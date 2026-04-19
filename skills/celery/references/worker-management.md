# Worker Management and Scaling

This guide provides detailed patterns for deploying, scaling, and managing Celery workers in production environments.

## Worker Deployment Strategies

### Process Management
**Goal:** Ensure reliable worker lifecycle and resource management

**Systemd Service Configuration:**
```ini
# /etc/systemd/system/celery-worker.service
[Unit]
Description=Celery Worker Service
After=network.target redis.service postgresql.service

[Service]
Type=simple
User=celery
Group=celery
Environment=PYTHONPATH=/opt/myapp
Environment=DJANGO_SETTINGS_MODULE=myapp.settings.production
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/venv/bin/celery -A myapp worker \
    --pool=prefork \
    --concurrency=4 \
    --loglevel=info \
    --logfile=/var/log/celery/worker.log \
    --pidfile=/var/run/celery/worker.pid
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

**Supervisor Configuration:**
```ini
# /etc/supervisor/conf.d/celery-worker.conf
[program:celery-worker]
command=/opt/myapp/venv/bin/celery -A myapp worker --pool=prefork --concurrency=4 --loglevel=info
directory=/opt/myapp
user=celery
group=celery
environment=PYTHONPATH=/opt/myapp,DJANGO_SETTINGS_MODULE=myapp.settings.production
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/worker.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
```

### Specialized Worker Pools

**CPU-Bound Tasks:**
```bash
# Worker optimized for CPU-intensive tasks
celery -A myapp worker \
    --pool=prefork \
    --concurrency=2 \
    --queues=cpu \
    --hostname=cpu-worker@%h \
    --loglevel=info
```

**I/O-Bound Tasks:**
```bash
# Worker optimized for I/O-intensive tasks
celery -A myapp worker \
    --pool=gevent \
    --concurrency=50 \
    --queues=io \
    --hostname=io-worker@%h \
    --loglevel=info
```

**High-Priority Tasks:**
```bash
# Worker for priority tasks
celery -A myapp worker \
    --pool=prefork \
    --concurrency=4 \
    --queues=priority \
    --hostname=priority-worker@%h \
    --loglevel=info
```

## Scaling Patterns

### Horizontal Scaling
**Load Balancer Configuration:**
```python
# Queue distribution across multiple workers
app.conf.task_routes = {
    'myapp.tasks.high_priority': {'queue': 'priority'},
    'myapp.tasks.normal_priority': {'queue': 'normal'},
    'myapp.tasks.low_priority': {'queue': 'low'},
}

# Worker deployment script
def deploy_workers():
    """Deploy workers across multiple machines"""
    worker_configs = [
        {'queue': 'priority', 'concurrency': 2, 'pool': 'prefork'},
        {'queue': 'normal', 'concurrency': 8, 'pool': 'prefork'},
        {'queue': 'low', 'concurrency': 4, 'pool': 'gevent'},
    ]

    for config in worker_configs:
        # Deploy worker with specific configuration
        deploy_worker_to_host(config, target_host)
```

### Auto-Scaling
**Dynamic Worker Scaling:**
```python
import boto3
from celery import current_app

class CeleryAutoScaler:
    """Auto-scale Celery workers based on queue length"""

    def __init__(self, min_workers=1, max_workers=10, queue_threshold=100):
        self.min_workers = min_workers
        self.max_workers = max_workers
        self.queue_threshold = queue_threshold
        self.ec2 = boto3.client('ec2')

    def scale_workers(self):
        """Scale workers based on queue metrics"""
        queue_length = self.get_queue_length()

        if queue_length > self.queue_threshold:
            # Scale up
            current_workers = self.get_current_worker_count()
            if current_workers < self.max_workers:
                self.launch_worker_instance()
        elif queue_length < (self.queue_threshold * 0.3):
            # Scale down
            current_workers = self.get_current_worker_count()
            if current_workers > self.min_workers:
                self.terminate_worker_instance()

    def get_queue_length(self):
        """Get current queue length from broker"""
        try:
            inspect = current_app.control.inspect()
            active = inspect.active()
            scheduled = inspect.scheduled()

            total_tasks = 0
            if active:
                total_tasks += sum(len(tasks) for tasks in active.values())
            if scheduled:
                total_tasks += sum(len(tasks) for tasks in scheduled.values())

            return total_tasks
        except Exception as e:
            logger.error(f"Failed to get queue length: {e}")
            return 0

    def get_current_worker_count(self):
        """Get current number of running workers"""
        # Implementation depends on deployment method
        pass

    def launch_worker_instance(self):
        """Launch new worker instance"""
        # Implementation for cloud provider
        pass

    def terminate_worker_instance(self):
        """Terminate excess worker instance"""
        # Implementation for cloud provider
        pass

# Periodic scaling check
@shared_task
def check_and_scale_workers():
    """Periodic task to check and scale workers"""
    scaler = CeleryAutoScaler()
    scaler.scale_workers()
```

## Monitoring and Alerting

### Worker Health Checks
**Health Check Implementation:**
```python
from django.http import JsonResponse
from celery import current_app
import time

def celery_health_check(request):
    """Comprehensive Celery health check endpoint"""
    health_status = {
        'timestamp': time.time(),
        'overall_status': 'unknown',
        'components': {}
    }

    # Check broker connectivity
    broker_status = check_broker_health()
    health_status['components']['broker'] = broker_status

    # Check result backend
    result_status = check_result_backend_health()
    health_status['components']['result_backend'] = result_status

    # Check workers
    worker_status = check_worker_health()
    health_status['components']['workers'] = worker_status

    # Determine overall status
    all_components = [broker_status, result_status, worker_status]
    if all(status == 'healthy' for status in all_components):
        health_status['overall_status'] = 'healthy'
    elif any(status == 'unhealthy' for status in all_components):
        health_status['overall_status'] = 'unhealthy'
    else:
        health_status['overall_status'] = 'degraded'

    status_code = 200 if health_status['overall_status'] == 'healthy' else 503
    return JsonResponse(health_status, status=status_code)

def check_broker_health():
    """Check broker connectivity and performance"""
    try:
        # Test basic connectivity
        connection = current_app.connection()
        connection.ensure_connection(max_retries=1)

        # Test message publishing
        with connection.channel() as channel:
            queue = channel.queue_declare(queue='health_check', passive=True)
            if queue.method.message_count > 1000:  # Queue too long
                return 'degraded'

        return 'healthy'
    except Exception as e:
        logger.error(f"Broker health check failed: {e}")
        return 'unhealthy'

def check_worker_health():
    """Check worker status and responsiveness"""
    try:
        inspect = current_app.control.inspect()

        # Check if any workers are responding
        active = inspect.active()
        if not active:
            return 'no_workers'

        # Check worker responsiveness
        ping = inspect.ping()
        if not ping:
            return 'unresponsive'

        # Check for worker issues
        stats = inspect.stats()
        for worker, worker_stats in stats.items():
            if worker_stats.get('error', False):
                return 'worker_errors'

        return 'healthy'
    except Exception as e:
        logger.error(f"Worker health check failed: {e}")
        return 'unhealthy'
```

### Alerting Configuration
**Celery Events Monitoring:**
```python
from celery.events import EventReceiver
from celery import Celery

app = Celery('myapp')

class CeleryMonitor:
    """Monitor Celery events and send alerts"""

    def __init__(self):
        self.alert_thresholds = {
            'task_failure_rate': 0.05,  # 5% failure rate
            'queue_length': 1000,       # Max queue length
            'task_duration': 300,       # Max task duration (seconds)
        }
        self.metrics = {}

    def start_monitoring(self):
        """Start monitoring Celery events"""
        with app.connection() as connection:
            recv = EventReceiver(connection,
                               handlers={
                                   'task-failed': self.on_task_failed,
                                   'task-succeeded': self.on_task_succeeded,
                                   'worker-heartbeat': self.on_worker_heartbeat,
                               })
            recv.capture(limit=None, timeout=None)

    def on_task_failed(self, event):
        """Handle task failure events"""
        task_name = event['name']
        exception = event.get('exception', 'Unknown')

        logger.error(f"Task failed: {task_name} - {exception}")

        # Update failure metrics
        self.update_failure_metrics(task_name)

        # Check if alert threshold exceeded
        failure_rate = self.get_failure_rate(task_name)
        if failure_rate > self.alert_thresholds['task_failure_rate']:
            self.send_alert(f"High failure rate for {task_name}: {failure_rate:.2%}")

    def on_task_succeeded(self, event):
        """Handle successful task events"""
        duration = event.get('runtime', 0)

        if duration > self.alert_thresholds['task_duration']:
            self.send_alert(f"Long-running task: {event['name']} took {duration}s")

    def on_worker_heartbeat(self, event):
        """Handle worker heartbeat events"""
        worker_name = event['hostname']
        active_tasks = event.get('active', 0)

        # Monitor worker load
        if active_tasks > 50:  # Worker overloaded
            self.send_alert(f"Worker {worker_name} overloaded with {active_tasks} active tasks")

    def send_alert(self, message):
        """Send alert notification"""
        # Implementation depends on alerting system (email, Slack, PagerDuty, etc.)
        logger.warning(f"ALERT: {message}")
        # send_email_alert(message)
        # send_slack_notification(message)

    def update_failure_metrics(self, task_name):
        """Update failure tracking metrics"""
        key = f"failures:{task_name}"
        current = cache.get(key, 0)
        cache.set(key, current + 1, 3600)  # 1 hour window

    def get_failure_rate(self, task_name):
        """Calculate failure rate for task"""
        failures = cache.get(f"failures:{task_name}", 0)
        total = cache.get(f"total:{task_name}", 1)  # Avoid division by zero
        return failures / total if total > 0 else 0

# Start monitoring in background
monitor = CeleryMonitor()
# monitor.start_monitoring()  # Run in separate process/thread
```

## Troubleshooting Common Issues

### Worker Not Starting
**Diagnostic Steps:**
```bash
# Check Celery installation
python -c "import celery; print(celery.__version__)"

# Test basic Celery functionality
celery -A myapp worker --help

# Check configuration
celery -A myapp inspect registered

# Check broker connectivity
celery -A myapp shell -c "app.connection().ensure_connection()"

# Check for import errors
celery -A myapp worker --loglevel=debug 2>&1 | head -50
```

### Tasks Not Being Processed
**Common Causes and Solutions:**
```python
# 1. Check worker status
from celery import app
inspect = app.control.inspect()
print("Active workers:", inspect.active())
print("Registered tasks:", inspect.registered())

# 2. Check queue configuration
print("Routes:", app.conf.task_routes)

# 3. Verify task registration
print("Available tasks:", list(app.tasks.keys()))

# 4. Check broker queue status
# For Redis: redis-cli LLEN celery
# For RabbitMQ: rabbitmqctl list_queues

# 5. Test task execution manually
from myapp.tasks import my_task
result = my_task.delay(arg1, arg2)
print("Task result:", result.get(timeout=10))
```

### Memory Issues
**Memory Leak Prevention:**
```python
# Worker configuration for memory management
app.conf.update(
    worker_max_tasks_per_child=1000,  # Restart worker after N tasks
    worker_max_memory_per_child=200000,  # Restart if memory exceeds (KB)
    worker_disable_rate_limits=False,
)

# Manual memory monitoring
@task_prerun.connect
def monitor_memory(sender=None, **kwargs):
    """Monitor memory usage before task execution"""
    import psutil
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024

    if memory_mb > 500:  # Alert if over 500MB
        logger.warning(f"High memory usage: {memory_mb:.1f}MB")

    # Force garbage collection periodically
    if kwargs.get('task_id', '0').endswith('000'):  # Every 1000th task
        import gc
        collected = gc.collect()
        logger.info(f"Garbage collected: {collected} objects")
```

This worker management guide provides production-ready patterns for deploying, scaling, and maintaining Celery workers. Implement these practices to ensure reliable task processing in distributed environments.</content>
<parameter name="filePath">skills/celery-skill/references/worker-management.md