# Performance Concurrency Tuning (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Optimizes task processing throughput and resource utilization

**Problem:**
Default Celery worker settings often result in suboptimal performance, either wasting resources or creating bottlenecks. Improper concurrency configuration can lead to slow task processing or system overload.

**Solution:**
Tune worker concurrency based on workload characteristics, available resources, and performance requirements. Monitor and adjust prefetch settings, pool types, and connection pooling.

**Examples:**

✅ **Correct: Optimized worker concurrency configuration**
```python
# celery worker command with optimized settings
# celery -A myapp worker --pool=prefork --concurrency=4 --prefetch-multiplier=1

from celery import Celery

app = Celery('myapp')

# Worker configuration for different scenarios
app.conf.update(
    # Pool settings
    worker_pool='prefork',  # or 'eventlet', 'gevent' for I/O bound tasks
    worker_concurrency=4,   # Number of worker processes/threads

    # Prefetch settings - critical for performance
    worker_prefetch_multiplier=1,  # Conservative prefetching
    worker_disable_rate_limits=False,

    # Task routing for performance
    task_routes={
        'myapp.tasks.cpu_intensive': {'queue': 'cpu'},
        'myapp.tasks.io_intensive': {'queue': 'io'},
    },

    # Connection pooling
    broker_pool_limit=10,      # Max broker connections per worker
    redis_max_connections=20,  # Redis connection pool size

    # Performance monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# Specialized worker configurations
CPU_WORKER_CONFIG = {
    'worker_pool': 'prefork',
    'worker_concurrency': 2,  # Fewer for CPU-bound tasks
    'worker_prefetch_multiplier': 1,
}

IO_WORKER_CONFIG = {
    'worker_pool': 'gevent',
    'worker_concurrency': 100,  # More for I/O-bound tasks
    'worker_prefetch_multiplier': 4,
}
```

✅ **Correct: Dynamic concurrency adjustment**
```python
import psutil
from celery.signals import worker_process_init, worker_process_shutdown

def get_optimal_concurrency():
    """Calculate optimal concurrency based on system resources"""
    cpu_count = psutil.cpu_count()
    memory_gb = psutil.virtual_memory().total / (1024 ** 3)

    # CPU-bound tasks: concurrency = CPU cores
    # I/O-bound tasks: concurrency = CPU cores * 10-50
    # Memory-intensive: limited by available RAM

    base_concurrency = min(cpu_count * 2, 8)  # Conservative default
    return max(1, base_concurrency)

@worker_process_init.connect
def configure_worker(sender=None, **kwargs):
    """Configure worker based on system resources"""
    optimal_concurrency = get_optimal_concurrency()

    # Adjust Celery settings dynamically
    sender.app.conf.worker_concurrency = optimal_concurrency

    logger.info(f"Configured worker concurrency: {optimal_concurrency}")

# Performance monitoring task
@shared_task
def monitor_worker_performance():
    """Monitor and log worker performance metrics"""
    inspect = app.control.inspect()

    # Get active tasks
    active_tasks = inspect.active()
    if active_tasks:
        total_active = sum(len(tasks) for tasks in active_tasks.values())
        logger.info(f"Active tasks across all workers: {total_active}")

    # Get worker stats
    stats = inspect.stats()
    if stats:
        for worker, worker_stats in stats.items():
            logger.info(f"Worker {worker}: {worker_stats}")

    return {
        'active_tasks': total_active if 'total_active' in locals() else 0,
        'worker_count': len(stats) if stats else 0
    }
```

❌ **Wrong: Default settings without tuning**
```python
# Poor performance: default settings
app = Celery('myapp')
# worker_prefetch_multiplier defaults to 4
# worker_concurrency defaults to CPU count
# No connection pooling configuration
# May cause memory issues or slow processing
```

**Common mistakes:**
- Using default prefetch multiplier (often too high)
- Not matching pool type to workload (CPU vs I/O bound)
- Ignoring connection pooling leading to broker overload
- Setting concurrency too high causing context switching overhead
- Not monitoring worker performance metrics

**When to apply:**
- Initial Celery deployment and configuration
- Performance optimization and scaling
- Troubleshooting slow task processing
- Resource utilization monitoring
- Deploying to different environments (dev/staging/prod)

**Related rules:**
- `perf-prefetch-tuning`: Prefetch multiplier optimization
- `perf-connection-pooling`: Broker connection management
- `monitoring-metrics-collection`: Performance monitoring</content>
<parameter name="filePath">skills/celery-skill/rules/perf-concurrency-tuning.md