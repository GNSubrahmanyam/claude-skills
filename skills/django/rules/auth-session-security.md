---
title: Authentication Session Security
impact: MEDIUM-HIGH
impactDescription: Prevents session hijacking and fixation attacks
tags: django, authentication, security, sessions
---

## Authentication Session Security

**Problem:**
Improper session configuration can allow attackers to hijack user sessions, perform session fixation attacks, or maintain sessions longer than necessary, compromising user accounts and data.

**Solution:**
Configure sessions securely with appropriate timeouts, secure cookies, and proper session handling throughout the application.

**Examples:**

❌ **Wrong: Insecure session configuration**
```python
# settings.py - INSECURE
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = 1209600  # 2 weeks - too long!
SESSION_COOKIE_SECURE = False  # Allows HTTP transmission
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = False  # Allows JavaScript access
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = False  # No periodic cleanup
```

✅ **Correct: Secure session configuration**
```python
# settings.py - SECURE
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'  # Cache + DB fallback
SESSION_COOKIE_AGE = 3600  # 1 hour for sensitive apps, 24 hours for convenience
SESSION_COOKIE_SECURE = True  # HTTPS only in production
CSRF_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # But with reasonable timeout
SESSION_SAVE_EVERY_REQUEST = True  # Update timestamp on each request

# Session security middleware (custom)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'myapp.middleware.SessionSecurityMiddleware',
    # ... other middleware
]
```

**Session security middleware:**
```python
# middleware.py
from django.contrib.sessions.models import Session
from django.utils import timezone
from django.contrib.auth import logout
import logging

logger = logging.getLogger(__name__)

class SessionSecurityMiddleware:
    """Enhanced session security middleware"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            self._check_session_security(request)

        response = self.get_response(request)
        return response

    def _check_session_security(self, request):
        """Perform security checks on authenticated sessions"""
        session = request.session

        # Check for session hijacking (IP change)
        current_ip = self._get_client_ip(request)
        session_ip = session.get('ip_address')

        if session_ip and session_ip != current_ip:
            logger.warning(f"IP address changed for user {request.user}: {session_ip} -> {current_ip}")
            # Optional: logout or notify user
            # logout(request)
            # messages.warning(request, "Security alert: IP address changed")

        # Update session IP
        session['ip_address'] = current_ip

        # Check user agent consistency
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        session_ua = session.get('user_agent')

        if session_ua and session_ua != user_agent:
            logger.warning(f"User agent changed for user {request.user}")
            # Optional: additional security measures

        # Update user agent
        session['user_agent'] = user_agent

        # Force logout after period of inactivity
        last_activity = session.get('last_activity')
        if last_activity:
            inactive_time = timezone.now() - last_activity
            max_inactive = timezone.timedelta(hours=2)  # 2 hours

            if inactive_time > max_inactive:
                logger.info(f"Logging out user {request.user} due to inactivity")
                logout(request)
                return

        # Update last activity
        session['last_activity'] = timezone.now()

        # Clean up expired sessions periodically
        self._cleanup_expired_sessions()

    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _cleanup_expired_sessions(self):
        """Periodically clean up expired sessions"""
        # Only run cleanup occasionally to avoid performance impact
        import random
        if random.random() < 0.01:  # 1% chance per request
            Session.objects.filter(expire_date__lt=timezone.now()).delete()
```

**Session management utilities:**
```python
# utils.py
from django.contrib.sessions.models import Session
from django.utils import timezone

def get_active_sessions(user):
    """Get all active sessions for a user"""
    return Session.objects.filter(
        session_key__in=user.session_set.values_list('session_key', flat=True),
        expire_date__gt=timezone.now()
    )

def invalidate_user_sessions(user, exclude_current=None):
    """Invalidate all sessions for a user except current"""
    sessions = get_active_sessions(user)

    for session in sessions:
        if exclude_current and session.session_key == exclude_current:
            continue
        session.delete()

def invalidate_all_sessions():
    """Invalidate all sessions (for maintenance)"""
    Session.objects.all().delete()

# View for session management
@login_required
def session_security(request):
    """Allow users to view and manage their sessions"""
    sessions = get_active_sessions(request.user)

    if request.method == 'POST':
        if 'invalidate_others' in request.POST:
            invalidate_user_sessions(request.user, exclude_current=request.session.session_key)
            messages.success(request, 'Other sessions have been invalidated.')

    return render(request, 'accounts/session_security.html', {
        'sessions': sessions,
        'current_session': request.session.session_key,
    })
```

**Common mistakes:**
- Using insecure session settings in production
- Not configuring HTTPS-only cookies
- Allowing JavaScript access to session cookies
- Not implementing session timeouts
- Missing session security monitoring
- Not handling session fixation attacks

**When to apply:**
- Configuring production Django settings
- Implementing security hardening
- During security audits and penetration testing
- When handling sensitive user data
- Building authentication systems