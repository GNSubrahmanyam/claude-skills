# Django Redis Caching (HIGH)

**Impact:** HIGH - Dramatically improves Django application performance and scalability

**Problem:**
Django applications suffer from slow database queries, expensive computations, and poor response times without proper caching. Inefficient caching strategies lead to cache stampedes, stale data, and memory waste.

**Solution:**
Implement comprehensive Redis caching in Django with proper cache keys, invalidation strategies, and performance optimization.

❌ **Wrong: Basic Django caching**
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# views.py
from django.core.cache import cache

def my_view(request):
    data = cache.get('my_key')
    if not data:
        data = expensive_operation()  # Cache miss - slow!
        cache.set('my_key', data, 300)
    return render(request, 'template.html', {'data': data})
```

✅ **Correct: Advanced Django Redis caching**
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'COMPRESSION': 'django_redis.compressors.zlib.ZlibCompressor',
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 20,
                'decode_responses': True,
            },
        },
        'KEY_PREFIX': 'myapp',
        'TIMEOUT': 300,
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/2',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'sessions',
    }
}

# Cache versioning for invalidation
CACHE_VERSION = 1

# models.py
from django.core.cache import cache
from django.db import models
import hashlib

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey('User', on_delete=models.CASCADE)
    published_at = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)

    def get_cache_key(self):
        """Generate cache key for this article"""
        return f"article:{CACHE_VERSION}:{self.pk}"

    def save(self, *args, **kwargs):
        """Invalidate cache on save"""
        super().save(*args, **kwargs)
        cache.delete(self.get_cache_key())
        # Invalidate related caches
        cache.delete(f"articles:author:{self.author_id}")
        cache.delete(f"articles:recent:{CACHE_VERSION}")

    @classmethod
    def get_cached(cls, article_id):
        """Get article with caching"""
        cache_key = f"article:{CACHE_VERSION}:{article_id}"

        article = cache.get(cache_key)
        if article is None:
            try:
                article = cls.objects.select_related('author').get(pk=article_id)
                cache.set(cache_key, article, 3600)  # 1 hour
            except cls.DoesNotExist:
                # Cache negative result for 5 minutes
                cache.set(cache_key, None, 300)
                return None

        return article

# views.py
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from django.utils.decorators import method_decorator

# View-level caching
@cache_page(60 * 15)  # 15 minutes
def article_list(request):
    """Cache entire view response"""
    articles = Article.objects.select_related('author').filter(
        published_at__isnull=False
    ).order_by('-published_at')[:10]

    return render(request, 'articles/list.html', {
        'articles': articles
    })

# Fragment caching
def article_detail(request, article_id):
    """Cache expensive operations"""
    # Try to get from cache first
    cache_key = f"article_detail:{CACHE_VERSION}:{article_id}"
    context = cache.get(cache_key)

    if context is None:
        article = Article.get_cached(article_id)
        if not article:
            raise Http404

        # Cache expensive computations
        related_articles = cache.get_or_set(
            f"related:{article_id}",
            lambda: get_related_articles(article),
            3600
        )

        author_stats = cache.get_or_set(
            f"author_stats:{article.author_id}",
            lambda: calculate_author_stats(article.author),
            1800
        )

        context = {
            'article': article,
            'related_articles': related_articles,
            'author_stats': author_stats,
        }

        cache.set(cache_key, context, 1800)  # 30 minutes

    return render(request, 'articles/detail.html', context)

# Template fragment caching
# templates/articles/detail.html
{% load cache %}
{% cache 900 article_cache_key article.pk %}
  <!-- Expensive template rendering -->
  <div class="article-content">
    {{ article.content|linebreaks }}
  </div>
{% endcache %}

# Database query caching
class ArticleQuerySet(models.QuerySet):
    def published(self):
        """Cache published articles query"""
        cache_key = f"articles:published:{CACHE_VERSION}"
        articles = cache.get(cache_key)

        if articles is None:
            articles = list(self.filter(published_at__isnull=False))
            cache.set(cache_key, articles, 600)  # 10 minutes

        return articles

# API response caching
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

class ArticleListView(APIView):
    @method_decorator(cache_page(60 * 5))  # 5 minutes
    def get(self, request):
        articles = Article.objects.filter(published_at__isnull=False)[:20]
        serializer = ArticleSerializer(articles, many=True)
        return Response(serializer.data)

# Cache invalidation patterns
class CacheInvalidationManager:
    """Manage cache invalidation across the application"""

    @staticmethod
    def invalidate_user_cache(user_id):
        """Invalidate all user-related caches"""
        cache.delete_many([
            f"user:{user_id}",
            f"user:profile:{user_id}",
            f"user:articles:{user_id}",
        ])

    @staticmethod
    def invalidate_article_cache(article_id):
        """Invalidate article-related caches"""
        cache.delete_many([
            f"article:{CACHE_VERSION}:{article_id}",
            f"article:detail:{CACHE_VERSION}:{article_id}",
            f"related:{article_id}",
        ])

    @staticmethod
    def invalidate_pattern(pattern):
        """Invalidate all keys matching pattern"""
        # Note: This requires redis-py or django-redis specific methods
        # For django-redis:
        from django_redis import get_redis_connection
        redis_client = get_redis_connection("default")
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)

# Low-level cache operations
def cache_with_versioning(key_suffix, data_func, timeout=300):
    """Cache with versioning support"""
    cache_key = f"{CACHE_VERSION}:{key_suffix}"

    data = cache.get(cache_key)
    if data is None:
        data = data_func()
        cache.set(cache_key, data, timeout)

    return data

# Cache warming on startup
from django.apps import AppConfig

class ArticlesConfig(AppConfig):
    def ready(self):
        # Warm up frequently accessed caches
        from django.core.cache import cache
        import threading

        def warm_cache():
            try:
                # Preload popular articles
                popular_articles = Article.objects.filter(
                    published_at__isnull=False
                ).order_by('-views')[:5]

                for article in popular_articles:
                    cache.set(
                        f"article:{CACHE_VERSION}:{article.pk}",
                        article,
                        3600
                    )
            except Exception as e:
                # Log error but don't break startup
                import logging
                logging.getLogger(__name__).warning(f"Cache warming failed: {e}")

        # Start cache warming in background
        thread = threading.Thread(target=warm_cache, daemon=True)
        thread.start()
```

**Common mistakes:**
- Not versioning cache keys for invalidation
- Caching large objects causing memory issues
- Not invalidating related caches
- Using wrong cache backends for Redis
- Missing compression for large cached data

**When to apply:**
- Database query result caching
- Expensive computation caching
- API response caching
- Session storage
- Template fragment caching