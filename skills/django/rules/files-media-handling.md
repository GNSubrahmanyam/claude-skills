# Impact: HIGH

## Problem

Django applications often need to handle file uploads, storage, and serving, but developers frequently encounter issues with file management leading to security vulnerabilities, resource leaks, poor performance, or data corruption. Common problems include file descriptor exhaustion, insecure file access, and improper storage configuration.

## Solution

Use Django's `FileField` and `ImageField` for model-based file handling:

```python
from django.db import models

class Document(models.Model):
    title = models.CharField(max_length=100)
    file = models.FileField(upload_to="documents/%Y/%m/%d/")
    image = models.ImageField(upload_to="images/%Y/%m/%d/", blank=True)
```

Configure media settings properly in `settings.py`:

```python
import os

MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")
```

Handle file objects safely with context managers:

```python
# Reading files
with document.file.open() as f:
    content = f.read()

# Writing files
from django.core.files.base import ContentFile

document.file.save("new_name.txt", ContentFile(b"new content"))

# Moving/renaming files
import os
from django.conf import settings

old_path = document.file.path
document.file.name = "new_path/file.txt"
new_path = os.path.join(settings.MEDIA_ROOT, document.file.name)
os.rename(old_path, new_path)
document.save()
```

Use custom storage backends when needed:

```python
from django.core.files.storage import FileSystemStorage

class CustomStorage(FileSystemStorage):
    def get_valid_filename(self, name):
        # Custom filename validation
        return super().get_valid_filename(name)

# In model
file = models.FileField(storage=CustomStorage())
```

## Common Mistakes

- Not closing file objects after use, causing file descriptor leaks
- Accessing file paths before model save (paths aren't final until saved)
- Not validating file types or sizes on upload
- Hardcoding file paths instead of using storage API
- Forgetting to handle file deletion when models are deleted
- Using file operations in loops without proper resource management
- Not configuring MEDIA_URL/MEDIA_ROOT correctly for production

## When to Apply

- Building applications that accept user file uploads
- Implementing image galleries or document management
- Creating media-heavy applications like blogs or e-commerce sites
- Setting up file serving and storage infrastructure
- Implementing backup or export functionality