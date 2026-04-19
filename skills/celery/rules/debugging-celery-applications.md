---
title: Debugging Celery Applications
impact: HIGH
impactDescription: Enables effective troubleshooting and issue resolution in distributed systems
tags: celery, debugging, troubleshooting, distributed-systems
---

## Debugging Celery Applications

**Problem:**
Celery's distributed nature makes debugging complex. Without proper debugging techniques, developers struggle to identify root causes of task failures, performance issues, and system-wide problems in production environments.

**Solution:**
Implement comprehensive debugging strategies including logging configuration, task inspection, worker debugging, and systematic troubleshooting approaches for common Celery issues.

**Examples:**

✅ **Correct: Comprehensive logging configuration**
```python
# settings.py or celeryconfig.py
import logging
import sys
from celery.utils.log import get_task_logger

# Root logger configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/celery/celery.log')
    ]
)

# Celery-specific logging
logger = get_task_logger(__name__)

# Task-specific logging configuration
@app.task(bind=True)
def debug_task(self, data):
    """Task with comprehensive logging"""
    logger.info(f"Task started: {self.request.id}", extra={
        'task_id': self.request.id,
        'task_name': self.name,
        'args': self.request.args,
        'kwargs': self.request.kwargs,
        'hostname': self.request.hostname,
        'retries': self.request.retries,
        'eta': self.request.eta,
        'expires': self.request.expires
    })

    try:
        # Enable debug logging for this task
        if settings.DEBUG:
            import logging
            logging.getLogger().setLevel(logging.DEBUG)

        # Your task logic here
        result = process_data(data)

        logger.info(f"Task completed successfully: {self.request.id}", extra={
            'task_id': self.request.id,
            'result_size': len(str(result)) if result else 0
        })

        return result

    except Exception as exc:
        logger.error(f"Task failed: {self.request.id}", extra={
            'task_id': self.request.id,
            'exception': str(exc),
            'traceback': traceback.format_exc(),
            'args': self.request.args,
            'kwargs': self.request.kwargs
        }, exc_info=True)
        raise
```

✅ **Correct: Remote debugging with Celery events**
```python
# Enable remote debugging
from celery.contrib.rdb import set_trace

@app.task(bind=True)
def debuggable_task(self, data):
    """Task with remote debugging capability"""
    # Conditional debugging
    if self.request.kwargs.get('debug', False):
        print(f"Debugging enabled for task {self.request.id}")
        print("Call set_trace() to start debugging")
        # set_trace()  # Uncomment to enable remote debugging

    # Your task logic
    return process_data(data)

# Runtime debugging commands
def enable_task_debugging(task_id):
    """Enable debugging for a specific task"""
    # This would be called from management command
    app.control.revoke(task_id, terminate=False)
    # Send debug signal to worker
    # Worker would need custom signal handler

# Worker debugging setup
from celery.signals import worker_process_init

@worker_process_init.connect
def setup_worker_debugging(**kwargs):
    """Setup debugging environment for workers"""
    import os
    os.environ['PYTHONBREAKPOINT'] = 'celery.contrib.rdb.set_trace'

    # Custom debugger configuration
    if os.environ.get('CELERY_DEBUG', '').lower() == 'true':
        import logging
        logging.getLogger().setLevel(logging.DEBUG)

        # Enable all Celery debug logs
        logging.getLogger('celery').setLevel(logging.DEBUG)
        logging.getLogger('celery.task').setLevel(logging.DEBUG)
        logging.getLogger('celery.worker').setLevel(logging.DEBUG)
```

✅ **Correct: Task inspection and debugging utilities**
```python
# Debug utilities for inspecting task state
def inspect_task_state(task_id):
    """Inspect the state of a specific task"""
    try:
        # Get task result
        result = app.AsyncResult(task_id)

        print(f"Task ID: {task_id}")
        print(f"State: {result.state}")
        print(f"Ready: {result.ready()}")
        print(f"Successful: {result.successful()}" if result.ready() else "Not ready")

        if result.state == 'FAILURE':
            print(f"Exception: {result.info}")
            print(f"Traceback: {result.traceback}")
        elif result.ready():
            print(f"Result: {result.result}")

        return result

    except Exception as e:
        print(f"Failed to inspect task {task_id}: {e}")
        return None

def inspect_worker_queues():
    """Inspect current queue status"""
    try:
        inspect = app.control.inspect()

        # Active tasks
        active = inspect.active()
        if active:
            print("Active tasks by worker:")
            for worker, tasks in active.items():
                print(f"  {worker}: {len(tasks)} tasks")
                for task in tasks[:3]:  # Show first 3 tasks
                    print(f"    - {task['name']} ({task['id']})")

        # Scheduled tasks
        scheduled = inspect.scheduled()
        if scheduled:
            print("Scheduled tasks:")
            for worker, tasks in scheduled.items():
                print(f"  {worker}: {len(tasks)} tasks")

        # Queue lengths (if using Redis)
        if hasattr(app.conf, 'broker_url') and 'redis' in app.conf.broker_url:
            import redis
            broker = redis.from_url(app.conf.broker_url)

            # Check common queues
            queues = ['celery', 'high_priority', 'low_priority']
            for queue in queues:
                try:
                    length = broker.llen(queue)
                    print(f"Queue '{queue}': {length} messages")
                except:
                    pass

    except Exception as e:
        print(f"Failed to inspect queues: {e}")

def debug_task_execution_flow(task_name, args=None, kwargs=None):
    """Debug task execution flow"""
    print(f"Debugging task: {task_name}")

    # Test task signature
    try:
        task = app.tasks[task_name]
        print(f"Task found: {task}")
        print(f"Task location: {task.__module__}.{task.__name__}")
        print(f"Task options: {task.__dict__}")
    except KeyError:
        print(f"Task '{task_name}' not registered!")
        return

    # Test task execution synchronously
    print("Testing synchronous execution...")
    try:
        args = args or ()
        kwargs = kwargs or {}
        result = task.apply(args=args, kwargs=kwargs)
        print(f"Synchronous result: {result.get(timeout=10)}")
    except Exception as e:
        print(f"Synchronous execution failed: {e}")
        import traceback
        traceback.print_exc()

    # Test task execution asynchronously
    print("Testing asynchronous execution...")
    try:
        result = task.delay(*args, **kwargs)
        print(f"Async result ID: {result.id}")
        print(f"Initial state: {result.state}")

        # Wait a bit and check state
        import time
        time.sleep(2)
        result = app.AsyncResult(result.id)
        print(f"Final state: {result.state}")

        if result.ready():
            print(f"Async result: {result.get()}")
        else:
            print("Task still running or failed to start")

    except Exception as e:
        print(f"Asynchronous execution failed: {e}")
        import traceback
        traceback.print_exc()
```

✅ **Correct: Common debugging patterns and troubleshooting**
```python
# Debug signal handlers for monitoring task lifecycle
from celery.signals import task_prerun, task_postrun, task_failure, task_success

@task_prerun.connect
def debug_task_start(sender=None, task_id=None, task=None, **kwargs):
    """Debug task startup"""
    print(f"[DEBUG] Task {task.name}[{task_id}] started on {task.request.hostname}")
    print(f"[DEBUG] Args: {task.request.args}")
    print(f"[DEBUG] Kwargs: {task.request.kwargs}")

@task_success.connect
def debug_task_success(sender=None, result=None, **kwargs):
    """Debug task success"""
    task_id = kwargs.get('task_id')
    print(f"[DEBUG] Task {sender.name}[{task_id}] completed successfully")

@task_failure.connect
def debug_task_failure(sender=None, task_id=None, exception=None, **kwargs):
    """Debug task failure"""
    print(f"[DEBUG] Task {sender.name}[{task_id}] failed: {exception}")
    import traceback
    traceback.print_exc()

# Debug worker startup issues
from celery.signals import worker_init, worker_ready

@worker_init.connect
def debug_worker_init(**kwargs):
    """Debug worker initialization"""
    print("[DEBUG] Worker initializing...")
    print(f"[DEBUG] Broker: {app.conf.broker_url}")
    print(f"[DEBUG] Result backend: {app.conf.result_backend}")

@worker_ready.connect
def debug_worker_ready(**kwargs):
    """Debug worker ready"""
    print("[DEBUG] Worker ready to accept tasks")

# Debug broker connectivity
def test_broker_connection():
    """Test broker connectivity"""
    try:
        with app.connection() as connection:
            connection.ensure_connection(max_retries=3)
            print("✓ Broker connection successful")

            # Test basic operations
            if 'redis' in app.conf.broker_url:
                # Test Redis operations
                connection.channel().queue_declare('test_queue', passive=True)
                print("✓ Redis broker operations working")
            elif 'amqp' in app.conf.broker_url:
                # Test AMQP operations
                connection.channel().queue_declare('test_queue')
                print("✓ AMQP broker operations working")

    except Exception as e:
        print(f"✗ Broker connection failed: {e}")
        return False

    return True

# Debug result backend
def test_result_backend():
    """Test result backend connectivity"""
    try:
        # Test basic set/get operation
        test_key = f"celery.debug.test.{time.time()}"
        app.backend.set(test_key, "test_value")
        retrieved = app.backend.get(test_key)

        if retrieved == "test_value":
            print("✓ Result backend working")
            # Clean up
            app.backend.delete(test_key)
            return True
        else:
            print("✗ Result backend set/get failed")
            return False

    except Exception as e:
        print(f"✗ Result backend failed: {e}")
        return False

# Comprehensive debugging function
def debug_celery_setup():
    """Comprehensive Celery setup debugging"""
    print("=== Celery Debug Report ===")
    print(f"Celery version: {celery.__version__}")
    print(f"Application: {app.main}")
    print(f"Broker: {app.conf.broker_url}")
    print(f"Result backend: {app.conf.result_backend}")
    print()

    # Test connections
    print("Testing connections...")
    broker_ok = test_broker_connection()
    backend_ok = test_result_backend()
    print()

    # Check registered tasks
    print("Registered tasks:")
    for name, task in app.tasks.items():
        if not name.startswith('celery.'):  # Skip built-in tasks
            print(f"  - {name}: {task}")
    print()

    # Check configuration
    print("Key configuration:")
    print(f"  Task serializer: {app.conf.task_serializer}")
    print(f"  Result serializer: {app.conf.result_serializer}")
    print(f"  Worker concurrency: {app.conf.worker_concurrency}")
    print(f"  Timezone: {app.conf.timezone}")
    print()

    overall_status = "✓" if broker_ok and backend_ok else "✗"
    print(f"Overall status: {overall_status}")

    return broker_ok and backend_ok
```

❌ **Wrong: Insufficient debugging information**
```python
# Silent failures make debugging impossible
@app.task
def broken_task():
    # No logging, no error details
    result = risky_operation()  # Might fail silently
    return result  # No way to know what happened
```

❌ **Wrong: Over-debugging in production**
```python
# Performance impact in production
@app.task
def over_debugged_task():
    print("Task started")  # Console output in production
    import pdb; pdb.set_trace()  # Blocks production workers
    result = do_work()
    print(f"Result: {result}")  # Unnecessary I/O
    return result
```

**Common mistakes:**
- Not enabling proper logging levels during debugging
- Missing task execution tracking and state monitoring
- Not testing broker and backend connectivity
- Ignoring worker-specific debugging information
- Not using structured logging with contextual information

**When to apply:**
- Troubleshooting task execution failures
- Investigating performance issues
- Debugging worker connectivity problems
- Monitoring task lifecycle and state transitions
- Diagnosing production issues systematically

**Related rules:**
- `monitoring-task-tracking`: Basic monitoring setup
- `signals-events-system`: Event-based debugging
- `remote-control-inspection`: Runtime inspection capabilities</content>
<parameter name="filePath">skills/celery-skill/rules/debugging-celery-applications.md