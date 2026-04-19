# Impact: MEDIUM

## Problem

Django applications often encounter errors that need proper handling to prevent crashes, security vulnerabilities, and poor user experience. Without proper exception handling and error views, applications can expose sensitive information, crash unexpectedly, or provide confusing error messages to users.

## Solution

Use Django's built-in exceptions for common HTTP errors:

```python
from django.http import Http404
from django.core.exceptions import PermissionDenied, SuspiciousOperation

def my_view(request, id):
    try:
        obj = MyModel.objects.get(pk=id)
    except MyModel.DoesNotExist:
        raise Http404("Object not found")
    
    if not request.user.has_perm('view_object', obj):
        raise PermissionDenied("You don't have permission to view this")
    
    # SuspiciousOperation for security-related errors
    if some_suspicious_condition:
        raise SuspiciousOperation("Invalid request detected")
    
    return render(request, 'template.html', {'obj': obj})
```

Create custom error views in your URLconf:

```python
# urls.py
from django.urls import path
from . import views

handler400 = 'myapp.views.bad_request'
handler403 = 'myapp.views.permission_denied'
handler404 = 'myapp.views.page_not_found'
handler500 = 'myapp.views.server_error'

# views.py
from django.shortcuts import render
from django.http import HttpResponseServerError

def bad_request(request, exception):
    return render(request, '400.html', status=400)

def permission_denied(request, exception):
    return render(request, '403.html', status=403)

def page_not_found(request, exception):
    return render(request, '404.html', status=404)

def server_error(request):
    return render(request, '500.html', status=500)
```

Handle exceptions in views with proper fallbacks:

```python
from django.db import IntegrityError, DatabaseError
from django.http import HttpResponseBadRequest

def create_object(request):
    try:
        # Database operations that might fail
        obj = MyModel.objects.create(name=request.POST['name'])
        return redirect('success')
    except IntegrityError:
        # Handle unique constraint violations
        return HttpResponseBadRequest("Object with this name already exists")
    except DatabaseError:
        # Handle general database errors
        logger.error("Database error in create_object", exc_info=True)
        return HttpResponseServerError("Database temporarily unavailable")
    except KeyError:
        # Handle missing form data
        return HttpResponseBadRequest("Required field missing")
```

Use Django's exception classes for specific scenarios:

```python
from django.core.exceptions import (
    ValidationError, ObjectDoesNotExist, MultipleObjectsReturned,
    FieldDoesNotExist, BadRequest, ImproperlyConfigured
)

def process_data(request):
    try:
        # Validate input
        if not request.POST.get('email'):
            raise ValidationError("Email is required")
        
        # Check for existing objects
        user = User.objects.get(email=request.POST['email'])
        
    except ValidationError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except ObjectDoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except MultipleObjectsReturned:
        logger.warning("Multiple users with same email")
        return JsonResponse({'error': 'Multiple users found'}, status=400)
```

## Common Mistakes

- Raising generic Exception instead of specific Django exceptions
- Not creating custom error templates for production
- Exposing stack traces in error responses
- Not logging exceptions for debugging
- Using try/except to hide all errors without proper handling
- Not testing error scenarios
- Forgetting to set proper HTTP status codes

## When to Apply

- Building any Django application that handles user input
- Creating REST APIs that need proper error responses
- Implementing authentication and authorization
- Working with database operations
- Processing forms and user data
- Implementing custom business logic with potential failure points