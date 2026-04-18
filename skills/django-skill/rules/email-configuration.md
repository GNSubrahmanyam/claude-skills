# Email Sending Configuration (MEDIUM)

**Impact:** MEDIUM - Ensures reliable email delivery and proper configuration

**Problem:**
Poor email configuration leads to undelivered messages, security vulnerabilities, and poor user experience. Email sending without proper setup can expose sensitive information and fail silently.

**Solution:**
Configure Django's email backend properly with secure credentials, proper error handling, and appropriate delivery methods.

**Examples:**

❌ **Wrong: Poor email configuration**
```python
# settings.py - INSECURE
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'myemail@gmail.com'  # Exposed in code!
EMAIL_HOST_PASSWORD = 'mypassword123'  # Security risk!

# No error handling, no templates
```

✅ **Correct: Secure email configuration**
```python
# settings.py - SECURE
import os

# Email configuration
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'False').lower() == 'true'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')

# Additional security settings
EMAIL_SSL_CERTFILE = os.environ.get('EMAIL_SSL_CERTFILE')
EMAIL_SSL_KEYFILE = os.environ.get('EMAIL_SSL_KEYFILE')

# Email timeout and retry settings
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', 30))

# Default email settings
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@example.com')
SERVER_EMAIL = os.environ.get('SERVER_EMAIL', 'server@example.com')

# For development - console backend
if os.environ.get('DJANGO_ENV') == 'development':
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# For testing - in-memory backend
if 'test' in sys.argv:
    EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
```

**Email Sending Best Practices:**
```python
# utils.py - Email utilities
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

def send_welcome_email(user):
    """Send welcome email to new user"""
    subject = 'Welcome to Our Platform!'

    # Context for templates
    context = {
        'user': user,
        'login_url': settings.SITE_URL + '/login/',
        'site_name': settings.SITE_NAME,
    }

    # Render HTML and text versions
    html_message = render_to_string('emails/welcome_email.html', context)
    text_message = render_to_string('emails/welcome_email.txt', context)

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,  # Plain text version
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.attach_alternative(html_message, "text/html")
        email.send()

        logger.info(f"Welcome email sent to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {e}")
        return False

def send_password_reset_email(user, reset_token):
    """Send password reset email"""
    subject = f'Password Reset for {settings.SITE_NAME}'

    context = {
        'user': user,
        'reset_url': f"{settings.SITE_URL}/reset-password/{reset_token}/",
        'site_name': settings.SITE_NAME,
        'valid_hours': 24,
    }

    try:
        send_mail(
            subject=subject,
            message=render_to_string('emails/password_reset.txt', context),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=render_to_string('emails/password_reset.html', context),
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False

def send_bulk_notification(users, subject, message):
    """Send notification to multiple users with rate limiting"""
    from django.core.mail import get_connection

    # Use a separate connection for bulk emails
    connection = get_connection(
        backend=settings.EMAIL_BACKEND,
        fail_silently=False,
    )

    emails = []
    for user in users:
        email = EmailMultiAlternatives(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
            connection=connection
        )
        emails.append(email)

    # Send in batches to avoid overwhelming the email server
    batch_size = 50
    sent_count = 0

    for i in range(0, len(emails), batch_size):
        batch = emails[i:i + batch_size]
        for email in batch:
            try:
                email.send()
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send email to {email.to}: {e}")

        # Small delay between batches
        if i + batch_size < len(emails):
            time.sleep(1)

    return sent_count
```

**Email Templates and Management:**
```python
<!-- templates/emails/base.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; color: #666; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{% block subject %}{% endblock %}</h1>
    </div>
    <div class="content">
        {% block content %}{% endblock %}
    </div>
    <div class="footer">
        <p>This email was sent by {{ site_name }}. If you no longer wish to receive these emails, you can <a href="{% block unsubscribe_url %}#{% endblock %}">unsubscribe</a>.</p>
    </div>
</body>
</html>

<!-- templates/emails/welcome_email.html -->
{% extends "emails/base.html" %}

{% block subject %}Welcome to {{ site_name }}!{% endblock %}

{% block content %}
<h2>Hello {{ user.get_full_name|default:user.username }}!</h2>

<p>Welcome to {{ site_name }}! We're excited to have you join our community.</p>

<p>To get started, you can:</p>
<ul>
    <li><a href="{{ login_url }}" class="button">Sign In to Your Account</a></li>
    <li>Explore our features</li>
    <li>Customize your profile</li>
</ul>

<p>If you have any questions, feel free to contact our support team.</p>

<p>Best regards,<br>The {{ site_name }} Team</p>
{% endblock %}

{% block unsubscribe_url %}{{ site_url }}/unsubscribe/?email={{ user.email }}{% endblock %}
```

**Email Testing and Monitoring:**
```python
# tests/test_emails.py
from django.test import TestCase
from django.core import mail
from django.test.utils import override_settings

class EmailTestCase(TestCase):
    """Test email functionality"""

    def setUp(self):
        # Ensure clean email outbox
        mail.outbox = []

    def test_welcome_email_sent(self):
        """Test welcome email is sent correctly"""
        from .utils import send_welcome_email

        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User'
        )

        result = send_welcome_email(user)

        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox[0]
        self.assertEqual(email.subject, 'Welcome to Our Platform!')
        self.assertEqual(email.to, ['test@example.com'])
        self.assertIn('Welcome Test User!', email.body)
        self.assertIn('<h2>Hello Test User!</h2>', email.alternatives[0][0])

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_password_reset_email(self):
        """Test password reset email"""
        from .utils import send_password_reset_email

        user = User.objects.create_user('testuser', 'test@example.com')
        reset_token = 'abc123reset'

        result = send_password_reset_email(user, reset_token)

        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)

        email = mail.outbox[0]
        self.assertIn('Password Reset', email.subject)
        self.assertIn(reset_token, email.body)

    def test_bulk_email_sending(self):
        """Test bulk email functionality"""
        from .utils import send_bulk_notification

        users = []
        for i in range(10):
            users.append(User.objects.create_user(
                f'user{i}', f'user{i}@example.com'
            ))

        sent_count = send_bulk_notification(
            users,
            'Test Notification',
            'This is a test message'
        )

        self.assertEqual(sent_count, 10)
        self.assertEqual(len(mail.outbox), 10)
```

**Common mistakes:**
- Hardcoding email credentials in code
- Not using HTML and plain text versions
- Missing proper error handling and logging
- Not testing email functionality
- Sending emails synchronously in views
- Not configuring email timeouts and retries

**When to apply:**
- Implementing user registration and password reset
- Building notification systems
- Creating marketing email campaigns
- Setting up administrative alerts
- During user communication features