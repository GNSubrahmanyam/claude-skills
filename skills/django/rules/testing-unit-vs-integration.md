---
title: Testing Unit vs Integration
impact: MEDIUM-HIGH
impactDescription: Ensures appropriate test coverage and maintainable tests
tags: django, testing, unit-tests, integration-tests
---

## Testing Unit vs Integration

**Problem:**
Wrong test types lead to slow test suites, missed bugs, or brittle tests. Unit tests that mock too much miss integration issues, while integration tests that are too broad are slow and hard to debug.

**Solution:**
Use unit tests for isolated logic, integration tests for component interaction. Follow Django's testing best practices and use appropriate test base classes.

**Examples:**

❌ **Wrong: Inappropriate test types**
```python
# Bad: Unit test that mocks everything (misses real issues)
class ArticleModelTest(TestCase):
    @patch('django.utils.timezone.now')
    @patch('myapp.models.Article.objects.create')
    def test_create_article(self, mock_create, mock_now):
        # Mocks everything - doesn't test real code!
        mock_now.return_value = datetime(2024, 1, 1)
        mock_create.return_value = Mock()

        result = create_article("Test", "Content")
        self.assertIsNotNone(result)

# Bad: Integration test that tests too much (slow, brittle)
class ArticleViewTest(TestCase):
    def test_full_workflow(self):
        # Tests database, templates, emails, cache - too broad!
        # Slow and fails for unrelated reasons
        pass
```

✅ **Correct: Appropriate test types**
```python
# Unit tests for isolated logic
class ArticleModelTest(TestCase):
    """Test model methods and business logic in isolation"""

    def setUp(self):
        self.author = User.objects.create_user('author', 'author@test.com', 'pass')

    def test_slug_generation(self):
        """Test model method logic"""
        article = Article(title="Test Article!", author=self.author)
        article.save()
        self.assertEqual(article.slug, "test-article")

    def test_word_count_calculation(self):
        """Test computed property"""
        article = Article(
            title="Test",
            content="This is a test article with some words in it.",
            author=self.author
        )
        self.assertEqual(article.word_count, 9)  # Isolated calculation test

    def test_publish_validation(self):
        """Test business rule validation"""
        article = Article(title="Test", author=self.author)

        # Should not allow publishing without content
        with self.assertRaises(ValidationError):
            article.publish()

# Integration tests for component interaction
class ArticleViewsTest(TestCase):
    """Test view behavior with database and templates"""

    def setUp(self):
        self.client = Client()
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
        """Test view renders correctly with data"""
        response = self.client.get('/articles/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'articles/list.html')
        self.assertContains(response, "Test Article")

    def test_article_detail_authenticated(self):
        """Test authenticated user can view article"""
        self.client.login(username='testuser', password='12345')
        response = self.client.get(f'/articles/{self.article.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Article")

    def test_article_creation_workflow(self):
        """Test complete article creation workflow"""
        self.client.login(username='testuser', password='12345')

        # Submit form
        response = self.client.post('/articles/create/', {
            'title': 'New Article',
            'content': 'New content for the article',
        })

        # Should redirect to detail view
        self.assertEqual(response.status_code, 302)

        # Check article was created
        article = Article.objects.get(title='New Article')
        self.assertEqual(article.author, self.user)
        self.assertFalse(article.published)  # Default state

# API integration tests
class ArticleAPITest(TestCase):
    """Test API endpoints with realistic data"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('apiuser', 'api@test.com', 'pass')
        # Create test data
        for i in range(5):
            Article.objects.create(
                title=f"Article {i}",
                content=f"Content {i}",
                author=self.user,
                published=True
            )

    def test_api_list_pagination(self):
        """Test API pagination works correctly"""
        response = self.client.get('/api/articles/?page=1&per_page=2')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(len(data['articles']), 2)
        self.assertEqual(data['pagination']['total_count'], 5)
        self.assertEqual(data['pagination']['total_pages'], 3)

    def test_api_create_authenticated(self):
        """Test API creation requires authentication"""
        # Should fail without auth
        response = self.client.post('/api/articles/', {
            'title': 'API Article',
            'content': 'API content'
        })
        self.assertEqual(response.status_code, 401)

        # Should succeed with auth
        self.client.login(username='apiuser', password='pass')
        response = self.client.post('/api/articles/', {
            'title': 'API Article',
            'content': 'API content'
        })
        self.assertEqual(response.status_code, 201)

# Django-specific test patterns
from django.test import override_settings

class ArticleEmailTest(TestCase):
    """Test email sending functionality"""

    def setUp(self):
        self.user = User.objects.create_user('user', 'user@test.com', 'pass')

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_notification_email_sent(self):
        """Test notification emails are sent"""
        from django.core import mail

        # Trigger email sending
        send_notification_email(self.user, "Test notification")

        # Check email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, "Test notification")
        self.assertEqual(mail.outbox[0].to, [self.user.email])

# Test utilities and factories
import factory

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')

class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Article

    title = factory.Faker('sentence')
    content = factory.Faker('paragraph')
    author = factory.SubFactory(UserFactory)
    published = factory.Faker('boolean')

class ArticleFactoryTest(TestCase):
    """Test using factories for complex data"""

    def test_article_with_comments(self):
        """Test article with multiple comments"""
        article = ArticleFactory()
        comments = CommentFactory.create_batch(3, article=article)

        self.assertEqual(article.comments.count(), 3)
        for comment in comments:
            self.assertEqual(comment.article, article)
```

**Common mistakes:**
- Testing implementation details instead of behavior
- Over-mocking in unit tests
- Testing too much in single integration tests
- Not using Django's test utilities
- Slow tests that aren't run regularly
- Tests that are brittle and break with refactoring

**When to apply:**
- Writing new tests
- Refactoring existing tests
- Debugging test failures
- During test suite optimization
- When adding new features or changing behavior