---
title: Forms Security Cleaning
impact: HIGH
impactDescription: Prevents injection attacks and data corruption
tags: django, forms, security, validation
---

## Forms Security Cleaning

**Problem:**
Form data not properly cleaned can contain malicious content or invalid data, leading to security vulnerabilities, data corruption, and application crashes.

**Solution:**
Always validate and clean form data before processing. Use Django's built-in cleaning mechanisms and implement additional security checks.

**Examples:**

❌ **Wrong: Skipping validation**
```python
def create_post(request):
    if request.method == 'POST':
        # DANGER: Using raw POST data without validation
        Post.objects.create(
            title=request.POST['title'],  # No validation!
            content=request.POST['content'],  # XSS vulnerability!
            author=request.user
        )
        return redirect('home')
```

✅ **Correct: Secure form processing**
```python
from django import forms
from django.core.exceptions import ValidationError
from django.utils.html import strip_tags

class SecurePostForm(forms.ModelForm):
    class Meta:
        model = Post
        fields = ['title', 'content', 'tags']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 10}),
        }

    def clean_title(self):
        """Clean and validate title"""
        title = self.cleaned_data['title'].strip()

        # Length validation
        if len(title) < 5:
            raise forms.ValidationError("Title must be at least 5 characters")
        if len(title) > 200:
            raise forms.ValidationError("Title cannot exceed 200 characters")

        # Content validation
        if '<' in title or '>' in title:
            raise forms.ValidationError("Title cannot contain HTML tags")

        return title

    def clean_content(self):
        """Clean and validate content"""
        content = self.cleaned_data['content']

        # Basic HTML stripping if allowing some HTML
        # content = strip_tags(content)  # Uncomment if needed

        # Length validation
        if len(content) < 10:
            raise forms.ValidationError("Content must be at least 10 characters")
        if len(content) > 50000:  # 50KB limit
            raise forms.ValidationError("Content cannot exceed 50,000 characters")

        # Check for malicious content
        dangerous_patterns = [
            '<script', 'javascript:', 'vbscript:',
            'onload=', 'onerror=', 'onclick='
        ]

        content_lower = content.lower()
        for pattern in dangerous_patterns:
            if pattern in content_lower:
                raise forms.ValidationError("Content contains potentially dangerous code")

        return content

    def clean_tags(self):
        """Validate and clean tags"""
        tags = self.cleaned_data['tags']

        if tags:
            # Split tags and validate each
            tag_list = [tag.strip() for tag in tags.split(',')]
            tag_list = [tag for tag in tag_list if tag]  # Remove empty tags

            # Validate tag format
            for tag in tag_list:
                if not tag.replace('-', '').replace('_', '').isalnum():
                    raise forms.ValidationError(f"Tag '{tag}' contains invalid characters")

                if len(tag) > 50:
                    raise forms.ValidationError(f"Tag '{tag}' is too long (max 50 chars)")

            # Limit number of tags
            if len(tag_list) > 10:
                raise forms.ValidationError("Cannot have more than 10 tags")

            return ','.join(tag_list)

        return tags

def create_post(request):
    if request.method == 'POST':
        form = SecurePostForm(request.POST)

        if form.is_valid():
            # Data is now validated and cleaned
            post = form.save(commit=False)
            post.author = request.user
            post.save()

            # Handle many-to-many relationships safely
            if form.cleaned_data.get('tags'):
                tag_names = form.cleaned_data['tags'].split(',')
                tags = []
                for tag_name in tag_names:
                    tag, created = Tag.objects.get_or_create(name=tag_name.strip())
                    tags.append(tag)
                post.tags.set(tags)

            messages.success(request, 'Post created successfully!')
            return redirect('post_detail', pk=post.pk)
        else:
            # Form errors are automatically handled
            pass
    else:
        form = SecurePostForm()

    return render(request, 'posts/create.html', {'form': form})

# File upload security
class DocumentForm(forms.ModelForm):
    class Meta:
        model = Document
        fields = ['title', 'file']

    def clean_file(self):
        file = self.cleaned_data['file']
        if file:
            # File size validation
            max_size = 10 * 1024 * 1024  # 10MB
            if file.size > max_size:
                raise forms.ValidationError("File size cannot exceed 10MB")

            # File type validation
            allowed_types = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'image/jpeg',
                'image/png',
            ]

            if file.content_type not in allowed_types:
                raise forms.ValidationError(
                    f"File type '{file.content_type}' not allowed. "
                    f"Allowed types: PDF, DOC, DOCX, TXT, JPEG, PNG"
                )

            # File extension validation (additional security)
            allowed_extensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png']
            file_name = file.name.lower()
            if not any(file_name.endswith(ext) for ext in allowed_extensions):
                raise forms.ValidationError("File extension not allowed")

            # Read file content for additional validation if needed
            if file.content_type.startswith('text/'):
                file.seek(0)
                content = file.read().decode('utf-8', errors='ignore')

                # Check for malicious content in text files
                if any(word in content.lower() for word in ['<script', 'javascript:']):
                    raise forms.ValidationError("File contains potentially malicious content")

                file.seek(0)  # Reset file pointer

        return file
```

**Common mistakes:**
- Using `request.POST` directly without form validation
- Not cleaning user input before processing
- Missing file upload validation
- Not checking file sizes and types
- Allowing dangerous HTML or script content
- Not validating data types and ranges

**When to apply:**
- Processing any form data
- Handling file uploads
- Implementing user input processing
- During security reviews
- When adding new data entry points