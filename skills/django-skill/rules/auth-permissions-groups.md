# Authentication Permissions Groups (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Ensures proper access control and security

**Problem:**
Improper permission management can lead to unauthorized access, data breaches, and inconsistent access control across the application.

**Solution:**
Use Django's permission system with groups, custom permissions, and proper permission checking throughout the application.

**Examples:**

❌ **Wrong: Manual permission checking**
```python
# Bad: Manual permission logic scattered throughout code
def edit_article(request, pk):
    article = get_object_or_404(Article, pk=pk)

    # Manual permission checking
    if request.user != article.author and not request.user.is_staff:
        return HttpResponseForbidden("You can't edit this article")

    # More manual checks
    if not request.user.is_superuser:
        return HttpResponseForbidden("Only admins can edit")

def delete_comment(request, comment_id):
    comment = get_object_or_404(Comment, id=comment_id)

    # Inconsistent permission logic
    if request.user != comment.author:
        if not request.user.has_perm('myapp.delete_comment'):
            return HttpResponseForbidden("Permission denied")
```

✅ **Correct: Django permissions system**
```python
# models.py
class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    published = models.BooleanField(default=False)

    class Meta:
        permissions = [
            ("can_publish", "Can publish articles"),
            ("can_edit_others", "Can edit others' articles"),
            ("can_delete_others", "Can delete others' articles"),
        ]

    def can_edit(self, user):
        """Business logic for edit permissions"""
        return (
            user == self.author or
            user.has_perm('articles.can_edit_others') or
            user.is_staff
        )

    def can_delete(self, user):
        """Business logic for delete permissions"""
        return (
            user == self.author or
            user.has_perm('articles.can_delete_others') or
            user.is_superuser
        )

# Create groups and assign permissions
def create_groups(sender, **kwargs):
    """Create default groups and assign permissions"""
    from django.contrib.auth.models import Group, Permission
    from django.db.models.signals import post_migrate

    # Editor group
    editor_group, created = Group.objects.get_or_create(name='Editors')
    if created:
        permissions = Permission.objects.filter(
            codename__in=['can_publish', 'can_edit_others']
        )
        editor_group.permissions.set(permissions)

    # Moderator group
    moderator_group, created = Group.objects.get_or_create(name='Moderators')
    if created:
        permissions = Permission.objects.filter(
            codename__in=['can_publish', 'can_edit_others', 'can_delete_others']
        )
        moderator_group.permissions.set(permissions)

# Connect signal
post_migrate.connect(create_groups)
```

**Views with proper permission checking:**
```python
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.core.exceptions import PermissionDenied

# Function-based view with decorators
@login_required
@permission_required('articles.can_publish', raise_exception=True)
def publish_article(request, pk):
    article = get_object_or_404(Article, pk=pk)

    if not article.can_edit(request.user):
        raise PermissionDenied("You don't have permission to publish this article")

    article.published = True
    article.published_date = timezone.now()
    article.save()

    messages.success(request, 'Article published successfully!')
    return redirect('article_detail', pk=pk)

# Class-based view with mixins
class ArticleUpdateView(LoginRequiredMixin, PermissionRequiredMixin, UpdateView):
    model = Article
    permission_required = 'articles.can_edit_others'
    fields = ['title', 'content', 'published']

    def get_queryset(self):
        """Users can only edit their own articles or if they have permission"""
        if self.request.user.has_perm('articles.can_edit_others'):
            return Article.objects.all()
        return Article.objects.filter(author=self.request.user)

# Template permission checking
{% if perms.articles.can_publish %}
  <a href="{% url 'article_publish' article.pk %}">Publish</a>
{% endif %}

{% if user|has_perm:'articles.can_edit_others' or user == article.author %}
  <a href="{% url 'article_edit' article.pk %}">Edit</a>
{% endif %}

# Custom permission template tag
from django import template

register = template.Library()

@register.filter
def can_edit(user, obj):
    """Check if user can edit an object"""
    if hasattr(obj, 'can_edit'):
        return obj.can_edit(user)
    return False

# Usage in template
{% if user|can_edit:article %}
  <button>Edit Article</button>
{% endif %}
```

**Common mistakes:**
- Not using Django's permission system
- Checking permissions manually instead of using decorators
- Missing permission checks in views
- Inconsistent permission logic across views
- Not creating groups for role-based access
- Hardcoding user IDs or roles in code

**When to apply:**
- Implementing access control
- Creating role-based permissions
- Building multi-user applications
- During security implementation
- When defining user roles and capabilities