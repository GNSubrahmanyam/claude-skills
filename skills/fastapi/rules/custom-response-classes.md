---
title: Custom Response Classes
impact: MEDIUM
impactDescription: Enables flexible response formatting and specialized content types
tags: fastapi, response, classes, custom, content-types
---

## Custom Response Classes

**Problem:**
Standard JSON responses are sufficient for most APIs, but some applications need custom response formats, binary data, HTML responses, or specialized content types.

**Solution:**
Create custom response classes for different content types and response formats while maintaining FastAPI's type safety and documentation features.

❌ **Wrong: Manual response creation**
```python
from fastapi import Response

@app.get("/download")
async def download_file():
    # Manual response creation - error-prone
    file_data = await get_file_data()
    response = Response(content=file_data, media_type="application/octet-stream")
    response.headers["Content-Disposition"] = "attachment; filename=file.txt"
    return response
```

✅ **Correct: Custom response classes**
```python
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi import Response
from starlette.responses import JSONResponse
from typing import Any
import json

# Custom JSON response with additional headers
class APIResponse(JSONResponse):
    """Custom JSON response with consistent API headers"""

    def __init__(
        self,
        content: Any,
        status_code: int = 200,
        headers: dict = None,
        **kwargs
    ):
        super().__init__(content, status_code, **kwargs)

        # Default API headers
        self.headers["X-API-Version"] = "v1"
        self.headers["Content-Type"] = "application/json"

        # Custom headers
        if headers:
            for key, value in headers.items():
                self.headers[key] = value

# HTML response for web pages
class WebPageResponse(HTMLResponse):
    """HTML response with web page headers"""

    def __init__(self, content: str, status_code: int = 200, **kwargs):
        super().__init__(content, status_code, **kwargs)

        # Web page specific headers
        self.headers["X-Content-Type-Options"] = "nosniff"
        self.headers["X-Frame-Options"] = "DENY"

# CSV response for data export
class CSVResponse(Response):
    """CSV response for data export"""

    def __init__(
        self,
        content: str,
        filename: str = "export.csv",
        status_code: int = 200,
        **kwargs
    ):
        super().__init__(
            content=content,
            status_code=status_code,
            media_type="text/csv",
            **kwargs
        )

        self.headers["Content-Disposition"] = f"attachment; filename={filename}"

# Usage examples
@app.get("/api/data", response_class=APIResponse)
async def get_api_data():
    """API endpoint with custom response class"""
    data = await get_data()

    return APIResponse(
        content={"data": data, "timestamp": datetime.utcnow().isoformat()},
        headers={
            "X-Data-Source": "database",
            "X-Cache-Status": "hit"
        }
    )

@app.get("/webpage", response_class=WebPageResponse)
async def get_webpage():
    """HTML page endpoint"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head><title>FastAPI Web Page</title></head>
    <body><h1>Hello from FastAPI!</h1></body>
    </html>
    """

    return WebPageResponse(content=html_content)

@app.get("/export/csv")
async def export_csv():
    """Export data as CSV"""
    data = await get_export_data()

    # Convert to CSV
    csv_content = "id,name,value\n"
    for item in data:
        csv_content += f"{item['id']},{item['name']},{item['value']}\n"

    return CSVResponse(
        content=csv_content,
        filename=f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    )

# Plain text response
class PlainTextResponse(Response):
    """Plain text response"""

    def __init__(self, content: str, status_code: int = 200, **kwargs):
        super().__init__(
            content=content,
            status_code=status_code,
            media_type="text/plain",
            **kwargs
        )

@app.get("/logs", response_class=PlainTextResponse)
async def get_logs(lines: int = 100):
    """Get application logs as plain text"""
    logs = await get_recent_logs(lines)
    return PlainTextResponse(content="\n".join(logs))

# XML response
class XMLResponse(Response):
    """XML response for legacy systems"""

    def __init__(self, content: str, status_code: int = 200, **kwargs):
        super().__init__(
            content=content,
            status_code=status_code,
            media_type="application/xml",
            **kwargs
        )

@app.get("/legacy/xml", response_class=XMLResponse)
async def get_xml_data():
    """XML response for legacy system integration"""
    data = await get_data()
    xml_content = f"""<?xml version="1.0"?>
<data>
    <items>{len(data)}</items>
    <timestamp>{datetime.utcnow().isoformat()}</timestamp>
</data>"""

    return XMLResponse(content=xml_content)

# Redirect response with custom logic
from fastapi.responses import RedirectResponse

@app.get("/redirect")
async def smart_redirect(user_type: str = "free"):
    """Smart redirect based on user type"""
    if user_type == "premium":
        return RedirectResponse(url="/premium/dashboard", status_code=302)
    elif user_type == "admin":
        return RedirectResponse(url="/admin/panel", status_code=302)
    else:
        return RedirectResponse(url="/public/welcome", status_code=302)

# Streaming response for large content
@app.get("/large-file")
async def stream_large_file():
    """Stream large file efficiently"""
    file_path = await get_large_file_path()

    def file_generator():
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):  # 8KB chunks
                yield chunk

    return StreamingResponse(
        file_generator(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_path.name}"}
    )

# ORJSON response for better performance
try:
    from fastapi.responses import ORJSONResponse
    FastJSONResponse = ORJSONResponse
except ImportError:
    FastJSONResponse = JSONResponse

@app.get("/fast-data", response_class=FastJSONResponse)
async def get_fast_data():
    """High-performance JSON response using orjson"""
    data = await get_large_dataset()
    return {"data": data, "count": len(data)}
```

**Common mistakes:**
- Using Response directly without proper media types
- Missing Content-Disposition for file downloads
- Not setting proper cache headers
- Ignoring content type validation
- Manual response creation instead of custom classes

**When to apply:**
- APIs serving different content types (HTML, CSV, XML)
- File download endpoints
- Legacy system integrations
- Performance-critical responses
- Custom API response formats