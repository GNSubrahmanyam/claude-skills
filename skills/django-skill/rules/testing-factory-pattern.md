# Testing Factory Pattern (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Enables flexible and maintainable test data creation

**Problem:**
Hardcoded test data creation leads to repetitive code, maintenance issues, and tests that are hard to modify. Factories provide a better way to create test data dynamically.

**Solution:**
Use factory libraries like Factory Boy or Django's built-in factories to create flexible, reusable test data that can be easily customized for different test scenarios.

**Examples:**

❌ **Wrong: Hardcoded test data creation**
```python
# tests.py - REPETITIVE AND BRITTLE
class ArticleTest(TestCase):
    def setUp(self):
        # Same data creation repeated everywhere
        self.user = User.objects.create(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            password='password123'
        )
        self.category = Category.objects.create(
            name='Technology',
            slug='tech',
            description='Tech articles'
        )

    def test_article_creation(self):
        # More repetitive data creation
        article = Article.objects.create(
            title='Test Article',
            content='Test content for article',
            slug='test-article',
            author=self.user,
            category=self.category,
            published=True,
            published_date=timezone.now()
        )

        self.assertEqual(article.title, 'Test Article')

    def test_article_with_comments(self):
        # Even more repetitive creation
        article = Article.objects.create(
            title='Article with Comments',
            content='Content',
            author=self.user,
            category=self.category,
            published=True
        )

        comment1 = Comment.objects.create(
            article=article,
            author=self.user,
            content='Great article!',
            approved=True
        )

        comment2 = Comment.objects.create(
            article=article,
            author=self.user,
            content='Thanks for sharing',
            approved=True
        )

        # Test logic
        self.assertEqual(article.comments.count(), 2)
```

✅ **Correct: Factory pattern**
```python
# factories.py
import factory
from django.contrib.auth import get_user_model
from . import models

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = get_user_model()

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    password = factory.PostGenerationMethodCall('set_password', 'password123')
    is_active = True

class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Category

    name = factory.Faker('word')
    slug = factory.LazyAttribute(lambda obj: obj.name.lower())
    description = factory.Faker('sentence')

class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Article

    title = factory.Faker('sentence', nb_words=4)
    content = factory.Faker('paragraph', nb_sentences=3)
    slug = factory.LazyAttribute(lambda obj: obj.title.lower().replace(' ', '-').replace('.', ''))
    author = factory.SubFactory(UserFactory)
    category = factory.SubFactory(CategoryFactory)
    published = factory.Faker('boolean', chance_of_getting_true=70)
    published_date = factory.LazyAttribute(
        lambda obj: factory.Faker('date_time_this_year').generate() if obj.published else None
    )

    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        """Add tags to article"""
        if not create:
            return

        if extracted:
            for tag in extracted:
                self.tags.add(tag)

class CommentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Comment

    article = factory.SubFactory(ArticleFactory)
    author = factory.SubFactory(UserFactory)
    content = factory.Faker('paragraph', nb_sentences=2)
    approved = factory.Faker('boolean', chance_of_getting_true=80)
    created_date = factory.Faker('date_time_this_year')

# tests/test_models.py
from .factories import ArticleFactory, CommentFactory

class ArticleModelTest(TestCase):

    def test_article_creation(self):
        """Test article creation with factory"""
        article = ArticleFactory()

        self.assertIsNotNone(article.title)
        self.assertIsNotNone(article.content)
        self.assertIsNotNone(article.author)
        self.assertTrue(len(article.title) > 0)

    def test_article_with_comments(self):
        """Test article with multiple comments"""
        article = ArticleFactory()
        comments = CommentFactory.create_batch(3, article=article)

        self.assertEqual(article.comments.count(), 3)
        for comment in comments:
            self.assertEqual(comment.article, article)
            self.assertTrue(comment.approved)

    def test_published_articles(self):
        """Test published article filtering"""
        # Create mix of published and draft articles
        ArticleFactory.create_batch(5, published=True)
        ArticleFactory.create_batch(3, published=False)

        published_count = Article.objects.filter(published=True).count()
        self.assertEqual(published_count, 5)

# tests/test_views.py
from .factories import ArticleFactory, UserFactory

class ArticleViewsTest(TestCase):

    def setUp(self):
        self.user = UserFactory()
        # Create test articles
        ArticleFactory.create_batch(10, author=self.user)

    def test_article_list_view(self):
        """Test article list pagination"""
        response = self.client.get('/articles/')

        self.assertEqual(response.status_code, 200)
        # Assuming 25 per page, should show all 10
        self.assertEqual(len(response.context['articles']), 10)

    def test_article_detail_view(self):
        """Test article detail view"""
        article = ArticleFactory(published=True)

        response = self.client.get(f'/articles/{article.pk}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['article'], article)

# Advanced factory patterns
class PublishedArticleFactory(ArticleFactory):
    """Factory for published articles only"""
    published = True
    published_date = factory.Faker('date_time_this_year')

class TechArticleFactory(ArticleFactory):
    """Factory for tech category articles"""
    category = factory.SubFactory(CategoryFactory, name='Technology', slug='tech')

class ArticleWithCommentsFactory(ArticleFactory):
    """Factory that creates article with comments"""

    @factory.post_generation
    def comments(self, create, extracted, **kwargs):
        """Create comments for the article"""
        if not create:
            return

        if extracted:
            # Use provided comments
            for comment in extracted:
                self.comments.add(comment)
        else:
            # Create default comments
            CommentFactory.create_batch(2, article=self)

# Usage examples
class ComplexArticleTest(TestCase):

    def test_article_with_comments_workflow(self):
        """Test complete article and comments workflow"""
        # Create article with comments in one line
        article = ArticleWithCommentsFactory()

        self.assertEqual(article.comments.count(), 2)
        for comment in article.comments.all():
            self.assertEqual(comment.article, article)
            self.assertTrue(comment.approved)

    def test_published_tech_articles(self):
        """Test published tech articles"""
        # Create published tech articles
        articles = PublishedArticleFactory.create_batch(5, category__name='Technology')

        published_tech = Article.objects.filter(
            published=True,
            category__name='Technology'
        )

        self.assertEqual(published_tech.count(), 5)

# Factory for related objects
class AuthorWithArticlesFactory(UserFactory):
    """Factory that creates author with articles"""

    # Create 3-5 articles for this author
    articles = factory.RelatedFactoryList(
        ArticleFactory,
        factory_related_name='author',
        size=lambda: factory.Faker('random_int', min=3, max=5).generate()
    )

class TestAuthorArticles(TestCase):

    def test_author_with_articles(self):
        """Test author article relationships"""
        author = AuthorWithArticlesFactory()

        self.assertTrue(author.articles.count() >= 3)
        self.assertTrue(author.articles.count() <= 5)

        for article in author.articles.all():
            self.assertEqual(article.author, author)

# Custom factory methods
class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = models.Article

    title = factory.Faker('sentence')
    content = factory.Faker('paragraph')
    author = factory.SubFactory(UserFactory)
    published = False

    @classmethod
    def create_published(cls, **kwargs):
        """Create a published article with defaults"""
        return cls.create(
            published=True,
            published_date=timezone.now(),
            **kwargs
        )

    @classmethod
    def create_featured(cls, **kwargs):
        """Create a featured article"""
        return cls.create(
            published=True,
            featured=True,
            published_date=timezone.now(),
            **kwargs
        )

# Usage
class ArticlePublishingTest(TestCase):

    def test_publish_article(self):
        """Test publishing workflow"""
        draft = ArticleFactory()  # Creates draft
        self.assertFalse(draft.published)

        published = ArticleFactory.create_published()  # Creates published
        self.assertTrue(published.published)
        self.assertIsNotNone(published.published_date)

        featured = ArticleFactory.create_featured()  # Creates featured
        self.assertTrue(featured.published)
        self.assertTrue(featured.featured)
```

**Factory best practices:**
```python
# factories.py - Best practices
import factory
from django.utils import timezone

class BaseFactory(factory.django.DjangoModelFactory):
    """Base factory with common settings"""

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override to handle custom creation logic"""
        # Custom creation logic here
        return super()._create(model_class, *args, **kwargs)

class UserFactory(BaseFactory):
    class Meta:
        model = get_user_model()

    # Use sequences for unique fields
    username = factory.Sequence(lambda n: f'testuser{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')

    # Use Faker for realistic data
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')

    # Handle password properly
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')

class ArticleFactory(BaseFactory):
    class Meta:
        model = Article

    title = factory.Faker('sentence', nb_words=4)
    content = factory.Faker('paragraph')
    author = factory.SubFactory(UserFactory)
    published = factory.Faker('boolean', chance_of_getting_true=70)

    # Custom lazy attributes
    slug = factory.LazyAttribute(
        lambda obj: obj.title.lower().replace(' ', '-').replace('.', '')
    )

    # Conditional fields
    published_date = factory.LazyAttribute(
        lambda obj: timezone.now() if obj.published else None
    )

# Test utilities
def create_test_data():
    """Create comprehensive test data set"""
    # Create users
    users = UserFactory.create_batch(5)

    # Create categories
    categories = CategoryFactory.create_batch(3)

    # Create articles for each user
    articles = []
    for user in users:
        user_articles = ArticleFactory.create_batch(
            factory.Faker('random_int', min=2, max=5).generate(),
            author=user,
            category=factory.Iterator(categories)
        )
        articles.extend(user_articles)

    # Create comments for articles
    for article in articles[:10]:  # Comment on first 10 articles
        CommentFactory.create_batch(
            factory.Faker('random_int', min=0, max=3).generate(),
            article=article
        )

    return {
        'users': users,
        'categories': categories,
        'articles': articles
    }
```

**Common mistakes:**
- Not using factories for complex test data
- Creating factories that are too complex
- Not maintaining factory files with model changes
- Using hardcoded values instead of faker data
- Not leveraging factory relationships properly
- Creating circular dependencies in factories

**When to apply:**
- Creating complex test data with relationships
- Testing with varied and realistic data
- Building reusable test data across test files
- Generating data for integration tests
- During test suite development and maintenance