# Monitoring Task Tracking (HIGH)

**Impact:** HIGH - Enables debugging and performance optimization

**Problem:**
Without proper monitoring, failed tasks go undetected, performance issues remain hidden, and debugging distributed systems becomes nearly impossible. Celery applications require comprehensive observability.

**Solution:**
Implement comprehensive task monitoring with logging, metrics collection, and alerting. Track task execution, performance metrics, and system health indicators.

**Examples:**

✅ **Correct: Comprehensive task monitoring setup**
```python
import logging
import time
from celery import shared_task
from celery.signals import task_prerun, task_postrun, task_failure, task_success
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Task execution tracking
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kw):
    """Track task start"""
    start_time = time.time()
    cache.set(f"task_{task_id}_start", start_time, 3600)

    logger.info(f"Task {task.name}[{task_id}] started", extra={
        'task_id': task_id,
        'task_name': task.name,
        'args': str(args)[:100],  # Truncate for logging
        'kwargs': str(kwargs)[:100],
        'timestamp': start_time
    })

@task_success.connect
def task_success_handler(sender=None, result=None, **kwargs):
    """Track successful task completion"""
    task_id = kwargs.get('task_id')
    start_time = cache.get(f"task_{task_id}_start")

    if start_time:
        duration = time.time() - start_time
        logger.info(f"Task {sender.name}[{task_id}] completed successfully", extra={
            'task_id': task_id,
            'task_name': sender.name,
            'duration': duration,
            'result_size': len(str(result)) if result else 0
        })

        # Clean up
        cache.delete(f"task_{task_id}_start")

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, args=None, kwargs=None, traceback=None, einfo=None, **kw):
    """Track task failures"""
    logger.error(f"Task {sender.name}[{task_id}] failed", extra={
        'task_id': task_id,
        'task_name': sender.name,
        'exception': str(exception),
        'args': str(args)[:200],
        'kwargs': str(kwargs)[:200],
        'retry_count': kw.get('request', {}).retries if 'request' in kw else 0
    }, exc_info=True)

# Custom task decorator with monitoring
def monitored_task(**decorator_kwargs):
    """Task decorator that adds monitoring"""
    def decorator(func):
        @shared_task(**decorator_kwargs)
        @wraps(func)
        def wrapper(*args, **kwargs):
            task_instance = args[0] if args else None

            try:
                # Pre-execution monitoring
                start_time = time.time()

                # Execute task
                result = func(*args, **kwargs)

                # Post-execution monitoring
                duration = time.time() - start_time

                # Record metrics
                metrics_key = f"metrics:{func.__name__}"
                cache.incr(f"{metrics_key}:success")
                cache.incr(f"{metrics_key}:total_duration", int(duration * 1000))

                return result

            except Exception as e:
                # Record failure metrics
                metrics_key = f"metrics:{func.__name__}"
                cache.incr(f"{metrics_key}:failure")

                # Re-raise for Celery's retry mechanism
                raise

        return wrapper
    return decorator

@monitored_task(max_retries=3)
def process_user_data(user_id):
    """Example monitored task"""
    # Task implementation...
    pass
```

✅ **Correct: Health check endpoints**
```python
from django.http import JsonResponse
from celery import current_app
import redis

def celery_health_check(request):
    """Health check endpoint for Celery"""
    health_status = {
        'celery': 'unknown',
        'broker': 'unknown',
        'workers': []
    }

    try:
        # Check Celery connectivity
        inspect = current_app.control.inspect()
        active_workers = inspect.active()

        if active_workers:
            health_status['celery'] = 'healthy'
            health_status['workers'] = list(active_workers.keys())
        else:
            health_status['celery'] = 'no_workers'

    except Exception as e:
        health_status['celery'] = f'error: {str(e)}'

    # Check broker connectivity
    try:
        if 'redis' in current_app.conf.broker_url:
            # Redis broker check
            broker_conn = redis.from_url(current_app.conf.broker_url)
            broker_conn.ping()
            health_status['broker'] = 'healthy'
        else:
            # For other brokers, just check if Celery can connect
            health_status['broker'] = 'configured'
    except Exception as e:
        health_status['broker'] = f'error: {str(e)}'

    status_code = 200 if health_status['celery'] == 'healthy' else 503
    return JsonResponse(health_status, status=status_code)
```

❌ **Wrong: Insufficient monitoring**
```python
@shared_task
def unmonitored_task():
    """Task without monitoring - hard to debug failures"""
    # No logging, no metrics, no tracking
    external_api_call()
    # If this fails, we have no visibility
```

**Common mistakes:**
- Not logging task start/completion/failure events
- Missing task execution time tracking
- Not monitoring queue lengths and worker status
- Ignoring task result status and error patterns
- Not implementing health check endpoints

**When to apply:**
- Setting up new Celery applications
- Debugging task execution issues
- Performance monitoring and optimization
- Implementing alerting and notifications
- Production deployment preparation

**Related rules:**
- `monitoring-health-checks`: Worker health monitoring
- `monitoring-metrics-collection`: Comprehensive metrics gathering
- `error-exception-handling`: Error tracking and categorization</content>
<parameter name="filePath">skills/celery-skill/rules/monitoring-task-tracking.md