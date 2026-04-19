---
title: Views Pagination
impact: HIGH
impactDescription: Prevents memory issues and improves performance
tags: django, views, pagination, performance
---

## Views Pagination

**Problem:**
Loading all records at once can cause memory exhaustion, slow page loads, and poor user experience. Large datasets without pagination can bring down servers.

**Solution:**
Use Django's pagination for large datasets. Choose appropriate page sizes and provide navigation controls.

**Examples:**

❌ **Wrong: Loading all records**
```python
def article_list(request):
    # Memory disaster waiting to happen!
    articles = Article.objects.all()  # Loads ALL articles into memory

    # If there are 100,000 articles, this creates massive memory usage
    return render(request, 'articles/list.html', {
        'articles': articles  # All 100k articles sent to template
    })
```

✅ **Correct: Pagination implementation**
```python
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

def article_list(request):
    # Get base queryset
    article_list = Article.objects.filter(
        published=True
    ).select_related('author').order_by('-published_date')

    # Create paginator
    paginator = Paginator(article_list, 25)  # Show 25 articles per page

    # Get current page number from request
    page = request.GET.get('page')

    try:
        articles = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        articles = paginator.page(1)
    except EmptyPage:
        # If page is out of range, deliver last page of results.
        articles = paginator.page(paginator.num_pages)

    return render(request, 'articles/list.html', {
        'articles': articles,
        'paginator': paginator,
    })

# Template pagination controls
{% comment %}
templates/articles/list.html
{% endcomment %}
<div class="articles">
    {% for article in articles %}
        <article>
            <h2><a href="{% url 'article_detail' article.pk %}">{{ article.title }}</a></h2>
            <p>By {{ article.author.name }} on {{ article.published_date|date }}</p>
        </article>
    {% endfor %}
</div>

{# Pagination controls #}
<div class="pagination">
    <span class="step-links">
        {% if articles.has_previous %}
            <a href="?page=1">&laquo; first</a>
            <a href="?page={{ articles.previous_page_number }}">previous</a>
        {% endif %}

        <span class="current">
            Page {{ articles.number }} of {{ articles.paginator.num_pages }}.
        </span>

        {% if articles.has_next %}
            <a href="?page={{ articles.next_page_number }}">next</a>
            <a href="?page={{ articles.paginator.num_pages }}">last &raquo;</a>
        {% endif %}
    </span>
</div>

# Advanced pagination with page ranges
def article_list_advanced(request):
    article_list = Article.objects.filter(published=True).order_by('-published_date')
    paginator = Paginator(article_list, 20)

    page = request.GET.get('page')
    try:
        articles = paginator.page(page)
    except PageNotAnInteger:
        articles = paginator.page(1)
    except EmptyPage:
        articles = paginator.page(paginator.num_pages)

    # Calculate page range for navigation
    current_page = articles.number
    total_pages = articles.paginator.num_pages

    # Show 5 pages around current page
    start_page = max(1, current_page - 2)
    end_page = min(total_pages, current_page + 2)

    page_range = range(start_page, end_page + 1)

    return render(request, 'articles/list.html', {
        'articles': articles,
        'page_range': page_range,
    })

# API pagination (JSON response)
from django.http import JsonResponse

def api_article_list(request):
    articles = Article.objects.filter(published=True).order_by('-published_date')

    # Simple offset-based pagination for APIs
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 10))
    start = (page - 1) * per_page
    end = start + per_page

    paginated_articles = articles[start:end]
    total_count = articles.count()

    data = {
        'articles': [
            {
                'id': article.id,
                'title': article.title,
                'author': article.author.name,
                'published_date': article.published_date.isoformat(),
            } for article in paginated_articles
        ],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page,
        }
    }

    return JsonResponse(data)
```

**Common mistakes:**
- Not implementing pagination for large datasets
- Using wrong page sizes (too small or too large)
- Not handling edge cases (invalid page numbers, empty pages)
- Forgetting to order querysets before pagination
- Not providing navigation controls in templates

**When to apply:**
- Listing views with potentially large datasets
- Search results pages
- Admin interfaces with many records
- API endpoints returning collections
- Any view that could grow unbounded