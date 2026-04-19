---
title: URLs Configuration Patterns
impact: MEDIUM-HIGH
impactDescription: Ensures maintainable and scalable URL structure
tags: django, urls, configuration, patterns
---

## URLs Configuration Patterns

**Problem:**
Poor URL configuration leads to hard-to-maintain code, broken links, and poor SEO. Inconsistent URL patterns make applications harder to navigate and extend.

**Solution:**
Use consistent URL patterns, leverage `reverse()` for URL generation, and organize URLs in a maintainable structure.

**Examples:**

❌ **Wrong: Hardcoded URLs and poor organization**
```python
# urls.py - Monolithic and hard to maintain
from django.urls import path
from . import views

urlpatterns = [
    path('articles/', views.article_list, name='article_list'),
    path('articles/create/', views.article_create, name='article_create'),
    path('articles/<int:pk>/', views.article_detail, name='article_detail'),
    path('articles/<int:pk>/edit/', views.article_edit, name='article_edit'),
    path('authors/', views.author_list, name='author_list'),
    path('authors/<int:pk>/', views.author_detail, name='author_detail'),
    # 50+ more URLs mixed together...
]

# In templates - hardcoded URLs break easily
<a href="/articles/{{ article.pk }}/">{{ article.title }}</a>
<a href="/articles/create/">Create Article</a>
```

✅ **Correct: Organized URL configuration**
```python
# myapp/urls.py
from django.urls import path, include
from . import views

app_name = 'articles'  # Namespace for this app

urlpatterns = [
    # Article URLs
    path('', views.ArticleListView.as_view(), name='list'),
    path('create/', views.ArticleCreateView.as_view(), name='create'),
    path('<int:pk>/', views.ArticleDetailView.as_view(), name='detail'),
    path('<int:pk>/edit/', views.ArticleUpdateView.as_view(), name='edit'),
    path('<int:pk>/delete/', views.ArticleDeleteView.as_view(), name='delete'),

    # Author URLs
    path('authors/', include([
        path('', views.AuthorListView.as_view(), name='author_list'),
        path('<int:pk>/', views.AuthorDetailView.as_view(), name='author_detail'),
    ])),
]

# main urls.py
from django.urls import path, include
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('django.contrib.auth.urls')),  # Built-in auth URLs
    path('articles/', include('articles.urls')),  # Include app URLs
    path('api/', include('api.urls')),
    path('', include('pages.urls')),  # Home page
]

# In views - always use reverse() for URL generation
from django.urls import reverse
from django.shortcuts import redirect

def article_create(request):
    if request.method == 'POST':
        form = ArticleForm(request.POST)
        if form.is_valid():
            article = form.save()
            # Use reverse() instead of hardcoded URLs
            return redirect(reverse('articles:detail', kwargs={'pk': article.pk}))
    else:
        form = ArticleForm()
    return render(request, 'articles/create.html', {'form': form})

# In templates - use {% url %} tag
<a href="{% url 'articles:detail' article.pk %}">{{ article.title }}</a>
<a href="{% url 'articles:create' %}">Create Article</a>

{# With query parameters #}
<a href="{% url 'articles:list' %}?category={{ category.slug }}">Filter by {{ category.name }}</a>

# In models/forms - get_absolute_url() method
class Article(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)

    def get_absolute_url(self):
        """Canonical URL for this object"""
        from django.urls import reverse
        return reverse('articles:detail', kwargs={'pk': self.pk})

# In admin - automatic links
@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'published_date', 'get_edit_link']

    def get_edit_link(self, obj):
        url = reverse('admin:articles_article_change', args=[obj.pk])
        return format_html('<a href="{}">Edit</a>', url)
    get_edit_link.short_description = 'Edit Link'

# Advanced URL patterns
from django.urls import re_path

urlpatterns = [
    # Named groups for complex patterns
    re_path(r'^articles/(?P<year>\d{4})/(?P<month>\d{2})/$',
            views.articles_by_date, name='articles_by_date'),

    # Optional parameters
    path('search/', views.search, name='search'),
    path('search/<str:q>/', views.search, name='search_with_query'),

    # File serving with custom logic
    re_path(r'^media/(?P<path>.*)$', views.serve_media, name='serve_media'),
]

# Custom path converters (Django 2.0+)
from django.urls import register_converter

class FourDigitYearConverter:
    regex = '[0-9]{4}'

    def to_python(self, value):
        return int(value)

    def to_url(self, value):
        return '%04d' % value

register_converter(FourDigitYearConverter, 'yyyy')

# Using custom converter
path('articles/<yyyy:year>/', views.articles_by_year, name='articles_by_year'),
```

**Common mistakes:**
- Hardcoding URLs in templates and views
- Not using URL namespaces (`app_name`)
- Mixing URL patterns from different apps
- Not providing `get_absolute_url()` on models
- Using `re_path` when `path` would work
- Not handling URL parameters properly

**When to apply:**
- Setting up new Django projects
- Adding new features and pages
- Refactoring existing URL configurations
- Implementing SEO-friendly URLs
- Building RESTful APIs