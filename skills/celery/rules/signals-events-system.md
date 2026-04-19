---
title: Signals and Events System
impact: MEDIUM
impactDescription: Enables monitoring, debugging, and extending Celery behavior
tags: celery, signals, events, monitoring, debugging
---

## Signals and Events System

**Problem:**
Without access to Celery's internal events, monitoring task lifecycle, debugging issues, and extending functionality becomes difficult. Important events like task start, success, failure, and worker status changes go unobserved.

**Solution:**
Use Celery's signals system to hook into task and worker events for monitoring, logging, metrics collection, and custom behavior extension.

**Examples:**

✅ **Correct: Comprehensive signal-based monitoring**
```python
from celery.signals import (
    task_prerun, task_postrun, task_success, task_failure,
    task_retry, task_revoked,
    worker_init, worker_ready, worker_shutdown,
    beat_init, beat_started
)
import time
import logging

logger = logging.getLogger(__name__)

# Task lifecycle monitoring
@task_prerun.connect
def task_started(sender=None, task_id=None, task=None, args=None, kwargs=None, **kw):
    """Monitor task execution start"""
    start_time = time.time()

    # Store start time for duration calculation
    cache.set(f"task:{task_id}:start_time", start_time, 3600)
    cache.set(f"task:{task_id}:name", task.name, 3600)

    logger.info(f"Task started: {task.name}[{task_id}]", extra={
        'task_id': task_id,
        'task_name': task.name,
        'args_count': len(args) if args else 0,
        'kwargs_count': len(kwargs) if kwargs else 0,
        'timestamp': start_time
    })

@task_success.connect
def task_completed(sender=None, result=None, **kwargs):
    """Monitor successful task completion"""
    task_id = kwargs.get('task_id')
    start_time = cache.get(f"task:{task_id}:start_time")
    task_name = cache.get(f"task:{task_id}:name")

    if start_time:
        duration = time.time() - start_time

        logger.info(f"Task succeeded: {task_name}[{task_id}]", extra={
            'task_id': task_id,
            'task_name': task_name,
            'duration': duration,
            'result_size': len(str(result)) if result else 0
        })

        # Update success metrics
        cache.incr('celery:metrics:tasks:success')
        cache.incr(f'celery:metrics:task:{task_name}:success')

        # Cleanup
        cache.delete(f"task:{task_id}:start_time")
        cache.delete(f"task:{task_id}:name")

@task_failure.connect
def task_failed(sender=None, task_id=None, exception=None,
                args=None, kwargs=None, traceback=None, einfo=None, **kw):
    """Monitor task failures with detailed information"""
    task_name = sender.name if sender else 'unknown'
    retry_count = kw.get('request', {}).get('retries', 0) if 'request' in kw else 0

    logger.error(f"Task failed: {task_name}[{task_id}]", extra={
        'task_id': task_id,
        'task_name': task_name,
        'exception': str(exception),
        'exception_type': type(exception).__name__,
        'retry_count': retry_count,
        'args': str(args)[:500] if args else None,  # Truncate for logging
        'kwargs': str(kwargs)[:500] if kwargs else None,
    }, exc_info=True)

    # Update failure metrics
    cache.incr('celery:metrics:tasks:failed')
    cache.incr(f'celery:metrics:task:{task_name}:failed')

    # Cleanup start time
    cache.delete(f"task:{task_id}:start_time")
    cache.delete(f"task:{task_id}:name")

@task_retry.connect
def task_retried(sender=None, request=None, reason=None, einfo=None, **kw):
    """Monitor task retries"""
    logger.warning(f"Task retry: {sender.name}[{request.id}]", extra={
        'task_id': request.id,
        'task_name': sender.name,
        'reason': str(reason),
        'retry_count': request.retries,
        'max_retries': sender.max_retries
    })

@task_revoked.connect
def task_revoked_handler(sender=None, request=None, terminated=None, signum=None, expired=None, **kw):
    """Monitor task revocation"""
    reason = "unknown"
    if terminated:
        reason = f"terminated by signal {signum}"
    elif expired:
        reason = "expired"

    logger.info(f"Task revoked: {sender.name}[{request.id}] - {reason}", extra={
        'task_id': request.id,
        'task_name': sender.name,
        'reason': reason,
        'terminated': terminated,
        'expired': expired
    })

# Worker lifecycle signals
@worker_init.connect
def worker_initialized(sender=None, **kwargs):
    """Worker initialization"""
    logger.info(f"Worker initialized: {sender}", extra={
        'worker_hostname': str(sender),
        'event': 'worker_init'
    })

    # Initialize worker-specific resources
    initialize_worker_resources()

@worker_ready.connect
def worker_ready_handler(sender=None, **kwargs):
    """Worker ready to accept tasks"""
    logger.info(f"Worker ready: {sender}", extra={
        'worker_hostname': str(sender),
        'event': 'worker_ready'
    })

    # Register worker with monitoring system
    register_worker_with_monitoring(sender)

@worker_shutdown.connect
def worker_shutdown_handler(sender=None, **kwargs):
    """Worker shutdown"""
    logger.info(f"Worker shutdown: {sender}", extra={
        'worker_hostname': str(sender),
        'event': 'worker_shutdown'
    })

    # Cleanup worker resources
    cleanup_worker_resources()

# Beat scheduler signals
@beat_init.connect
def beat_initialized(sender=None, **kwargs):
    """Celery Beat initialization"""
    logger.info("Celery Beat initialized", extra={
        'beat_hostname': str(sender),
        'event': 'beat_init'
    })

@beat_started.connect
def beat_started_handler(sender=None, **kwargs):
    """Celery Beat started"""
    logger.info("Celery Beat started", extra={
        'beat_hostname': str(sender),
        'event': 'beat_started'
    })
```

✅ **Correct: Custom signal-based error handling**
```python
from celery.signals import task_failure
from django.core.mail import send_mail

# Global error handler
@task_failure.connect
def global_error_handler(sender=None, task_id=None, exception=None, args=None, kwargs=None, **kw):
    """Global error handler for all tasks"""
    task_name = sender.name if sender else 'unknown'

    # Log critical errors
    if isinstance(exception, (SystemExit, KeyboardInterrupt)):
        logger.critical(f"Critical error in {task_name}: {exception}")
    else:
        logger.error(f"Task error in {task_name}: {exception}")

    # Send alerts for critical tasks
    critical_tasks = ['payment_processing', 'user_registration', 'data_backup']

    if any(critical in task_name for critical in critical_tasks):
        send_admin_alert(
            subject=f"Critical task failed: {task_name}",
            message=f"""
            Task: {task_name}
            Task ID: {task_id}
            Exception: {exception}
            Args: {args}
            Kwargs: {kwargs}
            """.strip()
        )

    # Store error for analysis
    error_record = {
        'task_name': task_name,
        'task_id': task_id,
        'exception': str(exception),
        'timestamp': timezone.now(),
        'args': args,
        'kwargs': kwargs
    }

    cache.lpush('celery:errors', json.dumps(error_record))
    cache.ltrim('celery:errors', 0, 999)  # Keep last 1000 errors

# Task-specific error handling
@task_failure.connect(sender='myapp.tasks.payment_processing')
def payment_error_handler(sender=None, task_id=None, exception=None, **kw):
    """Specific handler for payment processing errors"""
    # Mark payment as failed
    payment_id = kw.get('args', [None])[0]
    if payment_id:
        Payment.objects.filter(id=payment_id).update(status='error')

    # Notify payment service
    notify_payment_service_failure(payment_id, str(exception))

@task_failure.connect(sender='myapp.tasks.email_delivery')
def email_error_handler(sender=None, task_id=None, exception=None, args=None, **kw):
    """Handle email delivery failures"""
    email_id = args[0] if args else None

    if email_id:
        # Mark email as failed
        Email.objects.filter(id=email_id).update(status='failed')

        # Could retry with different email provider
        retry_email_delivery.apply_async(args=[email_id], countdown=300)
```

✅ **Correct: Signals for custom task behavior**
```python
from celery.signals import task_received, task_unknown

@task_received.connect
def task_received_handler(sender=None, request=None, **kwargs):
    """Handle task reception for custom routing or validation"""
    task_name = request.task
    task_id = request.id

    # Custom routing logic
    if task_name.startswith('high_priority.'):
        # Ensure high priority tasks are routed correctly
        if not request.delivery_info.get('routing_key', '').startswith('high'):
            logger.warning(f"High priority task {task_name} not on high priority queue")

    # Task validation
    if task_name == 'user.delete' and not request.args:
        logger.error(f"Delete user task {task_id} called without user ID")
        # Could revoke the task
        app.control.revoke(task_id)

@task_unknown.connect
def unknown_task_handler(sender=None, name=None, id=None, message=None, exc=None, **kwargs):
    """Handle unknown task errors"""
    logger.error(f"Unknown task received: {name}", extra={
        'task_name': name,
        'task_id': id,
        'message': str(message),
        'exception': str(exc)
    })

    # Could send alert for unknown tasks
    send_admin_alert(
        "Unknown Celery Task",
        f"Unknown task '{name}' received with ID {id}"
    )

# Custom task lifecycle hooks
from celery.signals import before_task_publish, after_task_publish

@before_task_publish.connect
def before_publish(sender=None, body=None, exchange=None, routing_key=None, **kwargs):
    """Validate task before publishing"""
    task_name = body[0] if body else None

    # Add custom headers
    headers = kwargs.get('headers', {})
    headers['published_at'] = time.time()
    headers['publisher'] = 'myapp'
    kwargs['headers'] = headers

@after_task_publish.connect
def after_publish(sender=None, body=None, **kwargs):
    """Track task publishing"""
    task_name = body[0] if body else 'unknown'

    # Update publishing metrics
    cache.incr(f'celery:published:{task_name}')
    cache.incr('celery:published:total')
```

❌ **Wrong: Not using signals for monitoring**
```python
# No visibility into task lifecycle
@app.task
def unmonitored_task():
    """Task with no monitoring"""
    do_work()
    # No way to know if it started, succeeded, or failed
```

❌ **Wrong: Overusing signals**
```python
# Attaching too many handlers can slow things down
@task_prerun.connect
def handler1(sender, **kwargs):
    do_something_expensive()

@task_prerun.connect
def handler2(sender, **kwargs):
    do_another_expensive_thing()

@task_prerun.connect
def handler3(sender, **kwargs):
    yet_another_expensive_operation()

# Multiple expensive handlers on every task start
```

**Common mistakes:**
- Not cleaning up signal handlers causing memory leaks
- Performing expensive operations in signal handlers
- Not handling exceptions in signal handlers properly
- Attaching handlers to wrong signals
- Missing error handling in custom signal handlers

**When to apply:**
- Implementing comprehensive task monitoring
- Adding custom error handling and alerting
- Extending Celery behavior with custom logic
- Implementing audit trails and compliance logging
- Building custom monitoring and observability systems

**Related rules:**
- `monitoring-task-tracking`: Basic task monitoring patterns
- `perf-monitoring-metrics`: Performance metrics collection
- `error-retry-strategy`: Error handling integration</content>
<parameter name="filePath">skills/celery-skill/rules/signals-events-system.md