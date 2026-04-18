# Authentication Social Auth (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Improves user experience and registration conversion

**Problem:**
Complex registration forms can deter users from signing up. Social authentication provides a familiar, quick way to register and login while maintaining security.

**Solution:**
Integrate social authentication providers while maintaining security and user experience best practices.

**Examples:**

❌ **Wrong: Complex registration only**
```python
# Only traditional registration - high friction
class RegistrationForm(forms.ModelForm):
    password1 = forms.CharField(widget=forms.PasswordInput)
    password2 = forms.CharField(widget=forms.PasswordInput)
    email = forms.EmailField()
    username = forms.CharField()
    first_name = forms.CharField()
    last_name = forms.CharField()
    date_of_birth = forms.DateField()
    # Many more fields...

    # Complex validation...
    def clean_password2(self):
        # Password confirmation logic
        pass

    def clean_email(self):
        # Email uniqueness validation
        pass
```

✅ **Correct: Social authentication integration**
```python
# Using django-allauth for social auth
# settings.py
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.messages',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.github',
    'allauth.socialaccount.providers.facebook',
    # ... other apps
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

# django-allauth settings
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_UNIQUE_EMAIL = True

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    },
    'github': {
        'SCOPE': ['user:email'],
    },
    'facebook': {
        'METHOD': 'oauth2',
        'SCOPE': ['email', 'public_profile'],
        'AUTH_PARAMS': {'auth_type': 'reauthenticate'},
        'INIT_PARAMS': {'cookie': True},
        'FIELDS': [
            'id',
            'email',
            'name',
            'first_name',
            'last_name',
            'verified',
            'locale',
            'timezone',
            'link',
            'gender',
            'updated_time',
        ],
        'EXCHANGE_TOKEN': True,
        'LOCALE_FUNC': 'path.to.callable',
        'VERIFIED_EMAIL': False,
        'VERSION': 'v2.12',
    }
}

# URLs
from allauth.socialaccount.providers.oauth2.urls import default_urlpatterns

urlpatterns = [
    path('accounts/', include('allauth.urls')),
    # ... other URLs
]
```

**Social auth pipeline customization:**
```python
# settings.py
SOCIALACCOUNT_ADAPTER = 'myapp.adapters.CustomSocialAccountAdapter'
SOCIALACCOUNT_AUTO_SIGNUP = True

# adapters.py
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Custom social account adapter"""

    def pre_social_login(self, request, sociallogin):
        """Called before social login"""
        # Check if user already exists with this email
        User = get_user_model()
        email = sociallogin.account.extra_data.get('email')

        if email:
            try:
                user = User.objects.get(email=email)
                # Connect social account to existing user
                sociallogin.connect(request, user)
            except User.DoesNotExist:
                pass

    def save_user(self, request, sociallogin, form=None):
        """Save user from social login"""
        user = super().save_user(request, sociallogin, form)

        # Additional user setup
        if sociallogin.account.provider == 'google':
            # Set additional fields from Google
            user.first_name = sociallogin.account.extra_data.get('given_name', '')
            user.last_name = sociallogin.account.extra_data.get('family_name', '')
            user.save()

        return user

    def populate_user(self, request, sociallogin, data):
        """Populate user data from social provider"""
        user = super().populate_user(request, sociallogin, data)

        # Set username if not provided
        if not user.username:
            user.username = self.generate_username(user.first_name, user.last_name)

        return user

    def generate_username(self, first_name, last_name):
        """Generate unique username from name"""
        base_username = f"{first_name.lower()}.{last_name.lower()}"
        username = base_username
        counter = 1

        User = get_user_model()
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        return username
```

**Templates for social login:**
```django
<!-- templates/account/login.html -->
{% extends "base.html" %}
{% load socialaccount %}

{% block content %}
<div class="login-container">
    <h2>Sign In</h2>

    <!-- Traditional login form -->
    <form method="post">
        {% csrf_token %}
        {{ form.as_p }}
        <button type="submit">Sign In</button>
    </form>

    <div class="social-login">
        <p>Or sign in with:</p>

        <!-- Social login buttons -->
        <a href="{% provider_login_url 'google' %}" class="btn-google">
            <i class="fab fa-google"></i> Sign in with Google
        </a>

        <a href="{% provider_login_url 'github' %}" class="btn-github">
            <i class="fab fa-github"></i> Sign in with GitHub
        </a>

        <a href="{% provider_login_url 'facebook' %}" class="btn-facebook">
            <i class="fab fa-facebook"></i> Sign in with Facebook
        </a>
    </div>

    <p>Don't have an account? <a href="{% url 'account_signup' %}">Sign up</a></p>
</div>
{% endblock %}

<!-- templates/account/signup.html -->
{% extends "base.html" %}
{% load socialaccount %}

{% block content %}
<div class="signup-container">
    <h2>Sign Up</h2>

    <!-- Quick social signup -->
    <div class="social-signup">
        <a href="{% provider_login_url 'google' %}" class="btn-google">
            <i class="fab fa-google"></i> Sign up with Google
        </a>

        <a href="{% provider_login_url 'github' %}" class="btn-github">
            <i class="fab fa-github"></i> Sign up with GitHub
        </a>
    </div>

    <div class="divider">
        <span>or</span>
    </div>

    <!-- Traditional signup form (simplified) -->
    <form method="post">
        {% csrf_token %}
        {{ form.as_p }}
        <button type="submit">Create Account</button>
    </form>
</div>
{% endblock %}
```

**Common mistakes:**
- Not verifying email addresses from social providers
- Not handling duplicate email addresses properly
- Exposing sensitive user data from social providers
- Not customizing the social auth flow
- Missing proper error handling for auth failures
- Not securing social auth callback URLs

**When to apply:**
- Improving user registration conversion rates
- Adding convenient login options
- Supporting OAuth-based authentication
- Integrating with existing social platforms
- Reducing registration friction