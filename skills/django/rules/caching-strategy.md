---
title: Caching Strategy Implementation
impact: MEDIUM
impactDescription: Improves application performance and reduces server load
tags: django, caching, performance, optimization
---

## Caching Strategy Implementation

**Problem:**
Expensive operations repeated on every request waste resources and slow down applications. Database queries, API calls, and complex computations can bring servers to their knees without caching.

**Solution:**
Implement appropriate caching strategies at multiple levels: database queries, view responses, template fragments, and low-level computations.

**Examples:**

❌ **Wrong: No caching**
```python
def get_popular_articles():
    """Expensive operation on every request"""
    return Article.objects.filter(
        published=True
    ).annotate(
        views_count=Count('views')
    ).order_by('-views_count')[:10]  # Database query every time

def article_detail(request, pk):
    article = get_object_or_404(Article, pk=pk)
    # Complex computation on every view
    related_articles = article.get_related_articles()  # Expensive calculation
    return render(request, 'article/detail.html', {
        'article': article,
        'related_articles': related_articles,
    })
```

✅ **Correct: Multi-level caching**
```python
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.core.cache.backends.base import DEFAULT_TIMEOUT

CACHE_TIMEOUT = 60 * 15  # 15 minutes

# 1. Page-level caching for public content
@cache_page(CACHE_TIMEOUT)
def article_list(request):
    """Cache entire page for anonymous users"""
    articles = Article.objects.filter(published=True).select_related('author')[:20]
    return render(request, 'articles/list.html', {'articles': articles})

# 2. Object-level caching for expensive computations
class Article(models.Model):
    @property
    def word_count(self):
        """Cache expensive computation"""
        cache_key = f'article_word_count_{self.id}'
        count = cache.get(cache_key)

        if count is None:
            count = len(self.content.split())
            cache.set(cache_key, count, CACHE_TIMEOUT)

        return count

    def get_related_articles(self):
        """Cache complex relationships"""
        cache_key = f'article_related_{self.id}'
        related = cache.get(cache_key)

        if related is None:
            # Expensive computation
            related = Article.objects.filter(
                category=self.category
            ).exclude(id=self.id).select_related('author')[:5]

            # Cache the queryset result as list
            cache.set(cache_key, list(related), CACHE_TIMEOUT)

        return related

# 3. Function-level caching
from functools import lru_cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

@lru_cache(maxsize=128)
def get_category_stats(category_id):
    """Cache expensive aggregations"""
    return Article.objects.filter(category_id=category_id).aggregate(
        total_views=Sum('views'),
        article_count=Count('id'),
        avg_rating=Avg('ratings__score')
    )

# 4. Template fragment caching
{% comment %} templates/article/detail.html {% endcomment %}
{% load cache %}

<article>
    <h1>{{ article.title }}</h1>

    {# Cache expensive template rendering #}
    {% cache 600 article_content article.id %}
        <div class="content">
            {{ article.content|linebreaks|markdown }}
        </div>
    {% endcache %}

    {# Cache related articles section #}
    {% cache 300 related_articles article.id article.updated_date %}
        <div class="related">
            <h3>Related Articles</h3>
            {% for related in article.get_related_articles %}
                <a href="{% url 'article_detail' related.id %}">{{ related.title }}</a>
            {% endfor %}
        </div>
    {% endcache %}
</article>

# 5. Database query result caching
def get_featured_articles():
    """Cache database query results"""
    cache_key = 'featured_articles'
    articles = cache.get(cache_key)

    if articles is None:
        articles = list(Article.objects.select_related('author').filter(
            featured=True,
            published=True
        ).order_by('-published_date')[:5])

        cache.set(cache_key, articles, CACHE_TIMEOUT)

    return articles

# 6. API response caching
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

class ArticleListView(ListView):
    model = Article

    @method_decorator(cache_page(60 * 5))  # 5 minutes
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

# 7. Cache invalidation strategies
def publish_article(article):
    """Invalidate related caches when publishing"""
    # Clear specific caches
    cache.delete(f'article_related_{article.id}')
    cache.delete('featured_articles')
    cache.delete_pattern(f'article_content_{article.id}')

    # Clear category caches
    if article.category:
        cache.delete(f'category_articles_{article.category.id}')

    # Update article and mark as published
    article.published = True
    article.published_date = timezone.now()
    article.save()

# 8. Cache backends configuration
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    },
    'local': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Using different cache backends
from django.core.cache import caches

def expensive_operation():
    # Use Redis for shared data
    cache = caches['default']
    result = cache.get('expensive_result')

    if result is None:
        result = perform_expensive_calculation()
        cache.set('expensive_result', result, 3600)

    return result

def user_specific_data(user_id):
    # Use local cache for user-specific data
    cache = caches['local']
    cache_key = f'user_data_{user_id}'
    data = cache.get(cache_key)

    if data is None:
        data = get_user_data(user_id)
        cache.set(cache_key, data, 300)

    return data
```

**Common mistakes:**
- Caching everything without considering cache invalidation
- Using wrong cache timeouts (too short or too long)
- Not invalidating caches when data changes
- Caching user-specific data globally
- Using cache as primary data storage
- Not monitoring cache hit rates and performance

**When to apply:**
- Optimizing slow database queries
- Caching expensive computations
- Reducing API response times
- Implementing page-level caching for public content
- During performance optimization and scaling