---
title: Error Retry Strategy
impact: HIGH
impactDescription: Ensures task reliability and system resilience
tags: celery, error, retry, strategy, reliability
---

## Error Retry Strategy

**Problem:**
Tasks can fail due to temporary issues like network timeouts, database locks, or external service unavailability. Without proper retry mechanisms, failed tasks are lost and systems become unreliable.

**Solution:**
Implement intelligent retry strategies with exponential backoff, maximum retry limits, and proper exception handling. Use different retry strategies for different types of failures.

**Examples:**

✅ **Correct: Intelligent retry with exponential backoff**
```python
from celery import shared_task
from requests.exceptions import RequestException, Timeout
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def api_data_sync(self, api_endpoint, data):
    """Task with intelligent retry strategy"""
    try:
        # Attempt API call
        response = requests.post(api_endpoint, json=data, timeout=30)

        if response.status_code == 429:  # Rate limited
            # Longer delay for rate limits
            raise self.retry(countdown=300, exc=Exception("Rate limited"))

        response.raise_for_status()
        return response.json()

    except Timeout:
        # Network timeout - retry with exponential backoff
        logger.warning(f"Timeout calling {api_endpoint}, retrying...")
        raise self.retry(countdown=min(300, 30 * (2 ** self.request.retries)))

    except RequestException as exc:
        # Other network errors - retry with shorter delay
        if self.request.retries < 3:
            logger.warning(f"Network error: {exc}, retrying...")
            raise self.retry(countdown=10 * (2 ** self.request.retries), exc=exc)
        else:
            logger.error(f"Persistent network error: {exc}")
            raise  # Give up after 3 retries

    except Exception as exc:
        # Unexpected errors - log and retry once more
        logger.error(f"Unexpected error in api_data_sync: {exc}")
        if self.request.retries == 0:
            raise self.retry(countdown=60, exc=exc)
        raise
```

✅ **Correct: Custom retry decorator for different error types**
```python
from functools import wraps
from celery.exceptions import MaxRetriesExceededError

def smart_retry(max_retries=3, base_delay=60):
    """Decorator for smart retry logic"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            task = args[0]  # self in bound task
            try:
                return func(*args, **kwargs)
            except Exception as exc:
                retry_config = get_retry_config(exc)

                if task.request.retries < retry_config['max_retries']:
                    raise task.retry(
                        countdown=retry_config['delay'],
                        exc=exc
                    )
                raise
        return wrapper
    return decorator

def get_retry_config(exception):
    """Determine retry configuration based on exception type"""
    if isinstance(exception, ConnectionError):
        return {'max_retries': 5, 'delay': 30}
    elif isinstance(exception, TimeoutError):
        return {'max_retries': 3, 'delay': 10}
    elif isinstance(exception, ValueError):
        return {'max_retries': 0, 'delay': 0}  # Don't retry validation errors
    else:
        return {'max_retries': 2, 'delay': 60}

@shared_task(bind=True)
@smart_retry()
def process_payment(self, payment_id):
    """Payment processing with smart retries"""
    # Implementation...
    pass
```

❌ **Wrong: Simple retry without intelligence**
```python
@shared_task(max_retries=3)
def unreliable_task():
    """Poor retry strategy"""
    # Will retry immediately on any failure
    # No consideration of error type or backoff
    # May overwhelm external services
    external_api_call()
```

**Common mistakes:**
- Using fixed retry delays without exponential backoff
- Not distinguishing between retryable and non-retryable errors
- Missing maximum retry limits leading to infinite retries
- Not logging retry attempts for debugging
- Ignoring task state when retrying

**When to apply:**
- Tasks that interact with external APIs or services
- Database operations that may encounter locks
- Network operations prone to timeouts
- Tasks with transient failure conditions
- Critical business operations requiring reliability

**Related rules:**
- `task-atomic-operations`: Ensuring tasks are safe to retry
- `error-exception-handling`: Proper exception categorization
- `monitoring-task-tracking`: Tracking retry behavior</content>
<parameter name="filePath">skills/celery-skill/rules/error-retry-strategy.md