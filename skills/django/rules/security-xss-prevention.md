---
title: Security XSS Prevention
impact: CRITICAL
impactDescription: Prevents cross-site scripting attacks
tags: security, django, xss, templates
---

## Security XSS Prevention

**Problem:**
User input displayed in templates without proper escaping can execute malicious JavaScript in users' browsers, compromising user sessions and stealing data.

**Solution:**
Always escape user input in templates. Use Django's auto-escaping and be extremely careful with the `safe` filter and `mark_safe`.

**Examples:**

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

**Common mistakes:**
- Using `|safe` filter on user-generated content
- Displaying user input in JavaScript contexts without proper escaping
- Trusting user input without validation
- Using `mark_safe()` in views without proper sanitization

**When to apply:**
- Displaying any user-generated content in templates
- Working with HTML content from external sources
- Implementing comment systems or user-generated content
- During security code reviews