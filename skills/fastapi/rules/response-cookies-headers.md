# Response Cookies & Headers (MEDIUM)

**Impact:** MEDIUM - Enables proper client state management and response metadata

**Problem:**
APIs need to set cookies and headers for authentication, caching, content negotiation, and client instructions. Manual header/cookie management leads to security issues and inconsistent responses.

**Solution:**
Use FastAPI's Response object and set_cookie method with proper security flags and header management.

❌ **Wrong: Manual response manipulation**
```python
@app.post("/login")
async def login():
    # Manual response creation
    response_data = {"message": "Logged in"}
    response = JSONResponse(content=response_data)

    # Manual cookie setting - insecure
    response.set_cookie("session", "session_value")
    response.headers["X-Custom-Header"] = "value"

    return response
```

✅ **Correct: Proper response cookies and headers**
```python
from fastapi import Response
from fastapi.responses import JSONResponse

@app.post("/login")
async def login(response: Response):
    """Login with proper cookie and header management"""

    session_token = await create_session_token()

    # Set secure session cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,      # Prevent JavaScript access
        secure=True,         # HTTPS only in production
        samesite="strict",   # CSRF protection
        max_age=3600,        # 1 hour expiration
        path="/",            # Available site-wide
    )

    # Set additional security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Set custom headers
    response.headers["X-API-Version"] = "v1"
    response.headers["X-Request-ID"] = generate_request_id()

    return {"message": "Logged in successfully"}

# Cookie-based authentication with automatic refresh
@app.get("/protected")
async def protected_route(
    response: Response,
    session_token: Optional[str] = Cookie(None)
):
    """Protected route with automatic cookie refresh"""

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await validate_session_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    # Extend session by refreshing cookie
    new_token = await refresh_session_token(session_token)
    response.set_cookie(
        key="session_token",
        value=new_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=3600
    )

    return {"user": user, "session_extended": True}

# Response headers for caching
@app.get("/data")
async def get_data(response: Response):
    """Data endpoint with caching headers"""

    data = await fetch_data()

    # Set caching headers
    response.headers["Cache-Control"] = "public, max-age=300"  # 5 minutes
    response.headers["ETag"] = generate_etag(data)
    response.headers["Last-Modified"] = data.updated_at.isoformat()

    # Custom metadata headers
    response.headers["X-Data-Version"] = str(data.version)
    response.headers["X-Record-Count"] = str(len(data.records))

    return data

# CORS headers via response
@app.options("/cors-endpoint")
async def cors_preflight(response: Response):
    """Handle CORS preflight requests"""

    response.headers["Access-Control-Allow-Origin"] = "https://example.com"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours

    return {}

# Content negotiation with headers
@app.get("/document/{doc_id}")
async def get_document(
    doc_id: str,
    response: Response,
    accept: str = Header("application/json")
):
    """Content negotiation with response headers"""

    document = await get_document_by_id(doc_id)

    if "application/pdf" in accept:
        # Generate PDF
        pdf_content = await generate_pdf(document)
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = f"attachment; filename={doc_id}.pdf"
        return Response(content=pdf_content, media_type="application/pdf")

    elif "text/html" in accept:
        # Generate HTML
        html_content = await generate_html(document)
        response.headers["Content-Type"] = "text/html"
        return Response(content=html_content, media_type="text/html")

    else:
        # Default JSON
        response.headers["Content-Type"] = "application/json"
        return {"document": document}

# Security headers middleware
@app.middleware("http")
async def security_headers_middleware(request, call_next):
    """Add security headers to all responses"""

    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # API metadata headers
    response.headers["X-API-Version"] = "v1"
    response.headers["X-Powered-By"] = "FastAPI"

    return response

# Custom response class for consistent headers
class APIResponse(JSONResponse):
    """Custom response class with consistent headers"""

    def __init__(self, content, status_code=200, headers=None, **kwargs):
        super().__init__(content, status_code, **kwargs)

        # Default API headers
        self.headers["X-API-Version"] = "v1"
        self.headers["Content-Type"] = "application/json"

        # Custom headers
        if headers:
            for key, value in headers.items():
                self.headers[key] = value

@app.get("/custom-response")
async def custom_response_endpoint():
    """Endpoint using custom response class"""

    data = await get_data()

    return APIResponse(
        content={"data": data, "timestamp": datetime.utcnow().isoformat()},
        headers={
            "X-Data-Source": "database",
            "X-Response-Time": "fast"
        }
    )

# Cookie deletion
@app.post("/logout")
async def logout(response: Response):
    """Logout with cookie deletion"""

    # Delete session cookie
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        httponly=True,
        samesite="strict"
    )

    # Additional cleanup
    await invalidate_session()

    response.headers["X-Logout-Time"] = datetime.utcnow().isoformat()

    return {"message": "Logged out successfully"}
```

**Common mistakes:**
- Missing secure cookie flags
- Not setting proper cache headers
- Inconsistent header naming
- Missing CORS headers for cross-origin requests
- Not handling cookie deletion properly

**When to apply:**
- Authentication and session management
- Caching and ETag handling
- CORS for web applications
- Security headers
- Content negotiation
- API versioning