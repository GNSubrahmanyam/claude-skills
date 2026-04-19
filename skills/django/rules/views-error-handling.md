# Views Error Handling (HIGH)

**Impact:** HIGH - Provides better user experience and prevents information leakage

**Problem:**
Poor error handling leads to 500 errors, confusing users, exposing sensitive information, and hiding actual problems from developers.

**Solution:**
Implement proper error handling with appropriate HTTP status codes, user-friendly messages, and proper logging. Use Django's built-in error handling mechanisms.

**Examples:**

❌ **Wrong: Poor error handling**
```python
def article_detail(request, pk):
    # Crashes with 500 if article doesn't exist
    article = Article.objects.get(pk=pk)  # No error handling!
    return render(request, 'article/detail.html', {'article': article})

def api_create_user(request):
    # Exposes raw exceptions to users
    user = User.objects.create(
        username=request.POST['username'],
        email=request.POST['email']
    )
    return JsonResponse({'id': user.id})
```

✅ **Correct: Comprehensive error handling**
```python
from django.http import Http404, HttpResponseBadRequest, JsonResponse
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import IntegrityError
import logging

logger = logging.getLogger(__name__)

def article_detail(request, pk):
    try:
        # Use get_object_or_404 for automatic 404 handling
        article = get_object_or_404(
            Article,
            pk=pk,
            published=True  # Add business logic filtering
        )
    except Http404:
        # Custom 404 handling if needed
        logger.warning(f"Article {pk} not found or not published")
        return render(request, '404.html', status=404)

    # Check permissions
    if not article.can_view(request.user):
        raise PermissionDenied("You don't have permission to view this article")

    try:
        # Handle potential errors in related operations
        related_articles = article.get_related_articles()
    except Exception as e:
        # Log error but don't crash the page
        logger.error(f"Error getting related articles for {article.id}: {e}")
        related_articles = []  # Provide fallback

    return render(request, 'article/detail.html', {
        'article': article,
        'related_articles': related_articles
    })

def api_create_user(request):
    if request.method != 'POST':
        return JsonResponse(
            {'error': 'Method not allowed'},
            status=405
        )

    try:
        # Validate required fields
        username = request.POST.get('username')
        email = request.POST.get('email')

        if not username or not email:
            return JsonResponse(
                {'error': 'Username and email are required'},
                status=400
            )

        # Create user with proper error handling
        user = User.objects.create_user(
            username=username,
            email=email,
            password=request.POST.get('password')
        )

        logger.info(f"Created user {user.username} ({user.id})")
        return JsonResponse({
            'id': user.id,
            'username': user.username,
            'email': user.email
        }, status=201)

    except IntegrityError as e:
        # Handle unique constraint violations
        logger.warning(f"Failed to create user {username}: {e}")
        if 'username' in str(e).lower():
            return JsonResponse(
                {'error': 'Username already exists'},
                status=409
            )
        return JsonResponse(
            {'error': 'Email already exists'},
            status=409
        )

    except ValidationError as e:
        # Handle field validation errors
        logger.warning(f"Validation error creating user: {e}")
        return JsonResponse({
            'error': 'Invalid data provided',
            'details': str(e)
        }, status=400)

    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(f"Unexpected error creating user: {e}")
        return JsonResponse(
            {'error': 'Internal server error'},
            status=500
        )

# Custom exception handler for API views
def api_error_handler(view_func):
    """Decorator to handle common API errors"""
    def wrapper(request, *args, **kwargs):
        try:
            return view_func(request, *args, **kwargs)
        except ValidationError as e:
            return JsonResponse({'error': str(e)}, status=400)
        except PermissionDenied as e:
            return JsonResponse({'error': str(e)}, status=403)
        except Exception as e:
            logger.error(f"Unhandled error in {view_func.__name__}: {e}")
            return JsonResponse({'error': 'Internal server error'}, status=500)
    return wrapper
```

**Common mistakes:**
- Not using `get_object_or_404()` for model lookups
- Exposing raw exceptions to users
- Not logging errors properly
- Returning generic 500 errors without logging
- Not handling validation errors gracefully
- Mixing business logic with error handling

**When to apply:**
- Implementing any view that accesses the database
- Creating API endpoints
- Building user-facing functionality
- During debugging and troubleshooting
- When reviewing error logs