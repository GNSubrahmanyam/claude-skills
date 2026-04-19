---
title: Templates Performance
impact: MEDIUM
impactDescription: Improves page load times and user experience
tags: django, templates, performance, caching
---

## Templates Performance

**Problem:**
Inefficient template rendering can slow down page loads and waste server resources. Complex template logic, unnecessary includes, and lack of caching can impact performance.

**Solution:**
Optimize template rendering with efficient patterns, caching, and minimal logic. Use template fragment caching for expensive operations.

**Examples:**

❌ **Wrong: Inefficient templates**
```django
<!-- Bad: Complex logic in templates -->
{% for article in articles %}
  {% for tag in article.tags.all %}  <!-- N+1 query! -->
    {% if tag.name|length > 3 %}
      <span class="tag">{{ tag.name }}</span>
    {% endif %}
  {% endfor %}
{% endfor %}

<!-- Bad: Expensive operations in loop -->
{% for user in users %}
  <div>{{ user.get_full_name|title }}</div>  <!-- Called for each user -->
  <span>Joined {{ user.date_joined|timesince }}</span>  <!-- Expensive operation -->
{% endfor %}

<!-- Bad: Deep nesting and includes -->
{% include "includes/header.html" %}
{% include "includes/nav.html" %}
<div>
  {% include "includes/sidebar.html" %}
  <main>
    {% include "includes/content.html" %}
  </main>
</div>
{% include "includes/footer.html" %}
```

✅ **Correct: Optimized templates**
```python
# views.py - Pre-compute expensive operations
def article_list(request):
    articles = Article.objects.prefetch_related('tags').filter(
        published=True
    )[:10]

    # Pre-compute expensive operations
    for article in articles:
        article.filtered_tags = [
            tag for tag in article.tags.all()
            if len(tag.name) > 3
        ]

    return render(request, 'articles/list.html', {
        'articles': articles,
    })

def user_list(request):
    users = User.objects.all()[:20]

    # Pre-compute expensive operations
    user_data = []
    for user in users:
        user_data.append({
            'full_name': user.get_full_name(),
            'display_name': user.get_full_name().title(),
            'joined_display': timesince(user.date_joined),
        })

    return render(request, 'users/list.html', {
        'user_data': user_data,
    })
```

```django
<!-- templates/articles/list.html -->
{% for article in articles %}
  {% for tag in article.filtered_tags %}
    <span class="tag">{{ tag.name }}</span>
  {% endfor %}
{% endfor %}

<!-- templates/users/list.html -->
{% for user in user_data %}
  <div>{{ user.display_name }}</div>
  <span>Joined {{ user.joined_display }}</span>
{% endfor %}

<!-- Optimized includes with template inheritance -->
{% extends "base.html" %}

{% block content %}
  <div class="container">
    {% block sidebar %}{% endblock %}
    <main>
      {% block main_content %}{% endblock %}
    </main>
  </div>
{% endblock %}
```

**Template fragment caching:**
```django
<!-- templates/article/detail.html -->
{% load cache %}

<article>
    <h1>{{ article.title }}</h1>

    {# Cache expensive template rendering #}
    {% cache 600 article_content article.id article.updated_date %}
        <div class="content">
            {{ article.content|linebreaks|markdown }}
        </div>
    {% endcache %}

    {# Cache related articles section #}
    {% cache 300 related_articles article.id %}
        <div class="related">
            <h3>Related Articles</h3>
            {% for related in article.get_related_articles %}
                <a href="{% url 'article_detail' related.id %}">{{ related.title }}</a>
            {% endfor %}
        </div>
    {% endcache %}
</article>
```

**Template optimization techniques:**
```django
<!-- Use with tags to avoid repeated attribute access -->
{% with user.profile as profile %}
  <div class="user-info">
    <h2>{{ profile.display_name }}</h2>
    <p>{{ profile.bio }}</p>
    <img src="{{ profile.avatar.url }}" alt="{{ profile.display_name }}">
  </div>
{% endwith %}

<!-- Use {% spaceless %} to remove whitespace -->
{% spaceless %}
<div>
    <span>Item 1</span>
    <span>Item 2</span>
</div>
{% endspaceless %}

<!-- Use {% firstof %} for defaults -->
<h1>{% firstof article.headline article.title "Untitled" %}</h1>

<!-- Minimize template tags in loops -->
{% for item in items %}
  {% if item.is_active %}{{ item.name }}{% endif %}
{% endfor %}

<!-- Better: filter in view -->
{% for item in active_items %}
  {{ item.name }}
{% endfor %}
```

**Common mistakes:**
- Database queries in template loops
- Expensive operations in templates
- Deep nesting of includes
- Not caching expensive template fragments
- Complex logic that belongs in views
- Not pre-computing expensive operations

**When to apply:**
- Optimizing slow page loads
- Improving template rendering performance
- Reducing database queries in templates
- Implementing caching strategies
- During performance optimization