# Database Indexes Strategy (CRITICAL)

**Impact:** CRITICAL - Ensures query performance and prevents slow database operations

**Problem:**
Missing database indexes on frequently queried fields cause slow queries, high CPU usage, and poor application performance that can bring down production systems.

**Solution:**
Add strategic database indexes for fields used in WHERE clauses, JOINs, ORDER BY operations, and unique constraints. Monitor slow queries and add indexes accordingly.

**Examples:**

❌ **Wrong: Missing critical indexes**
```python
class Article(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    published_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    tags = models.ManyToManyField(Tag)

    # No indexes - queries will be slow!
    # SELECT * FROM article WHERE published_date > '2024-01-01' AND status = 'published'
    # Will do a full table scan!
```

✅ **Correct: Strategic indexing**
```python
class Article(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    published_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    tags = models.ManyToManyField(Tag)

    class Meta:
        indexes = [
            # Most common query patterns
            models.Index(fields=['published_date', 'status']),  # Article listings
            models.Index(fields=['author', 'published_date']),  # Author articles
            models.Index(fields=['category', 'published_date']),  # Category pages
            models.Index(fields=['status', 'published_date']),  # Published articles
        ]

# For complex queries, consider partial indexes
class Article(models.Model):
    class Meta:
        indexes = [
            # Partial index for published articles only
            models.Index(
                fields=['published_date'],
                name='article_published_date_idx',
                condition=models.Q(status='published')
            ),
        ]

# For foreign keys, indexes are usually automatic but explicit is better
class Comment(models.Model):
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        db_index=True  # Explicit index (though usually automatic)
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    created_date = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=['article', 'created_date']),  # Comments for article
            models.Index(fields=['author', 'created_date']),   # User's comments
        ]
```

**Common mistakes:**
- Not indexing fields used in WHERE clauses
- Missing indexes on foreign key fields (though Django adds them automatically for ForeignKey)
- Over-indexing leading to slow writes
- Not monitoring query performance to identify missing indexes
- Using indexes on low-cardinality fields (like boolean fields)

**When to apply:**
- Designing new models
- Optimizing slow queries
- Adding new query patterns
- During database performance tuning
- After analyzing query execution plans