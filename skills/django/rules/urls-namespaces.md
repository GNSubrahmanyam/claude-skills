# URLs Namespaces (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Prevents URL conflicts and improves maintainability

**Problem:**
Without URL namespaces, similar URL patterns from different apps can conflict, making it impossible to include multiple apps with similar URL structures. Namespaces also make URL reversal more explicit and maintainable.

**Solution:**
Use URL namespaces for all apps to avoid conflicts and make URL references explicit. Always include app_name in URL configurations.

**Examples:**

❌ **Wrong: No namespaces - conflicts possible**
```python
# blog/urls.py
urlpatterns = [
    path('', views.index, name='index'),
    path('<int:pk>/', views.detail, name='detail'),
    path('create/', views.create, name='create'),
]

# shop/urls.py - CONFLICTS with blog!
urlpatterns = [
    path('', views.index, name='index'),  # Same name!
    path('<int:pk>/', views.detail, name='detail'),  # Same name!
    path('create/', views.create, name='create'),  # Same name!
]

# main urls.py
urlpatterns = [
    path('blog/', include('blog.urls')),
    path('shop/', include('shop.urls')),
    # URL reversal fails - which 'index'?
]
```

✅ **Correct: Using namespaces**
```python
# blog/urls.py
from django.urls import path
from . import views

app_name = 'blog'  # Namespace declaration

urlpatterns = [
    path('', views.index, name='index'),
    path('<int:pk>/', views.detail, name='detail'),
    path('create/', views.create, name='create'),
    path('<int:pk>/edit/', views.edit, name='edit'),
    path('<int:pk>/delete/', views.delete, name='delete'),
]

# shop/urls.py
from django.urls import path
from . import views

app_name = 'shop'  # Different namespace

urlpatterns = [
    path('', views.index, name='index'),
    path('<int:pk>/', views.detail, name='detail'),
    path('create/', views.create, name='create'),
    path('<int:pk>/edit/', views.edit, name='edit'),
    path('cart/', views.cart, name='cart'),
]

# accounts/urls.py
from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('register/', views.register, name='register'),
    path('profile/', views.profile, name='profile'),
]

# main urls.py
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('blog/', include('blog.urls')),
    path('shop/', include('shop.urls')),
    path('', include('pages.urls')),  # pages app for home page
]
```

**URL reversal with namespaces:**
```python
# views.py - Explicit namespace usage
from django.urls import reverse
from django.shortcuts import redirect

def blog_post_create(request):
    if request.method == 'POST':
        form = BlogPostForm(request.POST)
        if form.is_valid():
            post = form.save()
            # Explicit namespace
            return redirect(reverse('blog:detail', kwargs={'pk': post.pk}))

def add_to_cart(request, product_id):
    # Add to cart logic
    return redirect(reverse('shop:cart'))

# In templates
{# Explicit namespace references #}
<a href="{% url 'blog:index' %}">Blog</a>
<a href="{% url 'shop:index' %}">Shop</a>
<a href="{% url 'accounts:login' %}">Login</a>

{# In forms #}
<form action="{% url 'blog:create' %}" method="post">
    {% csrf_token %}
    <!-- form fields -->
</form>
```

**Advanced namespace patterns:**
```python
# Nested namespaces for complex apps
# shop/urls.py
from django.urls import path, include

app_name = 'shop'

urlpatterns = [
    path('', views.index, name='index'),
    path('products/', include([
        path('', views.product_list, name='product_list'),
        path('<int:pk>/', views.product_detail, name='product_detail'),
        path('<int:pk>/edit/', views.product_edit, name='product_edit'),
    ])),
    path('orders/', include([
        path('', views.order_list, name='order_list'),
        path('<int:pk>/', views.order_detail, name='order_detail'),
    ])),
]

# URL reversal for nested patterns
reverse('shop:product_detail', kwargs={'pk': 123})
# Result: /shop/products/123/

# Instance namespace for dynamic URL resolution
class Product(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse('shop:product_detail', kwargs={'pk': self.pk})

# Multiple app instances with different namespaces
# For multi-tenant applications
def get_app_urls(app_instance):
    """Generate URLs for specific app instance"""
    return [
        path(f'{app_instance.slug}/', include('blog.urls', namespace=f'{app_instance.slug}_blog')),
    ], f'{app_instance.slug}_blog'

# Custom URL resolver for dynamic namespaces
from django.urls import ResolverMatch

class DynamicNamespaceResolver:
    """Custom resolver for dynamic namespaces"""

    def resolve(self, path):
        # Custom logic to determine namespace based on path
        if path.startswith('tenant1/'):
            return ResolverMatch('blog:index', (), {}, 'tenant1_blog')
        elif path.startswith('tenant2/'):
            return ResolverMatch('blog:index', (), {}, 'tenant2_blog')
        return None
```

**Namespace best practices:**
```python
# Consistent naming conventions
# app_name should match the app's purpose
# Use lowercase, no special characters
# Examples: 'blog', 'shop', 'accounts', 'api', 'admin'

# Avoid generic names that could conflict
# Bad: 'main', 'core', 'app', 'site'
# Good: 'articles', 'products', 'users', 'dashboard'

# Namespace-aware template tags
from django import template

register = template.Library()

@register.simple_tag(takes_context=True)
def namespaced_url(context, view_name, **kwargs):
    """Get URL with automatic namespace detection"""
    request = context.get('request')
    if request and hasattr(request, 'resolver_match'):
        current_namespace = request.resolver_match.namespace
        if current_namespace and ':' not in view_name:
            view_name = f"{current_namespace}:{view_name}"
    return reverse(view_name, kwargs=kwargs)

# Usage in templates
{% load namespace_utils %}
<a href="{% namespaced_url 'detail' pk=object.pk %}">View</a>
```

**Common mistakes:**
- Not declaring app_name in URL configurations
- Using conflicting URL names across apps
- Hardcoding namespace prefixes in templates
- Not updating namespace references during refactoring
- Mixing namespaced and non-namespaced URL references
- Forgetting to include namespace in URL reversal

**When to apply:**
- Setting up multi-app Django projects
- Avoiding URL conflicts between apps
- Implementing modular Django applications
- During project architecture planning
- When adding new apps to existing projects