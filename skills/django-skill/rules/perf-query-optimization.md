# Performance Query Optimization (MEDIUM)

**Impact:** MEDIUM - Reduces database load and improves response times

**Problem:**
Inefficient database queries are the most common cause of slow Django applications. N+1 queries, missing indexes, and poorly constructed querysets can bring applications to a crawl.

**Solution:**
Optimize queries using Django's ORM features, add appropriate indexes, and monitor query performance. Use `select_related`, `prefetch_related`, and database indexes strategically.

**Examples:**

❌ **Wrong: Inefficient queries**
```python
def get_articles_with_authors():
    articles = Article.objects.all()  # 1 query
    for article in articles:
        author_name = article.author.name  # N queries!
    return articles

def get_popular_articles():
    # Inefficient - multiple queries and no indexes
    articles = Article.objects.filter(
        published_date__year=2024
    ).order_by('-views')  # No index on views!

    # Additional queries in template
    for article in articles:
        comments_count = article.comments.count()  # N more queries!
    return articles
```

✅ **Correct: Optimized queries**
```python
def get_articles_with_authors():
    # Single optimized query
    return Article.objects.select_related('author').all()

def get_popular_articles():
    # Optimized with annotations and indexes
    return Article.objects.filter(
        published_date__year=2024
    ).annotate(
        comments_count=models.Count('comments')
    ).select_related('author').order_by('-views')[:10]

# Model with proper indexes
class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    published_date = models.DateTimeField()
    views = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            models.Index(fields=['published_date', 'views']),  # Query optimization
            models.Index(fields=['author', 'published_date']),  # Author listings
            models.Index(fields=['category', 'published_date']),  # Category pages
        ]

# Complex query optimization
def get_dashboard_data():
    """Optimize dashboard queries with minimal database hits"""

    # Single query for article stats
    article_stats = Article.objects.aggregate(
        total_articles=models.Count('id'),
        published_articles=models.Count('id', filter=models.Q(published=True)),
        total_views=models.Sum('views'),
        avg_comments=models.Avg(
            models.Subquery(
                Comment.objects.filter(article=models.OuterRef('pk')).aggregate(
                    count=models.Count('id')
                )['count']
            )
        )
    )

    # Single query for recent articles with related data
    recent_articles = Article.objects.select_related(
        'author', 'category'
    ).prefetch_related(
        'tags',  # ManyToMany
        models.Prefetch(
            'comments',  # Reverse ForeignKey with limit
            queryset=Comment.objects.select_related('author')[:5],
            to_attr='recent_comments'
        )
    ).filter(
        published=True
    ).order_by('-published_date')[:10]

    # Single query for author stats
    author_stats = Author.objects.annotate(
        article_count=models.Count('articles'),
        total_views=models.Sum('articles__views')
    ).order_by('-article_count')[:5]

    return {
        'stats': article_stats,
        'recent_articles': recent_articles,
        'top_authors': author_stats,
    }

# Query result caching
from django.core.cache import cache

def get_featured_articles():
    """Cache expensive query results"""
    cache_key = 'featured_articles'
    articles = cache.get(cache_key)

    if articles is None:
        articles = list(Article.objects.select_related('author').filter(
            featured=True,
            published=True
        ).order_by('-published_date')[:5])

        # Cache for 15 minutes
        cache.set(cache_key, articles, 60 * 15)

    return articles

# Database function optimization
def get_articles_by_word_count(min_words=500):
    """Use database functions for performance"""
    return Article.objects.annotate(
        word_count=models.functions.Length('content') - models.functions.Length(
            models.functions.Replace('content', models.Value(' '), models.Value(''))
        ) + 1
    ).filter(word_count__gte=min_words)

# Raw SQL for complex optimizations (last resort)
def get_complex_report():
    """Use raw SQL only when ORM can't optimize"""
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                a.id, a.title, COUNT(c.id) as comment_count,
                AVG(r.score) as avg_rating
            FROM articles a
            LEFT JOIN comments c ON a.id = c.article_id
            LEFT JOIN ratings r ON a.id = r.article_id
            WHERE a.published = true
            GROUP BY a.id, a.title
            HAVING COUNT(c.id) > 5
            ORDER BY avg_rating DESC
            LIMIT 10
        """)

        return cursor.fetchall()

# Index optimization based on query analysis
class OptimizedIndexes(models.Model):
    """Example of strategic indexing"""

    # Fields used in WHERE clauses get indexes
    status = models.CharField(max_length=20, db_index=True)
    created_date = models.DateTimeField(db_index=True)

    # Foreign keys get automatic indexes
    author = models.ForeignKey(User, on_delete=models.CASCADE)  # Auto-indexed

    # Composite indexes for common query patterns
    class Meta:
        indexes = [
            # For filtering by status and date
            models.Index(fields=['status', 'created_date']),

            # For ordering by date within status
            models.Index(fields=['created_date', 'status']),

            # Partial index for active records only
            models.Index(
                fields=['created_date'],
                name='active_created_date_idx',
                condition=models.Q(status__in=['active', 'published'])
            ),
        ]
```

**Common mistakes:**
- Not using `select_related` for ForeignKey access
- Overusing `prefetch_related` for simple cases
- Missing database indexes on filtered/ordered fields
- Not monitoring query performance
- Using raw SQL when ORM can handle it
- Premature optimization without measurement

**When to apply:**
- Optimizing slow page loads
- Reducing database server load
- Improving API response times
- During performance audits
- When database queries are identified as bottlenecks