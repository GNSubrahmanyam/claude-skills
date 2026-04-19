# Templates Inheritance Pattern (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Promotes DRY and maintainable templates

**Problem:**
Duplicated HTML structure across templates leads to maintenance issues and violates DRY principles.

**Solution:**
Use template inheritance to create reusable base templates with blocks for customization.

**Examples:**

❌ **Wrong: Template duplication**
```django
<!-- header.html -->
<header>
    <nav>
        <a href="/">Home</a>
        {% if user.is_authenticated %}
            <a href="/logout/">Logout</a>
        {% else %}
            <a href="/login/">Login</a>
        {% endif %}
    </nav>
</header>

<!-- footer.html -->
<footer>
    <p>&copy; 2024 My Site</p>
</footer>

<!-- page1.html -->
{% include "header.html" %}
<h1>Page 1</h1>
<p>Content for page 1</p>
{% include "footer.html" %}

<!-- page2.html -->
{% include "header.html" %}
<h1>Page 2</h1>
<p>Content for page 2</p>
{% include "footer.html" %}
```

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

```django
<!-- templates/article/detail.html -->
{% extends "base.html" %}

{% block title %}{{ article.title }} - {{ block.super }}{% endblock %}

{% block extra_head %}
    <meta property="og:title" content="{{ article.title }}">
    <meta property="og:description" content="{{ article.excerpt }}">
{% endblock %}

{% block content %}
    <article>
        <h1>{{ article.title }}</h1>
        <p class="meta">By {{ article.author.name }} on {{ article.published_date|date }}</p>
        <div class="content">{{ article.content|linebreaks }}</div>
    </article>
{% endblock %}

{% block extra_scripts %}
    <script src="{% static 'js/article-sharing.js' %}"></script>
{% endblock %}
```

**Common mistakes:**
- Not using `{% block.super %}` to append to parent blocks
- Overriding entire blocks instead of extending them
- Deep inheritance hierarchies (more than 3-4 levels)
- Not providing meaningful default content in base template blocks
- Mixing template logic with inheritance structure

**When to apply:**
- Creating multi-page websites
- Building consistent layouts across pages
- Implementing themes and skins
- Managing reusable page components