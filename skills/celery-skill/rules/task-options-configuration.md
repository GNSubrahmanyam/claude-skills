# Task Options and Configuration (HIGH)

**Impact:** HIGH - Ensures proper task behavior and reliability

**Problem:**
Celery tasks have many configuration options that control behavior, but using defaults can lead to unexpected behavior, performance issues, or reliability problems in production.

**Solution:**
Configure task options appropriately based on use case requirements, including retry behavior, timeouts, naming, and execution parameters.

**Examples:**

✅ **Correct: Comprehensive task configuration**
```python
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded

@shared_task(
    # Task identity and naming
    name='myapp.tasks.process_user_data',
    bind=True,  # Bind task instance to first argument

    # Retry configuration
    max_retries=3,
    default_retry_delay=60,  # 1 minute
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=600,  # Max 10 minutes

    # Time limits
    time_limit=3600,      # Hard limit: 1 hour
    soft_time_limit=3300, # Soft limit: 55 minutes

    # Execution options
    acks_late=True,       # Acknowledge after execution
    reject_on_worker_lost=True,  # Don't requeue on worker crash

    # Result handling
    ignore_result=False,  # Store results
    store_errors_even_if_ignored=True,

    # Serialization
    serializer='json',
    compression='gzip',

    # Routing
    queue='default',
    routing_key='myapp.process_user_data',

    # Rate limiting
    rate_limit='100/m',   # 100 tasks per minute

    # Priority (RabbitMQ only)
    priority=5,  # 0-9, higher is more important

    # Expiration
    expires=86400,  # Expire after 24 hours if not executed
)
def process_user_data(self, user_id, data):
    """Comprehensive task configuration example"""
    try:
        # Task logic here
        user = User.objects.get(id=user_id)

        # Handle soft time limit
        try:
            result = process_data_with_timeout(data)
        except SoftTimeLimitExceeded:
            logger.warning(f"Soft time limit exceeded for user {user_id}")
            # Cleanup and save progress
            save_partial_progress(user_id, data)
            raise self.retry(countdown=300)  # Retry in 5 minutes

        return result

    except Exception as exc:
        logger.error(f"Task failed for user {user_id}: {exc}")
        raise
```

✅ **Correct: Task options for different use cases**
```python
# Fast, fire-and-forget task
@shared_task(
    name='send_email',
    bind=False,
    max_retries=0,  # Don't retry - emails are idempotent
    time_limit=30,  # Should be quick
    ignore_result=True,  # Don't store results
    queue='email'
)
def send_email(to, subject, body):
    """Email sending task - fast and fire-and-forget"""
    email_backend.send(to, subject, body)

# Critical financial operation
@shared_task(
    name='process_payment',
    bind=True,
    max_retries=2,
    default_retry_delay=300,  # 5 minutes between retries
    time_limit=600,  # 10 minutes max
    soft_time_limit=540,  # 9 minutes
    acks_late=True,  # Ensure execution completes
    reject_on_worker_lost=True,  # Don't lose payments
    queue='payments',
    priority=9,  # High priority
    rate_limit='10/m'  # Throttle payment processing
)
def process_payment(self, payment_id, amount):
    """Payment processing - critical and rate-limited"""
    try:
        payment = Payment.objects.select_for_update().get(id=payment_id)

        if payment.status == 'completed':
            return "Already processed"

        # Process payment with timeout handling
        result = payment_gateway.charge(amount)

        payment.status = 'completed' if result.success else 'failed'
        payment.save()

        return result

    except SoftTimeLimitExceeded:
        # Payment might be in progress, check status
        payment.refresh_from_db()
        if payment.status == 'processing':
            # Mark as failed and retry
            payment.status = 'failed'
            payment.save()
            raise self.retry(countdown=600)  # Retry in 10 minutes

        raise  # Don't retry if already processed

# Long-running data processing
@shared_task(
    name='process_large_dataset',
    bind=True,
    max_retries=1,  # Only retry once for long tasks
    time_limit=7200,  # 2 hours
    soft_time_limit=6900,  # 1.95 hours
    acks_late=True,
    reject_on_worker_lost=False,  # Can restart long tasks
    queue='data_processing',
    priority=1,  # Lower priority
    track_started=True  # Track when task starts
)
def process_large_dataset(self, dataset_id):
    """Long-running data processing task"""
    dataset = Dataset.objects.get(id=dataset_id)

    # Update progress
    total_records = dataset.records.count()
    processed = 0

    for record in dataset.records.iterator():
        # Check for abortion
        if self.is_aborted():
            logger.info(f"Task aborted for dataset {dataset_id}")
            dataset.status = 'cancelled'
            dataset.save()
            return "Cancelled"

        # Process record
        process_record(record)
        processed += 1

        # Update progress every 100 records
        if processed % 100 == 0:
            self.update_state(
                state='PROGRESS',
                meta={'current': processed, 'total': total_records}
            )

    dataset.status = 'completed'
    dataset.processed_at = timezone.now()
    dataset.save()

    return {'processed': processed, 'total': total_records}
```

❌ **Wrong: Task with poor defaults**
```python
@shared_task  # Uses all defaults - problematic for production
def process_payment(payment_id):
    """Task with no explicit configuration"""
    # max_retries defaults to 3 - may retry payments inappropriately
    # time_limit defaults to None - can run forever
    # acks_late defaults to False - messages lost if worker crashes
    # No rate limiting, priority, or queue specification
    payment = Payment.objects.get(id=payment_id)
    # Process payment...
```

**Common mistakes:**
- Not setting appropriate time limits for tasks
- Using default retry behavior without consideration
- Not configuring acks_late for important tasks
- Missing rate limits for resource-intensive tasks
- Not specifying queues for proper task routing
- Using default task names that may conflict

**When to apply:**
- Defining new Celery tasks
- Configuring existing tasks for production
- Optimizing task performance and reliability
- Implementing proper error handling and retries
- Setting up task priorities and resource management

**Related rules:**
- `task-atomic-operations`: Ensuring tasks work with retry options
- `error-retry-strategy`: Configuring retry behavior appropriately
- `routing-task-distribution`: Setting up proper queue routing</content>
<parameter name="filePath">skills/celery-skill/rules/task-options-configuration.md