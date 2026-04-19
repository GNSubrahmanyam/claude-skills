# Log Schema Design Patterns

## Standard Base Fields

Every log entry should include these core fields for consistency and queryability:

```json
{
  "timestamp": "2024-01-15T10:23:45.123Z",
  "level": "info",
  "service": "user-service",
  "environment": "production",
  "version": "1.2.3",
  "message": "User login successful",
  "logger": "auth.handlers",
  "correlation_id": "abc-123-def-456",
  "request_id": "req-789-xyz-000",
  "trace_id": "trace-111-222-333",
  "span_id": "span-444-555-666",
  "host": "web-01.prod.example.com",
  "process_id": 1234,
  "thread_id": "MainThread"
}
```

## Application-Specific Fields

### HTTP Request/Response
```json
{
  "http": {
    "method": "POST",
    "url": "/api/users",
    "status_code": 201,
    "user_agent": "Mozilla/5.0...",
    "remote_ip": "192.168.1.100",
    "request_size_bytes": 1024,
    "response_size_bytes": 512,
    "duration_ms": 150
  }
}
```

### Database Operations
```json
{
  "database": {
    "operation": "SELECT",
    "table": "users",
    "query": "SELECT * FROM users WHERE active = ?",
    "parameters": [true],
    "duration_ms": 45,
    "rows_affected": 150,
    "connection_pool_active": 3,
    "connection_pool_idle": 7
  }
}
```

### Business Logic
```json
{
  "business": {
    "user_id": "user-123",
    "action": "password_change",
    "resource": "user_profile",
    "outcome": "success",
    "metadata": {
      "ip_address": "192.168.1.100",
      "user_agent": "Chrome/91.0",
      "session_duration_minutes": 45
    }
  }
}
```

### Error Context
```json
{
  "error": {
    "type": "ValidationError",
    "message": "Email format invalid",
    "code": "VALIDATION_ERROR",
    "field": "email",
    "value": "invalid-email",
    "stack_trace": "Traceback (most recent call last):\n  File...",
    "context": {
      "user_id": "user-123",
      "endpoint": "/api/users",
      "request_id": "req-789"
    }
  }
}
```

### Performance Metrics
```json
{
  "performance": {
    "operation": "user_registration",
    "duration_ms": 1250,
    "memory_usage_mb": 45.6,
    "cpu_percent": 12.3,
    "database_queries": 3,
    "external_calls": 2,
    "cache_hits": 8,
    "cache_misses": 2
  }
}
```

## Naming Conventions

### Field Names
- Use `snake_case` for all field names
- Be descriptive but concise
- Use consistent prefixes for related fields
- Avoid abbreviations unless universally understood

### Good Examples
```json
{
  "user_id": "12345",
  "request_duration_ms": 150,
  "database_connection_pool_size": 10,
  "cache_hit_ratio": 0.85
}
```

### Bad Examples
```json
{
  "userId": "12345",           // camelCase inconsistent
  "reqDur": 150,              // Abbreviation unclear
  "dbConnPoolSz": 10,         // Cryptic abbreviation
  "cacheHit%": 0.85           // Special characters
}
```

## Data Types

### Required Types
- `timestamp`: ISO 8601 string
- `level`: Lowercase string ("trace", "debug", "info", "warn", "error", "fatal")
- `message`: Human-readable string
- `service`: String identifier
- `environment`: String ("development", "staging", "production")

### Optional Types
- `correlation_id`: String UUID
- `request_id`: String identifier
- `trace_id`: String (OpenTelemetry format)
- `span_id`: String (OpenTelemetry format)
- `host`: String hostname
- `process_id`: Integer
- `thread_id`: String
- `user_id`: String (hashed for privacy)
- `duration_ms`: Number
- `status_code`: Integer

## Cardinality Considerations

### Low Cardinality Fields (Good for grouping/filtering)
```json
{
  "service": "user-service",
  "environment": "production",
  "level": "error",
  "http_method": "POST",
  "status_code": 200
}
```

### High Cardinality Fields (Use carefully)
```json
{
  "request_id": "req-abc-123",     // Many unique values
  "user_id": "user-456",           // Many unique users
  "timestamp": "2024-01-15T10:23:45.123Z",  // Many unique times
  "url": "/api/users/123/profile"  // Many unique URLs
}
```

## Schema Evolution

### Versioning Strategy
```json
{
  "schema_version": "1.0",
  "timestamp": "2024-01-15T10:23:45.123Z",
  "level": "info",
  "message": "User login successful",
  // v1.0 fields
  "user_id": "12345",
  // v1.1 additions
  "login_method": "password",
  "mfa_used": true
}
```

### Backward Compatibility
- Add new fields as optional
- Never remove required fields
- Use version field to handle breaking changes
- Document schema changes

## Organization Standards

### Cross-Service Consistency
```json
// All services should use these exact field names
{
  "timestamp": "ISO_8601_string",
  "level": "lowercase_string",
  "service": "service_name",
  "environment": "env_name",
  "version": "semantic_version",
  "message": "human_readable_message",
  "correlation_id": "uuid_string",
  "request_id": "unique_string",
  "user_id": "identifier_string",
  "error": {
    "type": "error_class",
    "message": "error_description",
    "code": "error_code"
  }
}
```

### Domain-Specific Extensions
```json
// E-commerce service
{
  "business": {
    "order_id": "order-123",
    "customer_id": "cust-456",
    "total_amount": 99.99,
    "currency": "USD",
    "items_count": 3
  }
}

// Payment service
{
  "business": {
    "transaction_id": "txn-789",
    "payment_method": "credit_card",
    "amount": 99.99,
    "currency": "USD",
    "status": "completed"
  }
}
```

## Implementation Examples

### Python (structlog)
```python
import structlog

# Configure with standard schema
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso", key="timestamp"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Standard log entry
logger.info(
    "User login successful",
    service="auth-service",
    environment="production",
    version="1.2.3",
    user_id="user-123",
    correlation_id="abc-123-def",
    http={
        "method": "POST",
        "url": "/api/login",
        "status_code": 200,
        "duration_ms": 150
    }
)
```

### JavaScript (Winston)
```javascript
const winston = require('winston');

// Configure with standard schema
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'ISO' }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'user-service',
    environment: 'production',
    version: '1.2.3'
  },
  transports: [new winston.transports.Console()]
});

// Standard log entry
logger.info('User login successful', {
  user_id: 'user-123',
  correlation_id: 'abc-123-def',
  http: {
    method: 'POST',
    url: '/api/login',
    status_code: 200,
    duration_ms: 150
  }
});
```

### Go (logrus)
```go
package main

import (
    "github.com/sirupsen/logrus"
)

func init() {
    // Configure JSON formatter with standard fields
    logrus.SetFormatter(&logrus.JSONFormatter{
        TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
    })

    // Set standard fields
    logrus.WithFields(logrus.Fields{
        "service": "user-service",
        "environment": "production",
        "version": "1.2.3",
    }).Logger.SetLevel(logrus.InfoLevel)
}

// Usage
logrus.WithFields(logrus.Fields{
    "user_id": "user-123",
    "correlation_id": "abc-123-def",
    "http": map[string]interface{}{
        "method": "POST",
        "url": "/api/login",
        "status_code": 200,
        "duration_ms": 150,
    },
}).Info("User login successful")
```

## Validation and Enforcement

### Schema Validation
```python
from pydantic import BaseModel, validator
from typing import Optional, Dict, Any
from datetime import datetime

class LogEntry(BaseModel):
    # Required fields
    timestamp: str
    level: str
    message: str
    service: str
    environment: str
    version: str

    # Optional fields
    correlation_id: Optional[str] = None
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    host: Optional[str] = None
    process_id: Optional[int] = None

    # Custom fields
    extra: Optional[Dict[str, Any]] = None

    @validator('level')
    def validate_level(cls, v):
        allowed = {'trace', 'debug', 'info', 'warn', 'error', 'fatal'}
        if v.lower() not in allowed:
            raise ValueError(f'Level must be one of {allowed}')
        return v.lower()

    @validator('timestamp')
    def validate_timestamp(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('Timestamp must be ISO 8601 format')
        return v

def validate_log_entry(entry: Dict[str, Any]) -> bool:
    """Validate log entry against schema"""
    try:
        LogEntry(**entry)
        return True
    except Exception as e:
        print(f"Invalid log entry: {e}")
        return False
```

## Best Practices Summary

1. **Consistency First**: Use identical field names across all services
2. **ISO 8601 Timestamps**: Always use standardized timestamp format
3. **Lowercase Levels**: Use consistent log level strings
4. **Correlation IDs**: Include for request tracing
5. **Structured Context**: Nest related data in objects
6. **Cardinality Awareness**: Avoid high-cardinality fields in indexed fields
7. **Versioning**: Include schema version for evolution
8. **Validation**: Validate schema compliance in CI/CD
9. **Documentation**: Maintain schema documentation
10. **Evolution**: Add fields, don't remove them</content>
<parameter name="filePath">skills/structured-json-logging-skill/references/log-schema-design.md