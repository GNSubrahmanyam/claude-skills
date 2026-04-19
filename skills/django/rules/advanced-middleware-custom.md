---
title: Advanced Middleware Custom
impact: LOW
impactDescription: Enables request/response processing customization and cross-cutting concerns
tags: django, middleware, custom, advanced
---

## Advanced Middleware Custom

**Problem:**
Built-in Django middleware may not cover specific application requirements. Cross-cutting concerns like request logging, response modification, or custom authentication need custom middleware implementation.

**Solution:**
Create custom middleware classes that follow Django's middleware interface to handle specific application requirements.

**Examples:**

❌ **Wrong: Scattered cross-cutting logic**
```python
# views.py - Logic scattered across views
def my_view(request):
    # Request logging
    logger.info(f"Request to {request.path} from {request.META.get('REMOTE_ADDR')}")

    # Custom authentication check
    if not self._check_custom_auth(request):
        return HttpResponseForbidden()

    # Response processing
    response = render(request, 'template.html')

    # Add custom headers
    response['X-Custom-Header'] = 'value'

    # Response logging
    logger.info(f"Response status {response.status_code}")

    return response

# Similar logic repeated in every view...
```

✅ **Correct: Custom middleware**
```python
# middleware.py
import time
import logging
from django.http import HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(MiddlewareMixin):
    """Log all incoming requests"""

    def process_request(self, request):
        """Called before view processing"""
        request.start_time = time.time()

        logger.info(
            f"Request: {request.method} {request.path} "
            f"from {self._get_client_ip(request)} "
            f"user: {request.user if request.user.is_authenticated else 'anonymous'}"
        )

        return None  # Continue processing

    def process_response(self, request, response):
        """Called after view processing"""
        duration = time.time() - getattr(request, 'start_time', time.time())

        logger.info(
            f"Response: {response.status_code} for {request.path} "
            f"in {duration:.3f}s"
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

class CustomAuthenticationMiddleware(MiddlewareMixin):
    """Custom authentication for specific paths"""

    def process_request(self, request):
        """Check custom authentication for protected paths"""
        protected_paths = ['/admin/', '/api/private/']

        if any(request.path.startswith(path) for path in protected_paths):
            # Custom authentication logic
            if not self._is_authenticated(request):
                return HttpResponseForbidden("Custom authentication required")

        return None

    def _is_authenticated(self, request):
        """Custom authentication check"""
        # Check for custom token or other auth method
        token = request.headers.get('X-API-Token')
        if token:
            # Validate token
            return self._validate_token(token)
        return False

    def _validate_token(self, token):
        """Validate custom token"""
        # Implementation depends on your auth system
        return token == 'valid-token'  # Simplified example

class ResponseModificationMiddleware(MiddlewareMixin):
    """Modify responses globally"""

    def process_response(self, request, response):
        """Add custom headers and modify responses"""

        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-Custom-App-Version'] = '1.0.0'

        # Modify response for API calls
        if request.path.startswith('/api/'):
            response['Content-Type'] = 'application/json'

            # Add API-specific headers
            response['X-API-Version'] = 'v1'
            response['Access-Control-Allow-Origin'] = '*'

        # Compress response for large content
        if len(response.content) > 1024:  # 1KB
            response['Content-Encoding'] = 'gzip'

        return response

class RequestCachingMiddleware(MiddlewareMixin):
    """Cache requests to avoid duplicate processing"""

    def __init__(self, get_response):
        self.get_response = get_response
        self.cache = {}

    def __call__(self, request):
        # Create cache key
        cache_key = self._get_cache_key(request)

        # Check cache for GET requests
        if request.method == 'GET' and cache_key in self.cache:
            cached_response = self.cache[cache_key]
            # Check if cache is still valid
            if self._is_cache_valid(cached_response):
                return cached_response['response']

        # Process request
        response = self.get_response(request)

        # Cache successful GET responses
        if request.method == 'GET' and response.status_code == 200:
            self.cache[cache_key] = {
                'response': response,
                'timestamp': time.time(),
                'ttl': 300  # 5 minutes
            }

        return response

    def _get_cache_key(self, request):
        """Generate cache key for request"""
        return f"{request.method}:{request.path}:{hash(frozenset(request.GET.items()))}"

    def _is_cache_valid(self, cached_item):
        """Check if cached item is still valid"""
        return time.time() - cached_item['timestamp'] < cached_item['ttl']

class ExceptionHandlingMiddleware(MiddlewareMixin):
    """Handle exceptions globally"""

    def process_exception(self, request, exception):
        """Handle unhandled exceptions"""
        logger.error(
            f"Unhandled exception in {request.path}: {exception}",
            exc_info=True
        )

        # Return custom error response
        if request.path.startswith('/api/'):
            return JsonResponse({
                'error': 'Internal server error',
                'code': 'INTERNAL_ERROR'
            }, status=500)
        else:
            return render(request, 'errors/500.html', status=500)

class MaintenanceModeMiddleware(MiddlewareMixin):
    """Enable maintenance mode"""

    def process_request(self, request):
        """Check if site is in maintenance mode"""
        maintenance_file = Path(settings.BASE_DIR / 'maintenance.txt')

        if maintenance_file.exists():
            # Allow access to admin and static files
            if (request.path.startswith('/admin/') or
                request.path.startswith('/static/') or
                request.user.is_staff):
                return None

            # Show maintenance page
            return render(request, 'maintenance.html', status=503)

        return None
```

**Middleware Ordering and Configuration:**
```python
# settings.py - Middleware configuration
MIDDLEWARE = [
    # Security first
    'django.middleware.security.SecurityMiddleware',

    # Custom middleware in correct order
    'myapp.middleware.MaintenanceModeMiddleware',      # Check maintenance first
    'myapp.middleware.RequestLoggingMiddleware',       # Log all requests
    'myapp.middleware.CustomAuthenticationMiddleware', # Auth checks

    # Django core middleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.locale.LocaleMiddleware',

    # Response processing
    'myapp.middleware.ResponseModificationMiddleware',  # Modify responses
    'myapp.middleware.RequestCachingMiddleware',        # Cache responses

    # Error handling last
    'myapp.middleware.ExceptionHandlingMiddleware',     # Handle exceptions
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

**Testing Custom Middleware:**
```python
# tests/test_middleware.py
from django.test import TestCase, RequestFactory
from django.http import HttpResponse
from myapp.middleware import RequestLoggingMiddleware, ResponseModificationMiddleware

class MiddlewareTestCase(TestCase):
    """Test custom middleware"""

    def setUp(self):
        self.factory = RequestFactory()

    def test_request_logging_middleware(self):
        """Test request logging middleware"""
        middleware = RequestLoggingMiddleware(lambda r: HttpResponse())
        request = self.factory.get('/test/')

        # Process request
        result = middleware.process_request(request)

        # Should not return response (continues processing)
        self.assertIsNone(result)

        # Check that start_time was set
        self.assertIn('start_time', request.__dict__)

    def test_response_modification_middleware(self):
        """Test response modification middleware"""
        def dummy_get_response(request):
            return HttpResponse("Test content")

        middleware = ResponseModificationMiddleware(dummy_get_response)
        request = self.factory.get('/test/')
        response = middleware(request)

        # Check custom headers were added
        self.assertEqual(response['X-Custom-App-Version'], '1.0.0')
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')

    def test_api_response_modification(self):
        """Test API-specific response modification"""
        def dummy_get_response(request):
            return HttpResponse('{"data": "test"}')

        middleware = ResponseModificationMiddleware(dummy_get_response)
        request = self.factory.get('/api/test/')
        response = middleware(request)

        # Check API headers
        self.assertEqual(response['X-API-Version'], 'v1')
        self.assertEqual(response['Content-Type'], 'application/json')
```

**Common mistakes:**
- Wrong middleware ordering causing failures
- Not handling exceptions in middleware
- Creating middleware that blocks request processing
- Not testing middleware behavior
- Overusing middleware for simple view logic
- Missing error handling in custom middleware

**When to apply:**
- Implementing cross-cutting concerns
- Custom authentication or authorization
- Request/response logging and monitoring
- Response modification or compression
- Exception handling and error pages
- Implementing maintenance mode or feature flags