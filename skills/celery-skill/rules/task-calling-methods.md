# Task Calling Methods (HIGH)

**Impact:** HIGH - Ensures proper task execution and result handling

**Problem:**
Different calling methods have different behaviors and performance implications. Using the wrong method can lead to unexpected blocking, lost results, or performance issues.

**Solution:**
Choose the appropriate calling method based on your needs: delay() for fire-and-forget, apply_async() for advanced options, and call() for synchronous execution.

**Examples:**

✅ **Correct: Fire-and-forget with delay()**
```python
# Simple async execution - no result needed
@app.task
def send_email(user_id, template):
    # Implementation...
    pass

# Call asynchronously
send_email.delay(user_id=123, template='welcome')
```

✅ **Correct: Advanced options with apply_async()**
```python
# Advanced execution options
result = send_email.apply_async(
    args=[user_id, template],
    kwargs={'priority': 'high'},
    countdown=60,  # Delay execution by 60 seconds
    expires=3600,  # Expire if not executed within 1 hour
    retry=True,
    retry_policy={
        'max_retries': 3,
        'interval_start': 0,
        'interval_step': 0.2,
        'interval_max': 0.5,
    },
    queue='email_queue',
    priority=9,  # Higher priority (0-9, 9 is highest)
)
```

✅ **Correct: Synchronous execution with call()**
```python
# Synchronous execution for testing or immediate results
@app.task
def calculate_total(items):
    return sum(item.price for item in items)

# Execute synchronously
total = calculate_total.call(items)
# or
total = calculate_total(items)  # Direct call
```

❌ **Wrong: Blocking on delay()**
```python
# Don't do this - blocks until task completes
result = send_email.delay(user_id, template)
result.get()  # Blocks! Use apply_async() instead
```

**Common mistakes:**
- Using delay() when you need execution options
- Calling get() on delay() results causing blocking
- Not handling timeouts when waiting for results
- Ignoring priority and queue routing options
- Using synchronous call() in production code

**When to apply:**
- Choosing between delay(), apply_async(), and call()
- Implementing different execution patterns (sync vs async)
- Setting up task priorities and routing
- Handling delayed execution and expiration
- Implementing retry policies at call time

**Related rules:**
- `task-timeout-management`: Handling execution timeouts
- `routing-task-distribution`: Queue and routing configuration
- `result-backend-selection`: Result handling strategies</content>
<parameter name="filePath">skills/celery-skill/rules/task-calling-methods.md