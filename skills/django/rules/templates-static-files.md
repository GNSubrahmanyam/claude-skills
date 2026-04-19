---
title: Templates Static Files
impact: MEDIUM-HIGH
impactDescription: Ensures proper asset management and performance
tags: django, templates, static-files, performance
---

## Templates Static Files

**Problem:**
Incorrect static file handling leads to broken links, poor performance, and maintenance issues. Static files not properly configured can prevent CSS, JavaScript, and images from loading.

**Solution:**
Use Django's static files framework properly with proper URL generation, versioning, and organization.

**Examples:**

❌ **Wrong: Hardcoded static paths**
```django
<!-- Bad: Hardcoded paths -->
<link rel="stylesheet" href="/static/css/style.css">
<script src="/static/js/app.js"></script>
<img src="/static/images/logo.png" alt="Logo">

<!-- Bad: Missing static tag -->
<link rel="stylesheet" href="css/bootstrap.css">
```

✅ **Correct: Django static files**
```django
<!-- templates/base.html -->
{% load static %}

<!DOCTYPE html>
<html>
<head>
    <!-- CSS files -->
    <link rel="stylesheet" href="{% static 'css/bootstrap.min.css' %}">
    <link rel="stylesheet" href="{% static 'css/style.css' %}">

    <!-- JavaScript files -->
    <script src="{% static 'js/jquery.min.js' %}"></script>
    <script src="{% static 'js/app.js' %}"></script>

    <!-- Images -->
    <link rel="icon" href="{% static 'images/favicon.ico' %}">
    <img src="{% static 'images/logo.png' %}" alt="Logo">
</head>
<body>
    <!-- Dynamic static paths -->
    <link rel="stylesheet" href="{% static 'css/themes/'|add:theme|add:'.css' %}">
</body>
</html>
```

**Static files configuration:**
```python
# settings.py
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Development - static files directories
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR / 'assets',
]

# Production - WhiteNoise or CDN
if not DEBUG:
    STATIC_URL = 'https://cdn.example.com/static/'
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Custom storage for organization
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage

class OrganizedStaticFilesStorage(ManifestStaticFilesStorage):
    """Organize static files by type"""

    def get_target_dir(self, path, name):
        """Organize files in subdirectories by type"""
        if path.endswith('.css'):
            return f'css/{name}'
        elif path.endswith(('.js', '.coffee')):
            return f'js/{name}'
        elif path.endswith(('.png', '.jpg', '.jpeg', '.gif', '.svg')):
            return f'images/{name}'
        return name
```

**Static files in app directories:**
```python
# myapp/static/myapp/css/style.css
.myapp-style {
    color: blue;
}

# myapp/static/myapp/js/app.js
console.log('MyApp loaded');

# templates/myapp/base.html
{% load static %}
<link rel="stylesheet" href="{% static 'myapp/css/style.css' %}">
<script src="{% static 'myapp/js/app.js' %}"></script>
```

**Common mistakes:**
- Hardcoding static URLs instead of using `{% static %}`
- Not collecting static files in production
- Missing static files configuration
- Not using app-specific static directories
- Incorrect static file serving in production

**When to apply:**
- Setting up new Django projects
- Adding CSS, JavaScript, or images
- Configuring production static file serving
- Organizing static assets by app
- During deployment and asset optimization