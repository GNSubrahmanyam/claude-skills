---
title: Advanced Model Managers
impact: LOW
impactDescription: Provides reusable query logic and encapsulates database operations
tags: django, models, managers, queries, encapsulation
---

## Advanced Model Managers

**Problem:**
Repeated query patterns scattered across views and other code make maintenance difficult and lead to inconsistent data access patterns.

**Solution:**
Create custom model managers to encapsulate common query logic, provide reusable methods, and ensure consistent data access patterns.

**Examples:**

❌ **Wrong: Query logic scattered everywhere**
```python
# views.py - Repeated query patterns
def published_articles(request):
    # Scattered query logic
    articles = Article.objects.filter(
        published=True,
        published_date__lte=timezone.now()
    ).order_by('-published_date')

    # More logic in another view
    featured = Article.objects.filter(
        published=True,
        featured=True,
        published_date__lte=timezone.now()
    ).order_by('-published_date')

# models.py - No encapsulation
class Article(models.Model):
    title = models.CharField(max_length=200)
    published = models.BooleanField(default=False)
    featured = models.BooleanField(default=False)
    published_date = models.DateTimeField(null=True, blank=True)

    # No custom manager
```

✅ **Correct: Custom managers for encapsulation**
```python
# models.py
from django.db import models
from django.utils import timezone

class PublishedManager(models.Manager):
    """Manager for published articles"""

    def get_queryset(self):
        return super().get_queryset().filter(
            published=True,
            published_date__lte=timezone.now()
        )

    def featured(self):
        """Get featured published articles"""
        return self.get_queryset().filter(featured=True)

    def by_author(self, author):
        """Get published articles by specific author"""
        return self.get_queryset().filter(author=author)

    def recent(self, days=7):
        """Get recently published articles"""
        since = timezone.now() - timezone.timedelta(days=days)
        return self.get_queryset().filter(published_date__gte=since)

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    published = models.BooleanField(default=False)
    featured = models.BooleanField(default=False)
    published_date = models.DateTimeField(null=True, blank=True)

    # Default manager
    objects = models.Manager()

    # Custom manager for published articles
    published_objects = PublishedManager()

    class Meta:
        ordering = ['-published_date']

    def __str__(self):
        return self.title

    def publish(self):
        """Publish this article"""
        self.published = True
        self.published_date = timezone.now()
        self.save()

# Usage in views
def published_articles(request):
    # Clean, encapsulated queries
    articles = Article.published_objects.all()
    featured = Article.published_objects.featured()
    recent = Article.published_objects.recent(days=7)

    return render(request, 'articles/list.html', {
        'articles': articles,
        'featured': featured,
        'recent': recent,
    })

def author_articles(request, author_id):
    author = get_object_or_404(User, pk=author_id)
    articles = Article.published_objects.by_author(author)

    return render(request, 'articles/author.html', {
        'author': author,
        'articles': articles,
    })
```

**Advanced Manager Patterns:**
```python
# models.py - Advanced manager patterns
class ArticleManager(models.Manager):
    """Comprehensive article manager"""

    def published(self):
        """Get published articles"""
        return self.get_queryset().filter(
            published=True,
            published_date__lte=timezone.now()
        )

    def drafts(self):
        """Get draft articles"""
        return self.get_queryset().filter(published=False)

    def by_category(self, category_slug):
        """Get articles by category slug"""
        return self.published().filter(category__slug=category_slug)

    def search(self, query):
        """Search articles by title and content"""
        return self.published().filter(
            models.Q(title__icontains=query) |
            models.Q(content__icontains=query)
        )

    def popular(self, limit=10):
        """Get most viewed articles"""
        return self.published().order_by('-views')[:limit]

    def with_comment_count(self):
        """Get articles with comment counts"""
        return self.published().annotate(
            comment_count=models.Count('comments')
        )

class AuthorManager(models.Manager):
    """Manager for author-related queries"""

    def active_authors(self):
        """Get authors with published articles"""
        return self.get_queryset().filter(
            articles__published=True
        ).distinct()

    def top_authors(self, limit=5):
        """Get most prolific authors"""
        return self.active_authors().annotate(
            article_count=models.Count('articles')
        ).order_by('-article_count')[:limit]

    def authors_by_month(self, year, month):
        """Get authors who published in specific month"""
        start_date = timezone.datetime(year, month, 1)
        end_date = start_date + timezone.timedelta(days=31)

        return self.get_queryset().filter(
            articles__published_date__range=(start_date, end_date)
        ).distinct()

class CategoryManager(models.Manager):
    """Manager for category operations"""

    def with_article_count(self):
        """Get categories with article counts"""
        return self.get_queryset().annotate(
            article_count=models.Count('articles')
        )

    def popular_categories(self, limit=10):
        """Get categories sorted by article count"""
        return self.with_article_count().order_by('-article_count')[:limit]

# Update models to use custom managers
class Article(models.Model):
    # ... fields ...

    objects = ArticleManager()  # Replace default manager

class Author(models.Model):
    # ... fields ...

    objects = AuthorManager()

class Category(models.Model):
    # ... fields ...

    objects = CategoryManager()

# Usage examples
def article_search(request):
    query = request.GET.get('q', '')
    if query:
        articles = Article.objects.search(query)
    else:
        articles = Article.objects.published()

    return render(request, 'articles/search.html', {
        'articles': articles,
        'query': query,
    })

def author_stats(request):
    top_authors = Author.objects.top_authors()
    categories = Category.objects.popular_categories()

    return render(request, 'stats.html', {
        'top_authors': top_authors,
        'categories': categories,
    })
```

**Manager Inheritance and Composition:**
```python
# managers.py - Separate manager classes
from django.db import models
from django.utils import timezone

class PublishedQuerySet(models.QuerySet):
    """Custom queryset with publish-related methods"""

    def published(self):
        return self.filter(
            published=True,
            published_date__lte=timezone.now()
        )

    def featured(self):
        return self.published().filter(featured=True)

    def by_author(self, author):
        return self.published().filter(author=author)

class ArticleManager(models.Manager):
    """Article manager using custom queryset"""

    def get_queryset(self):
        return PublishedQuerySet(self.model, using=self._db)

    def published(self):
        return self.get_queryset().published()

    def featured(self):
        return self.get_queryset().featured()

    def by_author(self, author):
        return self.get_queryset().by_author(author)

# Multiple managers for different use cases
class Article(models.Model):
    # ... fields ...

    # Default manager - all objects
    objects = models.Manager()

    # Published manager - only published articles
    published = ArticleManager()

    class Meta:
        ordering = ['-published_date']

# Usage
# All articles (including drafts)
all_articles = Article.objects.all()

# Only published articles
published_articles = Article.published.all()
featured_articles = Article.published.featured()
author_articles = Article.published.by_author(some_author)
```

**Manager Testing:**
```python
# tests/test_managers.py
from django.test import TestCase
from django.utils import timezone

class ArticleManagerTest(TestCase):
    """Test custom article manager"""

    def setUp(self):
        self.author = User.objects.create_user('author', 'author@test.com', 'pass')
        self.category = Category.objects.create(name='Tech', slug='tech')

        # Create test articles
        self.published_article = Article.objects.create(
            title='Published Article',
            content='Content',
            author=self.author,
            category=self.category,
            published=True,
            published_date=timezone.now()
        )

        self.draft_article = Article.objects.create(
            title='Draft Article',
            content='Content',
            author=self.author,
            category=self.category,
            published=False
        )

        self.featured_article = Article.objects.create(
            title='Featured Article',
            content='Content',
            author=self.author,
            category=self.category,
            published=True,
            featured=True,
            published_date=timezone.now()
        )

    def test_published_manager(self):
        """Test published manager returns only published articles"""
        published = Article.published.all()
        self.assertEqual(published.count(), 2)
        self.assertIn(self.published_article, published)
        self.assertIn(self.featured_article, published)
        self.assertNotIn(self.draft_article, published)

    def test_featured_manager(self):
        """Test featured manager returns only featured published articles"""
        featured = Article.published.featured()
        self.assertEqual(featured.count(), 1)
        self.assertIn(self.featured_article, featured)
        self.assertNotIn(self.published_article, featured)

    def test_by_author_manager(self):
        """Test by_author manager filters by author"""
        author_articles = Article.published.by_author(self.author)
        self.assertEqual(author_articles.count(), 2)

        # Test with different author
        other_author = User.objects.create_user('other', 'other@test.com', 'pass')
        other_articles = Article.published.by_author(other_author)
        self.assertEqual(other_articles.count(), 0)
```

**Common mistakes:**
- Not using managers for complex queries
- Creating managers that duplicate model methods
- Overriding default manager incorrectly
- Not testing manager methods
- Using managers when simple querysets suffice
- Creating too many specialized managers

**When to apply:**
- Encapsulating complex query logic
- Providing reusable query methods
- Ensuring consistent data access patterns
- Implementing business logic at the database level
- Creating domain-specific query interfaces