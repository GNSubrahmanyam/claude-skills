# Remote Control and Worker Inspection (MEDIUM)

**Impact:** MEDIUM - Enables runtime management and troubleshooting of Celery workers

**Problem:**
Managing distributed Celery workers requires visibility into their state, ability to inspect running tasks, and control over worker behavior. Without remote control capabilities, debugging issues and managing workers becomes difficult.

**Solution:**
Use Celery's remote control commands and inspection API to monitor worker status, inspect active tasks, manage queues, and control worker behavior at runtime.

**Examples:**

✅ **Correct: Worker status monitoring and inspection**
```python
from celery import app

# Get comprehensive worker statistics
def inspect_workers():
    """Comprehensive worker inspection"""
    inspect = app.control.inspect()

    # Get active tasks on all workers
    active_tasks = inspect.active()
    if active_tasks:
        print("Active tasks:")
        for worker, tasks in active_tasks.items():
            print(f"  {worker}: {len(tasks)} tasks")
            for task in tasks:
                print(f"    - {task['name']}[{task['id']}]")

    # Get scheduled tasks (ETA/countdown)
    scheduled_tasks = inspect.scheduled()
    if scheduled_tasks:
        print("Scheduled tasks:")
        for worker, tasks in scheduled_tasks.items():
            print(f"  {worker}: {len(tasks)} tasks")

    # Get reserved tasks (received but not executing)
    reserved_tasks = inspect.reserved()
    if reserved_tasks:
        print("Reserved tasks:")
        for worker, tasks in reserved_tasks.items():
            print(f"  {worker}: {len(tasks)} tasks")

    # Get worker statistics
    stats = inspect.stats()
    if stats:
        print("Worker statistics:")
        for worker, worker_stats in stats.items():
            print(f"  {worker}:")
            print(f"    - Pool processes: {worker_stats.get('pool', {}).get('processes', [])}")
            print(f"    - Total tasks: {worker_stats.get('total', [])}")

# Check worker connectivity with ping
def check_worker_health():
    """Check if workers are responding"""
    try:
        # Ping all workers
        ping_result = app.control.ping(timeout=5)
        print("Worker ping results:")
        for worker, response in ping_result.items():
            status = "✓ OK" if response.get('ok') == 'pong' else "✗ FAIL"
            print(f"  {worker}: {status}")

        return ping_result
    except Exception as e:
        print(f"Failed to ping workers: {e}")
        return None

# Get registered tasks
def list_registered_tasks():
    """List all tasks registered on workers"""
    inspect = app.control.inspect()

    registered = inspect.registered()
    if registered:
        print("Registered tasks:")
        for worker, tasks in registered.items():
            print(f"  {worker} ({len(tasks)} tasks):")
            for task in sorted(tasks):
                print(f"    - {task}")

    return registered
```

✅ **Correct: Runtime queue management**
```python
# Add consumer to queue at runtime
def add_queue_consumer(queue_name, routing_key=None):
    """Add a queue consumer to running workers"""
    try:
        result = app.control.add_consumer(
            queue_name,
            routing_key=routing_key or queue_name,
            reply=True
        )
        print(f"Added consumer for queue '{queue_name}':")
        for worker, response in result.items():
            status = "✓ OK" if response.get('ok') else "✗ FAIL"
            print(f"  {worker}: {status}")

        return result
    except Exception as e:
        print(f"Failed to add consumer: {e}")
        return None

# Remove consumer from queue
def remove_queue_consumer(queue_name):
    """Remove a queue consumer from running workers"""
    try:
        result = app.control.cancel_consumer(queue_name, reply=True)
        print(f"Removed consumer for queue '{queue_name}':")
        for worker, response in result.items():
            status = "✓ OK" if response.get('ok') else "✗ FAIL"
            print(f"  {worker}: {status}")

        return result
    except Exception as e:
        print(f"Failed to remove consumer: {e}")
        return None

# List active queues
def list_active_queues():
    """List queues that workers are consuming from"""
    inspect = app.control.inspect()

    active_queues = inspect.active_queues()
    if active_queues:
        print("Active queues:")
        for worker, queues in active_queues.items():
            print(f"  {worker}:")
            for queue_info in queues:
                print(f"    - {queue_info['name']} (routing_key: {queue_info.get('routing_key', 'N/A')})")

    return active_queues
```

✅ **Correct: Task management and control**
```python
# Revoke tasks
def revoke_tasks(task_ids, terminate=False):
    """Revoke one or more tasks"""
    try:
        if isinstance(task_ids, str):
            task_ids = [task_ids]

        result = app.control.revoke(task_ids, reply=True, terminate=terminate)
        action = "terminated" if terminate else "revoked"

        print(f"Tasks {action}:")
        for worker, response in result.items():
            status = "✓ OK" if response.get('ok') else "✗ FAIL"
            print(f"  {worker}: {status}")

        return result
    except Exception as e:
        print(f"Failed to revoke tasks: {e}")
        return None

# Rate limiting control
def set_task_rate_limit(task_name, rate_limit):
    """Set rate limit for a task type"""
    try:
        result = app.control.rate_limit(task_name, rate_limit, reply=True)
        print(f"Set rate limit for '{task_name}' to '{rate_limit}':")
        for worker, response in result.items():
            status = "✓ OK" if response.get('ok') else "✗ FAIL"
            print(f"  {worker}: {status}")

        return result
    except Exception as e:
        print(f"Failed to set rate limit: {e}")
        return None

# Time limit control
def set_task_time_limits(task_name, soft_limit=None, hard_limit=None):
    """Set time limits for a task type"""
    try:
        result = app.control.time_limit(
            task_name,
            soft=soft_limit,
            hard=hard_limit,
            reply=True
        )
        print(f"Set time limits for '{task_name}' (soft: {soft_limit}, hard: {hard_limit}):")
        for worker, response in result.items():
            status = "✓ OK" if response.get('ok') else "✗ FAIL"
            print(f"  {worker}: {status}")

        return result
    except Exception as e:
        print(f"Failed to set time limits: {e}")
        return None

# Revoke tasks by stamped headers (advanced)
def revoke_tasks_by_headers(headers_dict):
    """Revoke tasks that have specific stamped headers"""
    try:
        result = app.control.revoke_by_stamped_headers(headers_dict, reply=True)
        print(f"Revoked tasks with headers {headers_dict}:")
        for worker, response in result.items():
            status = "✓ OK" if response.get('ok') else "✗ FAIL"
            print(f"  {worker}: {status}")

        return result
    except Exception as e:
        print(f"Failed to revoke tasks by headers: {e}")
        return None
```

✅ **Correct: Pool management and resizing**
```python
# Get current pool status
def get_pool_status():
    """Get pool status from workers"""
    inspect = app.control.inspect()

    stats = inspect.stats()
    if stats:
        print("Pool status:")
        for worker, worker_stats in stats.items():
            pool_stats = worker_stats.get('pool', {})
            print(f"  {worker}:")
            print(f"    - Processes: {pool_stats.get('processes', [])}")
            print(f"    - Writes: {pool_stats.get('writes', {})}")
            print(f"    - Max concurrency: {worker_stats.get('total', [])}")

    return stats

# Autoscale pool size (if supported)
def autoscale_pool(min_concurrency, max_concurrency):
    """Enable autoscaling for worker pools"""
    try:
        result = app.control.autoscale(min_concurrency, max_concurrency, reply=True)
        print(f"Set autoscaling ({min_concurrency}-{max_concurrency}):")
        for worker, response in result.items():
            status = "✓ OK" if response.get('ok') else "✗ FAIL"
            print(f"  {worker}: {status}")

        return result
    except Exception as e:
        print(f"Failed to set autoscaling: {e}")
        return None

# Shutdown workers gracefully
def shutdown_workers(timeout=30):
    """Shutdown all workers gracefully"""
    try:
        result = app.control.broadcast('shutdown', reply=True, timeout=timeout)
        print("Worker shutdown initiated:")
        for worker, response in result.items():
            status = "✓ OK" if response.get('ok') else "✗ FAIL"
            print(f"  {worker}: {status}")

        return result
    except Exception as e:
        print(f"Failed to shutdown workers: {e}")
        return None
```

❌ **Wrong: No remote control monitoring**
```python
# No visibility into worker status
# Difficult to debug production issues
# Cannot dynamically adjust worker behavior
# Manual intervention required for all management tasks
```

❌ **Wrong: Overusing broadcast commands**
```python
# Broadcasting expensive commands too frequently
app.control.broadcast('expensive_operation')
app.control.broadcast('another_expensive_operation')
# Can overwhelm workers with management overhead
```

**Common mistakes:**
- Not setting appropriate timeouts for control commands
- Broadcasting commands to all workers when targeting specific ones
- Not handling control command failures gracefully
- Performing expensive operations via control commands
- Not monitoring the impact of control commands on worker performance

**When to apply:**
- Production monitoring and troubleshooting
- Dynamic queue management and routing changes
- Emergency task revocation and termination
- Performance tuning and rate limit adjustments
- Worker maintenance and restart coordination

**Related rules:**
- `monitoring-health-checks`: Health monitoring integration
- `routing-task-distribution`: Runtime queue management
- `perf-concurrency-tuning`: Dynamic performance adjustment</content>
<parameter name="filePath">skills/celery-skill/rules/remote-control-inspection.md