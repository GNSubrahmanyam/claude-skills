# Django Development Workflows

This document provides detailed workflow patterns for common Django development tasks, including checklists, error handling, and best practices for different scenarios.

## Model Development Workflow

For creating and modifying Django models with proper migrations and testing:

**Checklist Pattern:**
```
Model Development:
- [ ] Define model fields with appropriate types and constraints
- [ ] Add model methods and properties for business logic
- [ ] Configure Meta class with ordering, indexes, and constraints
- [ ] Create and run migrations
- [ ] Update admin registration if needed
- [ ] Write model tests
- [ ] Test migrations on fresh database
```

**Detailed Steps:**

1. **Define model fields**
   - Choose appropriate field types (CharField, ForeignKey, etc.)
   - Set max_length for string fields
   - Configure on_delete for foreign keys
   - Add validators and constraints

2. **Add business logic**
   - Implement custom methods on model
   - Add properties for computed values
   - Override save() or delete() if needed

3. **Configure Meta options**
   - Set ordering for default queries
   - Add database indexes for performance
   - Configure unique constraints
   - Set verbose names and help texts

4. **Create migrations**
   - Run `python manage.py makemigrations`
   - Review generated migration files
   - Run `python manage.py migrate`

## View Implementation Workflow

For implementing Django views with proper error handling and testing:

**Checklist Pattern:**
```
View Implementation:
- [ ] Choose appropriate view type (function/class/generic)
- [ ] Implement URL configuration
- [ ] Add proper error handling (404, 403, 500)
- [ ] Implement form handling if needed
- [ ] Add context data and template rendering
- [ ] Test view with different scenarios
- [ ] Add authentication/authorization checks
```

**Error Handling Patterns:**

```python
# Good: Comprehensive error handling
def article_detail(request, pk):
    try:
        article = get_object_or_404(Article, pk=pk, published=True)
    except Http404:
        # Custom 404 handling
        return render(request, '404.html', status=404)

    if not article.can_view(request.user):
        raise PermissionDenied("You don't have permission to view this article")

    return render(request, 'article/detail.html', {'article': article})
```

## Form Processing Workflow

For implementing forms with validation and security:

**Checklist Pattern:**
```
Form Processing:
- [ ] Choose form type (Form/ModelForm)
- [ ] Implement custom validation methods
- [ ] Add CSRF protection
- [ ] Handle file uploads if needed
- [ ] Implement success/error responses
- [ ] Add form to templates with proper rendering
- [ ] Test form validation edge cases
```

**Security-First Form Handling:**

```python
def contact_view(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            # Process form data securely
            send_contact_email(form.cleaned_data)
            messages.success(request, 'Message sent successfully!')
            return redirect('contact_success')
    else:
        form = ContactForm()

    return render(request, 'contact/form.html', {'form': form})
```

## Database Query Optimization Workflow

For optimizing slow database queries:

**Checklist Pattern:**
```
Query Optimization:
- [ ] Identify slow queries using Django Debug Toolbar
- [ ] Analyze query patterns (N+1, missing indexes)
- [ ] Add select_related/prefetch_related as needed
- [ ] Create database indexes for filtered fields
- [ ] Implement caching for expensive queries
- [ ] Test query performance improvements
- [ ] Monitor query count and execution time
```

**Query Analysis Pattern:**

```python
# Before optimization - check query count
def author_books_bad(author_id):
    author = Author.objects.get(id=author_id)
    books = []  # This causes N queries!
    for book in author.books.all():
        books.append({
            'title': book.title,
            'publisher': book.publisher.name  # Extra query per book
        })
    return books

# After optimization
def author_books_good(author_id):
    author = Author.objects.select_related().prefetch_related('books__publisher').get(id=author_id)
    return [{
        'title': book.title,
        'publisher': book.publisher.name  # No extra queries
    } for book in author.books.all()]
```

## Testing Implementation Workflow

For comprehensive Django testing:

**Checklist Pattern:**
```
Testing Implementation:
- [ ] Write unit tests for models and utilities
- [ ] Create integration tests for views and forms
- [ ] Test edge cases and error conditions
- [ ] Use fixtures or factories for test data
- [ ] Test authentication and authorization
- [ ] Run tests with coverage reporting
- [ ] Test migrations don't break data
```

**Test Organization Pattern:**

```python
# tests/test_models.py
class ArticleModelTest(TestCase):
    def setUp(self):
        self.author = Author.objects.create(name="Test Author")

    def test_article_creation(self):
        article = Article.objects.create(
            title="Test Article",
            author=self.author
        )
        self.assertEqual(article.title, "Test Article")
        self.assertEqual(article.slug, "test-article")  # Test auto-generated fields

    def test_article_str_method(self):
        article = Article(title="Test", author=self.author)
        self.assertEqual(str(article), "Test")
```

## Deployment Preparation Workflow

For preparing Django applications for production deployment:

**Checklist Pattern:**
```
Production Deployment:
- [ ] Configure production settings (DEBUG=False)
- [ ] Set up proper logging configuration
- [ ] Configure static files serving
- [ ] Set up database connection pooling
- [ ] Configure caching backend
- [ ] Enable HTTPS and security headers
- [ ] Set up monitoring and error tracking
- [ ] Test deployment on staging environment
```

**Security Configuration:**

```python
# settings/production.py
DEBUG = False
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']

# Security middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # ... other middleware
]

# HTTPS settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```