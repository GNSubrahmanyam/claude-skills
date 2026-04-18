# Header Parameters (MEDIUM)

**Impact:** MEDIUM - Enables metadata passing and API versioning

**Problem:**
APIs need to handle HTTP headers for authentication, content negotiation, versioning, and custom metadata. Manual header parsing leads to inconsistencies and security issues.

**Solution:**
Use FastAPI's Header parameter declaration with automatic validation and type conversion. Handle common headers like Authorization, Content-Type, and custom headers.

❌ **Wrong: Manual header parsing**
```python
from fastapi import Request

@app.get("/api/data")
async def get_data(request: Request):
    # Manual header parsing - error-prone
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing authorization")

    # Manual parsing of Bearer token
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = auth_header[7:]  # Remove "Bearer "

    version = request.headers.get("x-api-version", "v1")
```

✅ **Correct: Automatic header parameter handling**
```python
from fastapi import Header, HTTPException
from typing import Optional
import re

@app.get("/api/data")
async def get_data(
    authorization: str = Header(..., description="Bearer token for authentication"),
    x_api_version: str = Header("v1", regex=r"^v\d+$", description="API version"),
    user_agent: Optional[str] = Header(None, description="Client user agent"),
    accept_language: str = Header("en", description="Preferred language")
):
    """Get data with automatic header validation"""

    # Validate Bearer token format
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization[7:]  # Extract token after "Bearer "

    # Validate token
    user = await validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Handle API versioning
    if x_api_version == "v2":
        # V2 specific logic
        data = await get_data_v2(user)
    else:
        # V1 default logic
        data = await get_data_v1(user)

    return {
        "data": data,
        "version": x_api_version,
        "language": accept_language
    }

# Content negotiation headers
@app.get("/documents/{doc_id}")
async def get_document(
    doc_id: str,
    accept: str = Header("application/json", description="Accepted content type"),
    response_format: Optional[str] = Header(None, alias="X-Response-Format")
):
    """Get document with content negotiation"""

    document = await get_document_by_id(doc_id)

    # Handle content negotiation
    if "application/pdf" in accept or response_format == "pdf":
        # Return PDF
        pdf_content = await generate_pdf(document)
        return Response(content=pdf_content, media_type="application/pdf")

    elif "text/html" in accept or response_format == "html":
        # Return HTML
        html_content = await generate_html(document)
        return Response(content=html_content, media_type="text/html")

    else:
        # Default JSON response
        return {"document": document}

# Custom headers for API features
@app.get("/search")
async def search_items(
    q: str = Query(..., min_length=1),
    x_request_id: Optional[str] = Header(None, description="Request tracking ID"),
    x_forwarded_for: Optional[str] = Header(None, description="Original client IP"),
    x_real_ip: Optional[str] = Header(None, description="Real client IP behind proxy")
):
    """Search with custom headers for tracking and proxy handling"""

    # Log request for debugging
    logger.info(
        "Search request",
        query=q,
        request_id=x_request_id,
        client_ip=x_forwarded_for or x_real_ip
    )

    results = await perform_search(q)

    # Include request ID in response for tracking
    response = {"results": results}
    if x_request_id:
        response["request_id"] = x_request_id

    return response

# Conditional requests with headers
@app.get("/resources/{resource_id}")
async def get_resource(
    resource_id: str,
    if_modified_since: Optional[str] = Header(None, description="Conditional request header"),
    if_none_match: Optional[str] = Header(None, description="ETag conditional header")
):
    """Get resource with conditional request support"""

    resource = await get_resource_by_id(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Handle If-Modified-Since
    if if_modified_since:
        try:
            client_modified = datetime.fromisoformat(if_modified_since.replace('Z', '+00:00'))
            if resource.updated_at <= client_modified:
                return Response(status_code=304)  # Not Modified
        except ValueError:
            pass  # Invalid date format, ignore

    # Handle If-None-Match (ETags)
    if if_none_match:
        client_etag = if_none_match.strip('"')
        resource_etag = generate_etag(resource)
        if client_etag == resource_etag:
            return Response(status_code=304)  # Not Modified

    return resource
```

**Common mistakes:**
- Not validating header formats
- Case sensitivity issues with headers
- Missing authorization header validation
- Not handling proxy headers properly
- Manual header parsing and validation

**When to apply:**
- Authentication and authorization
- API versioning
- Content negotiation
- Request tracking and debugging
- Conditional requests (caching)
- Proxy and load balancer handling