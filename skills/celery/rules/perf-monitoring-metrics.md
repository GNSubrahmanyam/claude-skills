---
title: Performance Monitoring Metrics
impact: MEDIUM-HIGH
impactDescription: Enables performance optimization and issue detection
tags: celery, performance, monitoring, metrics
---

## Performance Monitoring Metrics

**Problem:**
Without comprehensive performance monitoring, Celery applications suffer from undetected bottlenecks, resource waste, and poor user experience. Performance issues often go unnoticed until they cause system failures.

**Solution:**
Implement comprehensive monitoring with custom metrics collection, performance tracking, and alerting for performance degradation.

**Examples:**

✅ **Correct: Comprehensive task performance monitoring**
```python
from celery.signals import task_prerun, task_postrun, task_failure
import time
import psutil
from django.core.cache import cache

class CeleryMetricsCollector:
    """Collect and store Celery performance metrics"""

    def __init__(self):
        self.metrics_prefix = 'celery:metrics'

    def record_task_start(self, task_name, task_id):
        """Record task execution start"""
        cache.set(f"task:{task_id}:start_time", time.time(), 3600)
        cache.set(f"task:{task_id}:name", task_name, 3600)

        # Increment active task counter
        cache.incr(f"{self.metrics_prefix}:active_tasks")

    def record_task_completion(self, task_name, task_id, success=True, duration=None):
        """Record task completion"""
        start_time = cache.get(f"task:{task_id}:start_time")
        if start_time and duration is None:
            duration = time.time() - start_time

        if duration:
            # Record execution time
            self._record_execution_time(task_name, duration)

        # Update success/failure counters
        if success:
            cache.incr(f"{self.metrics_prefix}:tasks:success")
        else:
            cache.incr(f"{self.metrics_prefix}:tasks:failed")

        # Decrement active task counter
        cache.decr(f"{self.metrics_prefix}:active_tasks")

        # Cleanup
        cache.delete(f"task:{task_id}:start_time")
        cache.delete(f"task:{task_id}:name")

    def _record_execution_time(self, task_name, duration):
        """Record task execution time statistics"""
        # Store last 100 execution times for percentile calculations
        key = f"{self.metrics_prefix}:duration:{task_name}"
        durations = cache.get(key, [])

        durations.append(duration)
        if len(durations) > 100:
            durations = durations[-100:]  # Keep last 100

        cache.set(key, durations, 86400)  # 24 hours

        # Update min/max/avg
        cache.set(f"{self.metrics_prefix}:duration:{task_name}:min",
                 min(durations), 86400)
        cache.set(f"{self.metrics_prefix}:duration:{task_name}:max",
                 max(durations), 86400)
        cache.set(f"{self.metrics_prefix}:duration:{task_name}:avg",
                 sum(durations) / len(durations), 86400)

    def get_performance_stats(self, task_name=None):
        """Get performance statistics"""
        stats = {
            'active_tasks': cache.get(f"{self.metrics_prefix}:active_tasks", 0),
            'total_success': cache.get(f"{self.metrics_prefix}:tasks:success", 0),
            'total_failed': cache.get(f"{self.metrics_prefix}:tasks:failed", 0),
        }

        if task_name:
            durations = cache.get(f"{self.metrics_prefix}:duration:{task_name}", [])
            if durations:
                stats.update({
                    'avg_duration': sum(durations) / len(durations),
                    'min_duration': min(durations),
                    'max_duration': max(durations),
                    'p95_duration': sorted(durations)[int(len(durations) * 0.95)],
                })

        return stats

# Global metrics collector
metrics_collector = CeleryMetricsCollector()

# Signal handlers for automatic monitoring
@task_prerun.connect
def monitor_task_start(sender=None, task_id=None, task=None, **kwargs):
    """Monitor task execution start"""
    metrics_collector.record_task_start(task.name, task_id)

@task_postrun.connect
def monitor_task_success(sender=None, task_id=None, task=None, **kwargs):
    """Monitor successful task completion"""
    metrics_collector.record_task_completion(task.name, task_id, success=True)

@task_failure.connect
def monitor_task_failure(sender=None, task_id=None, task=None, **kwargs):
    """Monitor task failure"""
    metrics_collector.record_task_completion(task.name, task_id, success=False)

# Performance monitoring task
@app.task
def collect_system_metrics():
    """Collect system-level performance metrics"""
    import psutil

    # CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)

    # Memory usage
    memory = psutil.virtual_memory()
    memory_percent = memory.percent

    # Disk I/O
    disk_io = psutil.disk_io_counters()
    if disk_io:
        read_bytes = disk_io.read_bytes
        write_bytes = disk_io.write_bytes

    # Network I/O
    net_io = psutil.net_io_counters()
    if net_io:
        bytes_sent = net_io.bytes_sent
        bytes_recv = net_io.bytes_recv

    # Store metrics
    metrics = {
        'cpu_percent': cpu_percent,
        'memory_percent': memory_percent,
        'disk_read_bytes': getattr(disk_io, 'read_bytes', 0),
        'disk_write_bytes': getattr(disk_io, 'write_bytes', 0),
        'net_bytes_sent': getattr(net_io, 'bytes_sent', 0),
        'net_bytes_recv': getattr(net_io, 'bytes_recv', 0),
        'timestamp': time.time(),
    }

    # Store in cache for monitoring dashboard
    cache.set('celery:system_metrics', metrics, 300)  # 5 minutes

    return metrics
```

✅ **Correct: Queue length monitoring and alerting**
```python
@app.task
def monitor_queue_health():
    """Monitor queue lengths and worker status"""
    from celery import current_app

    try:
        inspect = current_app.control.inspect()

        # Get queue statistics
        active_queues = inspect.active_queues()
        if active_queues:
            queue_stats = {}
            for worker, queues in active_queues.items():
                for queue_info in queues:
                    queue_name = queue_info['name']
                    if queue_name not in queue_stats:
                        queue_stats[queue_name] = {'workers': 0, 'messages': 0}

                    queue_stats[queue_name]['workers'] += 1

                    # Get message count (broker-specific)
                    if 'redis' in current_app.conf.broker_url:
                        import redis
                        broker = redis.from_url(current_app.conf.broker_url)
                        messages = broker.llen(queue_name)
                        queue_stats[queue_name]['messages'] += messages

            # Check for problems
            alerts = []
            for queue_name, stats in queue_stats.items():
                if stats['messages'] > 1000:  # Queue too long
                    alerts.append(f"Queue {queue_name} has {stats['messages']} messages")
                if stats['workers'] == 0:  # No workers for queue
                    alerts.append(f"Queue {queue_name} has no active workers")

            if alerts:
                # Send alerts
                send_admin_alert("Celery Queue Issues", "\n".join(alerts))

        return queue_stats

    except Exception as e:
        logger.error(f"Queue monitoring failed: {e}")
        return None

# Monitor broker connectivity
@app.task
def check_broker_connectivity():
    """Check broker connection health"""
    try:
        connection = current_app.connection()
        connection.ensure_connection(max_retries=3)

        # Test message publishing
        with connection.channel() as channel:
            # Simple connectivity test
            queue = channel.queue_declare(queue='health_check', passive=True)
            return {
                'status': 'healthy',
                'timestamp': time.time()
            }

    except Exception as e:
        logger.error(f"Broker connectivity check failed: {e}")
        send_admin_alert("Celery Broker Issues", f"Broker connectivity failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': time.time()
        }
```

❌ **Wrong: No performance monitoring**
```python
# No visibility into performance issues
@app.task
def slow_task():
    # Task runs slowly but no monitoring
    time.sleep(300)  # 5 minutes
    return "done"

# No metrics, no alerts, no performance tracking
```

**Common mistakes:**
- Not tracking task execution times
- Missing queue length monitoring
- No alerting for performance degradation
- Ignoring system resource usage
- Not monitoring broker connectivity

**When to apply:**
- Production deployments
- Performance optimization projects
- Capacity planning
- Troubleshooting slow tasks
- Implementing SLOs/SLAs

**Related rules:**
- `monitoring-task-tracking`: Basic task monitoring
- `monitoring-health-checks`: Health check implementation
- `perf-concurrency-tuning`: Performance tuning based on metrics</content>
<parameter name="filePath">skills/celery-skill/rules/perf-monitoring-metrics.md