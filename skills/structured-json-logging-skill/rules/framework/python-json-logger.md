# Python JSON Logger
**Impact:** CRITICAL - Provides simple, reliable JSON logging for Python applications

**Problem:**
Many Python applications need structured JSON logging but don't require the full feature set of structlog. Python's built-in logging module lacks native JSON formatting, making it difficult to produce machine-readable logs for monitoring and analysis systems.

**Solution:**
Implement python-json-logger to add JSON formatting to Python's standard logging module, providing structured output with minimal configuration overhead.

## ✅ Correct: python-json-logger implementation

### 1. Basic setup
```python
import logging
from pythonjsonlogger import jsonlogger

# Create JSON formatter
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s',
    rename_fields={
        'asctime': 'timestamp',
        'levelname': 'level',
        'name': 'logger'
    }
)

# Configure handler
handler = logging.StreamHandler()
handler.setFormatter(formatter)

# Configure logger
logger = logging.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage
logger.info("Application started", extra={'version': '1.0.0', 'environment': 'production'})
```

### 2. Custom JSON formatter with additional fields
```python
import logging
from pythonjsonlogger import jsonlogger
import socket
import os

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)

        # Add standard fields
        log_record['timestamp'] = self.format_timestamp(record.created)
        log_record['level'] = record.levelname.lower()
        log_record['service'] = os.getenv('SERVICE_NAME', 'unknown-service')
        log_record['host'] = socket.gethostname()

        # Add correlation ID if present
        if hasattr(record, 'correlation_id'):
            log_record['correlation_id'] = record.correlation_id

        # Sanitize sensitive data
        self._sanitize_record(log_record)

    def _sanitize_record(self, log_record):
        sensitive_keys = ['password', 'token', 'secret', 'key', 'authorization']
        for key in sensitive_keys:
            if key in log_record:
                log_record[key] = '***MASKED***'

    def format_timestamp(self, timestamp):
        import datetime
        dt = datetime.datetime.fromtimestamp(timestamp)
        return dt.isoformat() + 'Z'

# Use custom formatter
formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(service)s %(message)s')
handler.setFormatter(formatter)
```

### 3. Request context middleware (Flask)
```python
from flask import Flask, request, g
import logging
import uuid

app = Flask(__name__)

class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = getattr(g, 'correlation_id', 'unknown')
        record.request_id = getattr(g, 'request_id', 'unknown')
        record.user_id = getattr(g, 'user_id', None)
        return True

# Add filter to all loggers
logging.getLogger().addFilter(RequestIdFilter())

@app.before_request
def before_request():
    g.correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
    g.request_id = str(uuid.uuid4())
    if hasattr(request, 'user') and request.user:
        g.user_id = request.user.id

@app.route('/')
def hello():
    app.logger.info("Request processed", extra={
        'method': request.method,
        'path': request.path,
        'status_code': 200
    })
    return "Hello World"
```

### 4. Django logging configuration
```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'correlation_id': {
            '()': 'myapp.logging.CorrelationIdFilter',
        },
    },
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(timestamp)s %(level)s %(name)s %(message)s %(correlation_id)s',
            'rename_fields': {
                'asctime': 'timestamp',
                'levelname': 'level'
            },
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'filters': ['correlation_id'],
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'app.log',
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
            'filters': ['correlation_id'],
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

# myapp/logging.py
import logging
from django.utils.deprecation import MiddlewareMixin

class CorrelationIdFilter(logging.Filter):
    def filter(self, record):
        from django.utils.deprecation import MiddlewareMixin
        # Get correlation ID from thread-local or middleware
        correlation_id = getattr(self._get_current_request(), 'correlation_id', None)
        if correlation_id:
            record.correlation_id = correlation_id
        return True

    def _get_current_request(self):
        # Implementation depends on Django version
        # For Django 2.0+
        from django.utils.deprecation import MiddlewareMixin
        # Custom middleware to store request in thread local
        pass
```

### 5. FastAPI integration
```python
from fastapi import FastAPI, Request, Response
import logging
from pythonjsonlogger import jsonlogger
import time
import uuid

# Configure logging
formatter = jsonlogger.JsonFormatter('%(timestamp)s %(level)s %(message)s')
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

app = FastAPI()

@app.middleware("http")
async def logging_middleware(request: Request, call_next) -> Response:
    start_time = time.time()

    # Generate request IDs
    correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
    request_id = str(uuid.uuid4())

    # Add to request state for handlers
    request.state.correlation_id = correlation_id
    request.state.request_id = request_id

    try:
        response = await call_next(request)

        # Log successful request
        logger.info("Request completed", extra={
            'correlation_id': correlation_id,
            'request_id': request_id,
            'method': request.method,
            'path': request.url.path,
            'status_code': response.status_code,
            'duration_ms': round((time.time() - start_time) * 1000, 2),
            'user_agent': request.headers.get('User-Agent'),
        })

        return response

    except Exception as e:
        # Log error
        logger.error("Request failed", extra={
            'correlation_id': correlation_id,
            'request_id': request_id,
            'method': request.method,
            'path': request.url.path,
            'error': str(e),
            'duration_ms': round((time.time() - start_time) * 1000, 2),
        }, exc_info=True)
        raise

@app.get("/")
async def read_root(request: Request):
    return {"message": "Hello World", "correlation_id": request.state.correlation_id}
```

### 6. Error logging with context
```python
import logging
from pythonjsonlogger import jsonlogger
import traceback
import sys

class ErrorFormatter(jsonlogger.JsonFormatter):
    def format(self, record):
        # Add exception info if present
        if record.exc_info:
            record.exception = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': traceback.format_exception(*record.exc_info)
            }

        # Add stack trace if available
        if hasattr(record, 'stack_info'):
            record.stack_trace = record.stack_info

        return super().format(record)

# Configure with error formatter
formatter = ErrorFormatter('%(timestamp)s %(level)s %(message)s')
handler.setFormatter(formatter)

# Usage
try:
    risky_operation()
except Exception as e:
    logger.error("Operation failed", extra={
        'operation': 'risky_operation',
        'error_type': type(e).__name__,
        'component': 'data_processor'
    }, exc_info=True)
```

### 7. Performance logging
```python
import time
import logging
from functools import wraps

def log_performance(logger_name=None):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = logging.getLogger(logger_name or func.__module__)
            start_time = time.time()

            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time

                logger.info("Function completed", extra={
                    'function': func.__name__,
                    'module': func.__module__,
                    'duration_seconds': round(duration, 3),
                    'success': True
                })

                return result

            except Exception as e:
                duration = time.time() - start_time

                logger.error("Function failed", extra={
                    'function': func.__name__,
                    'module': func.__module__,
                    'duration_seconds': round(duration, 3),
                    'success': False,
                    'error': str(e)
                }, exc_info=True)
                raise

        return wrapper
    return decorator

@log_performance()
def process_data(data):
    # Processing logic
    return processed_data
```

## ❌ Incorrect: python-json-logger mistakes

```python
# ❌ Not using extra parameter correctly
logger.info("User login", user_id=user_id)  # user_id won't be in JSON!

# ❌ Overriding built-in fields
logger.info("Message", extra={'message': 'override'})  # Breaks formatting

# ❌ Not handling circular references
logger.info("Complex object", extra={'data': complex_obj})  # May fail serialization

# ❌ Ignoring exc_info for errors
logger.error("Something failed")  # No stack trace in JSON
```

## Key Benefits
- **Simple integration**: Works with existing logging code
- **Standard library compatible**: Uses Python's logging module
- **Flexible formatting**: Customizable JSON structure
- **Performance**: Lightweight with minimal overhead
- **Reliable**: Mature library with good maintenance
- **Ecosystem**: Works with all Python frameworks</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/framework/python-json-logger.md