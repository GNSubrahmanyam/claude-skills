---
title: Performance Middleware Optimization
impact: MEDIUM
impactDescription: Improves request processing speed and reduces overhead
tags: django, performance, middleware, optimization
---

## Performance Middleware Optimization

**Problem:**
Inefficient middleware ordering, unnecessary middleware, or poorly implemented middleware can significantly slow down request processing and increase memory usage.

**Solution:**
Optimize middleware stack by proper ordering, removing unnecessary middleware, and implementing efficient custom middleware patterns.

**Examples:**

❌ **Wrong: Inefficient middleware stack**
```python
# settings.py - Poor middleware ordering
MIDDLEWARE = [
    'django.middleware.csrf.CsrfViewMiddleware',  # Too early
    'myapp.middleware.LoggingMiddleware',  # Expensive logging first
    'django.middleware.common.CommonMiddleware',  # Should be early
    'django.middleware.security.SecurityMiddleware',  # Should be first
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'myapp.middleware.CacheMiddleware',  # Too late
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Inefficient custom middleware
class SlowLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Expensive operation on every request
        import time
        time.sleep(0.1)  # Artificial delay

        # Heavy database query for logging
        LogEntry.objects.create(
            path=request.path,
            user=request.user if request.user.is_authenticated else None,
            timestamp=timezone.now()
        )

        response = self.get_response(request)
        return response
```

✅ **Correct: Optimized middleware stack**
```python
# settings.py - Optimized middleware ordering
MIDDLEWARE = [
    # 1. Security first (minimal processing)
    'django.middleware.security.SecurityMiddleware',

    # 2. Core Django middleware (lightweight)
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',

    # 3. Session and authentication (required for user context)
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',

    # 4. Localization
    'django.middleware.locale.LocaleMiddleware',

    # 5. Messages
    'django.contrib.messages.middleware.MessageMiddleware',

    # 6. Custom middleware (ordered by importance)
    'myapp.middleware.RequestLoggingMiddleware',  # Important logging
    'myapp.middleware.CacheMiddleware',  # Caching
    'myapp.middleware.ThrottlingMiddleware',  # Rate limiting

    # 7. Response processing (last)
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'myapp.middleware.ResponseCompressionMiddleware',
]

# Optimized custom middleware
class EfficientLoggingMiddleware:
    """Efficient request logging with buffering"""

    def __init__(self, get_response):
        self.get_response = get_response
        self.buffer = []  # Buffer log entries
        self.buffer_size = 100

    def __call__(self, request):
        start_time = time.time()

        response = self.get_response(request)

        # Fast logging - add to buffer
        self.buffer.append({
            'path': request.path,
            'method': request.method,
            'user_id': request.user.id if request.user.is_authenticated else None,
            'duration': time.time() - start_time,
            'status_code': response.status_code,
            'timestamp': timezone.now(),
        })

        # Flush buffer when full
        if len(self.buffer) >= self.buffer_size:
            self._flush_buffer()

        return response

    def _flush_buffer(self):
        """Bulk insert log entries"""
        if self.buffer:
            LogEntry.objects.bulk_create([
                LogEntry(**entry) for entry in self.buffer
            ])
            self.buffer.clear()

class CacheMiddleware:
    """Efficient caching middleware"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Quick cache key generation
        cache_key = self._get_cache_key(request)

        # Check cache first
        cached_response = cache.get(cache_key)
        if cached_response and self._is_cacheable(request):
            return cached_response

        response = self.get_response(request)

        # Cache successful GET responses
        if (request.method == 'GET' and
            response.status_code == 200 and
            self._is_cacheable(request)):
            cache.set(cache_key, response, 300)  # 5 minutes

        return response

    def _get_cache_key(self, request):
        """Generate cache key from request"""
        return f"response:{request.path}:{hash(frozenset(request.GET.items()))}"

    def _is_cacheable(self, request):
        """Determine if request should be cached"""
        # Don't cache authenticated requests
        if request.user.is_authenticated:
            return False

        # Don't cache POST/PUT/DELETE
        if request.method not in ['GET', 'HEAD']:
            return False

        # Don't cache admin requests
        if request.path.startswith('/admin/'):
            return False

        return True
```

**Middleware Performance Patterns:**
```python
# Conditional processing middleware
class APIMiddleware:
    """Only process API requests"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Quick check - skip if not API
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        # API-specific processing
        request.is_api_request = True
        # ... API processing logic

        response = self.get_response(request)
        return response

# Lazy loading middleware
class LazyLoadingMiddleware:
    """Defer expensive operations"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Defer expensive operation to after response
        if hasattr(response, 'add_post_render_callback'):
            response.add_post_render_callback(self._post_process)
        else:
            # Fallback for non-template responses
            self._post_process(response)

        return response

    def _post_process(self, response):
        """Expensive operation after response is sent"""
        # This runs after response is sent to client
        self._send_analytics()
        self._cleanup_temp_files()

# Async middleware (Django 3.1+)
class AsyncLoggingMiddleware:
    """Async middleware for I/O operations"""

    def __init__(self, get_response):
        self.get_response = get_response

    async def __call__(self, request):
        # Log request asynchronously
        await self._log_request_async(request)

        response = await self.get_response(request)

        # Log response asynchronously
        await self._log_response_async(response)

        return response

    async def _log_request_async(self, request):
        """Async request logging"""
        # Use async database operations or external services
        pass

    async def _log_response_async(self, response):
        """Async response logging"""
        pass
```

**Middleware Removal and Optimization:**
```python
# Conditional middleware loading
def get_middleware(debug=False, api_only=False):
    """Get middleware based on environment"""

    middleware = [
        'django.middleware.security.SecurityMiddleware',
        'django.middleware.common.CommonMiddleware',
    ]

    if not api_only:
        middleware.extend([
            'django.middleware.csrf.CsrfViewMiddleware',
            'django.contrib.sessions.middleware.SessionMiddleware',
            'django.contrib.auth.middleware.AuthenticationMiddleware',
        ])

    if debug:
        middleware.append('myapp.middleware.DebugMiddleware')
    else:
        middleware.append('myapp.middleware.ProductionMiddleware')

    middleware.extend([
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
    ])

    return middleware

# settings.py
MIDDLEWARE = get_middleware(DEBUG, API_ONLY)
```

**Common mistakes:**
- Wrong middleware ordering causing failures
- Expensive operations in every request
- Too many middleware layers
- Synchronous I/O in middleware
- Not caching middleware results
- Missing conditional processing

**When to apply:**
- Optimizing request processing speed
- Reducing middleware overhead
- Improving application performance
- Debugging middleware-related issues
- Scaling high-traffic applications