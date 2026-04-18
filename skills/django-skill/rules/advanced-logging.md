# Impact: LOW

## Problem

Django applications often lack proper logging configuration, making debugging difficult and preventing effective monitoring. Developers struggle with log levels, formatting, handlers, and organizing logs for different environments. Poor logging can lead to missing critical errors, performance issues going unnoticed, and difficulty troubleshooting production problems.

## Solution

Configure comprehensive logging with appropriate handlers, formatters, and levels:

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            'format': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        },
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/django/app.log',
            'maxBytes': 1024*1024*10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'django_file': {
            'level': 'INFO',
            'class': 'logging.handlers.TimedRotatingFileHandler',
            'filename': '/var/log/django/django.log',
            'when': 'midnight',
            'backupCount': 30,
            'formatter': 'json',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'django_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'myapp': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'WARNING',
    },
}
```

Use structured logging in your application:

```python
# myapp/views.py
import logging

logger = logging.getLogger(__name__)

def my_view(request):
    logger.info('Processing request', extra={
        'user_id': request.user.id,
        'ip': request.META.get('REMOTE_ADDR'),
        'user_agent': request.META.get('HTTP_USER_AGENT'),
    })
    
    try:
        # Your logic here
        result = process_data(request.POST)
        logger.info('Request processed successfully', extra={
            'result_count': len(result),
        })
        return JsonResponse({'status': 'success'})
    except Exception as e:
        logger.error('Request processing failed', exc_info=True, extra={
            'error_type': type(e).__name__,
            'user_id': request.user.id,
        })
        return JsonResponse({'status': 'error'}, status=500)
```

Implement custom loggers for specific components:

```python
# utils.py
class DatabaseLogger:
    def __init__(self):
        self.logger = logging.getLogger('myapp.database')
    
    def log_query(self, query, duration, params=None):
        self.logger.debug('Database query executed', extra={
            'query': query,
            'duration_ms': duration,
            'params': params,
        })

db_logger = DatabaseLogger()

# In your database operations
start_time = time.time()
cursor.execute(query, params)
duration = (time.time() - start_time) * 1000
db_logger.log_query(query, duration, params)
```

Configure different logging levels for different environments:

```python
# settings/base.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'root': {
        'handlers': ['console'],
        'level': os.getenv('LOG_LEVEL', 'INFO'),
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
}

# settings/production.py
from .base import *

LOGGING['handlers'].update({
    'file': {
        'level': 'WARNING',
        'class': 'logging.handlers.SysLogHandler',
        'address': '/dev/log',
        'facility': logging.handlers.SysLogHandler.LOG_LOCAL0,
        'formatter': 'json',
    },
})

LOGGING['root']['handlers'].append('file')
LOGGING['root']['level'] = 'WARNING'
```

Use logging decorators for consistent logging:

```python
# decorators.py
import functools
import logging
import time

def log_execution(logger_name=__name__):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            logger = logging.getLogger(logger_name)
            start_time = time.time()
            
            logger.debug(f'Calling {func.__name__}', extra={
                'function': func.__name__,
                'args_count': len(args),
                'kwargs_keys': list(kwargs.keys()),
            })
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                logger.debug(f'Function {func.__name__} completed', extra={
                    'function': func.__name__,
                    'duration': duration,
                    'success': True,
                })
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f'Function {func.__name__} failed', exc_info=True, extra={
                    'function': func.__name__,
                    'duration': duration,
                    'success': False,
                    'error_type': type(e).__name__,
                })
                raise
        
        return wrapper
    return decorator

# Usage
@log_execution('myapp.tasks')
def process_data(data):
    # Your processing logic
    pass
```

## Common Mistakes

- Using print() instead of proper logging
- Not configuring loggers for different components
- Using wrong log levels (DEBUG for production issues)
- Not rotating log files, causing disk space issues
- Logging sensitive information like passwords
- Not using structured logging with extra context
- Mixing different log formats inconsistently
- Not testing logging configuration
- Forgetting to set propagate=False to prevent duplicate logs

## When to Apply

- Debugging application issues in development
- Monitoring application health in production
- Tracking user actions and API usage
- Performance monitoring and profiling
- Error tracking and alerting
- Audit logging for compliance
- Multi-environment logging (dev/staging/prod)
- Integrating with log aggregation systems