---
title: Conditional View Processing
impact: MEDIUM
impactDescription: Enables efficient HTTP caching and reduces bandwidth usage
tags: django, views, conditional, caching, performance
---

## Conditional View Processing

**Problem:**
Django applications often serve content that hasn't changed since the client's last request, wasting bandwidth and server resources. Without conditional view processing, every request results in full response generation and transmission, even when the content is unchanged. Developers struggle with implementing proper HTTP caching headers and understanding when to use ETags versus Last-Modified.

**Solution:**
Use the `condition` decorator for efficient conditional processing:

```python
from django.views.decorators.http import condition
from django.utils.http import http_date

def article_last_modified(request, article_id):
    """Compute last modification time quickly"""
    try:
        article = Article.objects.only('modified').get(pk=article_id)
        return article.modified
    except Article.DoesNotExist:
        return None

def article_etag(request, article_id):
    """Compute ETag for article"""
    try:
        article = Article.objects.only('modified', 'version').get(pk=article_id)
        return f"{article_id}-{article.version}-{int(article.modified.timestamp())}"
    except Article.DoesNotExist:
        return None

@condition(last_modified_func=article_last_modified, etag_func=article_etag)
def article_detail(request, article_id):
    """View that uses conditional processing"""
    article = get_object_or_404(Article, pk=article_id)
    return render(request, 'article/detail.html', {'article': article})
```

Use shortcut decorators when only one condition is needed:

```python
from django.views.decorators.http import last_modified, etag

@last_modified(article_last_modified)
def article_detail(request, article_id):
    # Only checks Last-Modified header
    article = get_object_or_404(Article, pk=article_id)
    return render(request, 'article/detail.html', {'article': article})

@etag(article_etag)
def article_detail(request, article_id):
    # Only checks ETag header
    article = get_object_or_404(Article, pk=article_id)
    return render(request, 'article/detail.html', {'article': article})
```

Implement conditional processing for other HTTP methods:

```python
@condition(etag_func=resource_etag)
def update_resource(request, resource_id):
    """Use conditional processing for PUT/POST operations"""
    if request.method == 'PUT':
        # Check If-Match or If-Unmodified-Since headers
        resource = get_object_or_404(Resource, pk=resource_id)
        # Update logic here
        return JsonResponse({'status': 'updated'})

    elif request.method == 'GET':
        resource = get_object_or_404(Resource, pk=resource_id)
        return JsonResponse({'data': resource.data})
```

Order decorators correctly with caching decorators:

```python
# Correct order: vary/cache decorators before condition
from django.views.decorators.cache import cache_control
from django.views.decorators.vary import vary_on_headers

@vary_on_headers('Accept-Language')
@cache_control(max_age=3600)
@condition(last_modified_func=page_last_modified)
def article_list(request):
    articles = Article.objects.published()
    return render(request, 'article/list.html', {'articles': articles})
```

## Common Mistakes

- Placing condition decorators above vary/cache decorators
- Using expensive operations in ETag/last-modified functions
- Not handling both ETag and Last-Modified for maximum compatibility
- Forgetting that condition decorators skip decorators below them on 304 responses
- Using condition decorators on views that modify data
- Not testing conditional responses (304 status codes)
- Assuming all clients send conditional headers
- Using condition decorators inappropriately for dynamic content

## When to Apply

- Serving static or rarely changing content (articles, blog posts, documentation)
- Implementing REST APIs with proper HTTP caching
- Reducing bandwidth usage for mobile applications
- Optimizing performance for high-traffic content
- Implementing proper HTTP caching for CDNs and proxies
- When content generation is expensive and changes infrequently
- Building APIs that support conditional requests (PUT/POST/DELETE)