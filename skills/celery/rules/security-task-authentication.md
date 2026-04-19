---
title: Security Task Authentication
impact: MEDIUM-HIGH
impactDescription: Prevents unauthorized task execution and access
tags: celery, security, task, authentication, authorization
---

## Security Task Authentication

**Problem:**
Celery tasks can be invoked from various sources, and without proper authentication, malicious actors could execute tasks or access sensitive operations. Tasks often handle sensitive data or perform privileged operations.

**Solution:**
Implement task-level authentication and authorization checks. Use secure communication channels and validate task parameters.

**Examples:**

✅ **Correct: Task signature validation**
```python
import hmac
import hashlib
from celery import shared_task
from django.core.exceptions import PermissionDenied

def generate_task_signature(task_name, args, secret_key):
    """Generate HMAC signature for task authentication"""
    message = f"{task_name}:{str(sorted(args))}"
    return hmac.new(
        secret_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

def verify_task_signature(task_name, args, signature, secret_key):
    """Verify task signature"""
    expected = generate_task_signature(task_name, args, secret_key)
    return hmac.compare_digest(expected, signature)

@shared_task(bind=True)
def secure_process_payment(self, user_id, amount, signature):
    """Payment processing with signature verification"""
    # Verify signature before processing payment
    if not verify_task_signature(
        self.name,
        [user_id, amount],
        signature,
        settings.CELERY_SECRET_KEY
    ):
        logger.error(f"Invalid signature for payment task: {user_id}")
        raise PermissionDenied("Invalid task signature")

    # Process payment securely
    return process_payment(user_id, amount)

# Usage with signature
signature = generate_task_signature(
    'myapp.tasks.secure_process_payment',
    [123, 99.99],
    settings.CELERY_SECRET_KEY
)

secure_process_payment.delay(123, 99.99, signature)
```

✅ **Correct: Role-based task authorization**
```python
from enum import Enum

class TaskPermission(Enum):
    PUBLIC = 'public'
    USER = 'user'
    ADMIN = 'admin'
    SYSTEM = 'system'

class SecureTaskMixin:
    """Mixin for secure task authorization"""

    permission_required = TaskPermission.USER

    def authorize_request(self, request):
        """Authorize the task request"""
        if self.permission_required == TaskPermission.PUBLIC:
            return True

        # Extract user context from request
        user_id = getattr(request, 'user_id', None)
        user_role = getattr(request, 'user_role', None)

        if not user_id:
            logger.warning("No user context in task request")
            return False

        # Check permissions
        if self.permission_required == TaskPermission.USER:
            return user_role in ['user', 'admin', 'system']
        elif self.permission_required == TaskPermission.ADMIN:
            return user_role in ['admin', 'system']
        elif self.permission_required == TaskPermission.SYSTEM:
            return user_role == 'system'

        return False

class AuthorizedTask(SecureTaskMixin, app.Task):
    """Base task class with authorization"""

    def __call__(self, *args, **kwargs):
        # Custom authorization check
        if hasattr(self.request, 'user_id'):
            if not self.authorize_request(self.request):
                raise PermissionDenied(
                    f"Insufficient permissions for task {self.name}"
                )
        return super().__call__(*args, **kwargs)

@app.task(base=AuthorizedTask, permission_required=TaskPermission.ADMIN)
def delete_user_account(user_id):
    """Admin-only task to delete user accounts"""
    # Implementation
    pass

@app.task(base=AuthorizedTask, permission_required=TaskPermission.USER)
def update_user_profile(user_id, profile_data):
    """User task to update their own profile"""
    # Verify user can only update their own profile
    if str(self.request.user_id) != str(user_id):
        raise PermissionDenied("Cannot update other user's profile")
    # Implementation
    pass
```

✅ **Correct: Secure broker communication**
```python
# Use TLS/SSL for broker connections
app.conf.broker_url = 'amqps://user:password@rabbitmq.example.com:5671/vhost'

# Redis with TLS
app.conf.broker_url = 'rediss://user:password@redis.example.com:6380/0'

# Additional security options
app.conf.broker_transport_options = {
    'ssl': {
        'ca_certs': '/etc/ssl/certs/ca.pem',
        'certfile': '/etc/ssl/certs/client.pem',
        'keyfile': '/etc/ssl/private/client.key',
        'cert_reqs': ssl.CERT_REQUIRED,
    },
    'login_method': 'EXTERNAL',  # Certificate-based auth
}

# Network security
app.conf.broker_connection_timeout = 30
app.conf.broker_connection_retry = True
app.conf.broker_connection_max_retries = 10
app.conf.broker_failover_strategy = 'round-robin'
```

❌ **Wrong: No authentication on sensitive tasks**
```python
@shared_task
def delete_all_user_data():
    """Dangerous - no authentication!"""
    User.objects.all().delete()  # Anyone can call this!

# Any client with broker access can execute this
delete_all_user_data.delay()
```

❌ **Wrong: Insufficient input validation**
```python
@shared_task
def execute_sql_query(sql_query):
    """Dangerous - no validation!"""
    with connection.cursor() as cursor:
        cursor.execute(sql_query)  # SQL injection risk!

# Malicious query execution possible
execute_sql_query.delay("DROP TABLE users; --")
```

**Common mistakes:**
- Not authenticating task execution requests
- Missing authorization checks for sensitive operations
- Using insecure broker connections
- Not validating task input parameters
- Storing secrets in task messages

**When to apply:**
- Tasks handling sensitive data (payments, PII)
- Administrative or destructive operations
- Cross-tenant operations in multi-tenant systems
- Tasks requiring specific user permissions
- Production deployments with external access

**Related rules:**
- `serial-data-handling`: Safe data serialization
- `security-data-encryption`: Encrypting sensitive task data
- `security-network-security`: Secure broker connections</content>
<parameter name="filePath">skills/celery-skill/rules/security-task-authentication.md