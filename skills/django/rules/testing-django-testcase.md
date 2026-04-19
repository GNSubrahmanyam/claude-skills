---
title: Testing Django TestCase
impact: MEDIUM-HIGH
impactDescription: Ensures proper test isolation and Django integration
tags: django, testing, testcase, isolation
---

## Testing Django TestCase

**Problem:**
Using wrong test base classes or not leveraging Django's testing utilities leads to slow tests, database conflicts, and missed Django-specific functionality.

**Solution:**
Use appropriate Django TestCase subclasses and leverage Django's testing utilities for proper isolation, fixtures, and assertions.

**Examples:**

❌ **Wrong: Using unittest.TestCase**
```python
# BAD: Using standard unittest
import unittest
from django.test import Client

class ArticleTest(unittest.TestCase):  # Wrong base class!
    def setUp(self):
        self.client = Client()

    def test_article_creation(self):
        # No database isolation!
        # Tests interfere with each other
        # No Django-specific assertions
        response = self.client.post('/articles/create/', {
            'title': 'Test Article',
            'content': 'Content'
        })
        self.assertEqual(response.status_code, 200)  # Basic assertion only

# No proper cleanup between tests
# Database state persists between tests
```

✅ **Correct: Django TestCase subclasses**
```python
# tests/test_models.py
from django.test import TestCase
from django.core.exceptions import ValidationError

class ArticleModelTest(TestCase):
    """Test Article model using Django TestCase"""

    def test_article_creation(self):
        """Test basic article creation"""
        article = Article.objects.create(
            title="Test Article",
            content="Test content",
            author=self.user  # setUp creates this
        )

        self.assertEqual(article.title, "Test Article")
        self.assertEqual(article.slug, "test-article")  # Test auto-generated fields

    def test_article_str_method(self):
        """Test string representation"""
        article = Article(title="Test", author=self.user)
        self.assertEqual(str(article), "Test")

    def test_validation_errors(self):
        """Test model validation"""
        with self.assertRaises(ValidationError):
            article = Article(title="", content="", author=self.user)
            article.full_clean()

# tests/test_views.py
from django.test import TestCase
from django.urls import reverse

class ArticleViewsTest(TestCase):
    """Test Article views with proper Django integration"""

    def setUp(self):
        """Set up test data for each test method"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='12345'
        )
        self.article = Article.objects.create(
            title="Test Article",
            content="Test content",
            author=self.user,
            published=True
        )

    def test_article_list_view(self):
        """Test article list view"""
        response = self.client.get(reverse('articles:list'))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'articles/list.html')
        self.assertContains(response, "Test Article")

        # Test context data
        articles = response.context['articles']
        self.assertEqual(len(articles), 1)
        self.assertEqual(articles[0].title, "Test Article")

    def test_article_detail_view(self):
        """Test article detail view"""
        response = self.client.get(
            reverse('articles:detail', kwargs={'pk': self.article.pk})
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'articles/detail.html')
        self.assertEqual(response.context['article'], self.article)

    def test_article_create_requires_login(self):
        """Test that article creation requires authentication"""
        # Test unauthenticated access
        response = self.client.get(reverse('articles:create'))
        self.assertRedirects(response, '/accounts/login/?next=/articles/create/')

        # Test authenticated access
        self.client.login(username='testuser', password='12345')
        response = self.client.get(reverse('articles:create'))
        self.assertEqual(response.status_code, 200)

# tests/test_forms.py
from django.test import TestCase

class ArticleFormTest(TestCase):
    """Test Article forms"""

    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@example.com', 'pass')

    def test_valid_form(self):
        """Test form with valid data"""
        form_data = {
            'title': 'Valid Title',
            'content': 'Valid content for the article',
            'category': 'tech'
        }

        form = ArticleForm(data=form_data)
        self.assertTrue(form.is_valid())

        # Test saving
        article = form.save(commit=False)
        article.author = self.user
        article.save()

        self.assertEqual(article.title, 'Valid Title')
        self.assertEqual(article.author, self.user)

    def test_invalid_form(self):
        """Test form with invalid data"""
        form_data = {
            'title': '',  # Invalid: empty title
            'content': 'Short',  # Invalid: too short
        }

        form = ArticleForm(data=form_data)
        self.assertFalse(form.is_valid())
        self.assertIn('title', form.errors)
        self.assertIn('content', form.errors)

# Advanced TestCase usage
from django.test import TransactionTestCase, LiveServerTestCase

class ArticleTransactionTest(TransactionTestCase):
    """Test database transactions"""

    def test_transaction_rollback(self):
        """Test that failed transactions don't affect database"""
        initial_count = Article.objects.count()

        try:
            with transaction.atomic():
                Article.objects.create(
                    title="Should not exist",
                    content="Content",
                    author=self.user
                )
                raise Exception("Force rollback")
        except Exception:
            pass

        # Transaction was rolled back
        self.assertEqual(Article.objects.count(), initial_count)

class ArticleLiveServerTest(LiveServerTestCase):
    """Test with live Django server for JavaScript tests"""

    def test_javascript_interaction(self):
        """Test JavaScript functionality with live server"""
        from selenium import webdriver

        # Use selenium to test full user interaction
        browser = webdriver.Chrome()
        browser.get(self.live_server_url + '/articles/')

        # Test JavaScript functionality
        title_input = browser.find_element_by_id('id_title')
        title_input.send_keys('JavaScript Test')

        submit_button = browser.find_element_by_id('submit-btn')
        submit_button.click()

        # Verify result
        self.assertIn('JavaScript Test', browser.page_source)
        browser.quit()
```

**Django TestCase features:**
```python
# TestCase features
class ArticleTestCase(TestCase):

    @classmethod
    def setUpTestData(cls):
        """Set up data once for all test methods in the class"""
        # More efficient than setUp() for read-only data
        cls.user = User.objects.create_user('testuser', 'test@example.com', 'pass')
        cls.category = Category.objects.create(name='Tech', slug='tech')

    def setUp(self):
        """Set up data for each test method"""
        # Called before each test method
        self.article = Article.objects.create(
            title="Test Article",
            author=self.user,
            category=self.category
        )

    def tearDown(self):
        """Clean up after each test method"""
        # Called after each test method
        # Usually not needed with TestCase (database is rolled back)

    def test_something(self):
        """Test method"""
        # Database changes are rolled back after test
        pass

# Testing utilities
from django.test.utils import override_settings

class ArticleSettingsTest(TestCase):

    @override_settings(DEBUG=True)
    def test_debug_mode(self):
        """Test behavior in debug mode"""
        # DEBUG is True only in this test
        from django.conf import settings
        self.assertTrue(settings.DEBUG)

    @override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
    def test_caching(self):
        """Test with local memory cache"""
        from django.core.cache import cache
        cache.set('test_key', 'test_value')
        self.assertEqual(cache.get('test_key'), 'test_value')

# RequestFactory for testing views without HTTP
from django.test import RequestFactory

class ArticleViewLogicTest(TestCase):

    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user('testuser', 'test@example.com', 'pass')

    def test_view_logic(self):
        """Test view logic without HTTP layer"""
        request = self.factory.get('/articles/')
        request.user = self.user

        # Test view function directly
        response = article_list_view(request)

        self.assertEqual(response.status_code, 200)
        # Test response content without HTTP overhead

# Testing email sending
from django.core import mail

class EmailTest(TestCase):

    def test_welcome_email(self):
        """Test email sending"""
        send_welcome_email(self.user)

        # Test that email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Welcome!')
        self.assertEqual(mail.outbox[0].to, [self.user.email])

        # Reset for next test
        mail.outbox = []
```

**Common mistakes:**
- Using unittest.TestCase instead of Django's TestCase
- Not using setUpTestData for read-only data
- Creating test data in setUp() when setUpTestData() would work
- Not leveraging Django's testing utilities
- Forgetting database rollback behavior
- Testing HTTP responses when testing logic would suffice
- Not resetting global state between tests

**When to apply:**
- Writing any Django tests
- Testing models, views, forms, and utilities
- Setting up test data and fixtures
- Testing database operations and transactions
- During test suite development and optimization