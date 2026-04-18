# Advanced Signals Usage (LOW)

**Impact:** LOW - Enables decoupled component communication and event-driven architecture

**Problem:**
Tight coupling between Django components makes code hard to maintain and test. Components that need to react to events from other parts of the application create complex dependencies.

**Solution:**
Use Django signals for decoupled communication between components. Signals allow components to communicate without direct dependencies.

**Examples:**

❌ **Wrong: Tight coupling**
```python
# models.py
class Article(models.Model):
    title = models.CharField(max_length=200)
    published = models.BooleanField(default=False)

    def publish(self):
        """Tight coupling - directly calls other components"""
        self.published = True
        self.save()

        # Direct coupling to notification system
        from .notifications import send_publish_notification
        send_publish_notification(self)

        # Direct coupling to search indexing
        from .search import index_article
        index_article(self)

        # Direct coupling to analytics
        from .analytics import track_publish_event
        track_publish_event(self)
```

✅ **Correct: Signal-based decoupling**
```python
# signals.py
from django.db.models.signals import post_save
from django.dispatch import Signal
from django.dispatch import receiver

# Custom signals
article_published = Signal()  # providing_args=['article', 'user'])
article_viewed = Signal()     # providing_args=['article', 'user', 'request'])

# Built-in signal handlers
@receiver(post_save, sender='articles.Article')
def handle_article_save(sender, instance, created, **kwargs):
    """Handle article save events"""
    if created:
        # New article created
        from .analytics import track_article_creation
        track_article_creation(instance)
    else:
        # Article updated
        if instance.published and not instance.__class__.objects.filter(
            pk=instance.pk, published=False
        ).exists():
            # Article was just published
            article_published.send(sender=sender, article=instance)

@receiver(article_published)
def send_publish_notification(sender, article, **kwargs):
    """Send notification when article is published"""
    from .notifications import send_publish_notification
    send_publish_notification(article)

@receiver(article_published)
def index_published_article(sender, article, **kwargs):
    """Index article in search when published"""
    from .search import index_article
    index_article(article)

@receiver(article_published)
def track_publish_analytics(sender, article, **kwargs):
    """Track analytics for published article"""
    from .analytics import track_publish_event
    track_publish_event(article)

# models.py
class Article(models.Model):
    title = models.CharField(max_length=200)
    published = models.BooleanField(default=False)

    def publish(self, user=None):
        """Clean publish method - just changes state"""
        self.published = True
        self.save()

        # Emit signal - other components will react
        article_published.send(sender=self.__class__, article=self, user=user)

# views.py
def article_detail(request, pk):
    article = get_object_or_404(Article, pk=pk, published=True)

    # Track article view
    article_viewed.send(
        sender=Article,
        article=article,
        user=request.user if request.user.is_authenticated else None,
        request=request
    )

    return render(request, 'articles/detail.html', {'article': article})
```

**Signal Patterns and Best Practices:**
```python
# signals.py - Advanced signal patterns
from django.db.models.signals import (
    pre_save, post_save, pre_delete, post_delete,
    m2m_changed
)
from django.dispatch import Signal, receiver
from django.db import transaction

# Custom signals with proper argument specification
user_registered = Signal()  # providing_args=['user', 'request'])
payment_processed = Signal()  # providing_args=['payment', 'amount', 'currency'])

# Signal handlers with error handling
@receiver(user_registered)
def send_welcome_email(sender, user, request, **kwargs):
    """Send welcome email with error handling"""
    try:
        from .emails import send_welcome_email
        send_welcome_email(user, request=request)
    except Exception as e:
        # Log error but don't crash user registration
        logger.error(f"Failed to send welcome email to {user.email}: {e}")

@receiver(user_registered)
def create_user_profile(sender, user, request, **kwargs):
    """Create user profile on registration"""
    from .models import UserProfile
    UserProfile.objects.create(
        user=user,
        registration_ip=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT')
    )

@receiver(post_save, sender='auth.User')
def handle_user_save(sender, instance, created, **kwargs):
    """Handle user model changes"""
    if created:
        # New user created
        user_registered.send(sender=sender, user=instance, request=None)
    else:
        # User updated - check for important changes
        if instance.email != instance.__class__.objects.get(pk=instance.pk).email:
            # Email changed
            from .emails import send_email_change_notification
            send_email_change_notification(instance)

# Many-to-many relationship signals
@receiver(m2m_changed, sender='articles.Article.tags.through')
def handle_tag_changes(sender, instance, action, reverse, model, pk_set, **kwargs):
    """Handle article tag changes"""
    if action == 'post_add':
        # Tags added to article
        from .search import update_article_tags
        update_article_tags(instance, pk_set)

    elif action == 'post_remove':
        # Tags removed from article
        from .search import remove_article_tags
        remove_article_tags(instance, pk_set)

# Signal disconnection and reconnection
def disable_signals():
    """Temporarily disable signals for bulk operations"""
    post_save.disconnect(handle_article_save, sender='articles.Article')

def enable_signals():
    """Re-enable signals"""
    post_save.connect(handle_article_save, sender='articles.Article')

# Usage in management commands
def bulk_import_articles(articles_data):
    """Bulk import with signals disabled for performance"""
    disable_signals()
    try:
        for article_data in articles_data:
            Article.objects.create(**article_data)
    finally:
        enable_signals()

    # Manually trigger signals for created objects if needed
    for article in Article.objects.filter(created_in_bulk=True):
        article_published.send(sender=Article, article=article)
```

**Signal Testing Patterns:**
```python
# tests/test_signals.py
from django.test import TestCase
from django.db.models.signals import post_save
from unittest.mock import patch, MagicMock

class SignalTestCase(TestCase):
    """Test signal behavior"""

    def test_article_publish_signal(self):
        """Test that publishing article sends signal"""
        from .signals import article_published

        # Create signal receiver mock
        with patch('articles.signals.send_publish_notification') as mock_notify:
            article = Article.objects.create(title="Test", published=False)

            # Publish article - should send signal
            article.publish()

            # Verify signal was sent
            article_published.send.assert_called_once_with(
                sender=Article,
                article=article,
                user=None
            )

            # Verify receiver was called
            mock_notify.assert_called_once_with(article)

    def test_signal_error_handling(self):
        """Test that signal handler errors don't crash main operation"""
        from .signals import user_registered

        # Mock handler that raises exception
        with patch('accounts.signals.send_welcome_email') as mock_email:
            mock_email.side_effect = Exception("Email service down")

            # User registration should still succeed
            user = User.objects.create_user('test@example.com', 'password')

            # Signal should have been sent despite handler error
            user_registered.send.assert_called_once()

            # User should still exist
            self.assertTrue(User.objects.filter(email='test@example.com').exists())

    def test_bulk_operations_with_signals_disabled(self):
        """Test bulk operations with signals disabled"""
        from .signals import disable_signals, enable_signals

        disable_signals()
        try:
            # Create articles without triggering signals
            articles = Article.objects.bulk_create([
                Article(title=f"Article {i}", published=True)
                for i in range(10)
            ])

            # Verify signals were not sent
            # (This would require checking signal call counts)

        finally:
            enable_signals()
```

**Common mistakes:**
- Using signals for simple method calls
- Not handling exceptions in signal handlers
- Creating circular signal dependencies
- Overusing signals instead of direct method calls
- Not testing signal behavior
- Disabling signals globally without re-enabling them

**When to apply:**
- Decoupling components that need to react to events
- Implementing plugin architectures
- Creating extensible applications
- Building event-driven features
- When components need to communicate without direct dependencies