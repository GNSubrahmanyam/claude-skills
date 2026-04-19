# Static Files (MEDIUM)

**Impact:** MEDIUM - Enables serving of static assets and file resources

**Problem:**
Web applications need to serve static files like images, CSS, JavaScript, and documentation. Improper static file handling can expose sensitive files or cause performance issues.

**Solution:**
Use FastAPI's StaticFiles mounting with proper directory configuration and security considerations.

❌ **Wrong: Manual file serving**
```python
from fastapi import Request
import os

@app.get("/files/{filename}")
async def get_file(filename: str):
    # Dangerous - serves any file
    file_path = f"/var/www/files/{filename}"
    if os.path.exists(file_path):
        with open(file_path, 'rb') as f:
            content = f.read()
        return Response(content=content)
    return {"error": "File not found"}
```

✅ **Correct: Secure static file serving**
```python
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException
from pathlib import Path
import mimetypes

# Create static directories
STATIC_DIR = Path("static")
UPLOADS_DIR = Path("uploads")
DOCS_DIR = Path("docs")

STATIC_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)
DOCS_DIR.mkdir(exist_ok=True)

# Mount static file directories
app = FastAPI()

# Public static files (CSS, JS, images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# User-uploaded files (with access control)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# API documentation files
app.mount("/docs-static", StaticFiles(directory="docs"), name="docs")

# Secure file serving with validation
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt'}
MAX_FILENAME_LENGTH = 255

@app.get("/files/{file_path:path}")
async def serve_secure_file(file_path: str):
    """Serve files with security validation"""

    # Validate file path (prevent directory traversal)
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    # Check filename length
    if len(file_path) > MAX_FILENAME_LENGTH:
        raise HTTPException(status_code=400, detail="Filename too long")

    # Validate file extension
    file_ext = Path(file_path).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=403, detail="File type not allowed")

    # Check if file exists in uploads directory
    full_path = UPLOADS_DIR / file_path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Check file size (prevent large file serving)
    file_size = full_path.stat().st_size
    if file_size > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=413, detail="File too large")

    # Determine MIME type
    content_type, _ = mimetypes.guess_type(file_path)
    if not content_type:
        content_type = "application/octet-stream"

    # Return file with appropriate headers
    return FileResponse(
        path=full_path,
        media_type=content_type,
        filename=full_path.name  # For downloads
    )

# File upload with static serving
@app.post("/upload-image/")
async def upload_image(file: UploadFile = File(...)):
    """Upload image and serve via static files"""

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images allowed")

    # Generate safe filename
    import uuid
    file_ext = Path(file.filename).suffix
    safe_filename = f"{uuid.uuid4()}{file_ext}"

    # Save to uploads directory
    file_path = UPLOADS_DIR / safe_filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return public URL
    return {
        "filename": safe_filename,
        "url": f"/uploads/{safe_filename}",
        "size": file_path.stat().st_size
    }

# Static file with caching headers
from fastapi.responses import FileResponse

@app.get("/assets/{filename}")
async def serve_asset(filename: str):
    """Serve static assets with caching"""

    file_path = STATIC_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Asset not found")

    # Check if it's a static asset
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Asset not found")

    response = FileResponse(path=file_path)

    # Add caching headers for static assets
    if filename.endswith(('.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico')):
        response.headers["Cache-Control"] = "public, max-age=31536000"  # 1 year
    elif filename.endswith('.html'):
        response.headers["Cache-Control"] = "public, max-age=3600"  # 1 hour
    else:
        response.headers["Cache-Control"] = "no-cache"

    return response

# SPA fallback for client-side routing
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """Serve index.html for SPA routing"""

    # Check if it's an API route or static file
    if full_path.startswith("api/") or full_path.startswith("static/"):
        raise HTTPException(status_code=404, detail="Not found")

    # Check if file exists in static directory
    static_file = STATIC_DIR / full_path
    if static_file.exists() and static_file.is_file():
        return FileResponse(path=static_file)

    # Serve SPA index.html for all other routes
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(path=index_file)

    raise HTTPException(status_code=404, detail="Not found")
```

**Common mistakes:**
- Directory traversal vulnerabilities
- Serving sensitive files
- No file type validation
- Missing caching headers
- Large files causing memory issues

**When to apply:**
- Serving CSS, JavaScript, images
- User-uploaded content
- API documentation
- SPA assets and routing
- Public file sharing