# Authentication Custom User Model (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Ensures flexibility and future extensibility

**Problem:**
Using Django's default User model can limit customization options and make future changes difficult. The default model may not include necessary fields or relationships for complex applications.

**Solution:**
Create a custom user model that extends Django's AbstractUser when additional fields or behavior are needed. Plan for extensibility from the start of the project.

**Examples:**

❌ **Wrong: Using default User model when custom fields needed**
```python
# models.py - Trying to extend User poorly
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # Problems:
    # - Two separate models to manage
    # - Complex queries to get user with profile
    # - Profile might not exist for all users
    # - Harder to enforce required fields

# views.py - Complex user handling
def user_profile(request):
    try:
        profile = request.user.userprofile
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=request.user)

    return render(request, 'profile.html', {'profile': profile})
```

✅ **Correct: Custom user model**
```python
# models.py - Custom user model
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """Custom user model with additional fields"""

    # Remove username field if using email as username
    # username = None

    # Use email as username
    email = models.EmailField(unique=True)

    # Additional fields
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    is_email_verified = models.BooleanField(default=False)

    # Preferences
    theme = models.CharField(
        max_length=10,
        choices=[('light', 'Light'), ('dark', 'Dark')],
        default='light'
    )
    notifications_enabled = models.BooleanField(default=True)

    # Relationships
    following = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='followers',
        blank=True
    )

    USERNAME_FIELD = 'email'  # Use email for authentication
    REQUIRED_FIELDS = ['username']  # Fields required when creating superuser

    class Meta:
        ordering = ['-date_joined']

    def __str__(self):
        return self.get_full_name() or self.email

    def get_full_name(self):
        """Return full name or email if no name set"""
        full_name = super().get_full_name()
        return full_name.strip() or self.email

    def get_avatar_url(self):
        """Get avatar URL or default"""
        if self.avatar:
            return self.avatar.url
        return '/static/images/default-avatar.png'

    def can_follow(self, user):
        """Check if this user can follow another user"""
        return (
            self != user and
            not self.following.filter(id=user.id).exists()
        )

    def follow(self, user):
        """Follow another user"""
        if self.can_follow(user):
            self.following.add(user)

    def unfollow(self, user):
        """Unfollow a user"""
        self.following.remove(user)

# Custom manager for user queries
class CustomUserManager(models.Manager):
    """Custom manager for User model"""

    def active_users(self):
        """Get active users"""
        return self.filter(is_active=True)

    def verified_users(self):
        """Get email-verified users"""
        return self.filter(is_email_verified=True)

    def with_follower_count(self):
        """Get users with follower count"""
        return self.annotate(
            follower_count=models.Count('followers', distinct=True)
        )

# Add to CustomUser
CustomUser.objects = CustomUserManager()
```

**Settings configuration:**
```python
# settings.py
AUTH_USER_MODEL = 'accounts.CustomUser'

# Forms for custom user
from django.contrib.auth.forms import UserCreationForm, UserChangeForm

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = get_user_model()
        fields = ('email', 'username', 'first_name', 'last_name')

class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = get_user_model()
        fields = ('email', 'username', 'first_name', 'last_name', 'bio', 'avatar')

# Admin configuration
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

@admin.register(get_user_model())
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = get_user_model()

    list_display = ('email', 'username', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active', 'is_email_verified')

    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('bio', 'avatar', 'phone', 'date_of_birth', 'theme')}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('bio', 'avatar', 'phone', 'date_of_birth')}),
    )

    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('email',)
```

**Migration strategy:**
```python
# When changing AUTH_USER_MODEL mid-project
# 1. Create custom user model
# 2. Create database migration
# 3. Update AUTH_USER_MODEL in settings
# 4. Create data migration to migrate existing users
# 5. Update all imports and references to User model

# Data migration example
def migrate_existing_users(apps, schema_editor):
    """Migrate data from old User model to CustomUser"""
    OldUser = apps.get_model('auth', 'User')
    CustomUser = apps.get_model('accounts', 'CustomUser')

    for old_user in OldUser.objects.all():
        CustomUser.objects.create(
            id=old_user.id,
            password=old_user.password,
            last_login=old_user.last_login,
            is_superuser=old_user.is_superuser,
            username=old_user.username,
            first_name=old_user.first_name,
            last_name=old_user.last_name,
            email=old_user.email,
            is_staff=old_user.is_staff,
            is_active=old_user.is_active,
            date_joined=old_user.date_joined,
        )
```

**Common mistakes:**
- Creating custom user model too late in development
- Not updating AUTH_USER_MODEL setting
- Forgetting to update imports after changing user model
- Not handling migrations properly when changing user model
- Over-customizing when default User model would work
- Not creating proper forms and admin for custom user

**When to apply:**
- Starting new Django projects
- When additional user fields are needed
- When email-based authentication is required
- When complex user relationships are needed
- During project planning and architecture design