---
title: System Check Framework
impact: LOW
impactDescription: Validates application configuration and catches issues early
tags: django, system-check, validation, configuration
---

## System Check Framework

**Problem:**
Django applications can have configuration issues, missing settings, or problematic code that only surface at runtime or in production. Without systematic validation, teams waste time debugging issues that could be caught early. Developers struggle with implementing proper validation checks and integrating them with Django's deployment process.

**Solution:**
Create custom system checks to validate application configuration and catch issues early:

```python
# myapp/checks.py
from django.core.checks import Error, Warning, register, Tags
from django.conf import settings

@register(Tags.security, deploy=True)
def check_secret_key_strength(app_configs, **kwargs):
    """Check that SECRET_KEY is properly configured"""
    errors = []
    
    secret_key = getattr(settings, 'SECRET_KEY', '')
    if not secret_key:
        errors.append(
            Error(
                'SECRET_KEY is not set',
                hint='Set SECRET_KEY in your settings file',
                id='myapp.E001',
            )
        )
    elif len(secret_key) < 50:
        errors.append(
            Warning(
                'SECRET_KEY is too short',
                hint='Use a SECRET_KEY with at least 50 characters',
                id='myapp.W001',
            )
        )
    
    return errors

@register('myapp')
def check_required_settings(app_configs, **kwargs):
    """Check for required application settings"""
    errors = []
    required_settings = ['MYAPP_API_KEY', 'MYAPP_DATABASE_URL']
    
    for setting_name in required_settings:
        if not getattr(settings, setting_name, None):
            errors.append(
                Error(
                    f'{setting_name} is not configured',
                    hint=f'Set {setting_name} in your settings file',
                    id=f'myapp.E00{len(errors) + 2}',
                )
            )
    
    return errors
```

Register checks in AppConfig.ready():

```python
# myapp/apps.py
from django.apps import AppConfig

class MyAppConfig(AppConfig):
    name = 'myapp'
    
    def ready(self):
        # Import checks to register them
        import myapp.checks  # noqa
```

Add checks to model fields, managers, and constraints:

```python
# models.py
from django.core import checks
from django.db import models

class CustomField(models.Field):
    def check(self, **kwargs):
        errors = super().check(**kwargs)
        
        if hasattr(self, 'max_length') and self.max_length < 10:
            errors.append(
                checks.Error(
                    'max_length too small for CustomField',
                    hint='Set max_length to at least 10',
                    obj=self,
                    id='myapp.E003',
                )
            )
        
        return errors

class MyModel(models.Model):
    custom_field = CustomField(max_length=5)  # Will trigger error
    
    @classmethod
    def check(cls, **kwargs):
        errors = super().check(**kwargs)
        
        # Check model-specific constraints
        if not cls._meta.get_field('name'):
            errors.append(
                checks.Error(
                    'MyModel must have a name field',
                    hint='Add a name field to MyModel',
                    obj=cls,
                    id='myapp.E004',
                )
            )
        
        return errors
```

Run checks programmatically and in tests:

```python
# Run all checks
from django.core.management import call_command
call_command('check')

# Run specific tags
call_command('check', '--tags', 'security')

# Run deployment checks
call_command('check', '--deploy')

# In tests
from django.core.management import call_command
from django.core.management.base import SystemCheckError
from django.test import TestCase

class SystemCheckTest(TestCase):
    def test_custom_checks(self):
        """Test that custom checks work correctly"""
        # This should not raise an error
        call_command('check', 'myapp')
        
        # Test specific error conditions
        with self.settings(SECRET_KEY='short'):
            with self.assertRaises(SystemCheckError):
                call_command('check', 'myapp')
```

Silence specific warnings in production:

```python
# settings.py
SILENCED_SYSTEM_CHECKS = [
    'myapp.W001',  # Silence the SECRET_KEY warning
    'admin.E410',  # Silence some admin warning
]
```

## Common Mistakes

- Not registering checks in AppConfig.ready()
- Using wrong error levels (Error vs Warning)
- Not providing helpful hints for fixing issues
- Making checks too slow or database-dependent
- Not testing checks properly
- Using generic error IDs instead of unique ones
- Forgetting to handle deployment-only checks
- Not using appropriate tags for categorization

## When to Apply

- Validating application configuration settings
- Checking for required third-party service credentials
- Validating model field configurations
- Ensuring database connectivity and permissions
- Checking file system permissions and paths
- Validating external service configurations
- Implementing deployment-specific validations