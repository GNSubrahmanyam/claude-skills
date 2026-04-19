# Security CSRF Protection (CRITICAL)

**Impact:** CRITICAL - Prevents cross-site request forgery attacks

**Problem:**
Django applications are vulnerable to CSRF attacks if protection is disabled or improperly configured, allowing attackers to perform unauthorized actions on behalf of users.

**Solution:**
Always enable CSRF protection for forms and POST requests. Django provides built-in CSRF protection that should be enabled by default.

**Examples:**

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

**Common mistakes:**
- Removing CsrfViewMiddleware from settings
- Forgetting {% csrf_token %} in templates
- Using @csrf_exempt decorator without justification
- AJAX requests without proper CSRF token handling

**When to apply:**
- Creating any form that submits POST data
- Implementing AJAX endpoints
- Reviewing security settings
- During security audits