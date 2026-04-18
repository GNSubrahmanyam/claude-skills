# Impact: HIGH

## Problem

Django applications using asynchronous features can suffer from performance degradation, blocking operations, and thread-safety issues if async code is not properly implemented. Common issues include mixing synchronous and asynchronous code incorrectly, failing to use proper adapters, and not handling database operations asynchronously.

## Solution

Use async views for concurrent operations:

```python
from django.http import JsonResponse
import asyncio

async def async_view(request):
    # Concurrent async operations
    result1 = await some_async_api_call()
    result2 = await another_async_api_call()
    
    return JsonResponse({"data": result1 + result2})
```

Use sync_to_async for calling synchronous Django code:

```python
from asgiref.sync import sync_to_async

async def my_view(request):
    # Call sync ORM operations asynchronously
    users = await sync_to_async(list)(User.objects.all())
    
    # Call custom sync functions
    result = await sync_to_async(process_data, thread_sensitive=True)(data)
    
    return JsonResponse({"users": users, "result": result})
```

Use async ORM queries where available:

```python
async def async_orm_view(request):
    # Async database queries
    async for author in Author.objects.filter(name__startswith="A"):
        books = await author.books.all()
        # Process books
    
    # Async creation
    book = await Book.objects.acreate(title="Async Book", author=author)
    
    # Async aggregation
    count = await Book.objects.acount()
    
    return JsonResponse({"count": count})
```

Deploy with ASGI for full async benefits:

```python
# asgi.py
import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

application = get_asgi_application()
```

Handle async safety properly:

```python
# Avoid calling sync-only operations directly in async context
# This will raise SynchronousOnlyOperation
# connection.cursor()  # DON'T DO THIS

# Instead, wrap in sync_to_async
async def safe_db_operation():
    return await sync_to_async(some_sync_db_function)()
```

## Common Mistakes

- Calling synchronous Django ORM operations directly in async views
- Not using sync_to_async when calling sync functions from async code
- Mixing async and sync database connections in the same request
- Forgetting to deploy with ASGI for async benefits
- Using synchronous middleware with async views
- Not handling asyncio.CancelledError for long-running requests
- Passing thread-sensitive objects between sync and async contexts

## When to Apply

- Building high-performance web applications with many concurrent connections
- Integrating with async-native Python libraries (httpx, aiohttp, etc.)
- Implementing real-time features like WebSockets
- Handling external API calls that would benefit from concurrency
- Using Django 3.1+ with ASGI deployment
- Creating applications that need to handle streaming responses or long polling