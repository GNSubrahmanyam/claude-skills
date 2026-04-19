---
title: Middleware Basics
impact: MEDIUM
impactDescription: Enables proper request/response processing
tags: django, middleware
---

## Middleware Basics

**Problem:**
Middleware is essential for request/response processing in Django applications, but incorrect implementation can cause performance issues, broken request handling, and unexpected behavior. Developers often struggle with middleware ordering, async compatibility, and proper exception handling.

**Solution:**
Create middleware as a factory function or class:

```python
# Function-based middleware
def simple_middleware(get_response):
    def middleware(request):
        # Pre-processing
        print(f"Request to {request.path}")
        
        response = get_response(request)
        
        # Post-processing
        print(f"Response status: {response.status_code}")
        
        return response
    return middleware

# Class-based middleware
class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print(f"Request: {request.method} {request.path}")
        response = self.get_response(request)
        print(f"Response: {response.status_code}")
        return response
```

Add to MIDDLEWARE setting in correct order:

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Your custom middleware here
    'myapp.middleware.RequestLoggingMiddleware',
]
```

Use special middleware hooks for advanced processing:

```python
class AdvancedMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Called before view execution
        if request.user.is_authenticated:
            # Custom logic for authenticated users
            pass
        return None  # Continue to view

    def process_exception(self, request, exception):
        # Handle exceptions from view
        if isinstance(exception, ValueError):
            return HttpResponse("Custom error", status=400)
        return None  # Let other middleware handle

    def process_template_response(self, request, response):
        # Modify TemplateResponse objects
        if hasattr(response, 'context_data'):
            response.context_data['custom_var'] = 'value'
        return response
```

Support both sync and async requests:

```python
from asgiref.sync import iscoroutinefunction
from django.utils.decorators import sync_and_async_middleware

@sync_and_async_middleware
def universal_middleware(get_response):
    if iscoroutinefunction(get_response):
        async def async_middleware(request):
            # Async processing
            response = await get_response(request)
            return response
        return async_middleware
    else:
        def sync_middleware(request):
            # Sync processing
            response = get_response(request)
            return response
        return sync_middleware
```

## Common Mistakes

- Incorrect middleware ordering (e.g., AuthMiddleware before SessionMiddleware)
- Not handling streaming responses properly
- Blocking operations in async middleware
- Modifying request.POST before view execution
- Raising exceptions in middleware without proper handling
- Not testing middleware with different request types
- Forgetting to return responses from middleware hooks

## When to Apply

- Implementing custom authentication or authorization
- Adding request/response logging or monitoring
- Modifying requests before they reach views
- Handling exceptions globally
- Implementing rate limiting or throttling
- Adding custom headers or CORS handling
- Creating API versioning or content negotiation