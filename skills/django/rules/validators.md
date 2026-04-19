---
title: Validators
impact: MEDIUM
impactDescription: Ensures data integrity and prevents invalid input
tags: django, validators, validation, security, data-integrity
---

## Validators

**Problem:**
Django applications that accept user input without proper validation can suffer from data corruption, security vulnerabilities, and poor user experience. Without validators, invalid data can enter the database, leading to application crashes or malicious attacks.

**Solution:**
Use Django's built-in validators on model fields and forms:

```python
from django.core.validators import (
    MinLengthValidator, MaxLengthValidator, 
    MinValueValidator, MaxValueValidator,
    RegexValidator, EmailValidator, URLValidator
)
from django.db import models

class UserProfile(models.Model):
    username = models.CharField(
        max_length=30,
        validators=[
            MinLengthValidator(3, message="Username too short"),
            RegexValidator(r'^[a-zA-Z0-9_]+$', message="Invalid characters")
        ]
    )
    email = models.EmailField(validators=[EmailValidator()])
    age = models.IntegerField(
        validators=[MinValueValidator(13), MaxValueValidator(120)]
    )
    website = models.URLField(validators=[URLValidator()])
```

Create custom validators for business logic:

```python
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

def validate_even(value):
    if value % 2 != 0:
        raise ValidationError(
            _('%(value)s is not an even number'),
            params={'value': value},
        )

def validate_no_profanity(value):
    bad_words = ['badword1', 'badword2']
    for word in bad_words:
        if word.lower() in value.lower():
            raise ValidationError("Content contains inappropriate language")

class UsernameValidator:
    def __call__(self, value):
        if not value.isalnum():
            raise ValidationError("Username must be alphanumeric")
        
    def __eq__(self, other):
        return isinstance(other, UsernameValidator)

class CustomValidator:
    def __init__(self, prohibited_words=None):
        self.prohibited_words = prohibited_words or []

    def __call__(self, value):
        for word in self.prohibited_words:
            if word in value:
                raise ValidationError(f"Text contains prohibited word: {word}")

    def __eq__(self, other):
        return (
            isinstance(other, CustomValidator) and
            self.prohibited_words == other.prohibited_words
        )

    def deconstruct(self):
        return (
            'myapp.validators.CustomValidator',
            (self.prohibited_words,),
            {}
        )
```

Use validators in forms:

```python
from django import forms
from .validators import validate_even

class MyForm(forms.Form):
    even_number = forms.IntegerField(validators=[validate_even])
    
    def clean_even_number(self):
        # Additional validation
        value = self.cleaned_data['even_number']
        if value > 100:
            raise forms.ValidationError("Number too large")
        return value
```

Validate at model level:

```python
class Article(models.Model):
    title = models.CharField(max_length=100, validators=[validate_no_profanity])
    content = models.TextField(validators=[validate_no_profanity])

    def clean(self):
        # Model-level validation
        if 'spam' in self.title.lower() and 'spam' in self.content.lower():
            raise ValidationError("Article appears to be spam")
```

Use FileExtensionValidator for security:

```python
from django.core.validators import FileExtensionValidator

class Document(models.Model):
    file = models.FileField(
        validators=[FileExtensionValidator(['pdf', 'doc', 'docx'])]
    )
```

## Common Mistakes

- Not using validators on user input fields
- Forgetting to call full_clean() on model instances
- Using validators only on forms but not models
- Creating validators that raise generic exceptions instead of ValidationError
- Not providing meaningful error messages
- Using regex validators for complex validation
- Not testing validators with edge cases
- Applying validators that are too restrictive

## When to Apply

- All model fields that accept user input
- Form fields for data validation
- Custom business logic validation
- File upload validation for security
- API input validation
- Data import/export validation