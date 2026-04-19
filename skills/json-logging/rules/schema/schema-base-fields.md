# Base Log Schema Fields
**Impact:** CRITICAL - Ensures consistent, queryable log structure across all services and environments

**Problem:**
Inconsistent log formats make it impossible to correlate events, query logs effectively, or build reliable monitoring systems. Without standardized fields, log analysis becomes manual and error-prone, leading to missed issues and poor observability.

**Solution:**
Define and enforce a comprehensive base schema with standardized fields for all log entries, ensuring consistency across services, environments, and teams.

## ✅ Correct: Base log schema implementation

### 1. Required base fields for all logs
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

### 2. Field definitions and requirements
```typescript
interface BaseLogSchema {
  // Timestamp in ISO 8601 format (required)
  timestamp: string; // "2024-01-15T10:23:45.123Z"

  // Log level as lowercase string (required)
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";

  // Human-readable message (required)
  message: string;

  // Service identification (required)
  service: string; // "user-service", "payment-api"

  // Environment context (required)
  environment: "development" | "staging" | "production";

  // Service version (required)
  version: string; // "1.2.3", "v2.1.0"

  // Logger name/path (required)
  logger: string; // "auth.handlers", "database.connection"

  // Correlation and tracing (optional but recommended)
  correlation_id?: string; // Request correlation ID
  request_id?: string;     // HTTP request ID
  trace_id?: string;       // Distributed trace ID
  span_id?: string;        // Trace span ID

  // Infrastructure context
  host?: string;           // Hostname or pod name
  process_id?: number;     // Process ID
  thread_id?: string;      // Thread identifier

  // Error context (when applicable)
  error?: {
    type: string;          // Exception class name
    message: string;       // Error message
    stack_trace?: string;  // Formatted stack trace
    code?: string;         // Error code
  };

  // Performance context (when applicable)
  duration_ms?: number;    // Operation duration
  memory_mb?: number;      // Memory usage
  cpu_percent?: number;    // CPU usage
}
```

### 3. Python structlog base configuration
```python
import structlog
from pythonjsonlogger import jsonlogger
import logging

# Configure structlog for JSON output
shared_processors = [
    structlog.stdlib.filter_by_level,
    structlog.stdlib.add_logger_name,
    structlog.stdlib.add_log_level,
    structlog.stdlib.PositionalArgumentsFormatter(),
    structlog.processors.TimeStamper(fmt="iso"),
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
    structlog.processors.UnicodeDecoder(),
    structlog.processors.JSONRenderer()
]

structlog.configure(
    processors=shared_processors,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Standard logging configuration
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

# Add service context to all logs
logger = structlog.get_logger()
logger.bind(service="my-service", version="1.0.0", environment="production")
```

### 4. Application-specific field standards
```json
{
  "http": {
    "method": "GET",
    "url": "/api/users/123",
    "status_code": 200,
    "user_agent": "Mozilla/5.0...",
    "remote_ip": "192.168.1.100",
    "response_size_bytes": 1024,
    "duration_ms": 150
  },
  "database": {
    "operation": "SELECT",
    "table": "users",
    "query_duration_ms": 45,
    "rows_affected": 1,
    "connection_pool_size": 10,
    "connection_pool_active": 3
  },
  "business": {
    "user_id": "user-123",
    "action": "password_change",
    "resource": "user_profile",
    "outcome": "success"
  },
  "security": {
    "event_type": "authentication",
    "user_id": "user-123",
    "auth_method": "password",
    "success": true,
    "failure_reason": null
  }
}
```

### 5. Schema validation and enforcement
```python
from pydantic import BaseModel, validator
from typing import Optional, Dict, Any
import json

class LogEntry(BaseModel):
    # Required fields
    timestamp: str
    level: str
    message: str
    service: str
    environment: str
    version: str
    logger: str

    # Optional correlation fields
    correlation_id: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None

    # Infrastructure context
    host: Optional[str] = None
    process_id: Optional[int] = None

    # Additional context
    extra: Optional[Dict[str, Any]] = None

    @validator('level')
    def validate_level(cls, v):
        allowed_levels = {'trace', 'debug', 'info', 'warn', 'error', 'fatal'}
        if v.lower() not in allowed_levels:
            raise ValueError(f'Level must be one of {allowed_levels}')
        return v.lower()

    @validator('timestamp')
    def validate_timestamp(cls, v):
        # Validate ISO 8601 format
        from datetime import datetime
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('Timestamp must be in ISO 8601 format')
        return v

def validate_log_entry(log_data: dict) -> bool:
    """Validate log entry against schema"""
    try:
        LogEntry(**log_data)
        return True
    except Exception as e:
        logger.error("Invalid log entry", error=str(e), log_data=log_data)
        return False
```

## ❌ Incorrect: Poor schema design

```json
// Inconsistent field names across services
{
  "time": "2024-01-15T10:23:45.123Z",     // Should be "timestamp"
  "lvl": "INFO",                          // Should be "level" (lowercase)
  "msg": "User login successful",          // Should be "message"
  "serviceName": "user-service",           // Should be "service" (snake_case)
  "env": "prod",                          // Should be "environment"
  "ver": "1.2.3",                         // Should be "version"
  "requestId": "req-789-xyz-000"          // Should be "request_id"
}
```

```python
# Missing required fields
logger.info("User login successful")
# No timestamp, level, service, environment context
```

## Key Benefits
- **Queryability**: All logs can be searched and filtered consistently
- **Correlation**: Related events can be traced across services
- **Monitoring**: Standardized fields enable automated alerting
- **Analysis**: Consistent structure supports advanced analytics
- **Compliance**: Standardized fields meet audit requirements
- **Debugging**: Rich context makes issue resolution faster</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/schema/schema-base-fields.md