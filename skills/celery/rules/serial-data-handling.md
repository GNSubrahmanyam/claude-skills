---
title: Serialization Data Handling
impact: MEDIUM
impactDescription: Ensures reliable data transmission and storage
tags: celery, serialization, data-handling, message-broker
---

## Serialization Data Handling

**Problem:**
Improper serialization can lead to data corruption, compatibility issues, or security vulnerabilities when passing complex objects through Celery's message broker.

**Solution:**
Choose appropriate serializers and handle complex data types properly. Configure serialization consistently across all Celery components.

**Examples:**

✅ **Correct: Serialization configuration**
```python
# Choose appropriate serializer based on use case
app.conf.task_serializer = 'json'        # Default, human-readable
app.conf.result_serializer = 'json'      # For result compatibility
app.conf.accept_content = ['json']       # Accepted content types

# For complex Python objects (use with caution)
app.conf.task_serializer = 'pickle'
app.conf.result_serializer = 'pickle'
app.conf.accept_content = ['pickle', 'json']

# Compression for large messages
app.conf.task_compression = 'gzip'       # Compress task messages
app.conf.result_compression = 'gzip'     # Compress results
```

✅ **Correct: Custom serializer for domain objects**
```python
from kombu.serialization import register
from myapp.models import User, Order

class DomainSerializer:
    """Custom serializer for domain objects"""

    def serialize(self, data):
        """Convert domain objects to serializable format"""
        if isinstance(data, User):
            return {
                '_type': 'User',
                'id': data.id,
                'email': data.email,
                'name': data.name,
            }
        elif isinstance(data, Order):
            return {
                '_type': 'Order',
                'id': data.id,
                'user_id': data.user_id,
                'total': str(data.total),  # Decimal to string
                'items': [item.id for item in data.items.all()],
            }
        elif isinstance(data, dict) and '_type' in data:
            # Already serialized
            return data
        else:
            # Fallback for other types
            return data

    def deserialize(self, data):
        """Convert back to domain objects"""
        if isinstance(data, dict) and '_type' in data:
            obj_type = data['_type']
            if obj_type == 'User':
                # Lazy loading - only load when needed
                return UserLazyLoader(data['id'])
            elif obj_type == 'Order':
                return OrderLazyLoader(data['id'])
        return data

class UserLazyLoader:
    """Lazy loader for User objects"""
    def __init__(self, user_id):
        self.user_id = user_id
        self._user = None

    def get_user(self):
        if self._user is None:
            self._user = User.objects.get(id=self.user_id)
        return self._user

    def __getattr__(self, name):
        return getattr(self.get_user(), name)

# Register custom serializer
domain_serializer = DomainSerializer()
register(
    'domain',
    domain_serializer.serialize,
    domain_serializer.deserialize,
    content_type='application/x-domain',
    content_encoding='utf-8'
)

# Use custom serializer for specific tasks
@app.task(serializer='domain')
def process_user_order(user, order):
    """Task using custom serialization"""
    # user and order are automatically deserialized
    total = user.calculate_discount(order)
    return total
```

✅ **Correct: Safe serialization practices**
```python
import json
from datetime import datetime, date
from decimal import Decimal

class SafeJSONEncoder(json.JSONEncoder):
    """Safe JSON encoder for Celery messages"""

    def default(self, obj):
        if isinstance(obj, datetime):
            return {'_type': 'datetime', 'value': obj.isoformat()}
        elif isinstance(obj, date):
            return {'_type': 'date', 'value': obj.isoformat()}
        elif isinstance(obj, Decimal):
            return {'_type': 'decimal', 'value': str(obj)}
        elif hasattr(obj, '__dict__'):
            # Convert objects to dicts
            return {'_type': 'object', 'class': obj.__class__.__name__, 'data': obj.__dict__}
        return super().default(obj)

class SafeJSONDecoder(json.JSONDecoder):
    """Safe JSON decoder for Celery messages"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, object_hook=self.object_hook, **kwargs)

    def object_hook(self, obj):
        if isinstance(obj, dict) and '_type' in obj:
            obj_type = obj['_type']
            if obj_type == 'datetime':
                return datetime.fromisoformat(obj['value'])
            elif obj_type == 'date':
                return date.fromisoformat(obj['value'])
            elif obj_type == 'decimal':
                return Decimal(obj['value'])
            elif obj_type == 'object':
                # Reconstruct object (basic implementation)
                class_name = obj['class']
                data = obj['data']
                # Note: This is simplified - real implementation would need class registry
                return data
        return obj

# Use safe JSON serialization
app.conf.task_serializer = 'json'
app.conf.result_serializer = 'json'
app.conf.accept_content = ['json']

# Custom encoder/decoder can be integrated with kombu
```

❌ **Wrong: Using pickle for untrusted data**
```python
# Security risk - pickle can execute arbitrary code
app.conf.task_serializer = 'pickle'
app.conf.accept_content = ['pickle']

# Dangerous: Malicious pickle data can compromise workers
# Only use pickle for trusted, internal communication
```

❌ **Wrong: Incompatible serialization**
```python
# Task sends pickle, worker expects JSON
app.conf.task_serializer = 'pickle'
app.conf.accept_content = ['json']  # Mismatch!

# Tasks will fail with serialization errors
```

**Common mistakes:**
- Using pickle for external or untrusted data
- Not configuring accept_content properly
- Ignoring serialization performance implications
- Not handling complex object serialization
- Mixing different serializers in the same application

**When to apply:**
- Configuring new Celery applications
- Handling complex data types in tasks
- Implementing custom object serialization
- Optimizing message size with compression
- Ensuring compatibility across different environments

**Related rules:**
- `security-data-encryption`: Encrypting sensitive serialized data
- `perf-message-compression`: Compressing large messages
- `result-backend-selection`: Result serialization compatibility</content>
<parameter name="filePath">skills/celery-skill/rules/serial-data-handling.md