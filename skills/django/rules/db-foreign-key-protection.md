---
title: Database Foreign Key Protection
impact: CRITICAL
impactDescription: Maintains referential integrity and prevents data corruption
tags: database, django, foreign-keys, integrity
---

## Database Foreign Key Protection

**Problem:**
Incorrect `on_delete` behavior can lead to orphaned records, data loss, application crashes, or silent data corruption when related objects are deleted.

**Solution:**
Choose appropriate `on_delete` behavior based on business requirements and data relationships. Use `PROTECT` for critical relationships and `CASCADE` only when appropriate.

**Examples:**

❌ **Wrong: Dangerous on_delete choices**
```python
class Article(models.Model):
    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE  # Too dangerous - deleting author deletes all articles!
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,  # Can create orphaned articles
        null=True
    )

class Comment(models.Model):
    article = models.ForeignKey(
        Article,
        on_delete=models.DO_NOTHING  # Creates orphaned comments!
    )
```

✅ **Correct: Appropriate on_delete choices**
```python
class Article(models.Model):
    author = models.ForeignKey(
        Author,
        on_delete=models.PROTECT,  # Prevent author deletion if they have articles
        related_name='articles'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,  # Allow category deletion, set to NULL
        null=True, blank=True,
        related_name='articles'
    )
    editor = models.ForeignKey(
        User,
        on_delete=models.SET_DEFAULT,  # Set to default user on deletion
        default=1,  # ID of default editor
        related_name='edited_articles'
    )

class Comment(models.Model):
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,  # OK - comments should be deleted with article
        related_name='comments'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,  # OK - user deletion removes their comments
        related_name='comments'
    )

# For many-to-many relationships
class Article(models.Model):
    tags = models.ManyToManyField(
        Tag,
        related_name='articles',
        blank=True
    )
    # ManyToMany doesn't have on_delete - handled differently

# Custom on_delete behavior for complex cases
def set_default_editor():
    """Get or create default editor"""
    from django.contrib.auth.models import User
    editor, created = User.objects.get_or_create(
        username='deleted_editor',
        defaults={'email': 'deleted@example.com'}
    )
    return editor.id

class Article(models.Model):
    editor = models.ForeignKey(
        User,
        on_delete=models.SET(set_default_editor),
        related_name='edited_articles'
    )
```

**Common mistakes:**
- Using `CASCADE` when `PROTECT` would be safer
- Using `DO_NOTHING` which creates orphaned records
- Not considering the business impact of deletions
- Missing `related_name` for reverse relationships
- Not handling NULL values properly when using `SET_NULL`

**When to apply:**
- Designing model relationships
- Reviewing existing foreign key configurations
- Planning data deletion policies
- During data modeling and schema design