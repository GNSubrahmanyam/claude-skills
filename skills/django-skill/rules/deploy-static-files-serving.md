# Deployment Static Files Serving (MEDIUM)

**Impact:** MEDIUM - Ensures reliable asset delivery and optimal performance

**Problem:**
Incorrect static file serving in production leads to broken CSS/JavaScript, slow page loads, and poor user experience. Static files not properly configured can cause 404 errors or security vulnerabilities.

**Solution:**
Configure proper static file serving for production with CDNs, compression, and caching headers.

**Examples:**

❌ **Wrong: Improper static file serving**
```python
# settings.py - Wrong for production
DEBUG = True  # Don't serve static files in production!

STATIC_URL = '/static/'
STATIC_ROOT = '/var/www/static/'

# No CDN, no compression, no caching
# Django will try to serve static files - SLOW!
```

✅ **Correct: Production static file serving**
```python
# settings.py - Production ready
import os

DEBUG = False
STATIC_URL = os.environ.get('STATIC_URL', 'https://cdn.example.com/static/')
STATIC_ROOT = '/var/www/static/'

# Use WhiteNoise for simple deployments
MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ... other middleware
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# For CDN with CloudFront/S3
AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')
if AWS_S3_CUSTOM_DOMAIN:
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Custom storage for advanced features
from django.contrib.staticfiles.storage import ManifestStaticFilesStorage

class OptimizedStaticFilesStorage(ManifestStaticFilesStorage):
    """Enhanced static file storage"""

    def get_converters(self):
        converters = super().get_converters()
        # Add compression, minification
        return converters

    def hashed_name(self, name, content=None, filename=None):
        """Add version-based cache busting"""
        hashed_name = super().hashed_name(name, content, filename)
        # Add build version for cache busting
        version = os.environ.get('BUILD_VERSION', '1.0.0')
        if '?' not in hashed_name:
            hashed_name += f'?v={version}'
        return hashed_name
```

**WhiteNoise Configuration:**
```python
# settings.py - WhiteNoise setup
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# WhiteNoise settings
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = DEBUG

# Custom WhiteNoise storage
from whitenoise.storage import CompressedManifestStaticFilesStorage

class CustomWhiteNoiseStorage(CompressedManifestStaticFilesStorage):
    """Custom WhiteNoise storage with additional features"""

    def get_converters(self):
        converters = super().get_converters()
        # Add custom compression
        return converters

    def post_processing(self, paths, **options):
        """Add post-processing for static files"""
        super_processed = super().post_processing(paths, **options)

        # Add custom processing here
        # e.g., image optimization, additional compression

        return super_processed
```

**Nginx Configuration for Static Files:**
```nginx
# nginx.conf - Static file serving
server {
    listen 80;
    server_name example.com www.example.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Static files - long cache
    location /static/ {
        alias /var/www/static/;

        # Cache for 1 year
        expires 1y;
        add_header Cache-Control "public, immutable";

        # Compression
        gzip on;
        gzip_types
            text/css
            application/javascript
            application/json
            image/svg+xml
            font/woff2;

        # Security for fonts
        location ~* \.(woff|woff2|ttf|eot)$ {
            add_header Access-Control-Allow-Origin *;
            expires 1y;
        }

        # Prevent access to source maps in production
        location ~* \.map$ {
            deny all;
            return 404;
        }
    }

    # Media files - shorter cache
    location /media/ {
        alias /var/www/media/;
        expires 30d;
        add_header Cache-Control "public";

        # Image optimization
        location ~* \.(jpg|jpeg|png|gif|webp)$ {
            expires 90d;
            # Enable progressive loading
            image_filter progressive;
        }
    }

    # Django application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Handle static files during development
        # Remove in production!
        location /static/ {
            proxy_pass http://127.0.0.1:8000/static/;
        }
    }
}
```

**CDN Configuration with CloudFront:**
```python
# settings.py - CloudFront CDN
import os

# S3 bucket for static files
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')

if AWS_S3_CUSTOM_DOMAIN:
    # Use CloudFront CDN
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
    STATICFILES_STORAGE = 'myapp.storage.CloudFrontStorage'

# Custom CloudFront storage
from storages.backends.s3boto3 import S3Boto3Storage

class CloudFrontStorage(S3Boto3Storage):
    """S3 storage with CloudFront invalidation"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cloudfront_distribution_id = os.environ.get('CLOUDFRONT_DISTRIBUTION_ID')

    def save(self, name, content, max_length=None):
        """Save file and invalidate CloudFront cache"""
        result = super().save(name, content, max_length)

        # Invalidate CloudFront cache for this file
        if self.cloudfront_distribution_id:
            self._invalidate_cloudfront([f'/{self.location}/{name}'])

        return result

    def _invalidate_cloudfront(self, paths):
        """Invalidate CloudFront paths"""
        import boto3

        client = boto3.client('cloudfront')
        client.create_invalidation(
            DistributionId=self.cloudfront_distribution_id,
            InvalidationBatch={
                'CallerReference': str(time.time()),
                'Paths': {
                    'Quantity': len(paths),
                    'Items': paths
                }
            }
        )
```

**Deployment Commands:**
```bash
# Collect and optimize static files
python manage.py collectstatic --noinput --clear

# With Django Compressor
python manage.py compress --force

# Verify static files
python manage.py collectstatic --dry-run

# Post-deployment verification
curl -I https://example.com/static/css/main.css
# Should return 200 with proper cache headers

# Test static file serving
curl -H "Accept-Encoding: gzip" https://example.com/static/js/app.js
# Should return gzipped content
```

**Static File Security:**
```python
# settings.py - Security for static files
# Prevent access to sensitive static files
import os

class SecureStaticFilesStorage(ManifestStaticFilesStorage):
    """Secure static file storage"""

    def get_available_name(self, name, max_length=None):
        """Prevent access to sensitive files"""
        sensitive_patterns = [
            '.env',
            'secrets',
            'config',
            'private',
        ]

        if any(pattern in name.lower() for pattern in sensitive_patterns):
            raise ValueError(f"Cannot serve sensitive file: {name}")

        return super().get_available_name(name, max_length)

    def post_processing(self, paths, **options):
        """Remove sensitive files from processing"""
        processed = {}
        for name in paths:
            if not self._is_sensitive_file(name):
                processed[name] = self.hashed_name(name, paths[name])
        return processed

    def _is_sensitive_file(self, name):
        """Check if file should not be served"""
        sensitive_extensions = ['.key', '.pem', '.env', '.secret']
        return any(name.endswith(ext) for ext in sensitive_extensions)
```

**Common mistakes:**
- Serving static files through Django in production
- Missing cache headers for static files
- Not using compression for text assets
- Hardcoding static URLs
- Exposing sensitive files through static serving
- Not testing static file serving after deployment

**When to apply:**
- Configuring production web servers
- Setting up CDNs for global distribution
- Optimizing page load performance
- During deployment and infrastructure setup
- Implementing security for static assets