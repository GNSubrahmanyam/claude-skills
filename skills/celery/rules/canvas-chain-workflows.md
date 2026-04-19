# Canvas Chain Workflows (HIGH)

**Impact:** HIGH - Enables sequential task execution and error propagation

**Problem:**
Complex business processes require tasks to execute in sequence, with each task depending on the result of the previous one. Without proper chaining, workflows become error-prone and hard to manage.

**Solution:**
Use Celery's chain primitive to create sequential workflows where each task receives the result of the previous task as input.

**Examples:**

✅ **Correct: Simple sequential chain**
```python
from celery import chain

# Chain: validate -> process -> notify
@app.task
def validate_data(data):
    # Validate input data
    if not data.get('user_id'):
        raise ValueError("user_id required")
    return data

@app.task
def process_user_data(validated_data):
    # Process the validated data
    user = User.objects.get(id=validated_data['user_id'])
    user.processed_at = timezone.now()
    user.save()
    return {'user_id': user.id, 'processed': True}

@app.task
def send_notification(result):
    # Send notification with results
    send_email(
        to=result['user_id'],
        subject="Data processed successfully",
        body=f"Processed: {result['processed']}"
    )

# Create and execute chain
workflow = chain(
    validate_data.s(),
    process_user_data.s(),
    send_notification.s()
)

# Execute with data
result = workflow.delay({'user_id': 123, 'data': '...'})
```

✅ **Correct: Chain with partial arguments**
```python
# Chain with mixed arguments
cleanup_task = chain(
    validate_data.s(),  # Gets full result from previous
    process_user_data.s(),  # Gets full result from validate_data
    send_notification.s('custom_arg')  # Prepends 'custom_arg' to result
)

# Result flow: validate_data() -> process_user_data(result) -> send_notification('custom_arg', result)
```

✅ **Correct: Chain with error handling**
```python
from celery import chain

@app.task(bind=True)
def safe_validate_data(self, data):
    try:
        # Validation logic
        if not data.get('email'):
            raise ValueError("Email required")
        return data
    except Exception as exc:
        # Log error and re-raise
        logger.error(f"Validation failed: {exc}")
        raise self.retry(countdown=60, exc=exc)

@app.task(bind=True)
def safe_process_data(self, validated_data):
    try:
        # Processing logic
        return process_data(validated_data)
    except Exception as exc:
        logger.error(f"Processing failed: {exc}")
        raise

# Chain with error handling
workflow = chain(
    safe_validate_data.s(),
    safe_process_data.s()
).on_error(handle_chain_error.s())

@app.task
def handle_chain_error(request, exc, traceback, args, kwargs):
    """Handle chain execution errors"""
    logger.error(f"Chain failed: {exc}")
    # Send alert, cleanup, etc.
    send_admin_alert(f"Workflow failed: {exc}")
```

❌ **Wrong: Manual sequential execution**
```python
# Don't do this - error-prone and doesn't handle failures well
def process_workflow(data):
    try:
        validated = validate_data(data)
        processed = process_user_data(validated)
        send_notification(processed)
    except Exception as e:
        # Manual error handling - easy to miss
        logger.error(f"Workflow failed: {e}")
        # No retry logic, no proper error propagation
```

**Common mistakes:**
- Not handling exceptions in chain elements
- Assuming all tasks will complete successfully
- Missing error callbacks for chain failures
- Not considering partial argument passing
- Creating overly complex chains

**When to apply:**
- Sequential business processes
- Data processing pipelines
- Multi-step operations with dependencies
- ETL workflows
- User onboarding flows
- Order processing workflows

**Related rules:**
- `canvas-group-parallel`: Parallel execution patterns
- `canvas-chord-synchronization`: Synchronization patterns
- `error-retry-strategy`: Error handling in workflows</content>
<parameter name="filePath">skills/celery-skill/rules/canvas-chain-workflows.md