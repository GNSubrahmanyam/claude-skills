# Celery Development Best Practices - Complete Rules Reference

This document compiles all rules from the Celery Development Best Practices framework, organized by impact priority for comprehensive distributed task processing guidance.

---

## 1. Configuration & Setup (CRITICAL)

### Configuration Broker Setup
**Impact:** CRITICAL - Ensures reliable message delivery and system stability

**Problem:**
Improper broker configuration can lead to message loss, connection failures, and unreliable task execution. Celery applications depend on robust message broker setup for distributed task processing.

**Solution:**
Configure Redis or RabbitMQ brokers with proper connection settings, persistence, and reliability features. Use connection pooling and implement retry mechanisms for broker connections.

❌ **Wrong: Basic broker URL without resilience**
```python
# Insufficient for production
app.conf.broker_url = 'redis://localhost:6379/0'
# Missing connection pooling, retries, and error handling
```

✅ **Correct: Redis broker configuration**
```python
from celery import Celery

app = Celery('myapp')

app.conf.update(
    broker_url='redis://localhost:6379/0',
    broker_transport_options={
        'master_name': 'mymaster',  # For Redis Sentinel
        'socket_timeout': 5,
        'socket_connect_timeout': 5,
        'socket_keepalive': True,
        'socket_keepalive_options': {
            'TCP_KEEPIDLE': 60,
            'TCP_KEEPINTVL': 10,
            'TCP_KEEPCNT': 3,
        },
        'health_check_interval': 30,
    },
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
)
```

### Result Backend Selection
**Impact:** MEDIUM-HIGH - Enables task result tracking and retrieval

**Problem:**
Without proper result backend configuration, tasks cannot store or retrieve results, making it impossible to track task completion, handle asynchronous workflows, or implement result-dependent operations.

**Solution:**
Configure appropriate result backends (Redis, database, etc.) with proper expiration policies, serialization settings, and storage optimizations.

✅ **Correct: Redis result backend with proper configuration**
```python
app.conf.update(
    result_backend='redis://localhost:6379/1',
    result_backend_transport_options={
        'master_name': 'mymaster',
        'socket_timeout': 5,
        'socket_connect_timeout': 5,
        'socket_keepalive': True,
    },
    result_expires=3600,  # 1 hour
    result_cache_max=10000,
    result_serializer='json',
    accept_content=['json'],
    result_extended=True,  # Store additional metadata
)
```

---

## 2. Task Definition & Execution (CRITICAL)

### Task Atomic Operations
**Impact:** CRITICAL - Prevents data corruption and ensures task reliability

**Problem:**
Non-atomic tasks can leave systems in inconsistent states when failures occur midway through execution. Distributed task processing increases the risk of partial completion and data corruption.

**Solution:**
Design tasks to be atomic - either complete fully or not at all. Use transactions, idempotency keys, and proper error handling to ensure task reliability.

✅ **Correct: Atomic task with transaction**
```python
from django.db import transaction
from celery import shared_task

@shared_task(bind=True, max_retries=3)
def process_order_payment(self, order_id, payment_data):
    """Atomic payment processing task"""
    try:
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)

            if order.status != 'pending':
                return f"Order {order_id} already processed"

            payment_result = payment_gateway.charge(payment_data)
            order.status = 'paid' if payment_result.success else 'failed'
            order.payment_id = payment_result.transaction_id
            order.save()

            send_payment_confirmation.delay(order.customer_email, order.id)
            return f"Payment processed for order {order_id}"

    except Exception as exc:
        logger.error(f"Payment processing failed for order {order_id}: {exc}")
        raise self.retry(countdown=60 * (2 ** self.request.retries), exc=exc)
```

❌ **Wrong: Non-atomic task with partial updates**
```python
@shared_task
def process_user_registration(user_data):
    """Dangerous: partial updates without atomicity"""
    user = User.objects.create(email=user_data['email'], name=user_data['name'])
    send_welcome_email(user.email)  # What if this fails?
    UserProfile.objects.create(user=user, preferences=user_data.get('preferences', {}))
    # Inconsistent data if any step fails!
```

### Task Timeout Management
**Impact:** CRITICAL - Prevents runaway tasks and resource exhaustion

**Problem:**
Tasks without proper timeouts can run indefinitely, consuming resources and blocking worker processes. This can lead to system slowdowns and require manual intervention.

**Solution:**
Implement appropriate timeouts for different types of tasks based on their expected execution time and resource requirements.

✅ **Correct: Task timeout configuration**
```python
@shared_task(bind=True, soft_time_limit=300, time_limit=360)
def long_running_task(self, data):
    """Task with soft and hard timeouts"""
    try:
        # Soft time limit allows cleanup
        for item in data:
            if self.is_aborted():
                # Handle abortion gracefully
                cleanup_partial_work()
        return "Task aborted"

    except Exception as exc:
        logger.error(f"Task failed: {exc}")
        raise
```

### Task Calling Methods
**Impact:** HIGH - Ensures proper task execution and result handling

**Problem:**
Different calling methods have different behaviors and performance implications. Using the wrong method can lead to unexpected blocking, lost results, or performance issues.

**Solution:**
Choose the appropriate calling method based on your needs: delay() for fire-and-forget, apply_async() for advanced options, and call() for synchronous execution.

✅ **Correct: Fire-and-forget with delay()**
```python
# Simple async execution - no result needed
send_email.delay(user_id=123, template='welcome')
```

✅ **Correct: Advanced options with apply_async()**
```python
# Advanced execution options
result = send_email.apply_async(
    args=[user_id, template],
    countdown=60,  # Delay execution by 60 seconds
    expires=3600,  # Expire if not executed within 1 hour
    queue='email_queue',
    priority=9,  # Higher priority
)
```

✅ **Correct: Synchronous execution with call()**
```python
# Synchronous execution for testing or immediate results
total = calculate_total.call(items)
```

### Task Options and Configuration
**Impact:** HIGH - Ensures proper task behavior and reliability

**Problem:**
Celery tasks have many configuration options that control behavior, but using defaults can lead to unexpected behavior, performance issues, or reliability problems in production.

**Solution:**
Configure task options appropriately based on use case requirements, including retry behavior, timeouts, naming, and execution parameters.

✅ **Correct: Comprehensive task configuration**
```python
@shared_task(
    name='myapp.tasks.process_user_data',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(ConnectionError, TimeoutError),
    time_limit=3600,
    soft_time_limit=3300,
    acks_late=True,
    ignore_result=False,
    queue='default',
    priority=5,
    expires=86400,
)
def process_user_data(self, user_id):
    """Comprehensive task configuration example"""
    # Implementation...
```

---

## 3. Error Handling & Reliability (HIGH)

### Error Retry Strategy
**Impact:** HIGH - Ensures task reliability and system resilience

**Problem:**
Tasks can fail due to temporary issues like network timeouts, database locks, or external service unavailability. Without proper retry mechanisms, failed tasks are lost and systems become unreliable.

**Solution:**
Implement intelligent retry strategies with exponential backoff, maximum retry limits, and proper exception handling.

✅ **Correct: Intelligent retry with exponential backoff**
```python
@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def api_data_sync(self, api_endpoint, data):
    """Task with intelligent retry strategy"""
    try:
        response = requests.post(api_endpoint, json=data, timeout=30)

        if response.status_code == 429:  # Rate limited
            raise self.retry(countdown=300, exc=Exception("Rate limited"))

        response.raise_for_status()
        return response.json()

    except Timeout:
        logger.warning(f"Timeout calling {api_endpoint}, retrying...")
        raise self.retry(countdown=min(300, 30 * (2 ** self.request.retries)))

    except RequestException as exc:
        if self.request.retries < 3:
            logger.warning(f"Network error: {exc}, retrying...")
            raise self.retry(countdown=10 * (2 ** self.request.retries), exc=exc)
        else:
            logger.error(f"Persistent network error: {exc}")
            raise

    except Exception as exc:
        logger.error(f"Unexpected error in api_data_sync: {exc}")
        if self.request.retries == 0:
            raise self.retry(countdown=60, exc=exc)
        raise
```

❌ **Wrong: Simple retry without intelligence**
```python
@shared_task(max_retries=3)
def unreliable_task():
    """Poor retry strategy"""
    # Will retry immediately on any failure
    external_api_call()
```

---

## 4. Canvas: Designing Work-flows (HIGH)

### Canvas Chain Workflows
**Impact:** HIGH - Enables sequential task execution and error propagation

**Problem:**
Complex business processes require tasks to execute in sequence, with each task depending on the result of the previous one. Without proper chaining, workflows become error-prone and hard to manage.

**Solution:**
Use Celery's chain primitive to create sequential workflows where each task receives the result of the previous task as input.

✅ **Correct: Simple sequential chain**
```python
from celery import chain

# Chain: validate -> process -> notify
workflow = chain(
    validate_data.s(),
    process_user_data.s(),
    send_notification.s()
)

result = workflow.delay({'user_id': 123, 'data': '...'})
```

### Canvas Group Parallel Execution
**Impact:** HIGH - Enables parallel task execution for performance optimization

**Problem:**
Tasks that can run independently should execute in parallel to improve performance, but improper parallelization can lead to resource exhaustion, race conditions, or coordination issues.

**Solution:**
Use Celery's group primitive to execute multiple tasks in parallel, with proper error handling and result aggregation.

✅ **Correct: Parallel task execution with group**
```python
from celery import group

parallel_tasks = group(
    process_image.s(image_id, op)
    for image_id, op in zip(image_ids, operations)
)

results = parallel_tasks.apply_async().get(timeout=300)
```

### Canvas Chord Synchronization
**Impact:** HIGH - Enables complex workflows with parallel execution and synchronization

**Problem:**
Some workflows require parallel processing followed by a synchronization step that depends on all parallel tasks completing. Without chords, implementing these patterns is complex and error-prone.

**Solution:**
Use Celery's chord primitive to execute a group of tasks in parallel, then run a callback task that receives all results once all parallel tasks complete.

✅ **Correct: Basic chord pattern**
```python
from celery import chord, group

workflow = chord(
    group(process_data_chunk.s(chunk_id, data) for chunk_id, data in data_chunks),
    aggregate_results.s()
)

result = workflow.apply_async()
final_aggregate = result.get(timeout=300)
```

### Canvas Map and Starmap Operations
**Impact:** MEDIUM-HIGH - Enables efficient batch processing and data transformations

**Problem:**
Processing multiple items with similar operations requires efficient patterns. Manual iteration or individual task calls can be inefficient and hard to manage.

**Solution:**
Use Celery's map and starmap primitives to apply tasks to sequences of data efficiently, with proper error handling and result aggregation.

✅ **Correct: Using map for simple transformations**
```python
from celery import shared_task

@shared_task
def square_number(x):
    return x * x

# Map: apply square_number to each element
result = square_number.map([1, 2, 3, 4, 5]).apply_async().get()
# Results: [1, 4, 9, 16, 25]
```

---

## 5. Monitoring & Logging (HIGH)

### Monitoring Task Tracking
**Impact:** HIGH - Enables debugging and performance optimization

**Problem:**
Without proper monitoring, failed tasks go undetected, performance issues remain hidden, and debugging distributed systems becomes nearly impossible.

**Solution:**
Implement comprehensive task monitoring with logging, metrics collection, and alerting.

✅ **Correct: Comprehensive task monitoring setup**
```python
from celery.signals import task_prerun, task_postrun, task_failure, task_success
import time

@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kw):
    """Track task start"""
    start_time = time.time()
    cache.set(f"task_{task_id}_start", start_time, 3600)

    logger.info(f"Task {task.name}[{task_id}] started", extra={
        'task_id': task_id,
        'task_name': task.name,
        'args': str(args)[:100],
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
            'duration': duration
        })
        cache.delete(f"task_{task_id}_start")

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, **kw):
    """Track task failures"""
    logger.error(f"Task {sender.name}[{task_id}] failed", extra={
        'task_id': task_id,
        'task_name': sender.name,
        'exception': str(exception),
        'retry_count': kw.get('request', {}).retries if 'request' in kw else 0
    }, exc_info=True)
```

---

## 6. Performance & Scaling (MEDIUM-HIGH)

### Performance Concurrency Tuning
**Impact:** MEDIUM-HIGH - Optimizes task processing throughput and resource utilization

**Problem:**
Default Celery worker settings often result in suboptimal performance, either wasting resources or creating bottlenecks.

**Solution:**
Tune worker concurrency based on workload characteristics, available resources, and performance requirements.

✅ **Correct: Optimized worker concurrency configuration**
```python
app.conf.update(
    worker_pool='prefork',  # or 'eventlet', 'gevent' for I/O bound tasks
    worker_concurrency=4,   # Number of worker processes/threads
    worker_prefetch_multiplier=1,  # Conservative prefetching
    broker_pool_limit=10,      # Max broker connections per worker
    redis_max_connections=20,  # Redis connection pool size
)
```

❌ **Wrong: Default settings without tuning**
```python
app = Celery('myapp')
# worker_prefetch_multiplier defaults to 4
# May cause memory issues or slow processing
```

---

## 7. Security (MEDIUM-HIGH)

### Security Task Authentication
**Impact:** MEDIUM-HIGH - Prevents unauthorized task execution

**Problem:**
Celery tasks can be invoked from various sources, and without proper authentication, malicious actors could execute tasks or access sensitive operations.

**Solution:**
Implement task-level authentication and authorization checks to ensure only authorized sources can execute sensitive tasks.

✅ **Correct: Task authentication with signatures**
```python
import hmac
import hashlib
from celery import shared_task

def generate_task_signature(task_name, args, secret_key):
    """Generate HMAC signature for task authentication"""
    message = f"{task_name}:{str(args)}"
    return hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()

def verify_task_signature(task_name, args, signature, secret_key):
    """Verify task signature"""
    expected = generate_task_signature(task_name, args, secret_key)
    return hmac.compare_digest(expected, signature)

@shared_task(bind=True)
def secure_task(self, data, signature):
    """Task with signature-based authentication"""
    # Verify signature before processing
    if not verify_task_signature(self.name, data, signature, settings.CELERY_SECRET_KEY):
        logger.error(f"Invalid signature for task {self.name}")
        raise PermissionDenied("Invalid task signature")

    # Process authenticated task
    return process_secure_data(data)
```

---

## 8. Result Backends (MEDIUM-HIGH)

### Result Expiry Management
**Impact:** MEDIUM-HIGH - Prevents storage bloat and improves performance

**Problem:**
Task results accumulate over time without proper expiration, leading to storage bloat and degraded performance. Old results become irrelevant but continue consuming resources.

**Solution:**
Implement appropriate result expiration policies based on use case requirements and storage constraints.

✅ **Correct: Configured result expiration**
```python
app.conf.update(
    result_expires={
        'myapp.tasks.temporary_result': 300,    # 5 minutes
        'myapp.tasks.important_result': 86400,  # 24 hours
        '*': 3600,  # Default 1 hour for all other tasks
    },

    # Custom expiration function
    result_expires_callback=lambda task_name, args, kwargs: get_custom_expiry(task_name)
)

def get_custom_expiry(task_name):
    """Custom expiration logic based on task type"""
    if 'report' in task_name:
        return 604800  # 7 days for reports
    elif 'cache' in task_name:
        return 3600   # 1 hour for cache results
    else:
        return 86400  # 24 hours default
```

---

## 9. Routing & Queues (MEDIUM)

### Routing Task Distribution
**Impact:** MEDIUM - Optimizes task processing efficiency

**Problem:**
Without proper task routing, all tasks compete for the same worker resources, leading to inefficient processing and potential bottlenecks.

**Solution:**
Implement intelligent task routing to distribute workloads across specialized queues and workers.

✅ **Correct: Task routing configuration**
```python
app.conf.update(
    task_routes={
        'myapp.tasks.cpu_intensive': {'queue': 'cpu'},
        'myapp.tasks.io_intensive': {'queue': 'io'},
        'myapp.tasks.priority_high': {'queue': 'priority', 'routing_key': 'high'},
        'myapp.tasks.scheduled': {'queue': 'scheduled'},
    },

    # Queue definitions
    task_create_missing_queues=True,
    task_default_queue='celery',
    task_default_exchange='celery',
    task_default_routing_key='celery',
)

# Worker command for specialized queues:
# celery -A myapp worker -Q cpu --concurrency=2 --pool=prefork
# celery -A myapp worker -Q io --concurrency=50 --pool=gevent
```

---

## 10. Periodic Tasks (MEDIUM)

### Periodic Task Scheduling
**Impact:** MEDIUM - Enables reliable scheduled task execution

**Problem:**
Periodic tasks require reliable scheduling and execution, but misconfiguration can lead to missed executions, duplicate runs, or system overload.

**Solution:**
Configure Celery Beat with proper scheduling, timezone handling, and reliability features.

✅ **Correct: Celery Beat configuration**
```python
from celery import Celery
from celery.schedules import crontab

app = Celery('myapp')

app.conf.update(
    beat_schedule={
        'cleanup-expired-sessions': {
            'task': 'myapp.tasks.cleanup_sessions',
            'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
            'args': (),
        },
        'send-daily-reports': {
            'task': 'myapp.tasks.generate_reports',
            'schedule': crontab(hour=6, minute=0, day_of_week='mon-fri'),
            'args': ('daily',),
        },
        'health-check': {
            'task': 'myapp.tasks.health_check',
            'schedule': 300.0,  # Every 5 minutes
        },
    },

    # Beat settings
    beat_max_loop_interval=300,  # 5 minutes
    beat_schedule_filename='/var/run/celery/beat-schedule',
    beat_sync_every=1,
)

# Timezone-aware scheduling
app.conf.timezone = 'UTC'
app.conf.enable_utc = True
```

---

## 11. Serialization (MEDIUM)

### Serialization Data Handling
**Impact:** MEDIUM - Ensures reliable data transmission and storage

**Problem:**
Improper serialization can lead to data corruption, compatibility issues, or security vulnerabilities when passing complex objects through Celery.

**Solution:**
Choose appropriate serializers and handle complex data types properly.

✅ **Correct: Serialization configuration**
```python
app.conf.update(
    # Primary serializer
    task_serializer='json',
    accept_content=['json'],

    # Result serialization
    result_serializer='json',

    # Custom serializer for complex objects
    task_serializers={
        'myjson': 'myapp.serializers.MyJSONSerializer',
    }
)

from kombu.serialization import register
from myapp.models import CustomModel

class MyJSONSerializer:
    """Custom serializer for Django models"""

    def serialize(self, data):
        if isinstance(data, CustomModel):
            return {
                'type': 'CustomModel',
                'id': data.id,
                'name': data.name,
            }
        return data

    def deserialize(self, data):
        if isinstance(data, dict) and data.get('type') == 'CustomModel':
            return CustomModel.objects.get(id=data['id'])
        return data

# Register custom serializer
register('myjson', MyJSONSerializer().serialize, MyJSONSerializer().deserialize,
         content_type='application/x-myjson', content_encoding='utf-8')
```

---

## 12. Worker Management (MEDIUM)

### Worker Lifecycle Management
**Impact:** MEDIUM - Ensures reliable worker operation and resource management

**Problem:**
Workers can crash, hang, or consume excessive resources without proper lifecycle management, leading to unreliable task processing.

**Solution:**
Implement proper worker lifecycle management with health checks, graceful shutdown, and resource monitoring.

✅ **Correct: Worker lifecycle signals**
```python
from celery.signals import worker_init, worker_ready, worker_shutdown
import signal
import os

@worker_init.connect
def worker_init_handler(**kwargs):
    """Initialize worker resources"""
    logger.info("Worker initializing...")
    # Setup database connections, cache, etc.
    setup_worker_resources()

@worker_ready.connect
def worker_ready_handler(**kwargs):
    """Worker is ready to accept tasks"""
    logger.info("Worker ready to accept tasks")
    # Register with monitoring system
    register_worker_health()

@worker_shutdown.connect
def worker_shutdown_handler(**kwargs):
    """Cleanup before shutdown"""
    logger.info("Worker shutting down...")
    # Cleanup resources
    cleanup_worker_resources()
    # Unregister from monitoring
    unregister_worker_health()

def graceful_shutdown(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, initiating graceful shutdown")
    # Signal Celery to stop accepting new tasks
    os._exit(0)

# Register signal handlers
signal.signal(signal.SIGTERM, graceful_shutdown)
signal.signal(signal.SIGINT, graceful_shutdown)
```

---

## 13. Signals and Events (MEDIUM)

### Signals and Events System
**Impact:** MEDIUM - Enables monitoring, debugging, and extending Celery behavior

**Problem:**
Without access to Celery's internal events, monitoring task lifecycle, debugging issues, and extending functionality becomes difficult. Important events like task start, success, failure, and worker status changes go unobserved.

**Solution:**
Use Celery's signals system to hook into task and worker events for monitoring, logging, metrics collection, and custom behavior extension.

✅ **Correct: Comprehensive signal-based monitoring**
```python
from celery.signals import task_prerun, task_success, task_failure

@task_prerun.connect
def task_started(sender=None, task_id=None, task=None, **kw):
    logger.info(f"Task started: {task.name}[{task_id}]")

@task_success.connect
def task_completed(sender=None, result=None, **kwargs):
    task_id = kwargs.get('task_id')
    logger.info(f"Task succeeded: {sender.name}[{task_id}]")

@task_failure.connect
def task_failed(sender=None, task_id=None, exception=None, **kw):
    logger.error(f"Task failed: {sender.name}[{task_id]} - {exception}")
```

---

## 14. Remote Control and Inspection (MEDIUM)

### Remote Control and Worker Inspection
**Impact:** MEDIUM - Enables runtime management and troubleshooting of Celery workers

**Problem:**
Managing distributed Celery workers requires visibility into their state, ability to inspect running tasks, and control over worker behavior. Without remote control capabilities, debugging issues and managing workers becomes difficult.

**Solution:**
Use Celery's remote control commands and inspection API to monitor worker status, inspect active tasks, manage queues, and control worker behavior at runtime.

✅ **Correct: Worker status monitoring and inspection**
```python
# Get active tasks on all workers
active_tasks = app.control.inspect().active()

# Check worker connectivity
ping_result = app.control.ping()

# Revoke tasks
app.control.revoke(task_ids, terminate=False)

# Add/remove queue consumers
app.control.add_consumer('new_queue')
app.control.cancel_consumer('old_queue')
```

---

## 15. Testing Celery Applications (MEDIUM-HIGH)

### Testing Celery Applications
**Impact:** MEDIUM-HIGH - Ensures reliability and prevents production issues

**Problem:**
Celery applications are distributed and asynchronous, making testing complex. Without proper testing strategies, bugs can remain undetected until production, causing data corruption, lost tasks, or system failures.

**Solution:**
Implement comprehensive testing strategies including unit tests, integration tests, and end-to-end tests specifically designed for Celery's asynchronous nature.

✅ **Correct: Unit testing tasks**
```python
from unittest.mock import patch

def test_process_payment_success(self, mock_charge):
    mock_charge.return_value = MagicMock(success=True)
    result = process_payment.apply(args=[123, 99.99])
    self.assertEqual(result.get(), "Payment processed for order 123")
```

✅ **Correct: Testing task chains and workflows**
```python
@patch('myapp.tasks.validate_order')
@patch('myapp.tasks.process_payment')
def test_order_workflow(self, mock_payment, mock_validate):
    mock_validate.return_value = {'order_id': 123}
    mock_payment.return_value = {'status': 'success'}

    workflow = chain(validate_order.s(), process_payment.s())
    result = workflow.apply()
    self.assertTrue(result.get()['status'] == 'success')
```

---

## 17. Daemonization and Process Management (MEDIUM)

### Daemonization and Process Management
**Impact:** MEDIUM - Ensures reliable production deployment and process lifecycle management

**Problem:**
Celery workers need to run continuously in production environments, but manual process management leads to reliability issues, difficult monitoring, and improper resource cleanup when processes crash or need to be restarted.

**Solution:**
Use proper daemonization tools and process supervisors to manage Celery workers as reliable system services with automatic restart, logging, and monitoring capabilities.

✅ **Correct: Systemd service configuration**
```ini
# /etc/systemd/system/celery-worker.service
[Unit]
Description=Celery Worker Service
After=network.target redis-server.service postgresql.service
Requires=redis-server.service postgresql.service

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
    --pidfile=/var/run/celery/worker.pid \
    --statedb=/var/run/celery/worker.state
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
```

---

## 18. Debugging Celery Applications (HIGH)

### Debugging Celery Applications
**Impact:** HIGH - Enables effective troubleshooting and issue resolution in distributed systems

**Problem:**
Celery's distributed nature makes debugging complex. Without proper debugging techniques, developers struggle to identify root causes of task failures, performance issues, and system-wide problems in production environments.

**Solution:**
Implement comprehensive debugging strategies including logging configuration, task inspection, worker debugging, and systematic troubleshooting approaches for common Celery issues.

✅ **Correct: Comprehensive logging configuration**
```python
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

@app.task(bind=True)
def debug_task(self, data):
    logger.info(f"Task started: {self.request.id}", extra={
        'task_id': self.request.id,
        'task_name': self.name,
        'args': self.request.args,
        'kwargs': self.request.kwargs,
    })

    try:
        result = process_data(data)
        logger.info(f"Task completed: {self.request.id}")
        return result
    except Exception as exc:
        logger.error(f"Task failed: {self.request.id}", exc_info=True)
        raise
```

---

## 19. Advanced Performance Optimization (MEDIUM-HIGH)

### Advanced Performance Optimization
**Impact:** MEDIUM-HIGH - Maximizes throughput and minimizes resource usage in high-performance scenarios

**Problem:**
Basic concurrency tuning isn't sufficient for high-performance Celery deployments. Advanced optimization techniques are needed to handle high-throughput scenarios, minimize latency, and optimize resource utilization across complex distributed systems.

**Solution:**
Implement advanced performance optimization techniques including prefetch tuning, connection pooling optimization, task chunking, result backend optimization, and worker pool specialization.

✅ **Correct: Advanced prefetch and acknowledgment optimization**
```python
app.conf.update(
    worker_prefetch_multiplier=1,     # Conservative prefetching
    task_acks_late=True,             # Acknowledge after execution
    broker_pool_limit=20,            # More connections for high throughput
    worker_max_tasks_per_child=1000, # Restart worker after N tasks
)
```

---

## 20. Extensions and Bootsteps Customization (LOW)

### Extensions and Bootsteps Customization
**Impact:** LOW - Enables advanced customization and extension of Celery behavior

**Problem:**
Standard Celery configuration may not be sufficient for complex requirements. Organizations need to extend Celery's functionality with custom behaviors, monitoring, security features, or integration with other systems.

**Solution:**
Use Celery's extension system and bootsteps to customize worker behavior, add middleware, implement custom monitoring, and extend Celery's capabilities.

✅ **Correct: Custom bootstep for enhanced monitoring**
```python
from celery import bootsteps

class MonitoringBootstep(bootsteps.StartStopStep):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.metrics = {}

    def start(self, parent):
        print("Starting custom monitoring bootstep")
        # Initialize monitoring

    def stop(self, parent):
        print("Stopping custom monitoring bootstep")
        # Cleanup monitoring
```

---

## 21. Advanced Patterns (LOW)

### Advanced Task Chaining
**Impact:** LOW - Enables complex workflow orchestration

**Problem:**
Simple task execution may not suffice for complex workflows requiring conditional execution, error handling, or result-dependent processing.

**Solution:**
Use Celery's advanced features like chains, groups, chords, and callbacks for complex workflow orchestration.

✅ **Correct: Advanced task workflows**
```python
from celery import chain, group, chord

# Chain: sequential execution
workflow = chain(
    validate_data.s(data),
    process_data.s(),
    send_notification.s()
)
result = workflow()

# Group: parallel execution
parallel_tasks = group(
    process_chunk.s(chunk) for chunk in data_chunks
)
results = parallel_tasks.apply_async()

# Chord: parallel execution with callback
chord_tasks = chord(
    group(process_item.s(item) for item in items),
    process_results.s()
)
final_result = chord_tasks()

# Canvas with error handling
@shared_task
def complex_workflow(order_id):
    """Complex workflow with error handling"""
    try:
        # Step 1: Validate order
        validation = validate_order.s(order_id)

        # Step 2: Process payment (depends on validation)
        payment = process_payment.s(order_id)

        # Step 3: Update inventory and send confirmation
        finalize = group(
            update_inventory.s(order_id),
            send_confirmation.s(order_id)
        )

        # Execute workflow
        workflow = chain(validation, payment, finalize)
        return workflow.apply_async()

    except Exception as exc:
        logger.error(f"Workflow failed for order {order_id}: {exc}")
        # Compensate if needed
        compensate_order.delay(order_id)
        raise
```

---

*This Celery skill provides comprehensive guidance for building reliable, scalable distributed task processing systems. Regular updates will add more rules and patterns as Celery evolves.*</content>
<parameter name="filePath">skills/celery-skill/AGENTS.md