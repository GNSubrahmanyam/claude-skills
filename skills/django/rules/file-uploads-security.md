---
title: File Uploads Security
impact: LOW
impactDescription: Prevents malicious file upload exploits and security vulnerabilities
tags: django, security, file-uploads, validation
---

## File Uploads Security

**Problem:**
File upload functionality in Django applications can introduce serious security vulnerabilities if not properly implemented. Attackers can exploit file uploads to execute malicious code, perform directory traversal attacks, or overwhelm server resources. Developers often overlook validation, storage security, and access controls when implementing file uploads.

**Solution:**
Implement comprehensive file upload security measures:

```python
# models.py
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
import os

def validate_file_extension(value):
    """Validate file extension against allowed types"""
    allowed_extensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png']
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(f'File extension {ext} not allowed')

def validate_file_size(value):
    """Validate file size limits"""
    max_size = 5 * 1024 * 1024  # 5MB
    if value.size > max_size:
        raise ValidationError('File too large (max 5MB)')

class SecureDocument(models.Model):
    title = models.CharField(max_length=100)
    file = models.FileField(
        upload_to='documents/%Y/%m/%d/',
        validators=[validate_file_extension, validate_file_size]
    )
    uploaded_by = models.ForeignKey('auth.User', on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def clean(self):
        """Additional validation"""
        if self.file:
            # Check for malicious filenames
            if '..' in self.file.name or '/' in self.file.name:
                raise ValidationError('Invalid filename')
            
            # Check file content type matches extension
            content_type = self.file.file.content_type
            ext = os.path.splitext(self.file.name)[1].lower()
            
            if ext == '.pdf' and not content_type.startswith('application/pdf'):
                raise ValidationError('File content does not match PDF extension')
```

Use secure file storage with proper permissions:

```python
# settings.py
import os

# Secure file storage settings
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/'

# Use secure file permissions
FILE_UPLOAD_PERMISSIONS = 0o644
FILE_UPLOAD_DIRECTORY_PERMISSIONS = 0o755

# Limit upload size
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024  # 2MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024   # 2MB
DATA_UPLOAD_MAX_NUMBER_FILES = 10

# Custom storage class for additional security
from django.core.files.storage import FileSystemStorage
from django.core.files.base import ContentFile

class SecureFileStorage(FileSystemStorage):
    def save(self, name, content, max_length=None):
        # Generate secure filename
        import uuid
        name = f"{uuid.uuid4().hex}{os.path.splitext(name)[1]}"
        
        # Call parent save
        return super().save(name, content, max_length)
    
    def get_valid_filename(self, name):
        # Additional filename validation
        if any(char in name for char in ['<', '>', ':', '"', '|', '?', '*']):
            raise ValueError('Invalid characters in filename')
        return super().get_valid_filename(name)

# Use secure storage
DEFAULT_FILE_STORAGE = 'myapp.storage.SecureFileStorage'
```

Implement secure file serving with access controls:

```python
# views.py
from django.http import Http404, HttpResponse
from django.core.files.storage import default_storage
from django.contrib.auth.decorators import login_required

@login_required
def serve_secure_file(request, file_path):
    """Serve files with access control"""
    
    # Validate file path to prevent directory traversal
    if '..' in file_path or not file_path.startswith('documents/'):
        raise Http404("File not found")
    
    # Check user permissions
    document = get_object_or_404(
        Document, 
        file=file_path, 
        uploaded_by=request.user
    )
    
    # Check if file exists
    if not default_storage.exists(file_path):
        raise Http404("File not found")
    
    # Serve file with appropriate headers
    file_obj = default_storage.open(file_path)
    response = HttpResponse(file_obj, content_type='application/octet-stream')
    response['Content-Disposition'] = f'attachment; filename="{document.title}"'
    response['Content-Length'] = file_obj.size
    
    return response
```

Implement file scanning and validation:

```python
# utils.py
import magic
from django.core.exceptions import ValidationError

def validate_file_content(file):
    """Validate file content using magic numbers"""
    # Reset file pointer
    file.seek(0)
    
    # Read first 1024 bytes for MIME detection
    file_head = file.read(1024)
    file.seek(0)
    
    # Detect MIME type
    mime = magic.from_buffer(file_head, mime=True)
    
    allowed_mimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
    ]
    
    if mime not in allowed_mimes:
        raise ValidationError(f'File type {mime} not allowed')
    
    return mime

def scan_for_malware(file):
    """Basic malware scanning (integrate with actual scanner)"""
    # This is a placeholder - integrate with ClamAV or similar
    file.seek(0)
    content = file.read()
    
    # Check for suspicious patterns
    suspicious_patterns = [
        b'<?php',
        b'<script',
        b'eval(',
        b'exec(',
    ]
    
    for pattern in suspicious_patterns:
        if pattern in content.lower():
            raise ValidationError('File contains suspicious content')
    
    file.seek(0)
    return True
```

Handle upload errors gracefully:

```python
# forms.py
from django import forms
from .models import SecureDocument

class DocumentUploadForm(forms.ModelForm):
    class Meta:
        model = SecureDocument
        fields = ['title', 'file']
    
    def clean_file(self):
        file = self.cleaned_data['file']
        
        # Validate file size
        if file.size > 5 * 1024 * 1024:  # 5MB
            raise forms.ValidationError('File too large')
        
        # Validate content
        try:
            validate_file_content(file)
            scan_for_malware(file)
        except ValidationError as e:
            raise forms.ValidationError(str(e))
        
        return file
```

## Common Mistakes

- Not validating file types and content
- Storing files with original filenames (allows directory traversal)
- Not setting proper file permissions
- Allowing unlimited file sizes
- Not scanning for malware or malicious content
- Serving files without access controls
- Using predictable filenames
- Not handling upload errors properly
- Storing sensitive files in web-accessible directories

## When to Apply

- User file upload functionality
- Document management systems
- Image galleries and media libraries
- CSV/data import features
- Profile picture uploads
- Any application accepting user-generated files
- Content management systems
- File sharing applications