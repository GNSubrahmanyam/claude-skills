---
title: Forms Validation Logic
impact: HIGH
impactDescription: Ensures data integrity and user experience
tags: django, forms, validation, integrity
---

## Forms Validation Logic

**Problem:**
Missing or incorrect validation allows invalid data to be stored, leading to application bugs, security issues, and poor user experience.

**Solution:**
Implement comprehensive validation at form and model levels. Use Django's built-in validators and create custom validation logic where needed.

**Examples:**

❌ **Wrong: Insufficient validation**
```python
class ContactForm(forms.Form):
    name = forms.CharField(max_length=100)
    email = forms.EmailField()
    message = forms.CharField()

    # No custom validation - allows empty/whitespace names, invalid emails, etc.
```

✅ **Correct: Multi-level validation**
```python
class ContactForm(forms.Form):
    name = forms.CharField(
        max_length=100,
        min_length=2,
        validators=[validate_name_format]
    )
    email = forms.EmailField(
        validators=[validate_company_email]
    )
    message = forms.CharField(
        widget=forms.Textarea,
        min_length=10,
        max_length=1000,
        validators=[validate_message_content]
    )
    priority = forms.ChoiceField(
        choices=[('low', 'Low'), ('high', 'High')],
        validators=[validate_priority_permission]
    )

    def clean_name(self):
        """Validate name field"""
        name = self.cleaned_data['name'].strip()
        if not name:
            raise forms.ValidationError("Name cannot be empty")
        if len(name) < 2:
            raise forms.ValidationError("Name must be at least 2 characters")
        if not all(c.isalpha() or c.isspace() for c in name):
            raise forms.ValidationError("Name can only contain letters and spaces")
        return name

    def clean_email(self):
        """Validate email domain"""
        email = self.cleaned_data['email'].lower()
        if not email.endswith('@company.com'):
            raise forms.ValidationError("Please use your company email address.")
        return email

    def clean(self):
        """Cross-field validation"""
        cleaned_data = super().clean()
        name = cleaned_data.get('name')
        priority = cleaned_data.get('priority')

        if name and priority == 'high':
            # Only managers can set high priority
            if not self.is_manager(name):
                raise forms.ValidationError({
                    'priority': "Only managers can set high priority."
                })

        return cleaned_data

    def is_manager(self, name):
        """Helper method for validation logic"""
        # Simplified example - in real code, check against database
        return name.lower() in ['alice smith', 'bob johnson']

# Custom validators
def validate_name_format(value):
    if not value or not value.strip():
        raise ValidationError('Name cannot be empty')
    if len(value.strip()) < 2:
        raise ValidationError('Name must be at least 2 characters')
    if not all(c.isalpha() or c.isspace() for c in value):
        raise ValidationError('Name can only contain letters and spaces')

def validate_company_email(value):
    if not value.lower().endswith('@company.com'):
        raise ValidationError('Must be a company email address')

def validate_message_content(value):
    if not value or not value.strip():
        raise ValidationError('Message cannot be empty')
    if len(value.strip()) < 10:
        raise ValidationError('Message must be at least 10 characters')

    # Check for spam keywords
    spam_words = ['viagra', 'casino', 'lottery']
    message_lower = value.lower()
    for word in spam_words:
        if word in message_lower:
            raise ValidationError('Message appears to contain spam content')

def validate_priority_permission(value):
    # This validator needs access to request.user, so it's better in clean()
    # But if you need field-level validation, you can access self.request
    pass

# ModelForm validation
class ArticleForm(forms.ModelForm):
    class Meta:
        model = Article
        fields = ['title', 'content', 'author', 'published_date']

    def clean_title(self):
        title = self.cleaned_data['title'].strip()
        if not title:
            raise forms.ValidationError("Title cannot be empty")
        if len(title) < 5:
            raise forms.ValidationError("Title must be at least 5 characters")

        # Check for duplicate titles by same author
        existing = Article.objects.filter(
            title__iexact=title,
            author=self.cleaned_data.get('author')
        ).exclude(pk=self.instance.pk if self.instance else None)

        if existing.exists():
            raise forms.ValidationError("You already have an article with this title")

        return title

    def clean_published_date(self):
        published_date = self.cleaned_data['published_date']
        if published_date and published_date > timezone.now().date():
            raise forms.ValidationError("Published date cannot be in the future")
        return published_date

    def clean(self):
        cleaned_data = super().clean()
        content = cleaned_data.get('content', '')
        published_date = cleaned_data.get('published_date')

        # Business rule: long articles need published date
        word_count = len(content.split())
        if word_count > 1000 and not published_date:
            raise forms.ValidationError({
                'published_date': "Long articles must have a published date"
            })

        return cleaned_data
```

**Common mistakes:**
- Not validating required fields properly
- Missing cross-field validation
- Not using appropriate field types and validators
- Validation logic scattered across views
- Not handling validation errors in templates
- Over-validating causing poor user experience

**When to apply:**
- Creating new forms
- Adding business rules
- Improving user experience
- During form testing and validation
- When reviewing form security