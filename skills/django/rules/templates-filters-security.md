---
title: Templates Filters Security
impact: MEDIUM-HIGH
impactDescription: Prevents XSS attacks and maintains content integrity
tags: django, templates, security, xss, filters
---

## Templates Filters Security

**Problem:**
The `safe` filter bypasses Django's auto-escaping, potentially allowing XSS attacks when used incorrectly. User input displayed in templates without proper escaping can execute malicious JavaScript.

**Solution:**
Use Django's auto-escaping by default and only use `safe` when you absolutely trust the content. Implement proper sanitization for user-generated content.

**Examples:**

❌ **Wrong: Unsafe use of safe filter**
```django
<!-- DANGER: User input marked as safe -->
<div>{{ user_comment|safe }}</div>  <!-- XSS vulnerability -->

<!-- Also dangerous -->
<div>{{ user_input|safe }}</div>

<!-- Dangerous in scripts -->
<script>
  var userData = "{{ user_json|safe }}";  // XSS vulnerability
</script>

<!-- Dangerous in attributes -->
<img src="{{ user_image_url|safe }}" alt="User image">
```

✅ **Correct: Safe template rendering**
```django
<!-- Safe - Django auto-escapes by default -->
<div>{{ user_comment }}</div>

<!-- Safe - explicit escape (redundant but explicit) -->
<div>{{ user_comment|escape }}</div>

<!-- Safe - use safe only when you absolutely trust the content -->
<div class="trusted-content">{{ trusted_html|safe }}</div>

<!-- Safe - use format_html for dynamic content -->
{% load utils %}
<div class="message">
  {% format_html "Welcome back, <strong>{}</strong>!" user.name %}
</div>

<!-- Safe - proper attribute escaping -->
<img src="{{ user_image_url|urlencode }}" alt="{{ user_image_alt }}">

<!-- Safe - sanitize HTML content -->
<div>{{ user_html_content|striptags|truncatechars:100 }}</div>
```

**Custom filters for safe content:**
```python
# templatetags/safe_filters.py
from django import template
from django.utils.safestring import mark_safe
from django.utils.html import escape
import bleach

register = template.Library()

@register.filter
def sanitize_html(value):
    """Sanitize HTML content, allowing only safe tags"""
    if not value:
        return ''

    # Allow only safe tags
    allowed_tags = ['p', 'br', 'strong', 'em', 'a']
    allowed_attrs = {'a': ['href', 'title']}

    cleaned = bleach.clean(
        str(value),
        tags=allowed_tags,
        attributes=allowed_attrs,
        strip=True
    )

    return mark_safe(cleaned)

@register.filter
def format_user_message(message, username):
    """Safely format a message with user data"""
    from django.utils.html import format_html
    return format_html(
        '<div class="message"><strong>{}</strong>: {}</div>',
        escape(username),
        escape(message)
    )

# Usage in templates
{{ user_bio|sanitize_html }}
{{ message|format_user_message:request.user.username }}
```

**Common mistakes:**
- Using `|safe` on user-generated content
- Displaying user input in JavaScript contexts
- Not escaping content in HTML attributes
- Trusting content without proper validation
- Using `mark_safe()` in views without sanitization

**When to apply:**
- Displaying any user-generated content
- Working with HTML from external sources
- Implementing comment or content systems
- During security code reviews
- When handling rich text content