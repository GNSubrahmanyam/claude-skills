---
title: Authentication Password Security
impact: MEDIUM-HIGH
impactDescription: Protects user accounts from unauthorized access
tags: django, authentication, security, passwords
---

## Authentication Password Security

**Problem:**
Weak password policies, improper password storage, or poor password reset mechanisms can lead to compromised user accounts and data breaches.

**Solution:**
Implement strong password policies, use Django's secure password hashing, and provide secure password reset functionality.

**Examples:**

❌ **Wrong: Weak password security**
```python
# settings.py - WEAK
AUTH_PASSWORD_VALIDATORS = []  # No validation!

# Manual password checking (INSECURE)
def login_view(request):
    user = User.objects.get(username=request.POST['username'])
    if user.password == request.POST['password']:  # Plain text comparison!
        # Log user in
        pass

# Insecure password reset
def reset_password(request):
    user = User.objects.get(email=request.POST['email'])
    new_password = "password123"  # Weak default password!
    user.set_password(new_password)  # Not using set_password properly
    user.save()
    # Email password in plain text!
    send_mail("Your password", new_password, "admin@example.com", [user.email])
```

✅ **Correct: Strong password security**
```python
# settings.py - SECURE
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
        'OPTIONS': {
            'user_attributes': ('username', 'first_name', 'last_name', 'email'),
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom password validator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class CustomPasswordValidator:
    """Custom password strength validator"""

    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(_("Password must contain at least one uppercase letter."))
        if not re.search(r'[a-z]', password):
            raise ValidationError(_("Password must contain at least one lowercase letter."))
        if not re.search(r'\d', password):
            raise ValidationError(_("Password must contain at least one digit."))
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(_("Password must contain at least one special character."))

    def get_help_text(self):
        return _("Your password must contain at least 12 characters, including uppercase, lowercase, numbers, and special characters.")

# Add to AUTH_PASSWORD_VALIDATORS
AUTH_PASSWORD_VALIDATORS.append({
    'NAME': 'myapp.validators.CustomPasswordValidator',
})
```

**Password reset implementation:**
```python
# urls.py
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('password_reset/', auth_views.PasswordResetView.as_view(
        template_name='registration/password_reset_form.html',
        email_template_name='registration/password_reset_email.html',
        subject_template_name='registration/password_reset_subject.txt'
    ), name='password_reset'),

    path('password_reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='registration/password_reset_done.html'
    ), name='password_reset_done'),

    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='registration/password_reset_confirm.html'
    ), name='password_reset_confirm'),

    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(
        template_name='registration/password_reset_complete.html'
    ), name='password_reset_complete'),
]

# Custom password reset email
# templates/registration/password_reset_email.html
{% load i18n %}
{% autoescape off %}
{% trans "You're receiving this email because you requested a password reset for your user account at" %} {{ site_name }}.

{% trans "Please go to the following page and choose a new password:" %}
{% block reset_link %}
{{ protocol }}://{{ domain }}{% url 'password_reset_confirm' uidb64=uid token=token %}
{% endblock %}

{% trans "Your username, in case you've forgotten:" %} {{ user.get_username }}

{% trans "Thanks for using our site!" %}

{% blocktrans %}The {{ site_name }} team{% endblocktrans %}
{% endautoescape %}
```

**Password change views:**
```python
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash

@login_required
def change_password(request):
    """Secure password change for authenticated users"""
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            # Keep user logged in after password change
            update_session_auth_hash(request, user)
            messages.success(request, 'Your password was successfully updated!')
            return redirect('profile')
        else:
            messages.error(request, 'Please correct the error below.')
    else:
        form = PasswordChangeForm(request.user)

    return render(request, 'accounts/change_password.html', {
        'form': form
    })

# Password strength checking in forms
from django import forms
import re

class StrongPasswordMixin:
    """Mixin to add password strength validation"""

    def clean_new_password2(self):
        password1 = self.cleaned_data.get('new_password1')
        password2 = self.cleaned_data.get('new_password2')

        if password1 and password2:
            if password1 != password2:
                raise forms.ValidationError("The two password fields didn't match.")

            # Additional strength checks
            if len(password1) < 12:
                raise forms.ValidationError("Password must be at least 12 characters long.")

            if not re.search(r'[A-Z]', password1):
                raise forms.ValidationError("Password must contain at least one uppercase letter.")

            if not re.search(r'[a-z]', password1):
                raise forms.ValidationError("Password must contain at least one lowercase letter.")

            if not re.search(r'\d', password1):
                raise forms.ValidationError("Password must contain at least one number.")

        return password2

class CustomPasswordChangeForm(StrongPasswordMixin, PasswordChangeForm):
    """Enhanced password change form with strength validation"""
    pass
```

**Common mistakes:**
- Not using Django's password validators
- Storing passwords in plain text
- Using weak password reset tokens
- Not updating session after password change
- Sending passwords in email
- Not enforcing password complexity requirements

**When to apply:**
- Setting up user authentication systems
- Implementing password reset functionality
- During security hardening
- When configuring user account management
- During security audits and compliance