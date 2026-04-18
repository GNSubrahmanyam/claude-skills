# Testing Coverage Goals (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Ensures adequate test quality and identifies untested code

**Problem:**
Without coverage metrics, teams don't know how much of their code is tested, leading to gaps in test coverage and potential bugs in production.

**Solution:**
Set coverage goals, measure coverage regularly, and use coverage reports to identify and fix coverage gaps.

**Examples:**

❌ **Wrong: No coverage tracking**
```python
# No coverage measurement
# Tests exist but we don't know what's covered
# Potential gaps in critical code paths

# settings for tests
TEST_RUNNER = 'django.test.runner.DiscoverRunner'

# No coverage configuration
# No coverage goals or reporting
```

✅ **Correct: Comprehensive coverage strategy**
```python
# requirements.txt
coverage==7.2.7
django-coverage-plugin==3.1.0

# settings/test.py or pytest.ini
[coverage:run]
source = myapp
omit =
    */tests/*
    */migrations/*
    */__pycache__/*
    */venv/*
    */env/*
    manage.py

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    if self.debug:
    if settings.DEBUG
    raise AssertionError
    raise NotImplementedError
    if 0:
    if __name__ == .__main__.:

show_missing = True
skip_covered = False
skip_empty = False

[coverage:html]
directory = htmlcov

[coverage:xml]
output = coverage.xml

# Run tests with coverage
# pytest command
pytest --cov=myapp --cov-report=html --cov-report=term-missing

# Django test runner with coverage
coverage run --source=myapp manage.py test
coverage report --show-missing
coverage html

# CI/CD coverage requirements
# .github/workflows/test.yml
- name: Run tests with coverage
  run: |
    coverage run --source=myapp manage.py test
    coverage report --fail-under=90
    coverage xml

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
    fail_ci_if_error: true
```

**Coverage goals by component:**
```python
# coverage_config.py - Custom coverage configuration
COVERAGE_GOALS = {
    'overall': 85,        # Overall project coverage
    'models': 95,         # Models should be well tested
    'views': 90,          # Views need good coverage
    'forms': 95,          # Forms are critical for data validation
    'utils': 80,          # Utility functions less critical
    'management': 70,     # Management commands optional
    'migrations': 0,      # Don't test migrations
}

# Test to enforce coverage goals
import coverage
from django.test import TestCase
from django.core.management import call_command

class CoverageTest(TestCase):
    """Test to verify coverage meets goals"""

    def test_coverage_goals(self):
        """Ensure code coverage meets minimum requirements"""
        # Run coverage
        cov = coverage.Coverage(source=['myapp'])
        cov.start()

        # Run tests
        call_command('test', verbosity=0)

        cov.stop()
        cov.save()

        # Check coverage
        analysis = cov.analysis2('myapp')

        total_coverage = cov.report()

        # Assert minimum coverage
        self.assertGreaterEqual(
            total_coverage,
            COVERAGE_GOALS['overall'],
            f"Overall coverage {total_coverage}% is below required {COVERAGE_GOALS['overall']}%"
        )
```

**Coverage improvement strategies:**
```python
# Identify coverage gaps
coverage run --source=myapp manage.py test
coverage report --show-missing

# Output:
# Name                      Stmts   Miss  Cover   Missing
# -------------------------------------------------------
# myapp/models.py              50      5    90%   25-30
# myapp/views.py              100     20    80%   45-50, 75-85
# myapp/utils.py               30      3    90%   15

# Focus on missing lines
# Add tests for the missing line numbers shown

# Use coverage branches for conditional coverage
[coverage:run]
branch = True

[coverage:report]
show_missing = True
skip_covered = False

# Example: Test both branches of conditional
def test_conditional_logic(self):
    # Test if branch
    obj.status = 'active'
    result = obj.process()
    self.assertEqual(result, 'processed')

    # Test else branch
    obj.status = 'inactive'
    result = obj.process()
    self.assertEqual(result, 'skipped')

# Exclude generated code from coverage
[coverage:report]
exclude_lines =
    pragma: no cover
    @abstractmethod
    raise NotImplementedError
    pass  # Empty functions
    class .*\bProtocol\):  # Protocol classes

# Coverage badges for README
# Update coverage badge in CI
- name: Update coverage badge
  run: |
    coverage run --source=myapp manage.py test
    COVERAGE=$(coverage report | grep TOTAL | awk '{print $4}' | sed 's/%//')
    echo "Coverage: ${COVERAGE}%"
    # Update badge file or use shields.io dynamic badge
```

**Coverage patterns for different code types:**
```python
# Model testing coverage
class ArticleModelCoverage(TestCase):
    """Ensure model methods are fully covered"""

    def test_all_model_methods(self):
        """Test all public methods on Article model"""
        article = Article.objects.create(
            title="Test", content="Content", author=self.user
        )

        # Test __str__ method
        self.assertEqual(str(article), "Test")

        # Test custom methods
        self.assertEqual(article.get_word_count(), 2)
        self.assertTrue(article.is_recent())

        # Test properties
        self.assertIsNotNone(article.slug)

    def test_model_validation(self):
        """Test model field validation"""
        # Test valid data
        article = Article(title="Valid", content="Content", author=self.user)
        article.full_clean()  # Should not raise

        # Test invalid data
        with self.assertRaises(ValidationError):
            invalid = Article(title="", content="", author=self.user)
            invalid.full_clean()

# View testing coverage
class ArticleViewsCoverage(TestCase):
    """Ensure all view code paths are covered"""

    def test_all_view_methods(self):
        """Test all HTTP methods for article views"""
        # GET request
        response = self.client.get('/articles/1/')
        self.assertEqual(response.status_code, 200)

        # POST request (if applicable)
        response = self.client.post('/articles/1/', {'data': 'value'})
        self.assertEqual(response.status_code, 200)

        # Test error conditions
        response = self.client.get('/articles/999/')
        self.assertEqual(response.status_code, 404)

    def test_view_permissions(self):
        """Test permission checks in views"""
        # Test unauthenticated access
        self.client.logout()
        response = self.client.get('/articles/create/')
        self.assertEqual(response.status_code, 302)  # Redirect to login

        # Test authenticated access
        self.client.login(username='user', password='pass')
        response = self.client.get('/articles/create/')
        self.assertEqual(response.status_code, 200)

# Edge case coverage
class EdgeCaseCoverage(TestCase):
    """Test edge cases that are often missed"""

    def test_empty_queryset(self):
        """Test behavior with empty querysets"""
        articles = Article.objects.filter(title='nonexistent')
        self.assertEqual(articles.count(), 0)

        # Test view with empty results
        response = self.client.get('/articles/?q=nonexistent')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context['articles']), 0)

    def test_unicode_content(self):
        """Test with unicode characters"""
        article = Article.objects.create(
            title="测试文章",  # Chinese characters
            content="ñáéíóú",  # Accented characters
            author=self.user
        )
        self.assertEqual(article.title, "测试文章")

    def test_large_data(self):
        """Test with large datasets"""
        # Create many objects
        for i in range(100):
            Article.objects.create(
                title=f"Article {i}",
                content=f"Content {i}",
                author=self.user
            )

        # Test pagination
        response = self.client.get('/articles/?page=2')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.context['articles']), 25)  # Assuming 25 per page
```

**Common mistakes:**
- Setting unrealistic coverage goals
- Focusing on coverage percentage over test quality
- Not testing error conditions and edge cases
- Excluding important code from coverage
- Not reviewing coverage reports regularly
- Using coverage as the only quality metric

**When to apply:**
- Setting up new test suites
- Reviewing existing test coverage
- During code reviews and pull requests
- Continuous integration and deployment
- Sprint planning and test planning
- Identifying technical debt in testing