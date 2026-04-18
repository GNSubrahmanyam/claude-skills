# Admin Security (MEDIUM)

**Impact:** MEDIUM - Protects administrative access and prevents unauthorized admin actions

**Problem:**
Django admin provides powerful data manipulation capabilities that can be dangerous if not properly secured. Default admin settings may expose sensitive data or allow unauthorized access.

**Solution:**
Implement proper admin security measures including access restrictions, audit logging, and secure configuration.

**Examples:**

❌ **Wrong: Insecure admin configuration**
```python
# settings.py - INSECURE
SECRET_KEY = 'insecure-secret-key'  # Exposed!

# Admin accessible without restrictions
# No admin access controls

# Debug mode in production
DEBUG = True

# Admin URL not customized
# Default: /admin/ - easily guessable
```

✅ **Correct: Secure admin configuration**
```python
# settings.py - SECURE
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']

# Admin access restrictions
ADMIN_ENABLED = os.environ.get('ADMIN_ENABLED', 'False').lower() == 'true'

# Custom admin URL (change from default)
# main urls.py
if ADMIN_ENABLED:
    urlpatterns = [
        path('secret-admin-panel/', admin.site.urls),  # Non-obvious URL
        # ... other URLs
    ]

# Admin security middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # ... other middleware
]

# Admin access control
from django.contrib.admin.sites import AdminSite
from django.http import Http404

class SecureAdminSite(AdminSite):
    """Secure admin site with additional restrictions"""

    def has_permission(self, request):
        """Additional permission checks"""
        # Basic permission check
        if not super().has_permission(request):
            return False

        # IP whitelist for admin access
        allowed_ips = os.environ.get('ADMIN_ALLOWED_IPS', '').split(',')
        if allowed_ips and allowed_ips != ['']:
            client_ip = self._get_client_ip(request)
            if client_ip not in allowed_ips:
                return False

        # Time-based restrictions (business hours only)
        from datetime import datetime
        now = datetime.now()
        if not (9 <= now.hour <= 17):  # Business hours only
            return False

        # Additional user checks
        if request.user.is_authenticated:
            # Require 2FA for admin access
            if not hasattr(request.user, 'two_factor_enabled') or not request.user.two_factor_enabled:
                return False

        return True

    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def login(self, request, extra_context=None):
        """Custom login with additional security"""
        # Log admin login attempts
        logger.info(f"Admin login attempt from {self._get_client_ip(request)} for user: {request.POST.get('username', 'unknown')}")

        # Rate limiting for login attempts
        cache_key = f"admin_login_attempts_{self._get_client_ip(request)}"
        attempts = cache.get(cache_key, 0)

        if attempts >= 5:  # Max 5 attempts per 15 minutes
            logger.warning(f"Admin login rate limit exceeded for IP: {self._get_client_ip(request)}")
            return self._rate_limit_response()

        response = super().login(request, extra_context)

        if request.method == 'POST':
            if response.status_code == 302:  # Successful login
                cache.delete(cache_key)  # Reset attempts
                logger.info(f"Successful admin login for user: {request.user}")
            else:  # Failed login
                cache.set(cache_key, attempts + 1, 60 * 15)  # 15 minutes
                logger.warning(f"Failed admin login attempt for user: {request.POST.get('username', 'unknown')}")

        return response

    def _rate_limit_response(self):
        """Return rate limit response"""
        from django.http import HttpResponseForbidden
        from django.template import Template, Context

        template = Template("""
        <html><body>
        <h1>Access Denied</h1>
        <p>Too many login attempts. Please try again later.</p>
        </body></html>
        """)
        return HttpResponseForbidden(template.render(Context()))

# Register secure admin
secure_admin = SecureAdminSite(name='secure_admin')
# Register models with secure admin instead of default
```

**Admin model security:**
```python
# admin.py
from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.contrib import messages
from .models import SensitiveData

class SensitiveDataAdmin(admin.ModelAdmin):
    """Admin for sensitive data with additional security"""

    # Limit what fields are displayed and editable
    list_display = ['masked_identifier', 'category', 'created_date']
    readonly_fields = ['sensitive_field1', 'sensitive_field2']

    # Restrict access to specific users
    def has_view_permission(self, request, obj=None):
        # Only superusers or users in 'security' group
        if request.user.is_superuser:
            return True
        return request.user.groups.filter(name='security').exists()

    def has_change_permission(self, request, obj=None):
        # Even more restrictive for editing
        if request.user.is_superuser and request.user.groups.filter(name='security_admin').exists():
            return True
        return False

    def has_delete_permission(self, request, obj=None):
        # Most restrictive - only superusers
        return request.user.is_superuser

    def masked_identifier(self, obj):
        """Show masked identifier instead of real data"""
        return f"***{obj.identifier[-4:]}"  # Show last 4 characters
    masked_identifier.short_description = 'Identifier'

    # Audit logging for sensitive operations
    def save_model(self, request, obj, form, change):
        """Log all changes to sensitive data"""
        action = 'changed' if change else 'created'
        logger.info(f"User {request.user} {action} sensitive data {obj.id}")
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        """Log deletions of sensitive data"""
        logger.warning(f"User {request.user} deleted sensitive data {obj.id}")
        super().delete_model(request, obj)

    # Custom actions with logging
    actions = ['secure_export']

    def secure_export(self, request, queryset):
        """Export with additional security checks"""
        # Log the export action
        logger.info(f"User {request.user} exported {queryset.count()} sensitive records")

        # Additional authorization check
        if not self._can_export(request.user):
            self.message_user(request, "You don't have permission to export this data.")
            return

        # Proceed with export...
        return self._perform_export(queryset)

    def _can_export(self, user):
        """Check if user can export data"""
        return user.is_superuser or user.groups.filter(name='data_exporters').exists()

    secure_export.short_description = 'Securely export selected records'
```

**Admin audit logging:**
```python
# middleware.py or admin.py
import logging
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION

logger = logging.getLogger('admin_audit')

class AdminAuditMiddleware:
    """Audit all admin actions"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Log admin actions
        if request.path.startswith('/admin/') and request.user.is_staff:
            self._log_admin_action(request)

        return response

    def _log_admin_action(self, request):
        """Log admin actions for audit purposes"""
        action = 'viewed'
        if request.method in ['POST', 'PUT', 'PATCH']:
            action = 'modified'
        elif request.method == 'DELETE':
            action = 'deleted'

        # Don't log sensitive data in the URL
        safe_path = self._sanitize_path(request.path)

        logger.info(f"Admin {action}: {request.user} accessed {safe_path} from {self._get_client_ip(request)}")

    def _sanitize_path(self, path):
        """Remove sensitive data from paths"""
        import re
        # Remove IDs and sensitive parameters
        path = re.sub(r'/(\d+)/', '/[ID]/', path)
        return path

    def _get_client_ip(self, request):
        """Get client IP"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
```

**Common mistakes:**
- Using default admin URL (/admin/)
- Not restricting admin access by IP
- Missing audit logging for admin actions
- Exposing sensitive data in admin interface
- Not implementing proper permission checks
- Leaving debug mode enabled in production

**When to apply:**
- Configuring production admin access
- Implementing admin access controls
- Adding audit logging for admin actions
- Securing sensitive data in admin
- During security hardening and compliance