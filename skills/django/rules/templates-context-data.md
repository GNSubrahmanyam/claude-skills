---
title: Templates Context Data
impact: MEDIUM-HIGH
impactDescription: Maintains separation of concerns and improves maintainability
tags: django, templates, context, mvc
---

## Templates Context Data

**Problem:**
Business logic in templates leads to hard-to-maintain code, violates MVC principles, and makes templates difficult to test and reuse.

**Solution:**
Keep templates simple by moving complex logic to views and models. Use template tags and filters for presentation logic only.

**Examples:**

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

<!-- More bad examples -->
{% for user in users %}
  {% if user.is_staff or user.is_superuser %}
    {% if user.last_login and user.last_login|timesince < "7 days" %}
      <div class="active-admin">{{ user.username }}</div>
    {% endif %}
  {% endif %}
{% endfor %}
```

✅ **Correct: Simple templates with view logic**
```python
# views.py - Move logic here
def article_list(request):
    current_year = timezone.now().year

    # Use QuerySet methods for filtering
    articles = Article.objects.filter(
        published_date__year=current_year,
        author__is_active=True
    ).annotate(
        is_long_read=models.Case(
            models.When(word_count__gt=1000, then=models.Value(True)),
            default=models.Value(False),
            output_field=models.BooleanField()
        )
    ).select_related('author')

    return render(request, 'articles/list.html', {
        'articles': articles,
        'current_year': current_year,
    })

def user_list(request):
    # Complex logic in view
    recent_admins = User.objects.filter(
        models.Q(is_staff=True) | models.Q(is_superuser=True)
    ).filter(
        last_login__gte=timezone.now() - timedelta(days=7)
    )

    return render(request, 'users/list.html', {
        'recent_admins': recent_admins,
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

<!-- templates/users/list.html -->
{% for user in recent_admins %}
  <div class="active-admin">{{ user.username }}</div>
{% endfor %}
```

**Context processors for global data:**
```python
# context_processors.py
def site_settings(request):
    """Add site-wide settings to all templates"""
    return {
        'site_name': 'My Django Site',
        'current_year': timezone.now().year,
        'user_can_edit': request.user.has_perm('myapp.can_edit'),
    }

# settings.py
TEMPLATES = [{
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
            'myapp.context_processors.site_settings',  # Custom processor
        ],
    },
}]
```

**Common mistakes:**
- Complex conditional logic in templates
- Database queries in templates
- Business logic mixed with presentation
- Not using context processors for global data
- Templates that are hard to test or maintain

**When to apply:**
- Writing new templates
- Refactoring existing templates with complex logic
- Improving template maintainability
- Separating concerns between views and templates
- Making templates easier to test