# Python Structured Logging with Structlog
**Impact:** CRITICAL - Enables production-ready structured JSON logging in Python applications

**Problem:**
Python's default logging module produces unstructured text logs that are difficult to parse, search, and analyze. Without structured logging, debugging production issues becomes time-consuming and error-prone, especially in distributed systems.

**Solution:**
Implement structlog for comprehensive structured JSON logging with automatic context propagation, flexible processors, and seamless integration with Python's logging ecosystem.

## ✅ Correct: Structlog implementation

### 1. Basic structlog setup
```python
import structlog
import logging
import sys

# Configure structlog processors
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

# Configure standard logging
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)

# Create structured logger
logger = structlog.get_logger()
```

### 2. Global context binding
```python
# Bind service-wide context to all logs
logger = logger.bind(
    service="user-service",
    version="1.2.3",
    environment="production",
    host="web-01.prod.example.com"
)

# Usage throughout application
logger.info("Application started", startup_time=2.5)
logger.info("Database connected", connection_pool_size=10)
```

### 3. Request context propagation
```python
import uuid
from contextvars import ContextVar

# Context variables for request-scoped data
request_id: ContextVar[str] = ContextVar('request_id')
user_id: ContextVar[str] = ContextVar('user_id')

class RequestContextFilter(logging.Filter):
    """Add request context to all log records"""

    def filter(self, record):
        # Add request-scoped context
        try:
            record.request_id = request_id.get()
        except LookupError:
            record.request_id = None

        try:
            record.user_id = user_id.get()
        except LookupError:
            record.user_id = None

        return True

# Add filter to root logger
logging.getLogger().addFilter(RequestContextFilter())

# Middleware for web frameworks
def request_middleware(get_response):
    def middleware(request):
        # Generate request ID
        req_id = str(uuid.uuid4())

        # Set context variables
        request_id_token = request_id.set(req_id)
        user_id_token = None

        try:
            # Extract user ID if authenticated
            if hasattr(request, 'user') and request.user.is_authenticated:
                user_id_token = user_id.set(str(request.user.id))

            # Process request
            response = get_response(request)

            # Log successful request
            logger.info(
                "Request completed",
                method=request.method,
                path=request.path,
                status_code=response.status_code,
                duration_ms=getattr(response, 'duration', 0)
            )

        except Exception as e:
            # Log error
            logger.error(
                "Request failed",
                method=request.method,
                path=request.path,
                error=str(e),
                exc_info=True
            )
            raise
        finally:
            # Reset context variables
            request_id.reset(request_id_token)
            if user_id_token:
                user_id.reset(user_id_token)

        return response

    return middleware
```

### 4. Advanced processors and formatters
```python
from pythonjsonlogger import jsonlogger
import json

class CustomJSONFormatter(jsonlogger.JsonFormatter):
    """Enhanced JSON formatter with additional fields"""

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)

        # Add service context
        if not log_record.get('service'):
            log_record['service'] = 'unknown-service'

        # Add severity level
        log_record['severity'] = record.levelname

        # Add timestamp if not present
        if 'timestamp' not in log_record:
            log_record['timestamp'] = self.format_timestamp(record.created)

        # Sanitize sensitive fields
        self._sanitize_sensitive_data(log_record)

    def _sanitize_sensitive_data(self, log_record):
        """Remove or mask sensitive data"""
        sensitive_keys = ['password', 'token', 'secret', 'key']

        def sanitize_dict(data):
            if isinstance(data, dict):
                for key, value in data.items():
                    if any(sensitive in key.lower() for sensitive in sensitive_keys):
                        data[key] = '***MASKED***'
                    elif isinstance(value, (dict, list)):
                        sanitize_dict(value)
            elif isinstance(data, list):
                for item in data:
                    sanitize_dict(item)

        sanitize_dict(log_record)

    def format_timestamp(self, timestamp):
        """Format timestamp as ISO 8601"""
        import datetime
        dt = datetime.datetime.fromtimestamp(timestamp)
        return dt.isoformat() + 'Z'

# Configure with custom formatter
logging_config = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': CustomJSONFormatter,
            'format': '%(timestamp)s %(levelname)s %(name)s %(message)s'
        }
    },
    'handlers': {
        'json_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'stream': sys.stdout
        }
    },
    'root': {
        'handlers': ['json_console'],
        'level': 'INFO'
    }
}

logging.config.dictConfig(logging_config)
```

### 5. Async logging for performance
```python
import asyncio
import queue
import threading
from concurrent.futures import ThreadPoolExecutor

class AsyncLogHandler(logging.Handler):
    """Asynchronous logging handler to prevent blocking"""

    def __init__(self, max_workers=2):
        super().__init__()
        self.queue = queue.Queue()
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

        # Start worker thread
        self.worker_thread = threading.Thread(target=self._process_queue, daemon=True)
        self.worker_thread.start()

    def emit(self, record):
        """Add log record to queue for async processing"""
        try:
            self.queue.put_nowait(record)
        except queue.Full:
            # Drop log if queue is full to prevent blocking
            pass

    def _process_queue(self):
        """Process logs in background thread"""
        while True:
            try:
                record = self.queue.get(timeout=1)
                self._write_log(record)
                self.queue.task_done()
            except queue.Empty:
                continue
            except Exception:
                # Prevent logging errors from crashing the thread
                pass

    def _write_log(self, record):
        """Write log to destination (file, network, etc.)"""
        # Implement actual log writing here
        formatted_log = self.format(record)
        print(formatted_log)  # Replace with actual destination

# Add async handler
async_handler = AsyncLogHandler()
async_handler.setFormatter(CustomJSONFormatter())
logging.getLogger().addHandler(async_handler)
```

### 6. Integration with monitoring systems
```python
import statsd
from structlog.processors import JSONRenderer

class MetricsProcessor:
    """Add metrics and monitoring context to logs"""

    def __init__(self):
        self.statsd = statsd.StatsClient('localhost', 8125)

    def __call__(self, logger, method_name, event_dict):
        # Add metrics context
        event_dict['metrics'] = {
            'memory_usage_mb': self._get_memory_usage(),
            'active_threads': threading.active_count(),
            'uptime_seconds': self._get_uptime()
        }

        # Send metrics for error logs
        if method_name == 'error':
            self.statsd.increment('app.errors')
        elif method_name == 'info':
            self.statsd.increment('app.info_logs')

        return event_dict

    def _get_memory_usage(self):
        import psutil
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024

    def _get_uptime(self):
        import time
        return time.time() - psutil.Process().create_time()

# Add metrics processor
structlog.configure(
    processors=[
        MetricsProcessor(),
        JSONRenderer()
    ] + shared_processors
)
```

### 7. Dynamic configuration for environments
```python
import os

def configure_structlog():
    """Configure structlog based on environment"""

    environment = os.getenv('ENVIRONMENT', 'development')

    base_processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.PositionalArgumentsFormatter(),
    ]

    if environment == 'production':
        # Production: JSON output, more processors
        processors = base_processors + [
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ]
        log_level = logging.INFO
    else:
        # Development: Human-readable output
        processors = base_processors + [
            structlog.dev.ConsoleRenderer(colors=True)
        ]
        log_level = logging.DEBUG

    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

# Apply configuration
configure_structlog()
```

## ❌ Incorrect: Common structlog mistakes

```python
# ❌ Using print statements
print("User logged in")
# No structure, timestamps, or context

# ❌ Not binding context
logger.info("Processing user", user_id=user.id)
logger.info("Database query completed")
# No correlation between related logs

# ❌ Blocking operations in log processors
def slow_processor(logger, method_name, event_dict):
    time.sleep(1)  # Blocks logging!
    return event_dict

# ❌ Not handling exceptions in processors
def buggy_processor(logger, method_name, event_dict):
    return event_dict['nonexistent_key']  # Will crash logging
```

## Key Benefits
- **Structured output**: JSON format enables querying and analysis
- **Context propagation**: Automatic request/user context in all logs
- **Performance**: Async processing prevents blocking
- **Flexibility**: Custom processors for specific needs
- **Integration**: Works with existing Python logging ecosystem
- **Monitoring**: Built-in metrics and monitoring integration</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/framework/python-structlog.md