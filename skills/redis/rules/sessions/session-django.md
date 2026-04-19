# Django Session Management (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Scalable session storage for Django applications

**Problem:**
Django's default database session backend causes performance issues and scalability problems in production. File-based sessions don't work in multi-server deployments.

**Solution:**
Configure Django to use Redis for session storage with proper security, expiration, and performance optimizations.

❌ **Wrong: Database sessions in production**
```python
# settings.py - Default database sessions (slow!)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
```

✅ **Correct: Redis session configuration**
```python
# settings.py - Redis session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'

CACHES = {
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/2',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 20,
                'decode_responses': True,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
        },
        'KEY_PREFIX': 'django_sessions',
        'TIMEOUT': None,  # Sessions use their own timeout
    }
}

# Session security settings
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
SESSION_COOKIE_SAMESITE = 'Strict'  # CSRF protection
SESSION_EXPIRE_AT_BROWSER_CLOSE = True  # Expire on browser close
SESSION_COOKIE_AGE = 3600  # 1 hour timeout
SESSION_SAVE_EVERY_REQUEST = False  # Don't save unchanged sessions

# Session serialization
SESSION_SERIALIZER = 'django.contrib.sessions.serializers.JSONSerializer'
```

**Django session middleware configuration:**
```python
# settings.py - Session middleware (usually default)
MIDDLEWARE = [
    # ... other middleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # ... other middleware
]
```

**Custom session backend for advanced features:**
```python
# custom_session_backend.py
from django.contrib.sessions.backends.cache import SessionStore as CacheSessionStore
from django.core.cache import cache
import json
import hashlib

class RedisSessionStore(CacheSessionStore):
    """Custom Redis session store with additional features"""

    def __init__(self, session_key=None):
        super().__init__(session_key)
        self._cache = cache

    def load(self):
        """Load session data with error handling"""
        try:
            session_data = self._cache.get(self.cache_key)
            if session_data is None:
                return {}
            return json.loads(session_data)
        except (ValueError, TypeError):
            # Corrupted session data
            self._cache.delete(self.cache_key)
            return {}

    def save(self, must_create=False):
        """Save session with TTL and compression"""
        session_data = json.dumps(self._session)

        # Set session TTL based on cookie age
        ttl = getattr(self, '_session_cookie_age', 3600)

        self._cache.set(
            self.cache_key,
            session_data,
            timeout=ttl
        )

    def delete(self, session_key=None):
        """Delete session and cleanup"""
        if session_key is None:
            session_key = self.session_key
        cache_key = self.cache_key_prefix + session_key
        self._cache.delete(cache_key)

    def exists(self, session_key):
        """Check if session exists"""
        cache_key = self.cache_key_prefix + session_key
        return self._cache.has_key(cache_key)

    # Additional methods for session management
    def get_session_metadata(self, session_key):
        """Get session metadata (TTL, size, etc.)"""
        cache_key = self.cache_key_prefix + session_key

        # Get TTL
        ttl = self._cache.ttl(cache_key)

        # Get size (approximate)
        data = self._cache.get(cache_key)
        size = len(data) if data else 0

        return {
            'ttl': ttl,
            'size': size,
            'exists': ttl is not None
        }

    def extend_session(self, session_key, additional_seconds=3600):
        """Extend session TTL"""
        cache_key = self.cache_key_prefix + session_key
        self._cache.expire(cache_key, additional_seconds)

    def cleanup_expired_sessions(self):
        """Redis automatically expires sessions, but this could trigger cleanup"""
        # Redis handles expiration automatically
        pass
```

**Session security best practices:**
```python
# settings.py - Advanced session security
# Use secure random session keys
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

# Session configuration for production
SESSION_ENGINE = 'myapp.backends.custom_session_backend.RedisSessionStore'

# Security headers (complement session security)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# CSRF protection
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'

# Rate limiting for session creation
# Implement middleware to prevent session spam
```

**Session monitoring and analytics:**
```python
# session_monitor.py
from django.core.cache import cache
from django.contrib.sessions.models import Session
import time

class SessionMonitor:
    """Monitor session usage and performance"""

    @staticmethod
    def get_active_sessions_count():
        """Get count of active sessions"""
        # This requires custom tracking since Redis doesn't provide direct count
        # Implement by maintaining a separate counter
        return cache.get('active_sessions_count', 0)

    @staticmethod
    def track_session_activity(session_key, user_id=None, user_agent=None):
        """Track session activity for analytics"""
        activity_key = f"session_activity:{session_key}"

        activity_data = {
            'last_activity': time.time(),
            'user_id': user_id,
            'user_agent': user_agent,
            'ip_address': None  # Would need middleware to set this
        }

        cache.set(activity_key, activity_data, timeout=3600)  # 1 hour

    @staticmethod
    def get_session_stats():
        """Get session statistics"""
        # Get Redis info for session cache
        from django_redis import get_redis_connection
        redis_client = get_redis_connection('sessions')

        info = redis_client.info('stats')
        memory_info = redis_client.info('memory')

        return {
            'total_keys': info.get('total_connections_received', 0),
            'memory_used': memory_info.get('used_memory_human', 'unknown'),
            'hit_rate': calculate_hit_rate(info),
            'evicted_keys': info.get('evicted_keys', 0)
        }

def calculate_hit_rate(info):
    """Calculate session cache hit rate"""
    hits = info.get('keyspace_hits', 0)
    misses = info.get('keyspace_misses', 0)
    total = hits + misses
    return f"{(hits / total * 100):.1f}%" if total > 0 else "0%"

# Middleware for session tracking
class SessionTrackingMiddleware:
    """Middleware to track session activity"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Track session activity
        if hasattr(request, 'session') and request.session.session_key:
            SessionMonitor.track_session_activity(
                request.session.session_key,
                getattr(request.user, 'id', None),
                request.META.get('HTTP_USER_AGENT')
            )

        return response
```

**Session backup and recovery:**
```python
# session_backup.py
import json
from django.core.management.base import BaseCommand
from django.core.cache import cache
from django_redis import get_redis_connection

class Command(BaseCommand):
    help = 'Backup and restore sessions'

    def add_arguments(self, parser):
        parser.add_argument('--backup', action='store_true', help='Backup sessions')
        parser.add_argument('--restore', type=str, help='Restore sessions from file')

    def handle(self, *args, **options):
        if options['backup']:
            self.backup_sessions()
        elif options['restore']:
            self.restore_sessions(options['restore'])

    def backup_sessions(self):
        """Backup all sessions to JSON file"""
        redis_client = get_redis_connection('sessions')
        sessions_data = {}

        # Get all session keys
        keys = redis_client.keys('django_sessions:*')
        for key_bytes in keys:
            key = key_bytes.decode()
            data = redis_client.get(key)
            ttl = redis_client.ttl(key)

            if data and ttl > 0:
                sessions_data[key] = {
                    'data': data.decode(),
                    'ttl': ttl
                }

        # Save to file
        with open('session_backup.json', 'w') as f:
            json.dump(sessions_data, f, indent=2)

        self.stdout.write(f"Backed up {len(sessions_data)} sessions")

    def restore_sessions(self, filename):
        """Restore sessions from backup file"""
        redis_client = get_redis_connection('sessions')

        with open(filename, 'r') as f:
            sessions_data = json.load(f)

        restored_count = 0
        for key, session_info in sessions_data.items():
            redis_client.set(key, session_info['data'], ex=session_info['ttl'])
            restored_count += 1

        self.stdout.write(f"Restored {restored_count} sessions")
```

**Common mistakes:**
- Using database sessions in production
- Not configuring secure session cookies
- Missing session expiration settings
- Not monitoring session cache performance
- Forgetting to backup sessions during deployments

**When to apply:**
- Production Django deployments
- High-traffic web applications
- Applications requiring session persistence
- Multi-server deployments
- Session-heavy applications (e-commerce, social platforms)