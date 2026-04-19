---
title: HTTP Request Response
impact: MEDIUM
impactDescription: Ensures proper web interaction handling
tags: django, http, request, response, security
---

## HTTP Request Response

**Problem:**
Incorrect handling of Django's HttpRequest and HttpResponse objects can lead to security vulnerabilities, data loss, performance issues, and unexpected behavior. Common problems include improper access to request data, insecure cookie handling, and incorrect response formatting.

**Solution:**
Use HttpRequest attributes and methods correctly for data access:

```python
def my_view(request):
    # Check method properly
    if request.method == "POST":
        # Use getlist for multiple values
        tags = request.POST.getlist("tags")
        # Single value (last one if multiple)
        name = request.POST.get("name")
    
    # Handle files
    uploaded_file = request.FILES.get("document")
    if uploaded_file:
        # Process file
    
    # Access headers safely
    user_agent = request.headers.get("User-Agent")
    
    # Build URLs properly
    full_url = request.build_absolute_uri("/path")
    
    # Validate host
    try:
        host = request.get_host()
    except DisallowedHost:
        return HttpResponseBadRequest("Invalid host")
```

Create HttpResponse objects with proper configuration:

```python
from django.http import JsonResponse, HttpResponseRedirect

# JSON response
response = JsonResponse({"data": "value"}, status=200)
response.headers["Custom-Header"] = "value"

# File download
response = HttpResponse(file_content, content_type="application/pdf")
response.headers["Content-Disposition"] = 'attachment; filename="report.pdf"'

# Redirect
return HttpResponseRedirect("/success", status=302)
```

Handle cookies securely:

```python
# Set secure cookie
response.set_cookie(
    "session_id", 
    value, 
    secure=True, 
    httponly=True, 
    samesite="Lax"
)

# Get signed cookie
try:
    session_id = request.get_signed_cookie("session_id", salt="session")
except BadSignature:
    # Invalid cookie
    pass
```

Use StreamingHttpResponse for large content:

```python
from django.http import StreamingHttpResponse

def stream_file(request):
    def file_generator():
        with open(large_file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk
    
    return StreamingHttpResponse(
        file_generator(),
        content_type="application/octet-stream"
    )
```

## Common Mistakes

- Using request.POST to check HTTP method instead of request.method
- Accessing request.body after using streaming methods
- Not using getlist() for multi-value form fields
- Setting headers with newlines (causes BadHeaderError)
- Using HttpResponse for JSON without proper content_type
- Not setting security flags on cookies (secure, httponly, samesite)
- Iterating StreamingHttpResponse in application code
- Modifying request attributes without documentation
- Ignoring DisallowedHost exceptions from get_host()
- Using safe=False in JsonResponse unnecessarily

## When to Apply

- Building any Django view that handles HTTP requests
- Creating API endpoints that return JSON or file responses
- Implementing authentication with cookies or sessions
- Handling file uploads or downloads
- Setting up redirects or custom HTTP responses
- Working with streaming content or large files
- Implementing security-related request processing