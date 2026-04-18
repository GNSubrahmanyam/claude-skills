# Middleware Implementation Patterns

This reference covers Django middleware implementation, common patterns, and best practices for request/response processing.

## Basic Middleware Structure

```python
# middleware.py
from django.http import HttpResponse

class RequestLoggingMiddleware:
    """Log all incoming requests"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Code executed for each request before view
        print(f"Request: {request.method} {request.path}")

        response = self.get_response(request)

        # Code executed for each response after view
        print(f"Response: {response.status_code}")

        return response

class AuthenticationMiddleware:
    """Custom authentication middleware"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check for API token in header
        token = request.headers.get('Authorization')
        if token:
            # Validate token and set user
            user = self.authenticate_token(token)
            if user:
                request.user = user

        response = self.get_response(request)
        return response

    def authenticate_token(self, token):
        # Token validation logic
        pass
```

## Common Middleware Patterns

### Security Headers Middleware

```python
class SecurityHeadersMiddleware:
    """Add security headers to all responses"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com;"
        )

        return response
```

### Request Timing Middleware

```python
import time

class RequestTimingMiddleware:
    """Measure request processing time"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        response = self.get_response(request)

        duration = time.time() - start_time
        response['X-Processing-Time'] = f"{duration:.2f}s"

        # Log slow requests
        if duration > 1.0:  # More than 1 second
            logger.warning(f"Slow request: {request.path} took {duration:.2f}s")

        return response
```

### CORS Middleware

```python
class CORSMiddleware:
    """Handle Cross-Origin Resource Sharing"""

    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_origins = [
            'http://localhost:3000',
            'https://myapp.com',
        ]

    def __call__(self, request):
        response = self.get_response(request)

        origin = request.headers.get('Origin')
        if origin in self.allowed_origins:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'

        # Handle preflight requests
        if request.method == 'OPTIONS':
            response.status_code = 200

        return response
```

## Middleware Registration

```python
# settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # Custom middleware
    'myapp.middleware.RequestLoggingMiddleware',
    'myapp.middleware.SecurityHeadersMiddleware',
    'myapp.middleware.RequestTimingMiddleware',
]
```

## Middleware Ordering Best Practices

1. **SecurityMiddleware** - First for security headers
2. **SessionMiddleware** - Early for session access
3. **CommonMiddleware** - Standard Django middleware
4. **CsrfViewMiddleware** - CSRF protection
5. **AuthenticationMiddleware** - User authentication
6. **MessageMiddleware** - User messages
7. **Custom middleware** - Application-specific logic
8. **XFrameOptionsMiddleware** - Last for frame protection

## Advanced Middleware Patterns

### Conditional Processing

```python
class APIRateLimitMiddleware:
    """Rate limiting for API endpoints only"""

    def __init__(self, get_response):
        self.get_response = get_response
        self.requests = {}

    def __call__(self, request):
        # Only rate limit API endpoints
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        # Rate limiting logic here
        client_ip = self.get_client_ip(request)
        # ... rate limiting implementation

        return self.get_response(request)
```

### Async Middleware (Django 3.1+)

```python
class AsyncRequestLoggingMiddleware:
    """Async version of request logging"""

    def __init__(self, get_response):
        self.get_response = get_response

    async def __call__(self, request):
        print(f"Async request: {request.method} {request.path}")

        response = await self.get_response(request)

        print(f"Async response: {response.status_code}")
        return response
```

## Signals Reference

Django signals provide a way for decoupled applications to communicate. Here are common patterns:

### Model Signals

```python
# signals.py
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import Article, Notification

@receiver(post_save, sender=Article)
def notify_followers_on_publish(sender, instance, created, **kwargs):
    """Send notifications when article is published"""
    if not created and instance.published:
        # Article was just published
        send_notifications_to_followers(instance)

@receiver(pre_delete, sender=Article)
def cleanup_article_files(sender, instance, **kwargs):
    """Clean up files when article is deleted"""
    if instance.image:
        instance.image.delete()

# Connect signals in apps.py
# apps.py
from django.apps import AppConfig

class ArticlesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'articles'

    def ready(self):
        # Import signals to register them
        import articles.signals
```

### Custom Signals

```python
# signals.py
from django.dispatch import Signal

# Define custom signals
article_viewed = Signal()  # args: ['article', 'user', 'request']
user_registered = Signal()  # args: ['user', 'request']

# Send signals
def view_article(request, article):
    # Track article view
    article_viewed.send(
        sender=article.__class__,
        article=article,
        user=request.user,
        request=request
    )

# Receive custom signals
@receiver(user_registered)
def send_welcome_email(sender, user, request, **kwargs):
    """Send welcome email to new users"""
    send_mail(
        'Welcome!',
        'Thank you for registering.',
        'noreply@myapp.com',
        [user.email]
    )
```

### Signal Best Practices

1. **Use signals for decoupling** - Don't use signals when direct method calls work
2. **Keep signal handlers simple** - Move complex logic to separate functions
3. **Handle exceptions** - Signal handlers shouldn't crash the main flow
4. **Document signal usage** - Document what signals your app sends
5. **Test signal handlers** - Include signal behavior in tests