---
title: Database N+1 Query Prevention
impact: CRITICAL
impactDescription: Prevents exponential query growth and performance degradation
tags: database, django, queries, performance, n-plus-one
---

## Database N+1 Query Prevention

**Problem:**
N+1 query problems occur when code executes one query to fetch main objects, then additional queries for each object's related data, leading to hundreds or thousands of unnecessary database calls.

**Solution:**
Use select_related() for ForeignKey relationships and prefetch_related() for ManyToMany relationships to fetch related data in single queries.

**Examples:**

✅ **Correct: Optimized queries**
```python
# Good - single query with select_related
posts = Post.objects.select_related('author').all()
for post in posts:
    print(f"{post.title} by {post.author.name}")  # No extra query

# Good - single query with prefetch_related
authors = Author.objects.prefetch_related('books').all()
for author in authors:
    print(f"{author.name} wrote {author.books.count()} books")  # No extra queries
```

❌ **Wrong: N+1 queries**
```python
# Bad - N+1 queries (1 + N queries)
posts = Post.objects.all()  # 1 query
for post in posts:
    author = post.author  # N additional queries (one per post)
    print(f"{post.title} by {author.name}")
```

**Common mistakes:**
- Forgetting select_related for ForeignKey access in loops
- Using prefetch_related incorrectly for ForeignKey relationships
- Not anticipating future access patterns when optimizing
- Optimizing prematurely without measuring actual impact

**When to apply:**
- Writing view logic that accesses related objects
- Optimizing slow database queries
- Reviewing performance issues
- During code reviews for database access patterns