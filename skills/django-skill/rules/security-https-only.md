# Security HTTPS Only (CRITICAL)

**Impact:** CRITICAL - Protects data in transit and prevents MITM attacks

**Problem:**
HTTP traffic can be intercepted and modified by attackers, exposing sensitive data and allowing man-in-the-middle attacks that can compromise user sessions and data.

**Solution:**
Force HTTPS in production with proper security headers and secure cookie settings.

**Examples:**

❌ **Wrong: HTTP in production**
```python
# settings.py - INSECURE for production
DEBUG = False
ALLOWED_HOSTS = ['example.com']

# Missing HTTPS configuration - vulnerable!
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
```

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

# Additional security headers
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
```

**Common mistakes:**
- Forgetting to set `SECURE_SSL_REDIRECT = True`
- Not setting `SESSION_COOKIE_SECURE = True`
- Missing `SECURE_HSTS_SECONDS` for HSTS protection
- Using HTTP in production environments

**When to apply:**
- Configuring production settings
- Setting up SSL certificates
- During security hardening
- When deploying to production servers