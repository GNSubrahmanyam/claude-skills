# Response Headers (MEDIUM)

**Impact:** MEDIUM - Enables proper HTTP response metadata and client instructions

**Problem:**
APIs need to provide metadata, caching instructions, security policies, and client guidance through HTTP headers. Missing or incorrect headers can cause security issues, caching problems, and poor client behavior.

**Solution:**
Set appropriate response headers for security, caching, content negotiation, and API metadata using FastAPI's response manipulation capabilities.

❌ **Wrong: Missing response headers**
```python
@app.get("/api/data")
async def get_data():
    data = await fetch_data()
    return data  # No headers set
```

✅ **Correct: Comprehensive response headers**
```python
from fastapi import Response, Request
from fastapi.responses import JSONResponse
import time

# Security headers middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
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

# Caching headers
@app.get("/api/data")
async def get_data(response: Response):
    """Data endpoint with caching headers"""
    data = await fetch_data()

    # Set caching headers
    response.headers["Cache-Control"] = "public, max-age=300"  # 5 minutes
    response.headers["ETag"] = generate_etag(data)
    response.headers["Last-Modified"] = data.updated_at.isoformat()

    # Custom metadata headers
    response.headers["X-Data-Source"] = "database"
    response.headers["X-Record-Count"] = str(len(data))

    return data

# Content negotiation headers
@app.get("/documents/{doc_id}")
async def get_document(doc_id: str, response: Response, accept: str = Header("application/json")):
    """Content negotiation with response headers"""

    document = await get_document_by_id(doc_id)

    if "application/pdf" in accept:
        pdf_content = await generate_pdf(document)
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = f"attachment; filename={doc_id}.pdf"
        return Response(content=pdf_content, media_type="application/pdf")

    elif "text/html" in accept:
        html_content = await generate_html(document)
        response.headers["Content-Type"] = "text/html"
        return Response(content=html_content, media_type="text/html")

    else:
        response.headers["Content-Type"] = "application/json"
        return {"document": document}

# Rate limiting headers
@app.get("/api/search")
async def search_items(q: str, response: Response):
    """Search with rate limiting headers"""

    # Check rate limit
    remaining, reset_time = await check_rate_limit()

    # Set rate limiting headers
    response.headers["X-RateLimit-Limit"] = "100"
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(reset_time)

    if remaining <= 0:
        response.headers["Retry-After"] = "60"
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    results = await perform_search(q)
    return {"results": results}

# CORS headers (additional to middleware)
@app.options("/api/data")
async def cors_preflight(response: Response):
    """Handle CORS preflight with specific headers"""

    response.headers["Access-Control-Allow-Origin"] = "https://example.com"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-API-Key"
    response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
    response.headers["Access-Control-Allow-Credentials"] = "true"

    return {}

# Custom API metadata headers
class APIResponse(JSONResponse):
    """Custom response with API metadata headers"""

    def __init__(self, content, status_code=200, request_id=None, **kwargs):
        super().__init__(content, status_code, **kwargs)

        # API metadata
        self.headers["X-API-Version"] = "v1"
        self.headers["X-Response-Time"] = str(time.time())

        if request_id:
            self.headers["X-Request-ID"] = request_id

@app.get("/api/info", response_class=APIResponse)
async def get_api_info(request: Request):
    """API info with custom headers"""
    info = {
        "version": "1.0.0",
        "status": "operational",
        "timestamp": time.time()
    }

    return APIResponse(
        content=info,
        request_id=request.headers.get("X-Request-ID", str(uuid.uuid4()))
    )

# Pagination headers
@app.get("/api/items")
async def get_items(page: int = 1, page_size: int = 10, response: Response):
    """Items with pagination headers"""
    items, total_count = await get_paginated_items(page, page_size)

    # Pagination headers
    response.headers["X-Total-Count"] = str(total_count)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(page_size)
    response.headers["X-Total-Pages"] = str((total_count + page_size - 1) // page_size)

    # Navigation links
    base_url = "/api/items"
    if page > 1:
        response.headers["X-Prev-Page"] = f"{base_url}?page={page-1}&page_size={page_size}"
    if page * page_size < total_count:
        response.headers["X-Next-Page"] = f"{base_url}?page={page+1}&page_size={page_size}"

    return {"items": items}

# Conditional request headers
@app.get("/api/resource/{resource_id}")
async def get_resource(
    resource_id: str,
    response: Response,
    if_modified_since: Optional[str] = Header(None),
    if_none_match: Optional[str] = Header(None)
):
    """Resource with conditional request support"""

    resource = await get_resource_by_id(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Set entity tags and modification headers
    etag = generate_etag(resource)
    response.headers["ETag"] = etag
    response.headers["Last-Modified"] = resource.updated_at.isoformat()

    # Handle If-None-Match
    if if_none_match and etag in if_none_match:
        return Response(status_code=304)  # Not Modified

    # Handle If-Modified-Since
    if if_modified_since:
        try:
            client_modified = datetime.fromisoformat(if_modified_since.replace('Z', '+00:00'))
            if resource.updated_at <= client_modified:
                return Response(status_code=304)  # Not Modified
        except ValueError:
            pass  # Invalid date format

    return resource

# Performance monitoring headers
@app.middleware("http")
async def performance_headers_middleware(request: Request, call_next):
    """Add performance monitoring headers"""

    start_time = time.time()

    response = await call_next(request)

    process_time = time.time() - start_time

    # Performance headers
    response.headers["X-Process-Time"] = f"{process_time:.3f}"
    response.headers["X-Server-Time"] = str(int(time.time()))

    # Performance classification
    if process_time > 1.0:
        response.headers["X-Performance"] = "slow"
    elif process_time > 0.1:
        response.headers["X-Performance"] = "normal"
    else:
        response.headers["X-Performance"] = "fast"

    return response

# Custom headers for API features
@app.get("/api/features")
async def get_features(response: Response):
    """API features with capability headers"""

    features = await get_enabled_features()

    # Feature capability headers
    response.headers["X-API-Features"] = ",".join(features)
    response.headers["X-API-Limits"] = json.dumps({
        "requests_per_hour": 1000,
        "max_file_size": "10MB",
        "supported_formats": ["json", "xml", "csv"]
    })

    return {"features": features}

# Debug headers in development
if settings.DEBUG:
    @app.middleware("http")
    async def debug_headers_middleware(request: Request, call_next):
        """Add debug headers in development"""

        response = await call_next(request)

        # Debug headers
        response.headers["X-Debug-Mode"] = "true"
        response.headers["X-Request-Path"] = request.url.path
        response.headers["X-Request-Method"] = request.method
        response.headers["X-Response-Status"] = str(response.status_code)

        return response
```

**Common mistakes:**
- Missing security headers
- Incorrect cache control directives
- Not setting proper CORS headers
- Missing pagination metadata
- Inconsistent header naming

**When to apply:**
- Security policy enforcement
- Caching strategy implementation
- Content negotiation
- API metadata provision
- Rate limiting feedback
- Performance monitoring