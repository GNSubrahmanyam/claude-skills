---
title: Performance Static File Optimization
impact: MEDIUM
impactDescription: Improves page load times and user experience
tags: django, performance, static-files, optimization
---

## Performance Static File Optimization

**Problem:**
Poor static file handling leads to slow page loads, unnecessary requests, and poor user experience. Static files not properly optimized can significantly impact website performance.

**Solution:**
Implement static file optimization techniques including compression, caching headers, CDN usage, and proper serving configuration.

**Examples:**

❌ **Wrong: Unoptimized static files**
```python
# settings.py - Basic static file config
STATIC_URL = '/static/'
STATIC_ROOT = '/var/www/static/'

# No optimization
# Files served uncompressed
# No caching headers
# No CDN usage
```

✅ **Correct: Optimized static file handling**
```python
# settings.py - Optimized static files
STATIC_URL = 'https://cdn.example.com/static/'
STATIC_ROOT = '/var/www/static/'

# Compression and optimization
STATICFILES_STORAGE = 'myapp.storage.OptimizedStaticFilesStorage'

# For development
if DEBUG:
    STATICFILES_DIRS = [
        BASE_DIR / 'static',
    ]

# For production with WhiteNoise
MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ... other middleware
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Custom storage for advanced optimization
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage
from django.templatetags.static import static as static_tag

class OptimizedStaticFilesStorage(ManifestStaticFilesStorage):
    """Advanced static file optimization"""

    def get_converters(self):
        converters = super().get_converters()
        # Add CSS minification, JS compression
        return converters

    def hashed_name(self, name, content=None, filename=None):
        """Custom hashing for cache busting"""
        # Add version-based hashing
        hashed_name = super().hashed_name(name, content, filename)
        # Add query parameter for cache busting
        if '?' not in hashed_name:
            hashed_name += '?v=1.0.0'
        return hashed_name

# Django Compressor for advanced optimization
# settings.py
INSTALLED_APPS = [
    'compressor',
    # ... other apps
]

STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    'compressor.finders.CompressorFinder',
]

COMPRESS_ENABLED = True
COMPRESS_CSS_FILTERS = [
    'compressor.filters.css_default.CssAbsoluteFilter',
    'compressor.filters.cssmin.CSSMinFilter',
]
COMPRESS_JS_FILTERS = [
    'compressor.filters.jsmin.JSMinFilter',
]

# Template usage
{% load compress %}
{% load static %}

{% compress css %}
<link rel="stylesheet" href="{% static 'css/bootstrap.css' %}">
<link rel="stylesheet" href="{% static 'css/app.css' %}">
{% endcompress %}

{% compress js %}
<script src="{% static 'js/jquery.js' %}"></script>
<script src="{% static 'js/app.js' %}"></script>
{% endcompress %}
```

**CDN Configuration:**
```python
# settings.py - CDN setup
AWS_S3_CUSTOM_DOMAIN = 'cdn.example.com'
AWS_STORAGE_BUCKET_NAME = 'my-static-files'
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'

# CloudFront CDN settings
AWS_CLOUDFRONT_KEY_ID = 'your-key-id'
AWS_CLOUDFRONT_KEY = 'your-private-key'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',  # 24 hours
}

# For multiple CDNs (regional)
CDN_URLS = {
    'us': 'https://us-cdn.example.com/static/',
    'eu': 'https://eu-cdn.example.com/static/',
    'asia': 'https://asia-cdn.example.com/static/',
}

def get_cdn_url(request):
    """Get CDN URL based on user location"""
    # Simple geo-based CDN selection
    user_ip = get_client_ip(request)
    # Use geoip library to determine region
    region = get_region_from_ip(user_ip)
    return CDN_URLS.get(region, CDN_URLS['us'])
```

**Cache Headers and Optimization:**
```python
# Custom middleware for cache headers
class StaticFileCacheMiddleware:
    """Add cache headers to static files"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if self._is_static_file(request.path):
            # Add cache headers for static files
            response['Cache-Control'] = 'public, max-age=31536000'  # 1 year
            response['Expires'] = 'Thu, 31 Dec 2037 23:55:55 GMT'

            # Add ETags for conditional requests
            if hasattr(response, 'content'):
                import hashlib
                etag = hashlib.md5(response.content).hexdigest()
                response['ETag'] = f'"{etag}"'

        return response

    def _is_static_file(self, path):
        """Check if path is a static file"""
        static_extensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2']
        return any(path.endswith(ext) for ext in static_extensions)

# Nginx configuration for static file optimization
# nginx.conf
server {
    listen 80;
    server_name example.com;

    # Static files with optimization
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Gzip compression
        gzip on;
        gzip_types text/css application/javascript image/svg+xml;

        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
    }

    # Media files with different caching
    location /media/ {
        alias /var/www/media/;
        expires 30d;
        add_header Cache-Control "public";

        # Progressive JPEG for images
        location ~* \.(jpg|jpeg)$ {
            expires 90d;
            more_set_headers "Cache-Control: public";
            # Enable progressive JPEG
            image_filter progressive;
        }
    }
}

# Apache configuration
# .htaccess
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE image/svg+xml
</IfModule>
```

**Preloading and Resource Hints:**
```django
<!-- templates/base.html -->
{% load static %}

<!DOCTYPE html>
<html>
<head>
    <!-- Preload critical resources -->
    <link rel="preload" href="{% static 'css/critical.css' %}" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <link rel="preload" href="{% static 'js/app.js' %}" as="script">

    <!-- DNS prefetch for external resources -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//cdn.example.com">

    <!-- Preconnect to external domains -->
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <!-- Regular stylesheets with noscript fallback -->
    <noscript><link rel="stylesheet" href="{% static 'css/critical.css' %}"></noscript>
</head>
<body>
    <!-- Above-the-fold content -->
    <div class="hero">
        <h1>Welcome</h1>
        <p>Critical content loads first</p>
    </div>

    <!-- Defer non-critical CSS -->
    <link rel="stylesheet" href="{% static 'css/main.css' %}" media="print" onload="this.media='all'">

    <!-- Critical JS inline, rest deferred -->
    <script>
        // Critical JavaScript inline
        function toggleMenu() {
            document.getElementById('nav').classList.toggle('open');
        }
    </script>
    <script src="{% static 'js/app.js' %}" defer></script>
</body>
</html>
```

**Common mistakes:**
- Not compressing static files
- Missing cache headers
- Not using CDN for global distribution
- Loading all CSS/JS on every page
- Not optimizing images
- Blocking render with synchronous loading

**When to apply:**
- Optimizing page load times
- Reducing server bandwidth usage
- Improving user experience globally
- Preparing for high-traffic scenarios
- During performance optimization