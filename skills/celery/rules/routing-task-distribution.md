# Routing Task Distribution (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Ensures efficient task processing and resource utilization

**Problem:**
Without proper routing, all tasks compete for the same worker resources, leading to inefficient processing, resource contention, and poor performance isolation.

**Solution:**
Implement intelligent task routing to distribute workloads across specialized queues and workers based on task type, priority, and resource requirements.

**Examples:**

✅ **Correct: Queue-based routing by task type**
```python
from kombu import Exchange, Queue

# Define exchanges and queues
app.conf.task_queues = [
    Queue('celery', routing_key='celery'),  # Default queue
    Queue('high_priority', Exchange('high_priority', type='direct'),
          routing_key='high_priority'),
    Queue('cpu_intensive', Exchange('cpu_intensive', type='direct'),
          routing_key='cpu_intensive'),
    Queue('io_intensive', Exchange('io_intensive', type='direct'),
          routing_key='io_intensive'),
    Queue('periodic', Exchange('periodic', type='direct'),
          routing_key='periodic'),
]

# Route tasks to appropriate queues
app.conf.task_routes = {
    # High priority tasks
    'myapp.tasks.send_notification': {'queue': 'high_priority', 'routing_key': 'high_priority'},
    'myapp.tasks.process_payment': {'queue': 'high_priority', 'routing_key': 'high_priority'},

    # CPU intensive tasks
    'myapp.tasks.image_processing': {'queue': 'cpu_intensive', 'routing_key': 'cpu_intensive'},
    'myapp.tasks.data_analysis': {'queue': 'cpu_intensive', 'routing_key': 'cpu_intensive'},

    # I/O intensive tasks
    'myapp.tasks.api_sync': {'queue': 'io_intensive', 'routing_key': 'io_intensive'},
    'myapp.tasks.file_download': {'queue': 'io_intensive', 'routing_key': 'io_intensive'},

    # Periodic tasks
    'myapp.tasks.cleanup_expired_data': {'queue': 'periodic', 'routing_key': 'periodic'},
}

# Start specialized workers
# High priority: celery -A myapp worker -Q high_priority --concurrency=4
# CPU intensive: celery -A myapp worker -Q cpu_intensive --concurrency=2 --pool=prefork
# I/O intensive: celery -A myapp worker -Q io_intensive --concurrency=50 --pool=gevent
```

✅ **Correct: Dynamic routing based on task parameters**
```python
@app.task
def process_user_task(user_id, priority='normal'):
    """Task with dynamic routing based on parameters"""
    # Implementation
    pass

def route_by_priority(name, args, kwargs, options, task=None):
    """Custom routing function"""
    priority = kwargs.get('priority', 'normal')

    if priority == 'high':
        return {'queue': 'high_priority', 'routing_key': 'high_priority'}
    elif priority == 'low':
        return {'queue': 'low_priority', 'routing_key': 'low_priority'}
    else:
        return {'queue': 'normal', 'routing_key': 'normal'}

# Register custom router
app.conf.task_routes = [
    route_by_priority,
    # Other routes...
]

# Usage
process_user_task.apply_async(args=[123], kwargs={'priority': 'high'})
```

✅ **Correct: Automatic routing with task attributes**
```python
class PriorityTask(app.Task):
    """Base task class with priority routing"""
    priority = 'normal'  # Default priority

    def route(self, name, args, kwargs, options, task=None):
        """Automatic routing based on task priority"""
        return {
            'queue': f'{self.priority}_priority',
            'routing_key': f'{self.priority}_priority'
        }

    @property
    def queue(self):
        return f'{self.priority}_priority'

    @property
    def routing_key(self):
        return f'{self.priority}_priority'

@app.task(base=PriorityTask, priority='high')
def urgent_notification(user_id, message):
    """High priority notification task"""
    # Implementation
    pass

@app.task(base=PriorityTask, priority='low')
def background_cleanup():
    """Low priority cleanup task"""
    # Implementation
    pass

# Tasks automatically route to appropriate queues
urgent_notification.delay(user_id=123, message="Important!")
background_cleanup.delay()
```

❌ **Wrong: All tasks in default queue**
```python
# Poor routing - everything competes for same resources
app.conf.task_queues = [
    Queue('celery', routing_key='celery'),  # Only one queue
]

# All tasks go to same queue regardless of type
# CPU-intensive tasks block I/O tasks and vice versa
```

❌ **Wrong: Complex routing logic in application code**
```python
# Don't do this - routing logic scattered throughout codebase
def send_notification(user_id, message):
    # Manual queue selection in business logic
    if is_urgent_message(message):
        send_notification_task.apply_async(
            args=[user_id, message],
            queue='high_priority'
        )
    else:
        send_notification_task.apply_async(
            args=[user_id, message],
            queue='normal'
        )
```

**Common mistakes:**
- Using only default queue for all tasks
- Not separating CPU-bound from I/O-bound tasks
- Missing priority queues for urgent tasks
- Not considering worker specialization
- Hardcoding queue names in application code

**When to apply:**
- Separating different workload types (CPU vs I/O)
- Implementing task priority systems
- Scaling different parts of the system independently
- Isolating resource-intensive tasks
- Supporting multiple environments (dev/staging/prod)

**Related rules:**
- `worker-specialization`: Worker configuration for different queues
- `perf-concurrency-tuning`: Concurrency settings per worker type
- `routing-automatic-routing`: Automatic routing patterns</content>
<parameter name="filePath">skills/celery-skill/rules/routing-task-distribution.md