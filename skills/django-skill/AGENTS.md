# Django Development Best Practices - Complete Rules Reference

This document compiles all 60+ rules from the Django Development Best Practices framework, organized by impact priority for comprehensive Django application development guidance.

---

## 1. Security & Authentication (CRITICAL)

### Security CSRF Protection
**Impact:** CRITICAL - Prevents cross-site request forgery attacks

**Problem:**
Django applications are vulnerable to CSRF attacks if protection is disabled or improperly configured, allowing attackers to perform unauthorized actions on behalf of users.

**Solution:**
Always enable CSRF protection for forms and POST requests. Django provides built-in CSRF protection that should be enabled by default.

❌ **Wrong: CSRF disabled**
```python
# settings.py
MIDDLEWARE = [
    # Missing CsrfViewMiddleware
]

# In templates
<form method="post">
    <!-- No csrf_token - vulnerable! -->
</form>
```

✅ **Correct: CSRF enabled (default)**
```python
# settings.py
MIDDLEWARE = [
    'django.middleware.csrf.CsrfViewMiddleware',  # Always include this
    # ... other middleware
]

# In templates
<form method="post">
    {% csrf_token %}  <!-- Always include this in forms -->
    <!-- form fields -->
</form>
```

### Security SQL Injection
**Impact:** CRITICAL - Prevents malicious database manipulation

**Problem:**
SQL injection attacks can compromise entire databases by injecting malicious SQL through user input. Raw SQL queries without proper parameterization are particularly vulnerable.

**Solution:**
Always use Django's ORM methods or parameterized queries. Never construct SQL by string concatenation with user input.

❌ **Wrong: String concatenation**
```python
# Vulnerable to SQL injection!
query = f"SELECT * FROM users WHERE username = '{username}'"
User.objects.raw(query)  # DANGER!

# Also vulnerable
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

✅ **Correct: ORM methods**
```python
# Safe - ORM handles parameterization
user = User.objects.get(username=username)
posts = Post.objects.filter(published_date__gte=start_date)

# Safe - parameterized queries
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
```

### Security XSS Prevention
**Impact:** CRITICAL - Prevents cross-site scripting attacks

**Problem:**
User input displayed in templates without proper escaping can execute malicious JavaScript in users' browsers, compromising user sessions and stealing data.

**Solution:**
Always escape user input in templates. Use Django's auto-escaping and be extremely careful with the `safe` filter and `mark_safe`.

❌ **Wrong: Unsafe template rendering**
```django
<!-- Vulnerable to XSS -->
<div>{{ user_comment|safe }}</div>  <!-- DANGER: bypasses escaping -->

<div>{{ user_input }}</div>  <!-- This is actually safe - Django auto-escapes -->

<script>
  var userData = "{{ user_json|safe }}";  // XSS vulnerability
</script>
```

✅ **Correct: Safe template rendering**
```django
<!-- Safe - Django auto-escapes by default -->
<div>{{ user_comment }}</div>

<!-- Safe - only use safe when you absolutely trust the content -->
<div class="trusted-content">{{ trusted_html|safe }}</div>

<!-- Safe - use format_html for dynamic content -->
{% load utils %}
<div class="message">
  {% format_html "Welcome back, <strong>{}</strong>!" user.name %}
</div>

<!-- Safe - escape manually when needed -->
<div>{{ user_input|escape }}</div>
```

### Security HTTPS Only
**Impact:** CRITICAL - Protects data in transit and prevents MITM attacks

**Problem:**
HTTP traffic can be intercepted and modified by attackers, exposing sensitive data and allowing man-in-the-middle attacks that can compromise user sessions and data.

**Solution:**
Force HTTPS in production with proper security headers and secure cookie settings.

✅ **Correct: HTTPS enforcement**
```python
# settings.py - Production secure configuration
DEBUG = False
ALLOWED_HOSTS = ['example.com', 'www.example.com']

# HTTPS enforcement
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Secure cookies
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
```
**Impact:** CRITICAL - Prevents malicious database manipulation

**Problem:**
SQL injection attacks can compromise entire databases by injecting malicious SQL through user input. Raw SQL queries without proper parameterization are particularly vulnerable.

**Solution:**
Always use Django's ORM methods or parameterized queries. Never construct SQL by string concatenation with user input.

❌ **Wrong: String concatenation**
```python
# Vulnerable to SQL injection!
query = f"SELECT * FROM users WHERE username = '{username}'"
User.objects.raw(query)  # DANGER!

# Also vulnerable
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

✅ **Correct: ORM methods**
```python
# Safe - ORM handles parameterization
user = User.objects.get(username=username)
posts = Post.objects.filter(published_date__gte=start_date)

# Safe - parameterized queries
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
```

### Security XSS Prevention
**Impact:** CRITICAL - Prevents cross-site scripting attacks

**Problem:**
User input displayed in templates without proper escaping can execute malicious JavaScript in users' browsers.

**Solution:**
Always escape user input in templates. Use Django's auto-escaping and be careful with the `safe` filter.

❌ **Wrong: Unsafe template rendering**
```django
<!-- Vulnerable to XSS -->
<div>{{ user_comment|safe }}</div>  <!-- DANGER: bypasses escaping -->

<div>{{ user_input }}</div>  <!-- This is actually safe - Django auto-escapes -->
```

✅ **Correct: Safe template rendering**
```django
<!-- Safe - Django auto-escapes by default -->
<div>{{ user_comment }}</div>

<!-- Only use safe when you absolutely trust the content -->
<div>{{ trusted_html_content|safe }}</div>
```

### Security HTTPS Only
**Impact:** CRITICAL - Protects data in transit

**Problem:**
HTTP traffic can be intercepted and modified by attackers, exposing sensitive data and allowing man-in-the-middle attacks.

**Solution:**
Force HTTPS in production and set appropriate security headers.

✅ **Correct: HTTPS configuration**
```python
# settings.py for production
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### Security Password Hashing
**Impact:** CRITICAL - Protects user credentials

**Problem:**
Storing passwords in plain text or using weak hashing makes user accounts vulnerable to compromise.

**Solution:**
Always use Django's built-in password hashing and authentication system.

✅ **Correct: Django authentication**
```python
# Django handles this automatically with User model
from django.contrib.auth.models import User

# Creating users
user = User.objects.create_user(username='john', password='secret')

# Authentication
from django.contrib.auth import authenticate, login
user = authenticate(request, username=username, password=password)
if user is not None:
    login(request, user)
```

### Security Session Security
**Impact:** CRITICAL - Prevents session hijacking

**Problem:**
Improper session configuration can allow attackers to hijack user sessions or perform session fixation attacks.

**Solution:**
Configure sessions securely with appropriate timeouts and security settings.

✅ **Correct: Secure session configuration**
```python
# settings.py
SESSION_ENGINE = 'django.contrib.sessions.backends.db'  # Or cache/redis
SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = True
```

---

## 2. Database & Models (CRITICAL)

### Database Migration Safety
**Impact:** CRITICAL - Prevents database corruption and data loss

**Problem:**
Manual modification of migration files can lead to database inconsistencies, deployment failures, and data corruption.

**Solution:**
Never modify existing migration files manually. Create new migrations for schema changes.

❌ **Wrong: Manual editing of migrations**
```python
# NEVER edit existing migration files!
# 0001_initial.py (DON'T MODIFY)
operations = [
    migrations.CreateModel(...),
    # Manually adding new operations here - BAD!
]
```

✅ **Correct: Create new migrations**
```bash
# After changing models.py
python manage.py makemigrations
python manage.py migrate

# For data migrations
python manage.py makemigrations --empty myapp
# Edit the empty migration file to add operations
```

### Database Indexes Strategy
**Impact:** CRITICAL - Ensures query performance and prevents slow database operations

**Problem:**
Missing database indexes on frequently queried fields cause slow queries, high CPU usage, and poor application performance that can bring down production systems.

**Solution:**
Add strategic database indexes for fields used in WHERE clauses, JOINs, ORDER BY operations, and unique constraints. Monitor slow queries and add indexes accordingly.

❌ **Wrong: Missing critical indexes**
```python
class Article(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    published_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

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

    class Meta:
        indexes = [
            # Most common query patterns
            models.Index(fields=['published_date', 'status']),  # Article listings
            models.Index(fields=['author', 'published_date']),  # Author articles
            models.Index(fields=['category', 'published_date']),  # Category pages
        ]
```

### Database Foreign Key Protection
**Impact:** CRITICAL - Maintains referential integrity and prevents data corruption

**Problem:**
Incorrect `on_delete` behavior can lead to orphaned records, data loss, application crashes, or silent data corruption when related objects are deleted.

**Solution:**
Choose appropriate `on_delete` behavior based on business requirements and data relationships. Use `PROTECT` for critical relationships and `CASCADE` only when appropriate.

❌ **Wrong: Dangerous on_delete choices**
```python
class Article(models.Model):
    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE  # Too dangerous - deleting author deletes all articles!
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
```

### Database Constraints Validation
**Impact:** CRITICAL - Ensures data integrity and prevents invalid data storage

**Problem:**
Missing constraints allow invalid data to be stored, leading to application bugs, data corruption, and inconsistent database state.

**Solution:**
Use model-level and database-level constraints to enforce data integrity. Combine Django model validation with database constraints for comprehensive protection.

✅ **Correct: Multiple constraint levels**
```python
class Product(models.Model):
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(price__gte=Decimal('0.00')),
                name='price_non_negative'
            ),
        ]

    def clean(self):
        if self.price <= 0:
            raise ValidationError({'price': 'Price must be positive'})
```

### Database Transaction Management
**Impact:** CRITICAL - Ensures data consistency and prevents partial updates

**Problem:**
Related database operations not wrapped in transactions can leave data in inconsistent states if errors occur midway through operations, leading to data corruption and application bugs.

**Solution:**
Use database transactions for related operations that must succeed or fail together. Use Django's `transaction.atomic()` decorator or context manager.

✅ **Correct: Transaction management**
```python
from django.db import transaction

@transaction.atomic
def transfer_money(from_account, to_account, amount):
    from_account.balance -= amount
    to_account.balance += amount
    from_account.save()
    to_account.save()
```

### Database Indexes Strategy
**Impact:** CRITICAL - Ensures query performance

**Problem:**
Missing database indexes on frequently queried fields can cause slow queries and poor application performance.

**Solution:**
Add database indexes for fields used in WHERE clauses, JOINs, and ORDER BY operations.

✅ **Correct: Strategic indexing**
```python
class Article(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    published_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            models.Index(fields=['published_date', 'status']),  # Common query
            models.Index(fields=['author', 'published_date']),  # Author articles
            models.Index(fields=['category', 'published_date']),  # Category pages
        ]
```

### Database Foreign Key Protection
**Impact:** CRITICAL - Maintains referential integrity

**Problem:**
Incorrect `on_delete` behavior can lead to orphaned records, data loss, or application crashes.

**Solution:**
Choose appropriate `on_delete` behavior based on business requirements.

✅ **Correct: Appropriate on_delete choices**
```python
class Article(models.Model):
    author = models.ForeignKey(
        Author,
        on_delete=models.CASCADE  # Delete articles if author deleted
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,  # Set to NULL if category deleted
        null=True, blank=True
    )
    editor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,  # Prevent deletion if referenced
        related_name='edited_articles'
    )
```

### Database N+1 Query Prevention
**Impact:** CRITICAL - Prevents exponential query growth

**Problem:**
N+1 query problems occur when code executes one query for main objects, then additional queries for each object's related data.

**Solution:**
Use `select_related()` for ForeignKey and `prefetch_related()` for ManyToMany relationships.

❌ **Wrong: N+1 queries**
```python
# Bad - N+1 queries (1 + N queries)
posts = Post.objects.all()  # 1 query
for post in posts:
    author = post.author  # N additional queries (one per post)
    print(f"{post.title} by {author.name}")
```

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

### Database Constraints Validation
**Impact:** CRITICAL - Ensures data integrity

**Problem:**
Missing constraints allow invalid data to be stored, leading to application bugs and data corruption.

**Solution:**
Use model-level and database-level constraints to enforce data integrity.

✅ **Correct: Multiple constraint levels**
```python
class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sku = models.CharField(max_length=50, unique=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    stock_quantity = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(price__gte=0), name='price_positive'),
            models.CheckConstraint(check=models.Q(stock_quantity__gte=0), name='stock_non_negative'),
            models.UniqueConstraint(fields=['category', 'name'], name='unique_category_name'),
        ]

    def clean(self):
        if self.price <= 0:
            raise ValidationError('Price must be positive')
        if len(self.name.strip()) < 3:
            raise ValidationError('Name must be at least 3 characters')
```

### Database Transaction Management
**Impact:** CRITICAL - Ensures data consistency

**Problem:**
Related database operations not wrapped in transactions can leave data in inconsistent states if errors occur.

**Solution:**
Use database transactions for related operations that must succeed or fail together.

✅ **Correct: Transaction usage**
```python
from django.db import transaction

# Good: Atomic transfer operation
@transaction.atomic
def transfer_money(from_account, to_account, amount):
    from_account.balance -= amount
    to_account.balance += amount
    from_account.save()
    to_account.save()

# Good: Using context manager
def create_order_with_items(order_data, items_data):
    with transaction.atomic():
        order = Order.objects.create(**order_data)
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        # All or nothing - if any item creation fails, order is rolled back
```

---

## 3. Views & URLs (HIGH)

### Views Function vs Class
**Impact:** HIGH - Ensures maintainable view architecture

**Problem:**
Choosing the wrong view type leads to code duplication and poor maintainability.

**Solution:**
Use function-based views for simple logic, class-based views for complex views.

❌ **Wrong: Overly complex function view**
```python
def article_detail(request, pk):  # Too complex for function
    article = get_object_or_404(Article, pk=pk)
    comments = article.comments.filter(active=True)

    if request.method == 'POST':
        # Complex form handling mixed with display logic
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.article = article
            comment.save()
            return redirect('article_detail', pk=pk)
    else:
        form = CommentForm()

    return render(request, 'article/detail.html', {
        'article': article,
        'comments': comments,
        'form': form
    })
```

✅ **Correct: Appropriate view types**
```python
def article_list(request):
    """Simple view - function-based is appropriate"""
    articles = Article.objects.all()
    return render(request, 'articles/list.html', {'articles': articles})

# Good: Class-based for complex logic
class ArticleDetailView(DetailView):
    model = Article
    template_name = 'articles/detail.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['related'] = self.get_related_articles()
        return context
```

### Views HTTP Methods
**Impact:** HIGH - Ensures proper RESTful API design and security

**Problem:**
Not properly handling different HTTP methods can lead to security vulnerabilities, poor API design, and unexpected behavior.

**Solution:**
Explicitly handle appropriate HTTP methods and return proper HTTP status codes. Use Django's method decorators or check `request.method` explicitly.

❌ **Wrong: Missing method validation**
```python
def create_post(request):
    # Accepts any HTTP method! Dangerous!
    if request.method == 'POST':
        # Handle POST
        pass
    # GET requests fall through without proper response

def delete_item(request, item_id):
    # No method checking - accepts GET, POST, etc.
    Item.objects.get(id=item_id).delete()
    return redirect('item_list')  # Wrong - should be POST only
```

✅ **Correct: Proper HTTP method handling**
```python
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET", "POST"])
def article_view(request, pk):
    article = get_object_or_404(Article, pk=pk, published=True)

    if request.method == 'GET':
        return render(request, 'article/detail.html', {'article': article})

    elif request.method == 'POST':
        # Handle form submission
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.article = article
            comment.author = request.user
            comment.save()
            return redirect('article_detail', pk=pk)
```

### Views Error Handling
**Impact:** HIGH - Provides better user experience and prevents information leakage

**Problem:**
Poor error handling leads to 500 errors, confusing users, exposing sensitive information, and hiding actual problems from developers.

**Solution:**
Implement proper error handling with appropriate HTTP status codes, user-friendly messages, and proper logging.

✅ **Correct: Comprehensive error handling**
```python
from django.core.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)

def article_detail(request, pk):
    try:
        article = get_object_or_404(
            Article,
            pk=pk,
            published=True  # Add business logic filtering
        )
    except Http404:
        logger.warning(f"Article {pk} not found or not published")
        return render(request, '404.html', status=404)

    if not article.can_view(request.user):
        raise PermissionDenied("You don't have permission to view this article")

    return render(request, 'article/detail.html', {'article': article})
```

### Views Pagination
**Impact:** HIGH - Prevents memory issues and improves performance

**Problem:**
Loading all records at once can cause memory exhaustion, slow page loads, and poor user experience.

**Solution:**
Use Django's pagination for large datasets. Choose appropriate page sizes and provide navigation controls.

✅ **Correct: Pagination implementation**
```python
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

def article_list(request):
    article_list = Article.objects.filter(published=True).order_by('-published_date')
    paginator = Paginator(article_list, 25)  # Show 25 articles per page

    page = request.GET.get('page')
    try:
        articles = paginator.page(page)
    except PageNotAnInteger:
        articles = paginator.page(1)
    except EmptyPage:
        articles = paginator.page(paginator.num_pages)

    return render(request, 'articles/list.html', {'articles': articles})
```

### Views HTTP Methods
**Impact:** HIGH - Ensures proper RESTful API design

**Problem:**
Not properly handling different HTTP methods can lead to security vulnerabilities and poor API design.

**Solution:**
Explicitly handle appropriate HTTP methods and return proper responses.

✅ **Correct: Proper HTTP method handling**
```python
def article_view(request, pk):
    article = get_object_or_404(Article, pk=pk, published=True)

    if request.method == 'GET':
        return render(request, 'article/detail.html', {'article': article})

    elif request.method == 'PUT':
        if not request.user.has_perm('articles.change_article'):
            return HttpResponseForbidden()
        # Handle update logic
        return JsonResponse({'status': 'updated'})

    elif request.method == 'DELETE':
        if not request.user.has_perm('articles.delete_article'):
            return HttpResponseForbidden()
        article.delete()
        return HttpResponse(status=204)

    else:
        return HttpResponseNotAllowed(['GET', 'PUT', 'DELETE'])
```

### Views Error Handling
**Impact:** HIGH - Provides better user experience and debugging

**Problem:**
Poor error handling leads to 500 errors, confusing users, and hiding actual problems.

**Solution:**
Implement proper error handling with appropriate HTTP status codes and user-friendly messages.

✅ **Correct: Comprehensive error handling**
```python
from django.http import Http404, HttpResponseBadRequest
from django.core.exceptions import PermissionDenied

def article_detail(request, pk):
    try:
        article = get_object_or_404(Article, pk=pk, published=True)
    except Http404:
        # Custom 404 handling
        return render(request, '404.html', status=404)

    if not article.can_view(request.user):
        raise PermissionDenied("You don't have permission to view this article")

    try:
        related_articles = article.get_related_articles()
    except Exception as e:
        # Log error but don't crash
        logger.error(f"Error getting related articles: {e}")
        related_articles = []

    return render(request, 'article/detail.html', {
        'article': article,
        'related_articles': related_articles
    })
```

### Views Pagination
**Impact:** HIGH - Prevents memory issues and improves performance

**Problem:**
Loading all records at once can cause memory issues and slow page loads.

**Solution:**
Use Django's pagination for large datasets.

✅ **Correct: Pagination implementation**
```python
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger

def article_list(request):
    article_list = Article.objects.filter(published=True).order_by('-published_date')
    paginator = Paginator(article_list, 25)  # Show 25 articles per page

    page = request.GET.get('page')
    try:
        articles = paginator.page(page)
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        articles = paginator.page(1)
    except EmptyPage:
        # If page is out of range, deliver last page of results.
        articles = paginator.page(paginator.num_pages)

    return render(request, 'articles/list.html', {
        'articles': articles,
        'paginator': paginator
    })
```

### Views Caching Strategy
**Impact:** HIGH - Improves performance and reduces database load

**Problem:**
Expensive operations repeated on every request waste resources and slow response times.

**Solution:**
Implement appropriate caching strategies at different levels.

✅ **Correct: Multi-level caching**
```python
from django.views.decorators.cache import cache_page
from django.core.cache import cache

@cache_page(60 * 15)  # Cache for 15 minutes
def article_list(request):
    """Cache entire page for anonymous users"""
    return render(request, 'articles/list.html', {
        'articles': Article.objects.filter(published=True)[:20]
    })

def article_detail(request, pk):
    """Cache expensive computations"""
    article = get_object_or_404(Article, pk=pk)

    # Cache related articles computation
    cache_key = f'article_related_{article.id}'
    related = cache.get(cache_key)
    if related is None:
        related = article.get_related_articles()
        cache.set(cache_key, related, 60 * 30)  # Cache for 30 minutes

    return render(request, 'article/detail.html', {
        'article': article,
        'related_articles': related
    })
```

---

## 4. Forms (HIGH)

### Forms ModelForm Usage
**Impact:** HIGH - Reduces boilerplate and ensures consistency

**Problem:**
Manual forms for model data lead to duplication and maintenance issues.

**Solution:**
Prefer ModelForm for forms that create or edit model instances.

❌ **Wrong: Manual form for model data**
```python
# Avoid this duplication
class ArticleForm(forms.Form):
    title = forms.CharField(max_length=100)
    content = forms.CharField(widget=forms.Textarea)
    author = forms.ModelChoiceField(queryset=Author.objects.all())
    published_date = forms.DateField()

    def save(self):  # Manual save logic - error prone
        return Article.objects.create(**self.cleaned_data)
```

✅ **Correct: ModelForm for model data**
```python
from django import forms
from .models import Article

class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ['title', 'content', 'author', 'published_date']
        widgets = {
            'published_date': forms.DateInput(attrs={'type': 'date'}),
        }

# views.py
def create_article(request):
    if request.method == 'POST':
        form = ArticleForm(request.POST)
        if form.is_valid():
            form.save()  # Automatically creates Article instance
            return redirect('article_list')
    else:
        form = ArticleForm()
    return render(request, 'article/form.html', {'form': form})
```

### Forms Validation Logic
**Impact:** HIGH - Ensures data integrity and user experience

**Problem:**
Missing or incorrect validation allows invalid data to be stored, leading to application bugs, security issues, and poor user experience.

**Solution:**
Implement comprehensive validation at form and model levels. Use Django's built-in validators and create custom validation logic where needed.

✅ **Correct: Multi-level validation**
```python
class ContactForm(forms.Form):
    name = forms.CharField(max_length=100, min_length=2)
    email = forms.EmailField()
    message = forms.CharField(widget=forms.Textarea, min_length=10)

    def clean_name(self):
        name = self.cleaned_data['name'].strip()
        if not name:
            raise forms.ValidationError("Name cannot be empty")
        if len(name) < 2:
            raise forms.ValidationError("Name must be at least 2 characters")
        return name

    def clean(self):
        cleaned_data = super().clean()
        name = cleaned_data.get('name')
        priority = cleaned_data.get('priority')

        if name and priority == 'high':
            if not self.is_manager(name):
                raise forms.ValidationError({
                    'priority': "Only managers can set high priority."
                })

        return cleaned_data
```

### Forms Security Cleaning
**Impact:** HIGH - Prevents injection attacks and data corruption

**Problem:**
Form data not properly cleaned can contain malicious content or invalid data, leading to security vulnerabilities, data corruption, and application crashes.

**Solution:**
Always validate and clean form data before processing. Use Django's built-in cleaning mechanisms and implement additional security checks.

✅ **Correct: Secure form processing**
```python
from django import forms

class SecurePostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['title', 'content', 'tags']

    def clean_title(self):
        title = self.cleaned_data['title'].strip()
        if len(title) < 5:
            raise forms.ValidationError("Title must be at least 5 characters")
        if '<' in title or '>' in title:
            raise forms.ValidationError("Title cannot contain HTML tags")
        return title

def create_post(request):
    if request.method == 'POST':
        form = SecurePostForm(request.POST)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            return redirect('post_detail', pk=post.pk)
    else:
        form = SecurePostForm()
    return render(request, 'posts/create.html', {'form': form})
```

### Forms Error Display
**Impact:** HIGH - Provides clear feedback to users and prevents repeated submissions

**Problem:**
Poor error messages confuse users, lead to repeated form submissions, and increase support requests.

**Solution:**
Display clear, specific error messages and provide helpful guidance. Use Django's form error handling and customize messages for better user experience.

✅ **Correct: User-friendly error display**
```django
<form method="post" novalidate>
    {% csrf_token %}

    <div class="form-group {% if form.name.errors %}has-error{% endif %}">
        <label for="{{ form.name.id_for_label }}">Full Name:</label>
        {{ form.name }}
        {% if form.name.errors %}
            <div class="error-messages">
                {% for error in form.name.errors %}
                    <div class="error-message">{{ error }}</div>
                {% endfor %}
            </div>
        {% endif %}
    </div>

    {% if form.non_field_errors %}
        <div class="alert alert-error">
            <strong>Please correct the following issues:</strong>
            <ul>
                {% for error in form.non_field_errors %}
                    <li>{{ error }}</li>
                {% endfor %}
            </ul>
        </div>
    {% endif %}

    <button type="submit">Send Message</button>
</form>
```

### Forms Validation Logic
**Impact:** HIGH - Ensures data integrity and user experience

**Problem:**
Missing or incorrect validation allows invalid data and confuses users.

**Solution:**
Implement comprehensive validation at form and model levels.

✅ **Correct: Multi-level validation**
```python
class ContactForm(forms.Form):
    name = forms.CharField(max_length=100, min_length=2)
    email = forms.EmailField()
    message = forms.CharField(widget=forms.Textarea, min_length=10)
    priority = forms.ChoiceField(choices=[('low', 'Low'), ('high', 'High')])

    def clean_email(self):
        """Validate email domain"""
        email = self.cleaned_data['email']
        if not email.endswith('@company.com'):
            raise forms.ValidationError("Please use your company email address.")
        return email

    def clean(self):
        """Cross-field validation"""
        cleaned_data = super().clean()
        name = cleaned_data.get('name')
        priority = cleaned_data.get('priority')

        if name and priority == 'high' and not self.is_manager(name):
            raise forms.ValidationError("Only managers can set high priority.")

        return cleaned_data

    def is_manager(self, name):
        """Helper method for validation logic"""
        return name.lower() in ['alice', 'bob']  # Simplified example
```

### Forms Security Cleaning
**Impact:** HIGH - Prevents injection attacks and data corruption

**Problem:**
Form data not properly cleaned can contain malicious content or invalid data.

**Solution:**
Always validate and clean form data before processing.

✅ **Correct: Secure form processing**
```python
def contact_view(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)  # Includes request.FILES if needed
        if form.is_valid():
            # Data is now cleaned and validated
            name = form.cleaned_data['name']  # Safe to use
            email = form.cleaned_data['email']
            message = form.cleaned_data['message']

            # Process cleaned data
            send_contact_email(name, email, message)
            messages.success(request, 'Message sent successfully!')
            return redirect('contact_success')
        else:
            # Form errors will be displayed in template
            pass
    else:
        form = ContactForm()

    return render(request, 'contact/form.html', {'form': form})
```

### Forms Error Display
**Impact:** HIGH - Provides clear feedback to users

**Problem:**
Poor error messages confuse users and lead to repeated form submissions.

**Solution:**
Display clear, specific error messages and provide helpful guidance.

✅ **Correct: User-friendly error display**
```django
<!-- templates/contact/form.html -->
<form method="post">
    {% csrf_token %}

    <div class="form-group">
        <label for="{{ form.name.id_for_label }}">Name:</label>
        {{ form.name }}
        {% if form.name.errors %}
            <div class="error">
                {% for error in form.name.errors %}
                    <p>{{ error }}</p>
                {% endfor %}
            </div>
        {% endif %}
    </div>

    <div class="form-group">
        <label for="{{ form.email.id_for_label }}">Email:</label>
        {{ form.email }}
        {% if form.email.errors %}
            <div class="error">
                {% for error in form.email.errors %}
                    <p>{{ error }}</p>
                {% endfor %}
            </div>
        {% endif %}
        <small class="help">Please use your company email address</small>
    </div>

    {% if form.non_field_errors %}
        <div class="error">
            {% for error in form.non_field_errors %}
                <p>{{ error }}</p>
            {% endfor %}
        </div>
    {% endif %}

    <button type="submit">Send Message</button>
</form>
```

### Forms File Handling
**Impact:** HIGH - Ensures secure and reliable file uploads

**Problem:**
Improper file handling can lead to security vulnerabilities and data corruption.

**Solution:**
Validate file types, sizes, and content before processing.

✅ **Correct: Secure file handling**
```python
class DocumentForm(forms.ModelForm):
    class Meta:
        model = Document
        fields = ['title', 'file']

    def clean_file(self):
        file = self.cleaned_data['file']
        if file:
            # Check file size (5MB limit)
            if file.size > 5 * 1024 * 1024:
                raise forms.ValidationError("File size must be under 5MB")

            # Check file type
            allowed_types = ['application/pdf', 'text/plain', 'application/msword']
            if file.content_type not in allowed_types:
                raise forms.ValidationError("Only PDF, TXT, and DOC files are allowed")

            # Check file extension matches content type
            if not self._is_valid_extension(file.name, file.content_type):
                raise forms.ValidationError("File extension doesn't match content type")

        return file

    def _is_valid_extension(self, filename, content_type):
        """Validate file extension matches content type"""
        ext = filename.split('.')[-1].lower()
        type_ext_map = {
            'application/pdf': ['pdf'],
            'text/plain': ['txt'],
            'application/msword': ['doc'],
        }
        return ext in type_ext_map.get(content_type, [])
```

---

## 5. Templates (MEDIUM-HIGH)

### Templates Context Data
**Impact:** MEDIUM-HIGH - Maintains separation of concerns

**Problem:**
Business logic in templates leads to hard-to-maintain code and violates MVC principles.

**Solution:**
Keep templates simple - move complex logic to views and models.

❌ **Wrong: Logic in templates**
```django
<!-- Bad: Complex logic in template -->
{% for article in articles %}
  {% if article.published_date|date:"Y" == current_year %}
    {% if article.author.is_active %}
      <div class="article">
        <h2>{{ article.title }}</h2>
        <p>By {{ article.author.name }}</p>
        {% if article.word_count > 1000 %}
          <span class="long-article">Long read</span>
        {% endif %}
      </div>
    {% endif %}
  {% endif %}
{% endfor %}
```

✅ **Correct: Simple templates**
```python
# views.py - Move logic here
def article_list(request):
    current_year = timezone.now().year
    articles = Article.objects.filter(
        published_date__year=current_year,
        author__is_active=True
    ).annotate(
        is_long_read=models.Case(
            models.When(word_count__gt=1000, then=models.Value(True)),
            default=models.Value(False),
            output_field=models.BooleanField()
        )
    )

    return render(request, 'articles/list.html', {
        'articles': articles
    })
```

```django
<!-- templates/articles/list.html -->
{% for article in articles %}
  <div class="article">
    <h2>{{ article.title }}</h2>
    <p>By {{ article.author.name }}</p>
    {% if article.is_long_read %}
      <span class="long-article">Long read</span>
    {% endif %}
  </div>
{% endfor %}
```

### Templates Inheritance Pattern
**Impact:** MEDIUM-HIGH - Promotes DRY and maintainable templates

**Problem:**
Duplicated HTML structure across templates leads to maintenance issues and violates DRY principles.

**Solution:**
Use template inheritance to create reusable base templates with blocks for customization.

✅ **Correct: Template inheritance**
```django
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}My Site{% endblock %}</title>
    {% block extra_head %}{% endblock %}
</head>
<body>
    <header>
        <nav>
            <a href="{% url 'home' %}">Home</a>
            {% if user.is_authenticated %}
                <a href="{% url 'logout' %}">Logout</a>
            {% else %}
                <a href="{% url 'login' %}">Login</a>
            {% endif %}
        </nav>
    </header>

    <main>
        {% block content %}{% endblock %}
    </main>

    <footer>
        <p>&copy; 2024 My Site</p>
    </footer>

    {% block extra_scripts %}{% endblock %}
</body>
</html>
```

```django
<!-- templates/article/list.html -->
{% extends "base.html" %}

{% block title %}Articles - {{ block.super }}{% endblock %}

{% block content %}
    <h1>Latest Articles</h1>
    {% for article in articles %}
        <article>
            <h2><a href="{% url 'article_detail' article.pk %}">{{ article.title }}</a></h2>
            <p>By {{ article.author.name }} on {{ article.published_date|date }}</p>
        </article>
    {% endfor %}
{% endblock %}
```

---

## 6. Authentication & Authorization (MEDIUM-HIGH)

### Authentication User Management
**Impact:** MEDIUM-HIGH - Ensures secure user authentication and authorization

**Problem:**
Improper authentication setup can lead to security vulnerabilities, poor user experience, and data breaches.

**Solution:**
Use Django's built-in authentication system properly. Implement proper login/logout flows, password management, and user permissions.

✅ **Correct: Django authentication**
```python
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = authenticate(
                username=form.cleaned_data['username'],
                password=form.cleaned_data['password']
            )
            if user is not None:
                login(request, user)
                messages.success(request, f'Welcome back, {user.username}!')
                return redirect(request.GET.get('next', 'home'))
    else:
        form = AuthenticationForm()
    return render(request, 'login.html', {'form': form})

@login_required
def profile_view(request):
    """Protected view requiring authentication"""
    return render(request, 'profile.html', {
        'user': request.user
    })
```

---

## 7. URLs & Admin (MEDIUM-HIGH)

### URLs Configuration Patterns
**Impact:** MEDIUM-HIGH - Ensures maintainable and scalable URL structure

**Problem:**
Poor URL configuration leads to hard-to-maintain code, broken links, and poor SEO. Inconsistent URL patterns make applications harder to navigate and extend.

**Solution:**
Use consistent URL patterns, leverage `reverse()` for URL generation, and organize URLs in a maintainable structure.

✅ **Correct: Organized URL configuration**
```python
# myapp/urls.py
from django.urls import path, include
from . import views

app_name = 'articles'  # Namespace for this app

urlpatterns = [
    path('', views.ArticleListView.as_view(), name='list'),
    path('create/', views.ArticleCreateView.as_view(), name='create'),
    path('<int:pk>/', views.ArticleDetailView.as_view(), name='detail'),
    path('<int:pk>/edit/', views.ArticleUpdateView.as_view(), name='edit'),
]

# In views - always use reverse() for URL generation
from django.urls import reverse

def article_create(request):
    if request.method == 'POST':
        form = ArticleForm(request.POST)
        if form.is_valid():
            article = form.save()
            return redirect(reverse('articles:detail', kwargs={'pk': article.pk}))
```

### Admin Interface Customization
**Impact:** MEDIUM - Improves admin usability and functionality

**Problem:**
Default Django admin interface is functional but often insufficient for complex data management needs.

**Solution:**
Customize the admin interface with appropriate list displays, filters, search fields, and custom actions.

✅ **Correct: Admin customization**
```python
from django.contrib import admin
from django.utils.html import format_html

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'author_link', 'status_display', 'published_date']
    list_filter = ['published', 'published_date', 'author']
    search_fields = ['title', 'content']

    def author_link(self, obj):
        url = reverse('admin:auth_user_change', args=[obj.author.id])
        return format_html('<a href="{}">{}</a>', url, obj.author.get_full_name())

    def status_display(self, obj):
        if obj.published:
            return format_html('<span style="color: green;">✓ Published</span>')
        return format_html('<span style="color: orange;">Draft</span>')
```

---

## 8. Testing (MEDIUM-HIGH)

### Testing Unit vs Integration
**Impact:** MEDIUM-HIGH - Ensures appropriate test coverage and maintainable tests

**Problem:**
Wrong test types lead to slow test suites, missed bugs, or brittle tests. Unit tests that mock too much miss integration issues, while integration tests that are too broad are slow and hard to debug.

**Solution:**
Use unit tests for isolated logic, integration tests for component interaction. Follow Django's testing best practices and use appropriate test base classes.

✅ **Correct: Appropriate test types**
```python
# Unit tests for isolated logic
class ArticleModelTest(TestCase):
    def test_slug_generation(self):
        article = Article(title="Test Article!", author=self.author)
        article.save()
        self.assertEqual(article.slug, "test-article")

# Integration tests for component interaction
class ArticleViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.article = Article.objects.create(title="Test Article", author=self.user)

    def test_article_list_view(self):
        response = self.client.get('/articles/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Article")
```

### Testing Fixtures Usage
**Impact:** MEDIUM-HIGH - Ensures consistent and reliable test data

**Problem:**
Tests without proper test data setup are brittle, inconsistent, and hard to maintain. Tests that depend on production data or manual data creation lead to flaky test suites.

**Solution:**
Use Django fixtures or factory pattern to create reliable, consistent test data that can be easily maintained and version controlled.

✅ **Correct: Using fixtures**
```python
# fixtures/test_data.json
[
    {
        "model": "auth.user",
        "pk": 1,
        "fields": {
            "username": "testuser",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "is_active": true,
            "is_staff": false,
            "date_joined": "2024-01-01T00:00:00Z"
        }
    }
]

# tests.py
class ArticleTest(TestCase):
    fixtures = ['test_data.json']

    def test_article_creation(self):
        user = User.objects.get(pk=1)
        article = Article.objects.create(
            title='Test Article',
            content='Test content',
            author=user
        )
        self.assertEqual(article.title, 'Test Article')
```

### Testing Mocking Strategy
**Impact:** MEDIUM-HIGH - Ensures tests are isolated, fast, and reliable

**Problem:**
Tests that make real network calls, database queries, or depend on external services are slow, unreliable, and hard to control. Without proper mocking, tests can fail due to external factors.

**Solution:**
Use mocking strategically to isolate code under test, control external dependencies, and create predictable test scenarios.

✅ **Correct: Strategic mocking**
```python
from unittest.mock import patch

class EmailServiceTest(TestCase):
    @patch('myapp.services.send_email')
    def test_send_welcome_email(self, mock_send):
        mock_send.return_value = {'success': True, 'message_id': '123'}

        user = User.objects.create(email='test@example.com')
        result = send_welcome_email(user)

        mock_send.assert_called_once_with(
            to=user.email,
            subject='Welcome!',
            template='welcome.html',
            context={'user': user}
        )
        self.assertTrue(result['success'])
```

### Testing Coverage Goals
**Impact:** MEDIUM-HIGH - Ensures adequate test quality and identifies untested code

**Problem:**
Without coverage metrics, teams don't know how much of their code is tested, leading to gaps in test coverage and potential bugs in production.

**Solution:**
Set coverage goals, measure coverage regularly, and use coverage reports to identify and fix coverage gaps.

✅ **Correct: Coverage strategy**
```python
# pytest command with coverage
pytest --cov=myapp --cov-report=html --cov-report=term-missing

# Django test with coverage
coverage run --source=myapp manage.py test
coverage report --fail-under=90
coverage html
```

### Testing Django TestCase
**Impact:** MEDIUM-HIGH - Ensures proper test isolation and Django integration

**Problem:**
Using wrong test base classes or not leveraging Django's testing utilities leads to slow tests, database conflicts, and missed Django-specific functionality.

**Solution:**
Use appropriate Django TestCase subclasses and leverage Django's testing utilities for proper isolation, fixtures, and assertions.

✅ **Correct: Django TestCase usage**
```python
from django.test import TestCase

class ArticleViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='12345')
        self.article = Article.objects.create(title="Test Article", author=self.user)

    def test_article_list_view(self):
        response = self.client.get('/articles/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Article")
```

### Testing Factory Pattern
**Impact:** MEDIUM-HIGH - Enables flexible and maintainable test data creation

**Problem:**
Hardcoded test data creation leads to repetitive code, maintenance issues, and tests that are hard to modify. Factories provide a better way to create test data dynamically.

**Solution:**
Use factory libraries like Factory Boy to create flexible, reusable test data that can be easily customized for different test scenarios.

✅ **Correct: Factory pattern**
```python
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

# Usage in tests
class ArticleTest(TestCase):
    def test_article_creation(self):
        article = ArticleFactory()
        self.assertIsNotNone(article.title)
        self.assertIsNotNone(article.author)
```

### Testing Execution Database Management
**Impact:** MEDIUM-HIGH - Ensures efficient test execution and proper database handling

**Problem:**
Poor test execution practices lead to slow test suites, unreliable results, and wasted development time. Improper database management can cause test interference and inconsistent results.

**Solution:**
Follow Django's test execution best practices including proper test discovery, database management, and optimization techniques.

✅ **Correct: Optimized test execution**
```bash
# Run specific tests for faster feedback
python manage.py test myapp.tests.MyTestCase.test_specific_method

# Run tests with database reuse for faster execution
python manage.py test --keepdb

# Run tests in parallel for multiple cores
python manage.py test --parallel auto

# Run tests with warnings enabled
python -Wa manage.py test
```

**Test Database Management:**
```python
# settings.py - Test database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'TEST': {
            'NAME': 'test_myapp_db',  # Custom test database name
            'SERIALIZE': False,  # Speed up by not serializing DB
        }
    }
}
```

---

## 9. Performance & Caching (MEDIUM)

### Performance Static File Optimization
**Impact:** MEDIUM - Improves page load times and user experience

**Problem:**
Poor static file handling leads to slow page loads, unnecessary requests, and poor user experience. Static files not properly optimized can significantly impact website performance.

**Solution:**
Implement static file optimization techniques including compression, caching headers, CDN usage, and proper serving configuration.

✅ **Correct: Optimized static file handling**
```python
# settings.py - Optimized static files
STATIC_URL = 'https://cdn.example.com/static/'
STATIC_ROOT = '/var/www/static/'

# Compression and optimization
STATICFILES_STORAGE = 'myapp.storage.OptimizedStaticFilesStorage'

# For development
if DEBUG:
    STATICFILES_DIRS = [
        BASE_DIR / 'static',
    ]

# For production with WhiteNoise
MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ... other middleware
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

### Performance Middleware Optimization
**Impact:** MEDIUM - Improves request processing speed and reduces overhead

**Problem:**
Inefficient middleware ordering, unnecessary middleware, or poorly implemented middleware can significantly slow down request processing and increase memory usage.

**Solution:**
Optimize middleware stack by proper ordering, removing unnecessary middleware, and implementing efficient custom middleware patterns.

✅ **Correct: Optimized middleware stack**
```python
# settings.py - Optimized middleware ordering
MIDDLEWARE = [
    # Security first
    'django.middleware.security.SecurityMiddleware',
    # Core Django middleware (lightweight)
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    # Session and authentication
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # Messages
    'django.contrib.messages.middleware.MessageMiddleware',
    # Custom middleware (ordered by importance)
    'myapp.middleware.RequestLoggingMiddleware',
    'myapp.middleware.CacheMiddleware',
    'myapp.middleware.ThrottlingMiddleware',
    # Response processing last
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

---

## 10. Deployment (MEDIUM)

### Deployment Environment Separation
**Impact:** MEDIUM - Prevents configuration conflicts and security issues

**Problem:**
Same configuration for development and production leads to security risks, performance issues, and debugging difficulties. Environment-specific settings get mixed up causing deployment failures.

**Solution:**
Maintain separate settings for each environment with environment variables and proper configuration management.

✅ **Correct: Environment-based configuration**
```python
# settings/__init__.py
import os

# Determine environment
ENVIRONMENT = os.environ.get('DJANGO_ENV', 'development')

# Import environment-specific settings
if ENVIRONMENT == 'production':
    from .production import *
elif ENVIRONMENT == 'staging':
    from .staging import *
else:
    from .development import *

# Environment-specific settings
if ENVIRONMENT == 'production':
    DEBUG = False
    ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
    DATABASES['default'] = dj_database_url.config()
else:
    DEBUG = True
    ALLOWED_HOSTS = ['localhost', '127.0.0.1']
```

### Deployment Secret Management
**Impact:** MEDIUM - Protects sensitive configuration and prevents security breaches

**Problem:**
Hardcoded secrets in code or configuration files lead to security breaches when repositories are compromised or files are accidentally exposed.

**Solution:**
Use secure secret management with environment variables, secret files, or dedicated secret management services.

✅ **Correct: Secure secret management**
```python
# settings.py - Secure
import os

# Secret key with fallback for development
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if os.environ.get('DJANGO_ENV') == 'development':
        SECRET_KEY = 'dev-secret-key-change-in-production'
    else:
        raise ValueError('DJANGO_SECRET_KEY environment variable must be set')

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
    }
}
```

### Deployment Static Files Serving
**Impact:** MEDIUM - Ensures reliable asset delivery and optimal performance

**Problem:**
Incorrect static file serving in production leads to broken CSS/JavaScript, slow page loads, and poor user experience. Static files not properly configured can cause 404 errors or security vulnerabilities.

**Solution:**
Configure proper static file serving for production with CDNs, compression, and caching headers.

✅ **Correct: Production static file serving**
```python
# settings.py - Production ready
DEBUG = False
STATIC_URL = os.environ.get('STATIC_URL', 'https://cdn.example.com/static/')
STATIC_ROOT = '/var/www/static/'

# Use WhiteNoise for simple deployments
MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# For CDN with CloudFront/S3
AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')
if AWS_S3_CUSTOM_DOMAIN:
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

### Deployment Database Configuration
**Impact:** MEDIUM - Ensures database performance and reliability in production

**Problem:**
Default database settings cause performance issues, connection problems, and reliability issues in production. Improper database configuration can lead to slow queries, connection pool exhaustion, and data corruption.

**Solution:**
Configure database settings appropriately for production with connection pooling, proper timeouts, and performance optimizations.

✅ **Correct: Production database configuration**
```python
# settings.py - Production database config
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),

        # Connection pooling and timeouts
        'CONN_MAX_AGE': 600,  # 10 minutes - reuse connections
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'connect_timeout': 10,
            'statement_timeout': 30000,  # 30 second query timeout
        },
    }
}
```

### Deployment Monitoring Setup
**Impact:** MEDIUM - Enables proactive issue detection and performance monitoring

**Problem:**
Without monitoring, production issues go undetected, performance problems aren't identified, and debugging becomes difficult. Applications fail silently or degrade without warning.

**Solution:**
Implement comprehensive monitoring with error tracking, performance metrics, and alerting for critical issues.

✅ **Correct: Comprehensive monitoring**
```python
# settings.py - Monitoring setup
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    environment=os.environ.get('DJANGO_ENV', 'development'),
    traces_sample_rate=0.1,
)

# Logging configuration
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/app.log',
        }
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

### Deployment Backup Strategy
**Impact:** MEDIUM - Ensures data recoverability and business continuity

**Problem:**
Without proper backup strategies, data loss from system failures, human errors, or security incidents can be catastrophic. Missing or inadequate backups can lead to permanent data loss and business downtime.

**Solution:**
Implement comprehensive backup strategies with automated backups, testing, encryption, and disaster recovery procedures.

✅ **Correct: Comprehensive backup strategy**
```python
# Database backup implementation
def create_backup():
    """Create PostgreSQL backup"""
    db_settings = settings.DATABASES['default']
    backup_file = f"/tmp/backup_{db_settings['NAME']}_{datetime.now().date()}.sql"

    cmd = [
        'pg_dump',
        '--host', db_settings['HOST'],
        '--username', db_settings['USER'],
        '--dbname', db_settings['NAME'],
        '--file', backup_file,
    ]

    env = os.environ.copy()
    env['PGPASSWORD'] = db_settings['PASSWORD']

    subprocess.run(cmd, env=env, check=True)
    return backup_file

# Upload to S3
def upload_to_s3(backup_file):
    """Upload backup to S3"""
    s3_client = boto3.client('s3')
    bucket = settings.AWS_BACKUP_CONFIG['bucket']
    key = f"database/{os.path.basename(backup_file)}"

    s3_client.upload_file(backup_file, bucket, key)

# Automated backup management
# Run daily at 2 AM via cron
# 0 2 * * * /path/to/project/manage.py backup_database
```

---

## 11. Advanced Patterns (LOW)

### Advanced Signals Usage
**Impact:** LOW - Enables decoupled component communication and event-driven architecture

**Problem:**
Tight coupling between Django components makes code hard to maintain and test. Components that need to react to events from other parts of the application create complex dependencies.

**Solution:**
Use Django signals for decoupled communication between components. Signals allow components to communicate without direct dependencies.

✅ **Correct: Signal-based decoupling**
```python
# signals.py
from django.db.models.signals import post_save
from django.dispatch import Signal

# Custom signals
article_published = Signal()

# Signal handlers
@receiver(post_save, sender='articles.Article')
def handle_article_save(sender, instance, created, **kwargs):
    if created and instance.published:
        article_published.send(sender=sender, article=instance)

@receiver(article_published)
def send_publish_notification(sender, article, **kwargs):
    # Send notification
    pass

@receiver(article_published)
def index_published_article(sender, article, **kwargs):
    # Index in search
    pass
```

### Advanced Middleware Custom
**Impact:** LOW - Enables request/response processing customization and cross-cutting concerns

**Problem:**
Built-in Django middleware may not cover specific application requirements. Cross-cutting concerns like request logging, response modification, or custom authentication need custom middleware implementation.

**Solution:**
Create custom middleware classes that follow Django's middleware interface to handle specific application requirements.

✅ **Correct: Custom middleware**
```python
# middleware.py
class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log request
        logger.info(f"Request: {request.method} {request.path}")

        response = self.get_response(request)

        # Log response
        logger.info(f"Response: {response.status_code}")

        return response

class CustomAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Custom auth check
        if not self._check_custom_auth(request):
            return HttpResponseForbidden()

        return self.get_response(request)

    def _check_custom_auth(self, request):
        token = request.headers.get('X-API-Token')
        return token == 'valid-token'
```

### Advanced Model Managers
**Impact:** LOW - Provides reusable query logic and encapsulates database operations

**Problem:**
Repeated query patterns scattered across views and other code make maintenance difficult and lead to inconsistent data access patterns.

**Solution:**
Create custom model managers to encapsulate common query logic, provide reusable methods, and ensure consistent data access patterns.

✅ **Correct: Custom managers for encapsulation**
```python
# models.py
class PublishedManager(models.Manager):
    """Manager for published articles"""

    def get_queryset(self):
        return super().get_queryset().filter(
            published=True,
            published_date__lte=timezone.now()
        )

    def featured(self):
        """Get featured published articles"""
        return self.get_queryset().filter(featured=True)

    def by_author(self, author):
        """Get published articles by specific author"""
        return self.get_queryset().filter(author=author)

class Article(models.Model):
    # Fields...

    # Default manager
    objects = models.Manager()

    # Custom manager for published articles
    published_objects = PublishedManager()

# Usage
published_articles = Article.published_objects.all()
featured_articles = Article.published_objects.featured()
```

### Advanced Generic Views
**Impact:** LOW - Reduces boilerplate code and provides consistent CRUD operations

**Problem:**
Writing similar view logic repeatedly for common operations like create, read, update, delete (CRUD) leads to code duplication and maintenance issues.

**Solution:**
Extend Django's generic class-based views to customize behavior while leveraging built-in functionality for common patterns.

✅ **Correct: Extended generic views**
```python
# views.py
from django.views.generic import ListView, DetailView, CreateView, UpdateView

class ArticleListView(ListView):
    model = Article
    template_name = 'articles/list.html'
    paginate_by = 10

    def get_queryset(self):
        return Article.objects.filter(published=True).select_related('author')

class ArticleCreateView(CreateView):
    model = Article
    fields = ['title', 'content']

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

class ArticleUpdateView(UpdateView):
    model = Article
    fields = ['title', 'content', 'published']

    def get_queryset(self):
        # Users can only edit their own articles
        return Article.objects.filter(author=self.request.user)
```

### Advanced Internationalization
**Impact:** LOW - Enables complex multilingual applications and locale-specific features

**Problem:**
Basic internationalization may not cover complex scenarios like pluralization, context-dependent translations, or locale-specific formatting.

**Solution:**
Implement advanced i18n patterns including custom translation functions, locale-aware formatting, and translation context management.

✅ **Correct: Advanced internationalization**
```python
# Advanced pluralization
{% blocktrans count messages_count=unread_messages|length %}
    There is {{ messages_count }} unread message.
{% plural %}
    There are {{ messages_count }} unread messages.
{% endblocktrans %}

# Context for disambiguation
<p>{% trans "May" context "month name" %}</p>
<p>{% trans "May" context "verb" %}</p>

# Locale-aware formatting
{% load l10n %}
<p>Price: {{ price|localize }}</p>
<p>Date: {{ date|localize }}</p>
```

**Custom translation functions:**
```python
from django.utils.translation import pgettext

def get_month_name(month_number):
    """Get localized month name with context"""
    months = [
        pgettext("month name", "January"),
        pgettext("month name", "February"),
        # ... other months
    ]
    return months[month_number - 1]
```

---

## 9. Performance & Caching (MEDIUM)

### Performance Query Optimization
**Impact:** MEDIUM - Reduces database load and improves response times

**Problem:**
Inefficient database queries are the most common cause of slow Django applications. N+1 queries, missing indexes, and poorly constructed querysets can bring applications to a crawl.

**Solution:**
Optimize queries using Django's ORM features, add appropriate indexes, and monitor query performance.

❌ **Wrong: Inefficient queries**
```python
def get_articles_with_authors():
    articles = Article.objects.all()  # 1 query
    for article in articles:
        author_name = article.author.name  # N queries!
    return articles
```

✅ **Correct: Optimized queries**
```python
def get_articles_with_authors():
    return Article.objects.select_related('author').all()
```

### Caching Strategy Implementation
**Impact:** MEDIUM - Improves application performance and reduces server load

**Problem:**
Expensive operations repeated on every request waste resources and slow down applications.

**Solution:**
Implement appropriate caching strategies at multiple levels: database queries, view responses, template fragments, and low-level computations.

✅ **Correct: Multi-level caching**
```python
from django.core.cache import cache

def get_popular_articles():
    """Cache database query results"""
    cache_key = 'popular_articles'
    articles = cache.get(cache_key)

    if articles is None:
        articles = list(Article.objects.select_related('author').filter(
            published=True
        ).order_by('-views')[:10])
        cache.set(cache_key, articles, 60 * 15)  # 15 minutes

    return articles
```

### Templates Filters Security
**Impact:** MEDIUM-HIGH - Prevents XSS attacks

**Problem:**
The `safe` filter bypasses Django's auto-escaping, potentially allowing XSS attacks.

**Solution:**
Only use `safe` when you absolutely trust the content and have sanitized it.

❌ **Wrong: Unsafe use of safe filter**
```django
<!-- DANGER: User input marked as safe -->
<div class="comment">{{ user_comment|safe }}</div>

<!-- Also dangerous -->
<script>
  var userData = "{{ user_json|safe }}";  // XSS vulnerability
</script>
```

✅ **Correct: Safe template rendering**
```django
<!-- Safe - Django auto-escapes -->
<div class="comment">{{ user_comment }}</div>

<!-- Safe - explicitly mark as HTML -->
<div class="trusted-content">{{ trusted_html|safe }}</div>

<!-- Safe - use format_html for dynamic content -->
{% load utils %}
<div class="message">
  {% format_html "Welcome back, <strong>{}</strong>!" user.name %}
</div>
```

### Templates Inheritance Pattern
**Impact:** MEDIUM-HIGH - Promotes DRY and maintainable templates

**Problem:**
Duplicated HTML structure across templates leads to maintenance issues.

**Solution:**
Use template inheritance to create reusable base templates.

✅ **Correct: Template inheritance**
```django
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}My Site{% endblock %}</title>
    {% block extra_head %}{% endblock %}
</head>
<body>
    <header>
        <nav>
            <a href="{% url 'home' %}">Home</a>
            {% if user.is_authenticated %}
                <a href="{% url 'logout' %}">Logout</a>
            {% else %}
                <a href="{% url 'login' %}">Login</a>
            {% endif %}
        </nav>
    </header>

    <main>
        {% block content %}{% endblock %}
    </main>

    <footer>
        <p>&copy; 2024 My Site</p>
    </footer>

    {% block extra_scripts %}{% endblock %}
</body>
</html>
```

```django
<!-- templates/article/list.html -->
{% extends "base.html" %}

{% block title %}Articles - {{ block.super }}{% endblock %}

{% block content %}
    <h1>Latest Articles</h1>
    {% for article in articles %}
        <article>
            <h2><a href="{% url 'article_detail' article.pk %}">{{ article.title }}</a></h2>
            <p>By {{ article.author.name }} on {{ article.published_date|date }}</p>
        </article>
    {% endfor %}
{% endblock %}
```

### Templates Static Files
**Impact:** MEDIUM-HIGH - Ensures proper asset management

**Problem:**
Incorrect static file handling leads to broken links and poor performance.

**Solution:**
Use Django's static files framework properly with proper URL generation.

✅ **Correct: Static file management**
```django
<!-- templates/base.html -->
{% load static %}
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="{% static 'css/style.css' %}">
    <script src="{% static 'js/app.js' %}" defer></script>
</head>
<body>
    <!-- Use static template tag for versioned URLs -->
    <img src="{% static 'images/logo.png' %}" alt="Logo">

    <!-- For CSS with dynamic paths -->
    <link rel="stylesheet" href="{% static 'css/themes/'|add:theme|add:'.css' %}">
</body>
</html>
```

```python
# settings.py
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# For development
if DEBUG:
    STATICFILES_DIRS = [
        BASE_DIR / 'static',
    ]

# For production - collect static files
# python manage.py collectstatic
```

---

## 6. Testing (MEDIUM-HIGH)

### Testing Unit vs Integration
**Impact:** MEDIUM-HIGH - Ensures appropriate test coverage

**Problem:**
Wrong test types lead to slow test suites or missed bugs.

**Solution:**
Use unit tests for isolated logic, integration tests for component interaction.

✅ **Correct: Appropriate test types**
```python
# tests/test_models.py - Unit tests
class ArticleModelTest(TestCase):
    def test_slug_generation(self):
        """Test model method in isolation"""
        article = Article(title="Test Article!")
        article.save()
        self.assertEqual(article.slug, "test-article")

    def test_word_count_calculation(self):
        """Test computed property"""
        article = Article(content="This is a test article with some words.")
        self.assertEqual(article.word_count, 8)

# tests/test_views.py - Integration tests
class ArticleViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='12345')

    def test_article_list_view(self):
        """Test full request/response cycle"""
        response = self.client.get('/articles/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'articles/list.html')

    def test_article_creation_requires_login(self):
        """Test authentication integration"""
        response = self.client.post('/articles/create/', {'title': 'Test'})
        self.assertRedirects(response, '/login/?next=/articles/create/')
```

### Testing Fixtures Usage
**Impact:** MEDIUM-HIGH - Provides consistent test data

**Problem:**
Inconsistent or missing test data leads to flaky tests and poor coverage.

**Solution:**
Use fixtures or factories to create reliable test data.

✅ **Correct: Test data management**
```python
# fixtures/test_data.json
[
    {
        "model": "auth.user",
        "pk": 1,
        "fields": {
            "username": "testuser",
            "email": "test@example.com",
            "is_active": true
        }
    },
    {
        "model": "articles.article",
        "pk": 1,
        "fields": {
            "title": "Test Article",
            "content": "This is a test article.",
            "author": 1,
            "published": true
        }
    }
]

# tests/test_views.py
class ArticleViewsTest(TestCase):
    fixtures = ['test_data.json']

    def test_article_display(self):
        """Test uses fixture data"""
        response = self.client.get('/articles/1/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Article")

# Using factory pattern (recommended for complex data)
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

# tests/test_models.py
class ArticleModelTest(TestCase):
    def test_article_creation(self):
        """Test with factory-generated data"""
        article = ArticleFactory()
        self.assertIsNotNone(article.title)
        self.assertTrue(len(article.content) > 0)
```

### Testing Coverage Goals
**Impact:** MEDIUM-HIGH - Ensures adequate test coverage

**Problem:**
Low test coverage leaves code untested and increases bug risk.

**Solution:**
Aim for high coverage with focus on critical paths.

✅ **Correct: Coverage configuration**
```python
# tests/__init__.py or separate coverage config
# Install coverage: pip install coverage

# runtests.py
import os
import sys
import django
from django.test.utils import get_runner
from django.conf import settings

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
    django.setup()

    # Run tests with coverage
    import coverage
    cov = coverage.Coverage(
        source=['myapp'],  # Modules to measure
        omit=['*/tests/*', '*/migrations/*'],  # Exclude from coverage
    )
    cov.start()

    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["myapp"])

    cov.stop()
    cov.save()

    # Report coverage
    cov.report()
    cov.html_report(directory='htmlcov')  # Generate HTML report

    sys.exit(bool(failures))
```

```bash
# Run with coverage
python runtests.py

# Check coverage report
coverage report --fail-under=90  # Fail if under 90%
```

### Testing Django TestCase
**Impact:** MEDIUM-HIGH - Ensures proper test isolation and utilities

**Problem:**
Using wrong base classes misses Django's testing utilities and causes test interference.

**Solution:**
Use appropriate Django TestCase subclasses for different testing needs.

✅ **Correct: Django TestCase usage**
```python
from django.test import TestCase, Client, RequestFactory
from django.contrib.auth.models import User

class ModelTestCase(TestCase):
    """For testing models and database operations"""

    def test_model_creation(self):
        user = User.objects.create_user('test', 'test@example.com', 'pass')
        self.assertEqual(user.username, 'test')
        # Database is rolled back after test

class ViewTestCase(TestCase):
    """For testing views with full Django integration"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser', password='12345')

    def test_view_requires_login(self):
        response = self.client.get('/protected/')
        self.assertRedirects(response, '/login/?next=/protected/')

    def test_view_with_authenticated_user(self):
        self.client.login(username='testuser', password='12345')
        response = self.client.get('/protected/')
        self.assertEqual(response.status_code, 200)

class APITestCase(TestCase):
    """For testing API endpoints"""

    def setUp(self):
        self.factory = RequestFactory()

    def test_api_endpoint(self):
        request = self.factory.get('/api/articles/')
        response = article_list_api(request)
        self.assertEqual(response.status_code, 200)
```

---

## 7. Performance (MEDIUM)

### Performance Query Optimization
**Impact:** MEDIUM - Reduces database load and improves response times

**Problem:**
Inefficient database queries are the most common cause of slow Django applications. N+1 queries, missing indexes, and poorly constructed querysets can bring applications to a crawl.

**Solution:**
Optimize queries using Django's ORM features, add appropriate indexes, and monitor query performance. Use `select_related`, `prefetch_related`, and database indexes strategically.

❌ **Wrong: Inefficient queries**
```python
def get_articles_with_authors():
    articles = Article.objects.all()  # 1 query
    for article in articles:
        author_name = article.author.name  # N queries!
    return articles
```

✅ **Correct: Optimized queries**
```python
def get_articles_with_authors():
    # Single optimized query
    return Article.objects.select_related('author').all()

def get_popular_articles():
    # Optimized with annotations and indexes
    return Article.objects.filter(
        published_date__year=2024
    ).annotate(
        comments_count=models.Count('comments')
    ).select_related('author').order_by('-views')[:10]

# Model with proper indexes
class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    published_date = models.DateTimeField()
    views = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            models.Index(fields=['published_date', 'views']),  # Query optimization
            models.Index(fields=['author', 'published_date']),  # Author listings
            models.Index(fields=['category', 'published_date']),  # Category pages
        ]
```

### Performance Caching Strategy
**Impact:** MEDIUM - Reduces computation and database load

**Problem:**
Expensive operations repeated unnecessarily slow down responses.

**Solution:**
Implement caching at appropriate levels with proper invalidation.

✅ **Correct: Multi-level caching**
```python
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

# Page-level caching
@cache_page(60 * 15)  # 15 minutes
def article_list(request):
    return render(request, 'articles/list.html', {
        'articles': Article.objects.filter(published=True)[:20]
    })

# Object-level caching
class Article(models.Model):
    @property
    def word_count(self):
        """Cache expensive computation"""
        cache_key = f'article_word_count_{self.id}'
        count = cache.get(cache_key)
        if count is None:
            count = len(self.content.split())
            cache.set(cache_key, count, 60 * 60)  # Cache for 1 hour
        return count

# Template fragment caching
{% load cache %}
{% cache 600 article_detail article.id %}
  <div class="article-content">
    {{ article.content|linebreaks }}
  </div>
{% endcache %}

# Low-level caching for expensive operations
def get_related_articles(article, limit=5):
    cache_key = f'related_articles_{article.id}_{limit}'
    related = cache.get(cache_key)

    if related is None:
        # Expensive computation
        related = Article.objects.filter(
            category=article.category
        ).exclude(id=article.id).order_by('-published_date')[:limit]

        # Cache with proper timeout
        cache.set(cache_key, list(related), 60 * 30)  # 30 minutes

    return related
```

### Performance Static File Optimization
**Impact:** MEDIUM - Improves page load times

**Problem:**
Poor static file handling leads to slow page loads and poor user experience.

**Solution:**
Use proper static file configuration and optimization techniques.

✅ **Correct: Static file optimization**
```python
# settings.py
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# For development
if DEBUG:
    STATICFILES_DIRS = [
        BASE_DIR / 'static',
    ]

# For production - use CDN
if not DEBUG:
    STATIC_URL = 'https://cdn.example.com/static/'
    STATICFILES_STORAGE = 'myapp.storage.OptimizedStaticFilesStorage'

# Custom storage for optimization
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage

class OptimizedStaticFilesStorage(ManifestStaticFilesStorage):
    def get_converters(self):
        converters = super().get_converters()
        # Add CSS minification, JS compression, etc.
        return converters
```

```django
<!-- templates/base.html -->
{% load static %}
<!DOCTYPE html>
<html>
<head>
    <!-- Preload critical resources -->
    <link rel="preload" href="{% static 'css/critical.css' %}" as="style">

    <!-- Async load non-critical CSS -->
    <link rel="stylesheet" href="{% static 'css/main.css' %}" media="print" onload="this.media='all'">

    <!-- Defer non-critical JavaScript -->
    <script src="{% static 'js/analytics.js' %}" defer></script>

    <!-- Critical JS inline, rest deferred -->
    <script>
        // Critical JavaScript inline
        function toggleMenu() {
            document.getElementById('nav').classList.toggle('open');
        }
    </script>
    <script src="{% static 'js/app.js' %}" defer></script>
</head>
<body>
    <nav id="nav">
        <button onclick="toggleMenu()">Menu</button>
        <!-- Navigation content -->
    </nav>
</body>
</html>
```

---

## 8. Deployment (MEDIUM)

### Deployment Environment Separation
**Impact:** MEDIUM - Prevents configuration conflicts and security issues

**Problem:**
Same configuration for development and production leads to security risks and performance issues.

**Solution:**
Maintain separate settings for each environment with environment variables.

✅ **Correct: Environment separation**
```python
# settings/__init__.py
import os

# Determine environment
ENVIRONMENT = os.environ.get('DJANGO_ENV', 'development')

if ENVIRONMENT == 'production':
    from .production import *
else:
    from .development import *

# settings/base.py - Shared settings
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
DEBUG = ENVIRONMENT != 'production'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
    }
}

# settings/development.py
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Development-specific settings
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# settings/production.py
from .base import *

DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# Production security settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Production performance settings
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL'),
    }
}
```

### Deployment Secret Management
**Impact:** MEDIUM - Protects sensitive configuration

**Problem:**
Hardcoded secrets in code lead to security breaches and configuration leaks.

**Solution:**
Use environment variables and secret management systems.

✅ **Correct: Secret management**
```python
# settings/production.py
import os
from pathlib import Path

# Get secrets from environment
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
DATABASE_PASSWORD = os.environ['DB_PASSWORD']
AWS_ACCESS_KEY_ID = os.environ['AWS_ACCESS_KEY_ID']
AWS_SECRET_ACCESS_KEY = os.environ['AWS_SECRET_ACCESS_KEY']

# For Docker/Kubernetes - read from files
def get_secret(secret_name):
    """Read secret from file (for Docker secrets)"""
    try:
        with open(f'/run/secrets/{secret_name}', 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return os.environ.get(secret_name)

SECRET_KEY = get_secret('django_secret_key')
```

```bash
# .env.example (document required variables)
DJANGO_SECRET_KEY=your-secret-key-here
DB_PASSWORD=your-db-password
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret

# For production deployment
export DJANGO_SECRET_KEY="your-actual-secret-key"
export DB_PASSWORD="your-actual-db-password"
```

### Deployment Static Files Serving
**Impact:** MEDIUM - Ensures proper asset delivery in production

**Problem:**
Incorrect static file configuration leads to broken assets and poor performance.

**Solution:**
Configure proper static file serving for production with CDNs.

✅ **Correct: Production static files**
```python
# settings/production.py
STATIC_URL = 'https://cdn.example.com/static/'
STATIC_ROOT = '/var/www/static/'

# Use WhiteNoise for simple deployments
MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ... other middleware
]

# WhiteNoise configuration
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# For CDN with CloudFront/S3
AWS_S3_CUSTOM_DOMAIN = 'cdn.example.com'
AWS_STORAGE_BUCKET_NAME = 'my-static-files'
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

```bash
# Deployment commands
python manage.py collectstatic --noinput
python manage.py compress  # If using django-compressor

# Nginx configuration for static files
location /static/ {
    alias /var/www/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Deployment Database Configuration
**Impact:** MEDIUM - Ensures database performance and reliability

**Problem:**
Default database settings cause performance and reliability issues in production.

**Solution:**
Configure database connection pooling, timeouts, and production optimizations.

✅ **Correct: Production database configuration**
```python
# settings/production.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ['DB_HOST'],
        'PORT': os.environ['DB_PORT'],
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000ms',  # 30 second query timeout
        },
        'CONN_MAX_AGE': 600,  # 10 minutes connection age
        'CONN_HEALTH_CHECKS': True,  # Django 4.1+
    }
}

# For MySQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'charset': 'utf8mb4',
        },
        'CONN_MAX_AGE': 600,
    }
}
```

---

## 9. Advanced Patterns (LOW)

### Advanced Signals Usage
**Impact:** LOW - Enables decoupled component communication

**Problem:**
Tight coupling between components makes code hard to maintain and test.

**Solution:**
Use Django signals for decoupled communication between components.

✅ **Correct: Signal usage**
```python
# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Article, Notification

@receiver(post_save, sender=Article)
def notify_followers(sender, instance, created, **kwargs):
    """Notify followers when new article is published"""
    if created and instance.published:
        # Avoid circular imports
        from .tasks import send_notifications

        followers = instance.author.followers.all()
        send_notifications.delay(instance, followers)

# Alternative: Custom signals
from django.dispatch import Signal

article_published = Signal()

# In model save method
def save(self, *args, **kwargs):
    is_new = self.pk is None
    super().save(*args, **kwargs)

    if is_new and self.published:
        article_published.send(sender=self.__class__, article=self)
```

### Advanced Middleware Custom
**Impact:** LOW - Enables request/response processing customization

**Problem:**
Built-in middleware insufficient for complex request processing needs.

**Solution:**
Create custom middleware for specific requirements.

✅ **Correct: Custom middleware**
```python
# middleware.py
from django.http import HttpResponseBadRequest
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    """Log all requests for debugging"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log request
        logger.info(f"{request.method} {request.path} from {request.META.get('REMOTE_ADDR')}")

        response = self.get_response(request)

        # Log response
        logger.info(f"Response: {response.status_code}")

        return response

class APIRateLimitMiddleware:
    """Simple API rate limiting"""

    def __init__(self, get_response):
        self.get_response = get_response
        self.requests = {}

    def __call__(self, request):
        # Only rate limit API endpoints
        if not request.path.startswith('/api/'):
            return self.get_response(request)

        client_ip = self.get_client_ip(request)
        current_time = time.time()

        # Clean old requests
        self._clean_old_requests(current_time)

        # Check rate limit
        if client_ip in self.requests:
            request_count = len(self.requests[client_ip])
            if request_count >= 100:  # 100 requests per minute
                return HttpResponseBadRequest('Rate limit exceeded')

            self.requests[client_ip].append(current_time)
        else:
            self.requests[client_ip] = [current_time]

        return self.get_response(request)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _clean_old_requests(self, current_time):
        """Remove requests older than 1 minute"""
        cutoff = current_time - 60
        for ip in list(self.requests.keys()):
            self.requests[ip] = [
                timestamp for timestamp in self.requests[ip]
                if timestamp > cutoff
            ]
            if not self.requests[ip]:
                del self.requests[ip]
```

### Advanced Model Managers
**Impact:** LOW - Provides reusable query logic

**Problem:**
Repeated query patterns scattered across codebase.

**Solution:**
Create custom managers for common query operations.

✅ **Correct: Custom managers**
```python
# models.py
from django.db import models
from django.utils import timezone

class PublishedManager(models.Manager):
    """Manager for published articles"""

    def get_queryset(self):
        return super().get_queryset().filter(
            published=True,
            published_date__lte=timezone.now()
        )

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    published = models.BooleanField(default=False)
    published_date = models.DateTimeField(null=True, blank=True)

    # Default manager
    objects = models.Manager()

    # Custom manager for published articles
    published_objects = PublishedManager()

    class Meta:
        ordering = ['-published_date']

    def __str__(self):
        return self.title

# Usage
# All articles
all_articles = Article.objects.all()

# Only published articles
published_articles = Article.published_objects.all()

# Custom manager with methods
class AuthorManager(models.Manager):
    def get_popular_authors(self, min_articles=5):
        return self.annotate(
            article_count=models.Count('articles')
        ).filter(article_count__gte=min_articles)

class Author(models.Model):
    name = models.CharField(max_length=100)
    bio = models.TextField()

    objects = AuthorManager()

# Usage
popular_authors = Author.objects.get_popular_authors(min_articles=10)
```

### Advanced Generic Views
**Impact:** LOW - Reduces boilerplate for common patterns

**Problem:**
Writing similar view logic repeatedly for CRUD operations.

**Solution:**
Extend Django's generic views with custom behavior.

✅ **Correct: Extended generic views**
```python
# views.py
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from .models import Article

class ArticleListView(ListView):
    model = Article
    template_name = 'articles/list.html'
    context_object_name = 'articles'
    paginate_by = 20

    def get_queryset(self):
        """Filter for published articles only"""
        return Article.objects.filter(published=True)

class ArticleDetailView(DetailView):
    model = Article
    template_name = 'articles/detail.html'

    def get_queryset(self):
        """Published articles or user's own drafts"""
        if self.request.user.is_staff:
            return Article.objects.all()
        return Article.objects.filter(published=True)

class ArticleCreateView(LoginRequiredMixin, CreateView):
    model = Article
    template_name = 'articles/form.html'
    fields = ['title', 'content', 'published_date']
    success_url = reverse_lazy('article_list')

    def form_valid(self, form):
        """Set author to current user"""
        form.instance.author = self.request.user
        return super().form_valid(form)

class ArticleUpdateView(LoginRequiredMixin, UpdateView):
    model = Article
    template_name = 'articles/form.html'
    fields = ['title', 'content', 'published_date']

    def get_queryset(self):
        """Users can only edit their own articles"""
        return Article.objects.filter(author=self.request.user)

    def get_success_url(self):
        return reverse_lazy('article_detail', kwargs={'pk': self.object.pk})
```

### Advanced Admin Customization
**Impact:** LOW - Improves admin interface usability

**Problem:**
Default admin interface insufficient for complex data management.

**Solution:**
Customize admin with custom forms, filters, and actions.

✅ **Correct: Admin customization**
```python
# admin.py
from django.contrib import admin
from django.db.models import Count
from .models import Article, Author

@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ['name', 'article_count', 'is_active']
    list_filter = ['is_active', 'created_date']
    search_fields = ['name', 'bio']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            article_count=Count('articles')
        )

    def article_count(self, obj):
        return obj.article_count
    article_count.admin_order_field = 'article_count'

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'published_date', 'word_count']
    list_filter = ['published', 'published_date', 'author']
    search_fields = ['title', 'content']
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'published_date'

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'author')
        }),
        ('Content', {
            'fields': ('content', 'excerpt'),
            'classes': ('collapse',)
        }),
        ('Publishing', {
            'fields': ('published', 'published_date'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('author')

    def word_count(self, obj):
        return len(obj.content.split())
    word_count.short_description = 'Word Count'

    actions = ['publish_articles', 'unpublish_articles']

    def publish_articles(self, request, queryset):
        updated = queryset.update(published=True)
        self.message_user(
            request,
            f'{updated} articles published successfully.'
        )
    publish_articles.short_description = 'Publish selected articles'

    def unpublish_articles(self, request, queryset):
        updated = queryset.update(published=False)
        self.message_user(
            request,
            f'{updated} articles unpublished.'
        )
    unpublish_articles.short_description = 'Unpublish selected articles'
```

---

## Additional Rules from Django Docs Analysis

### Serialization
**Impact:** HIGH - Essential for API development and data exchange

**Problem:**
Django applications need to convert model instances to various formats like JSON, XML, or YAML for APIs, data export, or fixtures. Incorrect serialization can lead to data loss, security issues, or broken deserialization.

**Solution:**
Use Django's built-in serialization framework for converting model data to various formats. Handle natural keys for foreign keys, be careful with inherited models, and use appropriate formats for your use case.

❌ **Wrong: Manual serialization**
```python
# Avoid manual JSON creation - error prone and incomplete
import json
data = []
for article in Article.objects.all():
    data.append({
        'id': article.id,
        'title': article.title,
        'author': article.author.name,  # N+1 query!
    })
json_data = json.dumps(data)
```

✅ **Correct: Django serialization**
```python
from django.core import serializers
from django.http import JsonResponse

# Serialize to JSON
data = serializers.serialize("json", Article.objects.all())
json_data = json.loads(data)  # Convert to dict for API responses

# Deserialize data
for obj in serializers.deserialize("json", data):
    obj.save()

# Use with APIs
def api_articles(request):
    articles = Article.objects.select_related('author').all()
    data = serializers.serialize("json", articles, use_natural_foreign_keys=True)
    return JsonResponse({'articles': json.loads(data)})
```

### Files and Media Handling
**Impact:** HIGH - Critical for user uploads and asset management

**Problem:**
Handling file uploads, storage, and serving in Django can be complex, leading to security vulnerabilities, resource leaks, poor performance, or data corruption. Common issues include not closing files, insecure access, and improper storage configuration.

**Solution:**
Use FileField and ImageField for model-based file handling, configure media settings properly, handle file objects safely with context managers, and use custom storage backends when needed.

✅ **Correct: Secure file handling**
```python
from django.db import models
from django.core.files.storage import FileSystemStorage

class Document(models.Model):
    title = models.CharField(max_length=100)
    file = models.FileField(upload_to="documents/%Y/%m/%d/")
    image = models.ImageField(upload_to="images/%Y/%m/%d/", blank=True)

# settings.py
import os
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

# Safe file operations
def process_upload(request):
    if request.method == 'POST':
        form = DocumentForm(request.POST, request.FILES)
        if form.is_valid():
            document = form.save()
            # Safe file reading
            with document.file.open() as f:
                content = f.read()
            return redirect('success')
```

### Settings Management
**Impact:** CRITICAL - Fundamental application configuration

**Problem:**
Django settings files contain sensitive information and configuration that varies between environments. Poor settings management can lead to security breaches, deployment failures, and configuration errors. Hardcoded secrets and environment confusion are common issues.

**Solution:**
Organize settings with environment-specific files, use environment variables for sensitive data, and follow Django's settings best practices.

✅ **Correct: Environment-based configuration**
```python
# settings/
# ├── __init__.py
# ├── base.py
# ├── development.py
# ├── production.py

# base.py - common settings
import os
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
DEBUG = False
ALLOWED_HOSTS = []

# development.py
from .base import *
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
SECRET_KEY = "dev-secret-key-change-in-production"

# production.py
from .base import *
DEBUG = False
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ["DB_NAME"],
        'USER': os.environ["DB_USER"],
        'PASSWORD': os.environ["DB_PASSWORD"],
        'HOST': os.environ["DB_HOST"],
        'PORT': os.environ["DB_PORT"],
    }
}
```

### Asynchronous Views and Tasks
**Impact:** HIGH - Performance optimization for concurrent operations

**Problem:**
Django applications using asynchronous features can suffer from performance degradation, blocking operations, and thread-safety issues if async code is not properly implemented. Mixing synchronous and asynchronous code incorrectly is a common problem.

**Solution:**
Use async views for concurrent operations, sync_to_async for calling synchronous Django code, and async ORM queries where available. Deploy with ASGI for full async benefits.

✅ **Correct: Async implementation**
```python
from asgiref.sync import sync_to_async
from django.http import JsonResponse

async def async_view(request):
    # Concurrent async operations
    result1 = await some_async_api_call()
    result2 = await another_async_api_call()
    return JsonResponse({"data": result1 + result2})

async def async_orm_view(request):
    # Async database queries
    async for author in Author.objects.filter(name__startswith="A"):
        books = await author.books.all()
        # Process books
    return JsonResponse({"processed": True})

# Call sync Django code from async
async def mixed_view(request):
    users = await sync_to_async(list)(User.objects.all())
    return JsonResponse({"users": users})
```

### Signing and Cryptography
**Impact:** MEDIUM - Data integrity and security

**Problem:**
Web applications need to protect data integrity and prevent tampering when passing information through untrusted channels. Without proper cryptographic signing, sensitive data like password reset tokens, form values, or temporary access URLs can be manipulated by attackers.

**Solution:**
Use Django's signing framework to protect data integrity with timestamps and salts. Generate secure one-time URLs and protect complex data structures.

✅ **Correct: Data signing**
```python
from django.core import signing
from django.core.signing import TimestampSigner

# Basic signing
signer = signing.Signer()
signed_value = signer.sign("sensitive-data")
original_value = signer.unsign(signed_value)

# Timestamped signatures
signer = TimestampSigner()
token = signer.sign("user-123")
try:
    user_id = signer.unsign(token, max_age=3600)  # 1 hour
except signing.SignatureExpired:
    # Token expired
    pass

# Secure URLs
def get_reset_url(user):
    signer = TimestampSigner(salt="password-reset")
    token = signer.sign(str(user.id))
    return f"/reset-password/{token}/"
```

### Middleware Basics
**Impact:** MEDIUM - Request/response processing and cross-cutting concerns

**Problem:**
Middleware is essential for request/response processing, but incorrect implementation can cause performance issues, broken request handling, and unexpected behavior. Wrong ordering, not handling async, or poorly implemented middleware are common issues.

**Solution:**
Create middleware as factory functions or classes, handle both sync and async requests, and order middleware correctly. Use special hooks like process_view, process_exception, and process_template_response appropriately.

✅ **Correct: Custom middleware**
```python
# Function-based middleware
def simple_middleware(get_response):
    def middleware(request):
        # Pre-processing
        print(f"Request to {request.path}")
        response = get_response(request)
        # Post-processing
        print(f"Response status: {response.status_code}")
        return response
    return middleware

# Class-based with hooks
class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Called before view execution
        logger.info(f"View: {view_func.__name__}")
        return None

    def process_exception(self, request, exception):
        # Handle exceptions
        logger.error(f"Exception: {exception}")
        return None
```

### Exceptions and Error Handling
**Impact:** MEDIUM - Better user experience and debugging

**Problem:**
Poor error handling leads to 500 errors, confusing users, exposing sensitive information, and hiding actual problems from developers. Django's default error handling may not be sufficient for production applications.

**Solution:**
Implement proper error handling with appropriate HTTP status codes, user-friendly messages, and proper logging. Use Django's built-in exceptions and create custom error views.

✅ **Correct: Comprehensive error handling**
```python
from django.http import Http404
from django.core.exceptions import PermissionDenied

def article_detail(request, pk):
    try:
        article = get_object_or_404(Article, pk=pk, published=True)
    except Http404:
        logger.warning(f"Article {pk} not found or not published")
        return render(request, '404.html', status=404)

    if not article.can_view(request.user):
        raise PermissionDenied("You don't have permission to view this article")

    return render(request, 'article/detail.html', {'article': article})

# Custom error views in urls.py
handler400 = 'myapp.views.bad_request'
handler403 = 'myapp.views.permission_denied'
handler404 = 'myapp.views.page_not_found'
handler500 = 'myapp.views.server_error'
```

### Validators
**Impact:** MEDIUM - Data integrity and validation

**Problem:**
Django applications that accept user input without proper validation can suffer from data corruption, security vulnerabilities, and poor user experience. Missing validators allow invalid data to be stored, leading to application bugs.

**Solution:**
Use Django's built-in validators on model fields and forms, and create custom validators for business logic. Implement comprehensive validation at form and model levels.

✅ **Correct: Multi-level validation**
```python
from django.core.validators import MinLengthValidator, EmailValidator
from django.core.exceptions import ValidationError

class Article(models.Model):
    title = models.CharField(
        max_length=100,
        validators=[MinLengthValidator(5, message="Title too short")]
    )
    email = models.EmailField(validators=[EmailValidator()])

# Custom validator
def validate_even(value):
    if value % 2 != 0:
        raise ValidationError('%(value)s is not an even number', params={'value': value})

class MyForm(forms.Form):
    even_number = forms.IntegerField(validators=[validate_even])

    def clean_title(self):
        title = self.cleaned_data['title'].strip()
        if len(title) < 5:
            raise forms.ValidationError("Title must be at least 5 characters")
        return title
```

### HTTP Request/Response Handling
**Impact:** MEDIUM - Proper web interaction handling

**Problem:**
Incorrect handling of Django's HttpRequest and HttpResponse objects can lead to security vulnerabilities, data loss, performance issues, and unexpected behavior. Common mistakes include improper access to request data and insecure cookie handling.

**Solution:**
Use HttpRequest attributes and methods correctly for data access, create HttpResponse objects with proper configuration, handle cookies securely, and use StreamingHttpResponse for large content.

✅ **Correct: Request/response handling**
```python
def my_view(request):
    # Proper method checking
    if request.method == 'POST':
        # Safe multi-value access
        tags = request.POST.getlist('tags')
        name = request.POST.get('name')
    else:
        # Query parameters
        search = request.GET.get('q', '')

    # Headers access
    user_agent = request.headers.get('User-Agent')

    # URL building
    full_url = request.build_absolute_uri('/path')

    # Response creation
    response = JsonResponse({'data': 'value'}, status=200)
    response.headers['Custom-Header'] = 'value'

    # Secure cookies
    response.set_cookie('session', value, secure=True, httponly=True, samesite='Lax')

    return response
```

### Unicode and Text Handling
**Impact:** LOW - International application support

**Problem:**
Django applications handling non-ASCII text can encounter encoding issues, data corruption, and display problems if unicode and text encoding are not handled properly. Python 3 uses unicode by default, but developers may still encounter encoding/decoding issues.

**Solution:**
Use UTF-8 encoding consistently, handle text properly in forms and database, and use Django's encoding utilities when needed.

✅ **Correct: Unicode handling**
```python
# settings.py
DEFAULT_CHARSET = 'utf-8'
FILE_CHARSET = 'utf-8'

# Proper text handling
def unicode_view(request):
    text = "Hello, 世界"  # Unicode string
    response = HttpResponse(text, content_type="text/plain; charset=utf-8")
    return response

# File handling with encoding
with open("file.txt", "r", encoding="utf-8") as f:
    content = f.read()

# Database text storage (automatic with proper settings)
class Article(models.Model):
    title = models.CharField(max_length=100)  # Stores unicode
    content = models.TextField()
```