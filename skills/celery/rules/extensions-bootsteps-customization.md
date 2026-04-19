---
title: Extensions and Bootsteps Customization
impact: LOW
impactDescription: Enables advanced customization and extension of Celery behavior
tags: celery, extensions, bootsteps, customization
---

## Extensions and Bootsteps Customization

**Problem:**
Standard Celery configuration may not be sufficient for complex requirements. Organizations need to extend Celery's functionality with custom behaviors, monitoring, security features, or integration with other systems.

**Solution:**
Use Celery's extension system and bootsteps to customize worker behavior, add middleware, implement custom monitoring, and extend Celery's capabilities.

**Examples:**

✅ **Correct: Custom bootstep for enhanced monitoring**
```python
from celery import bootsteps
from celery.signals import task_received, task_succeeded, task_failed
import time
import threading

class MonitoringBootstep(bootsteps.StartStopStep):
    """Custom bootstep for advanced monitoring"""

    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.metrics = {}
        self.lock = threading.Lock()

    def start(self, parent):
        """Called when the worker starts"""
        print("Starting custom monitoring bootstep")

        # Initialize monitoring
        self.metrics = {
            'tasks_received': 0,
            'tasks_succeeded': 0,
            'tasks_failed': 0,
            'start_time': time.time(),
        }

        # Connect signal handlers
        task_received.connect(self.on_task_received)
        task_succeeded.connect(self.on_task_succeeded)
        task_failed.connect(self.on_task_failed)

        # Start metrics reporting thread
        self.reporting_thread = threading.Thread(target=self.report_metrics)
        self.reporting_thread.daemon = True
        self.reporting_thread.start()

    def stop(self, parent):
        """Called when the worker stops"""
        print("Stopping custom monitoring bootstep")

        # Report final metrics
        self.report_final_metrics()

    def on_task_received(self, sender=None, **kwargs):
        """Handle task received"""
        with self.lock:
            self.metrics['tasks_received'] += 1

    def on_task_succeeded(self, sender=None, **kwargs):
        """Handle task success"""
        with self.lock:
            self.metrics['tasks_succeeded'] += 1

    def on_task_failed(self, sender=None, **kwargs):
        """Handle task failure"""
        with self.lock:
            self.metrics['tasks_failed'] += 1

    def report_metrics(self):
        """Periodically report metrics"""
        while True:
            time.sleep(60)  # Report every minute

            with self.lock:
                metrics_copy = self.metrics.copy()

            # Report metrics (could send to monitoring system)
            print(f"Worker metrics: {metrics_copy}")

    def report_final_metrics(self):
        """Report final metrics on shutdown"""
        uptime = time.time() - self.metrics['start_time']

        print("Final worker metrics:")
        print(f"  Uptime: {uptime:.1f} seconds")
        print(f"  Tasks received: {self.metrics['tasks_received']}")
        print(f"  Tasks succeeded: {self.metrics['tasks_succeeded']}")
        print(f"  Tasks failed: {self.metrics['tasks_failed']}")
        print(f"  Success rate: {self.metrics['tasks_succeeded'] / max(1, self.metrics['tasks_received']) * 100:.1f}%")

# Register the bootstep
app.steps['worker'].add(MonitoringBootstep)
```

✅ **Correct: Custom task middleware**
```python
from celery import Task
from celery.signals import task_prerun, task_postrun

class CustomTask(Task):
    """Custom task base class with middleware"""

    def __call__(self, *args, **kwargs):
        """Task execution wrapper"""
        # Pre-execution middleware
        self.pre_execute(*args, **kwargs)

        try:
            # Execute the actual task
            result = self.run(*args, **kwargs)

            # Post-execution middleware
            self.post_execute(result, *args, **kwargs)

            return result

        except Exception as exc:
            # Error middleware
            self.on_error(exc, *args, **kwargs)
            raise

    def pre_execute(self, *args, **kwargs):
        """Pre-execution middleware"""
        # Custom logging
        logger.info(f"Executing {self.name} with args={args} kwargs={kwargs}")

        # Performance monitoring
        self.start_time = time.time()

        # Custom validation
        self.validate_input(*args, **kwargs)

    def post_execute(self, result, *args, **kwargs):
        """Post-execution middleware"""
        # Performance monitoring
        duration = time.time() - self.start_time
        logger.info(f"{self.name} completed in {duration:.3f}s")

        # Result validation
        self.validate_output(result)

        # Custom processing
        self.process_result(result)

    def on_error(self, exc, *args, **kwargs):
        """Error handling middleware"""
        logger.error(f"{self.name} failed: {exc}")

        # Custom error processing
        self.handle_error(exc, *args, **kwargs)

    def validate_input(self, *args, **kwargs):
        """Validate task input"""
        # Custom validation logic
        pass

    def validate_output(self, result):
        """Validate task output"""
        # Custom validation logic
        pass

    def process_result(self, result):
        """Process task result"""
        # Custom result processing
        pass

    def handle_error(self, exc, *args, **kwargs):
        """Handle task errors"""
        # Custom error handling
        pass

# Use custom task class
@app.task(base=CustomTask)
def my_enhanced_task(data):
    """Task with custom middleware"""
    # Task logic here
    return process_data(data)
```

✅ **Correct: Custom worker extension**
```python
from celery import bootsteps
from celery.worker import components

class CustomWorkerExtension(bootsteps.StartStopStep):
    """Custom worker extension"""

    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.custom_component = None

    def start(self, parent):
        """Initialize custom extension"""
        print("Starting custom worker extension")

        # Initialize custom components
        self.custom_component = CustomMonitoringComponent()

        # Register with worker
        parent.custom_extension = self

    def stop(self, parent):
        """Cleanup custom extension"""
        print("Stopping custom worker extension")

        if self.custom_component:
            self.custom_component.shutdown()

class CustomMonitoringComponent:
    """Custom monitoring component"""

    def __init__(self):
        self.metrics = {}
        self.start_time = time.time()

    def record_metric(self, name, value):
        """Record a custom metric"""
        self.metrics[name] = value

    def get_metrics(self):
        """Get current metrics"""
        return dict(self.metrics)

    def shutdown(self):
        """Shutdown component"""
        # Cleanup resources
        pass

# Register extension with worker
app.steps['worker'].add(CustomWorkerExtension)

# Usage in tasks
@app.task(bind=True)
def monitored_task(self, data):
    """Task using custom monitoring"""
    # Access custom extension
    if hasattr(self.app, 'custom_extension'):
        extension = self.app.custom_extension
        if hasattr(extension, 'custom_component'):
            extension.custom_component.record_metric('task_started', time.time())

    result = process_data(data)

    # Record completion
    if hasattr(self.app, 'custom_extension'):
        extension = self.app.custom_extension
        if hasattr(extension, 'custom_component'):
            extension.custom_component.record_metric('task_completed', time.time())

    return result
```

✅ **Correct: Signal-based extensions**
```python
from celery.signals import (
    worker_init, worker_ready, worker_shutdown,
    task_prerun, task_postrun, task_success, task_failure
)

# Worker lifecycle extensions
@worker_init.connect
def custom_worker_init(**kwargs):
    """Custom worker initialization"""
    print("Custom worker initialization")

    # Setup custom resources
    setup_custom_resources()

@worker_ready.connect
def custom_worker_ready(**kwargs):
    """Custom worker ready handler"""
    print("Custom worker ready")

    # Register with external systems
    register_with_monitoring_system()

@worker_shutdown.connect
def custom_worker_shutdown(**kwargs):
    """Custom worker shutdown"""
    print("Custom worker shutdown")

    # Cleanup resources
    cleanup_custom_resources()

# Task lifecycle extensions
@task_prerun.connect
def custom_task_prerun(sender=None, **kwargs):
    """Custom task pre-run handler"""
    task_name = sender.name if sender else 'unknown'

    # Custom pre-run logic
    log_task_start(task_name)

@task_success.connect
def custom_task_success(sender=None, **kwargs):
    """Custom task success handler"""
    task_name = sender.name if sender else 'unknown'

    # Custom success logic
    update_success_metrics(task_name)

@task_failure.connect
def custom_task_failure(sender=None, exception=None, **kwargs):
    """Custom task failure handler"""
    task_name = sender.name if sender else 'unknown'

    # Custom failure logic
    handle_task_failure(task_name, exception)
    send_failure_alert(task_name, exception)

# Custom signal definition
from celery.utils.dispatch import Signal

custom_task_signal = Signal(name='custom_task_signal')

@custom_task_signal.connect
def handle_custom_signal(sender=None, **kwargs):
    """Handle custom signal"""
    print(f"Custom signal received: {kwargs}")

# Emit custom signal in task
@app.task
def task_with_custom_signal(data):
    """Task that emits custom signals"""
    result = process_data(data)

    # Emit custom signal
    custom_task_signal.send(sender=task_with_custom_signal, result=result, data=data)

    return result
```

❌ **Wrong: Over-customization leading to complexity**
```python
# Too many extensions make the system hard to maintain
app.steps['worker'].add(Extension1)
app.steps['worker'].add(Extension2)
app.steps['worker'].add(Extension3)
# Each extension adds complexity and potential failure points
```

❌ **Wrong: Extensions without proper error handling**
```python
# Extensions that fail can break the worker
@worker_init.connect
def fragile_extension(**kwargs):
    risky_operation()  # If this fails, worker won't start
    # No error handling
```

**Common mistakes:**
- Creating extensions that interfere with Celery's core functionality
- Not handling errors in extensions properly
- Over-customizing leading to maintenance complexity
- Missing cleanup in extension shutdown
- Not documenting custom extensions

**When to apply:**
- Implementing custom monitoring and metrics collection
- Adding security features or compliance requirements
- Integrating with external monitoring systems
- Implementing custom task lifecycle management
- Adding domain-specific functionality

**Related rules:**
- `signals-events-system`: Basic signal usage
- `monitoring-task-tracking`: Monitoring integration
- `security-task-authentication`: Security extensions</content>
<parameter name="filePath">skills/celery-skill/rules/extensions-bootsteps-customization.md