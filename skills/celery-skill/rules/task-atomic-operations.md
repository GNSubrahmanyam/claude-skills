# Task Atomic Operations (CRITICAL)

**Impact:** CRITICAL - Prevents data corruption and ensures task reliability

**Problem:**
Non-atomic tasks can leave systems in inconsistent states when failures occur midway through execution. Distributed task processing increases the risk of partial completion and data corruption.

**Solution:**
Design tasks to be atomic - either complete fully or not at all. Use transactions, idempotency keys, and proper error handling to ensure task reliability.

**Examples:**

✅ **Correct: Atomic task with transaction**
```python
from django.db import transaction
from celery import shared_task

@shared_task(bind=True, max_retries=3)
def process_order_payment(self, order_id, payment_data):
    """Atomic payment processing task"""
    try:
        with transaction.atomic():
            # Lock the order for processing
            order = Order.objects.select_for_update().get(id=order_id)

            if order.status != 'pending':
                return f"Order {order_id} already processed"

            # Process payment
            payment_result = payment_gateway.charge(payment_data)

            # Update order status
            order.status = 'paid' if payment_result.success else 'failed'
            order.payment_id = payment_result.transaction_id
            order.save()

            # Send confirmation email
            send_payment_confirmation.delay(order.customer_email, order.id)

            return f"Payment processed for order {order_id}"

    except Exception as exc:
        # Log error and retry
        logger.error(f"Payment processing failed for order {order_id}: {exc}")
        raise self.retry(countdown=60 * (2 ** self.request.retries), exc=exc)
```

✅ **Correct: Idempotent task design**
```python
@shared_task(bind=True)
def update_user_stats(self, user_id, idempotency_key):
    """Idempotent task using idempotency key"""
    # Check if this operation was already performed
    cache_key = f"user_stats_update_{user_id}_{idempotency_key}"
    if cache.get(cache_key):
        logger.info(f"Skipping duplicate stats update for user {user_id}")
        return "Already processed"

    try:
        # Perform the update
        user = User.objects.get(id=user_id)
        user.login_count += 1
        user.last_login = timezone.now()
        user.save()

        # Mark as processed (expires in 24 hours)
        cache.set(cache_key, True, 86400)

        return f"Updated stats for user {user_id}"

    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return f"User {user_id} not found"
```

❌ **Wrong: Non-atomic task with partial updates**
```python
@shared_task
def process_user_registration(user_data):
    """Dangerous: partial updates without atomicity"""
    # Create user
    user = User.objects.create(
        email=user_data['email'],
        name=user_data['name']
    )

    # Send welcome email (what if this fails?)
    send_welcome_email(user.email)

    # Create user profile (what if this fails?)
    UserProfile.objects.create(
        user=user,
        preferences=user_data.get('preferences', {})
    )

    # If any step fails, we have inconsistent data!
    return "Registration complete"
```

**Common mistakes:**
- Performing multiple database operations without transactions
- Not handling partial failures in complex tasks
- Missing idempotency checks for retryable operations
- Not using select_for_update for concurrent operations
- Ignoring task state when resuming after failures

**When to apply:**
- Designing new Celery tasks
- Refactoring existing tasks for reliability
- Handling payments, orders, or financial operations
- Processing user data or account modifications
- Implementing complex business logic tasks

**Related rules:**
- `error-retry-strategy`: Retry mechanisms for failed tasks
- `task-timeout-management`: Preventing runaway tasks
- `task-state-management`: Tracking task execution state</content>
<parameter name="filePath">skills/celery-skill/rules/task-atomic-operations.md