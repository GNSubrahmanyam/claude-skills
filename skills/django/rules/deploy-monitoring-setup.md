---
title: Deployment Monitoring Setup
impact: MEDIUM
impactDescription: Enables proactive issue detection and performance monitoring
tags: django, deployment, monitoring, observability
---

## Deployment Monitoring Setup

**Problem:**
Without monitoring, production issues go undetected, performance problems aren't identified, and debugging becomes difficult. Applications fail silently or degrade without warning.

**Solution:**
Implement comprehensive monitoring with error tracking, performance metrics, and alerting for critical issues.

**Examples:**

❌ **Wrong: No monitoring**
```python
# settings.py - No monitoring setup
# No error tracking
# No performance monitoring
# No alerting
# Issues go undetected
```

✅ **Correct: Comprehensive monitoring**
```python
# settings.py - Monitoring setup
import os

# Sentry for error tracking
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    environment=os.environ.get('DJANGO_ENV', 'development'),
    traces_sample_rate=0.1,  # Performance monitoring
    send_default_pii=True,   # Include user data for debugging
)

# Django logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/app.log',
            'formatter': 'verbose',
        },
        'json_file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/app.json',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console', 'file', 'json_file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
```

**Health Check Endpoints:**
```python
# views.py - Health check endpoints
from django.http import JsonResponse
from django.db import connections
from django.core.cache import cache
import time

def health_check(request):
    """Basic health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'timestamp': time.time(),
        'service': 'django-app'
    })

def detailed_health_check(request):
    """Comprehensive health check"""
    health_status = {
        'status': 'healthy',
        'checks': {},
        'timestamp': time.time(),
    }

    # Database check
    try:
        for db_alias in connections:
            connection = connections[db_alias]
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                health_status['checks'][f'database_{db_alias}'] = 'healthy'
    except Exception as e:
        health_status['checks']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'

    # Cache check
    try:
        cache.set('health_check', 'ok', 10)
        result = cache.get('health_check')
        if result == 'ok':
            health_status['checks']['cache'] = 'healthy'
        else:
            health_status['checks']['cache'] = 'unhealthy: cache not working'
            health_status['status'] = 'unhealthy'
    except Exception as e:
        health_status['checks']['cache'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'

    # External services check
    try:
        # Check Redis connectivity
        from django_redis import get_redis_connection
        redis_conn = get_redis_connection('default')
        redis_conn.ping()
        health_status['checks']['redis'] = 'healthy'
    except Exception as e:
        health_status['checks']['redis'] = f'unhealthy: {str(e)}'

    # Return appropriate status code
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return JsonResponse(health_status, status=status_code)

def metrics_endpoint(request):
    """Prometheus metrics endpoint"""
    from django.db import connection
    from django.core.cache import cache
    import psutil

    metrics = []

    # Database connection count
    db_connections = len(connection.queries) if hasattr(connection, 'queries') else 0
    metrics.append(f'# HELP django_db_connections_active Number of active database connections')
    metrics.append(f'# TYPE django_db_connections_active gauge')
    metrics.append(f'django_db_connections_active {db_connections}')

    # Cache hit/miss ratio (simplified)
    try:
        cache_info = cache._cache  # Access underlying cache
        if hasattr(cache_info, 'get_stats'):
            stats = cache_info.get_stats()
            metrics.append(f'# HELP django_cache_hits_total Total cache hits')
            metrics.append(f'# TYPE django_cache_hits_total counter')
            metrics.append(f'django_cache_hits_total {stats.get("hits", 0)}')
    except:
        pass

    # Memory usage
    memory = psutil.virtual_memory()
    metrics.append(f'# HELP process_memory_usage_bytes Current memory usage')
    metrics.append(f'# TYPE process_memory_usage_bytes gauge')
    metrics.append(f'process_memory_usage_bytes {memory.used}')

    return HttpResponse('\n'.join(metrics), content_type='text/plain')
```

**Performance Monitoring Middleware:**
```python
# middleware.py - Performance monitoring
import time
import logging
from django.db import connection

logger = logging.getLogger('performance')

class PerformanceMonitoringMiddleware:
    """Monitor request performance"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        response = self.get_response(request)

        # Calculate request duration
        duration = time.time() - start_time

        # Log slow requests
        if duration > 1.0:  # More than 1 second
            logger.warning(
                f'Slow request: {request.method} {request.path} '
                f'took {duration:.2f}s from {self._get_client_ip(request)}'
            )

        # Add performance headers
        response['X-Response-Time'] = f'{duration:.3f}s'

        # Count database queries
        query_count = len(connection.queries)
        response['X-Query-Count'] = str(query_count)

        if query_count > 50:  # High query count
            logger.warning(
                f'High query count: {query_count} queries for {request.path}'
            )

        return response

    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
```

**Alerting Configuration:**
```python
# monitoring.py - Alerting setup
import requests
import logging
from django.conf import settings

logger = logging.getLogger('alerts')

class AlertManager:
    """Send alerts to monitoring services"""

    def __init__(self):
        self.slack_webhook = settings.SLACK_WEBHOOK_URL
        self.pagerduty_key = settings.PAGERDUTY_INTEGRATION_KEY

    def send_alert(self, title, message, severity='warning'):
        """Send alert to configured services"""
        alert_data = {
            'title': title,
            'message': message,
            'severity': severity,
            'timestamp': time.time(),
            'environment': settings.ENVIRONMENT,
        }

        # Send to Slack
        if self.slack_webhook:
            self._send_slack_alert(alert_data)

        # Send to PagerDuty for critical alerts
        if severity == 'critical' and self.pagerduty_key:
            self._send_pagerduty_alert(alert_data)

        # Log alert
        logger.error(f'ALERT [{severity}]: {title} - {message}')

    def _send_slack_alert(self, alert_data):
        """Send alert to Slack"""
        color = {'info': 'good', 'warning': 'warning', 'error': 'danger', 'critical': 'danger'}

        payload = {
            'attachments': [{
                'color': color.get(alert_data['severity'], 'warning'),
                'title': alert_data['title'],
                'text': alert_data['message'],
                'fields': [
                    {'title': 'Environment', 'value': alert_data['environment'], 'short': True},
                    {'title': 'Severity', 'value': alert_data['severity'], 'short': True},
                ],
                'ts': alert_data['timestamp']
            }]
        }

        try:
            requests.post(self.slack_webhook, json=payload)
        except Exception as e:
            logger.error(f'Failed to send Slack alert: {e}')

    def _send_pagerduty_alert(self, alert_data):
        """Send alert to PagerDuty"""
        payload = {
            'routing_key': self.pagerduty_key,
            'event_action': 'trigger',
            'payload': {
                'summary': alert_data['title'],
                'source': 'django-app',
                'severity': alert_data['severity'],
                'component': 'web',
                'group': alert_data['environment'],
                'class': 'application',
                'custom_details': {
                    'message': alert_data['message'],
                    'environment': alert_data['environment'],
                }
            }
        }

        try:
            requests.post('https://events.pagerduty.com/v2/enqueue', json=payload)
        except Exception as e:
            logger.error(f'Failed to send PagerDuty alert: {e}')

# Global alert manager
alert_manager = AlertManager()

def send_alert(title, message, severity='warning'):
    """Send alert (global function)"""
    alert_manager.send_alert(title, message, severity)
```

**Application Performance Monitoring:**
```python
# settings.py - APM setup
# For DataDog APM
DATADOG_TRACE_ENABLED = os.environ.get('DD_TRACE_ENABLED', 'false').lower() == 'true'
if DATADOG_TRACE_ENABLED:
    from ddtrace import patch_all, tracer
    patch_all()

    # Configure tracer
    tracer.configure(
        hostname=os.environ.get('DD_AGENT_HOST', 'localhost'),
        port=int(os.environ.get('DD_TRACE_AGENT_PORT', 8126)),
        service_name='django-app',
        service_version=os.environ.get('BUILD_VERSION', '1.0.0'),
    )

# For New Relic
NEW_RELIC_LICENSE_KEY = os.environ.get('NEW_RELIC_LICENSE_KEY')
if NEW_RELIC_LICENSE_KEY:
    import newrelic.agent
    newrelic.agent.initialize()

# Custom metrics collection
from django.core.signals import request_finished
from django.dispatch import receiver

class MetricsCollector:
    """Collect custom application metrics"""

    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.avg_response_time = 0

    def record_request(self, duration, status_code):
        """Record request metrics"""
        self.request_count += 1

        if status_code >= 400:
            self.error_count += 1

        # Update average response time
        self.avg_response_time = (
            (self.avg_response_time * (self.request_count - 1)) + duration
        ) / self.request_count

        # Send to monitoring service
        self._send_metrics()

    def _send_metrics(self):
        """Send metrics to monitoring service"""
        # This would integrate with your monitoring system
        pass

metrics_collector = MetricsCollector()

@receiver(request_finished)
def record_request_metrics(sender, **kwargs):
    """Record metrics for each request"""
    # This is a simplified example
    # In practice, you'd use middleware to track duration and status
    pass
```

**Common mistakes:**
- No error tracking in production
- Missing performance monitoring
- Not logging critical application events
- No alerting for production issues
- Ignoring health check endpoints
- Not monitoring database and cache performance

**When to apply:**
- Setting up production monitoring
- Implementing error tracking
- Configuring performance monitoring
- During incident response preparation
- Building observable applications