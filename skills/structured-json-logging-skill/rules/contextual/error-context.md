# Error Context Logging
**Impact:** HIGH - Enables comprehensive error analysis and debugging across distributed systems

**Problem:**
Errors logged without sufficient context make debugging nearly impossible. Missing stack traces, request context, environmental factors, and error chains prevent developers from understanding root causes. Without structured error context, teams waste hours reproducing issues and implementing fixes.

**Solution:**
Implement comprehensive error context logging that captures exception details, request context, environmental factors, and error propagation chains for effective debugging and monitoring.

## ✅ Correct: Error context implementation

### 1. Exception and error details
```json
{
  "error": {
    "type": "ValueError",
    "message": "Invalid email format: user@invalid",
    "code": "VALIDATION_ERROR",
    "module": "user_service.validation",
    "function": "validate_email",
    "line_number": 45,
    "file_path": "/app/user_service/validation.py",
    "stack_trace": "Traceback (most recent call last):\n  File 'validation.py', line 45, in validate_email\n    raise ValueError('Invalid email format')\n  File 'handlers.py', line 123, in process_request\n    validate_email(email)",
    "root_cause": "Email validation regex failed",
    "error_category": "validation",
    "severity": "warning",
    "recoverable": true
  },
  "context": {
    "operation": "user_registration",
    "component": "email_validator",
    "service": "user-service",
    "version": "1.2.3"
  }
}
```

### 2. Request context for errors
```json
{
  "request_context": {
    "request_id": "req_abc123def",
    "correlation_id": "corr_xyz789",
    "method": "POST",
    "url": "/api/users",
    "query_string": "source=web&campaign=summer",
    "headers": {
      "content_type": "application/json",
      "user_agent": "Mozilla/5.0...",
      "accept_language": "en-US,en;q=0.9"
    },
    "body_size_bytes": 1024,
    "client_ip": "192.168.1.100",
    "user_id": "usr_12345",
    "session_id": "sess_def456",
    "timestamp": "2024-01-15T10:23:45.123Z"
  },
  "error": {
    "type": "DatabaseConnectionError",
    "message": "Connection timeout after 30 seconds",
    "database_host": "db-primary.prod.example.com",
    "database_port": 5432,
    "connection_pool_size": 20,
    "active_connections": 18,
    "query_timeout_ms": 30000
  }
}
```

### 3. Environmental context
```json
{
  "environment": {
    "service": "user-service",
    "version": "1.2.3",
    "environment": "production",
    "region": "us-west-2",
    "availability_zone": "us-west-2a",
    "instance_id": "i-1234567890abcdef0",
    "host": "web-01.prod.example.com",
    "process_id": 1234,
    "thread_id": "Thread-5",
    "memory_usage_mb": 512.5,
    "cpu_usage_percent": 75.2,
    "disk_usage_percent": 45.8,
    "uptime_seconds": 345600
  },
  "dependencies": {
    "database": {
      "status": "degraded",
      "latency_ms": 2500,
      "connection_count": 18,
      "error_rate_percent": 5.2
    },
    "cache": {
      "status": "healthy",
      "hit_rate_percent": 92.5,
      "latency_ms": 2.1
    },
    "external_api": {
      "status": "timeout",
      "last_success": "2024-01-15T09:45:00Z"
    }
  }
}
```

### 4. Error chain and cascading failures
```json
{
  "error_chain": [
    {
      "sequence": 1,
      "timestamp": "2024-01-15T10:23:45.000Z",
      "service": "api-gateway",
      "error": {
        "type": "TimeoutError",
        "message": "Request timeout after 30 seconds",
        "target_service": "user-service"
      }
    },
    {
      "sequence": 2,
      "timestamp": "2024-01-15T10:23:45.100Z",
      "service": "user-service",
      "error": {
        "type": "DatabaseConnectionError",
        "message": "Connection pool exhausted",
        "pool_size": 20,
        "active_connections": 20
      }
    },
    {
      "sequence": 3,
      "timestamp": "2024-01-15T10:23:45.200Z",
      "service": "database",
      "error": {
        "type": "ConnectionLimitExceeded",
        "message": "Too many connections",
        "max_connections": 100,
        "current_connections": 105
      }
    }
  ],
  "cascade_analysis": {
    "root_cause_service": "database",
    "affected_services": ["user-service", "api-gateway"],
    "blast_radius": "high",
    "recovery_time_estimate_minutes": 15
  }
}
```

### 5. Python error logging with context
```python
import logging
import traceback
import sys
from pythonjsonlogger import jsonlogger
import inspect

class ErrorContextFormatter(jsonlogger.JsonFormatter):
    def format(self, record):
        # Add error context if exception info exists
        if record.exc_info:
            record.error = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'module': record.exc_info[1].__class__.__module__,
                'file': record.exc_info[2].tb_frame.f_code.co_filename,
                'line': record.exc_info[2].tb_lineno,
                'function': record.exc_info[2].tb_frame.f_code.co_name
            }

            # Full stack trace
            record.stack_trace = ''.join(traceback.format_exception(*record.exc_info))

            # Code context around error
            try:
                lines, lineno = inspect.getsourcelines(record.exc_info[2].tb_frame)
                record.code_context = {
                    'line': lineno,
                    'code': lines[lineno - 1].strip() if lineno <= len(lines) else None,
                    'surrounding_lines': lines[max(0, lineno-3):lineno+2]
                }
            except:
                record.code_context = None

        return super().format(record)

# Configure error-aware logging
formatter = ErrorContextFormatter('%(timestamp)s %(level)s %(message)s')
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(handler)

# Usage with automatic error context
try:
    # Code that might fail
    result = risky_operation()
except Exception as e:
    logger.error("Operation failed", extra={
        'operation': 'risky_operation',
        'component': 'data_processor',
        'error_category': 'runtime',
        'severity': 'error',
        'recoverable': False
    }, exc_info=True)
```

### 6. FastAPI error middleware
```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import logging
import time
import traceback

app = FastAPI()

@app.middleware("http")
async def error_logging_middleware(request: Request, call_next):
    start_time = time.time()

    try:
        response = await call_next(request)
        return response

    except Exception as e:
        # Calculate request duration
        duration = time.time() - start_time

        # Log comprehensive error context
        error_context = {
            'error': {
                'type': type(e).__name__,
                'message': str(e),
                'module': type(e).__module__,
                'traceback': traceback.format_exc()
            },
            'request': {
                'method': request.method,
                'url': str(request.url),
                'headers': dict(request.headers),
                'client_ip': request.client.host,
                'user_agent': request.headers.get('User-Agent'),
                'query_params': dict(request.query_params),
                'path_params': dict(request.path_params)
            },
            'performance': {
                'duration_ms': round(duration * 1000, 2),
                'timestamp': time.time()
            },
            'context': {
                'service': 'api-service',
                'endpoint': request.url.path,
                'correlation_id': request.headers.get('X-Correlation-ID'),
                'request_id': request.headers.get('X-Request-ID')
            }
        }

        # Log error with full context
        logging.error("Request failed", extra=error_context, exc_info=True)

        # Return error response
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "request_id": error_context['context']['request_id']}
        )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Log HTTP exceptions with context
    logging.warning("HTTP exception", extra={
        'error': {
            'type': 'HTTPException',
            'status_code': exc.status_code,
            'detail': exc.detail
        },
        'request': {
            'method': request.method,
            'url': str(request.url)
        }
    })

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )
```

### 7. Error aggregation and alerting
```json
{
  "error_aggregation": {
    "time_window_minutes": 5,
    "error_count": 25,
    "error_rate_per_minute": 5.0,
    "unique_error_types": 3,
    "most_common_error": {
      "type": "TimeoutError",
      "count": 15,
      "percentage": 60.0
    },
    "affected_endpoints": [
      "/api/users",
      "/api/orders",
      "/api/payments"
    ],
    "affected_users": 12,
    "severity_assessment": "high"
  },
  "alert_criteria": {
    "error_rate_threshold": 10,
    "error_count_threshold": 50,
    "unique_users_affected_threshold": 20,
    "alert_level": "critical",
    "escalation_required": true
  }
}
```

### 8. Error recovery and retry context
```json
{
  "error_recovery": {
    "retry_attempt": 3,
    "max_retries": 5,
    "retry_strategy": "exponential_backoff",
    "backoff_delay_ms": 1000,
    "total_duration_ms": 7500,
    "recovery_action": "circuit_breaker_opened",
    "fallback_used": true,
    "degraded_mode": true
  },
  "circuit_breaker": {
    "state": "open",
    "failure_count": 10,
    "success_count": 0,
    "failure_threshold": 5,
    "recovery_timeout_seconds": 60,
    "last_failure_at": "2024-01-15T10:23:45Z"
  }
}
```

## ❌ Incorrect: Error context mistakes

```json
// ❌ Minimal error logging
{
  "message": "Error occurred"
}
// No error type, context, or stack trace

// ❌ Generic error messages
{
  "message": "Something went wrong",
  "error": "Exception"
}
// Too vague for debugging

// ❌ Missing stack traces
{
  "message": "Database error",
  "error": "Connection failed"
}
// No stack trace for root cause analysis

// ❌ No request context
{
  "error": {
    "type": "ValidationError",
    "message": "Invalid input"
  }
}
// Cannot correlate with specific request

// ❌ Sensitive data in errors
{
  "error": "Authentication failed for user@example.com"
}
// Exposes user email in error logs
```

## Key Benefits
- **Root cause analysis**: Complete error context for debugging
- **Error correlation**: Link errors across services and requests
- **Impact assessment**: Understand error scope and affected users
- **Recovery tracking**: Monitor error recovery and retry logic
- **Alert effectiveness**: Accurate error alerting and prioritization
- **Post-mortem analysis**: Comprehensive error investigation</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/contextual/error-context.md