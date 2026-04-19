---
title: Unicode Text Handling
impact: LOW
impactDescription: Ensures proper handling of non-ASCII text and encoding
tags: django, unicode, text, encoding, internationalization
---

## Unicode Text Handling

**Problem:**
Django applications handling non-ASCII text can encounter encoding issues, data corruption, and display problems if unicode and text encoding are not handled properly. Python 3 uses unicode strings by default, but developers may still encounter encoding/decoding issues with file I/O, database operations, and HTTP responses.

**Solution:**
Use UTF-8 encoding consistently throughout the application:

```python
# In settings.py
DEFAULT_CHARSET = 'utf-8'
FILE_CHARSET = 'utf-8'
```

Handle text properly in views and responses:

```python
from django.http import HttpResponse
from django.utils.encoding import smart_str

def unicode_view(request):
    # Django handles unicode strings automatically
    text = "Hello, 世界"  # Unicode string
    
    # HttpResponse encodes to UTF-8 by default
    response = HttpResponse(text, content_type="text/plain; charset=utf-8")
    
    # For custom encoding
    response.charset = "utf-8"
    
    return response
```

Handle file I/O with proper encoding:

```python
# Reading text files
with open("file.txt", "r", encoding="utf-8") as f:
    content = f.read()

# Writing text files
with open("output.txt", "w", encoding="utf-8") as f:
    f.write(unicode_content)
```

Work with form data and database text:

```python
# Forms handle unicode automatically
class ContactForm(forms.Form):
    name = forms.CharField()  # Accepts unicode
    message = forms.CharField()

# Database fields store unicode
class Article(models.Model):
    title = models.CharField(max_length=100)  # UTF-8 in database
    content = models.TextField()
```

Use Django's encoding utilities when needed:

```python
from django.utils.encoding import force_str, smart_str

# Ensure string is unicode
unicode_text = smart_str(byte_string, encoding="utf-8")

# Force conversion to string
text = force_str(obj)
```

Handle JSON with unicode support:

```python
import json
from django.http import JsonResponse

# JsonResponse handles unicode properly
data = {"message": "Hello, 世界"}
return JsonResponse(data, json_dumps_params={"ensure_ascii": False})
```

## Common Mistakes

- Assuming all text is ASCII and not handling unicode characters
- Not specifying charset in HTTP responses
- Mixing str and bytes without proper encoding/decoding
- Using latin-1 or other encodings instead of UTF-8
- Not handling unicode in file operations
- Forgetting that Python 3 strings are unicode by default
- Using ensure_ascii=True in JSON responses (escapes unicode)
- Not testing with non-ASCII characters

## When to Apply

- Building applications that support multiple languages
- Handling user input with non-ASCII characters
- Working with international text data
- Creating APIs that return unicode content
- Processing files with unicode filenames or content
- Implementing search or text processing features
- Developing for international markets