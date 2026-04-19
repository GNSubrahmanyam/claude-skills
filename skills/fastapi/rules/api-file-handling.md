# File Upload Handling (HIGH)

**Impact:** HIGH - Ensures secure and reliable file uploads

**Problem:**
Improper file handling can lead to security vulnerabilities, resource exhaustion, and data corruption. Without validation, malicious files can be uploaded and executed.

**Solution:**
Validate file types, sizes, and content before processing. Use FastAPI's `UploadFile` for secure file handling. Store files safely and provide proper error handling.

❌ **Wrong: Insecure file upload**
```python
@app.post("/upload")
async def upload_file(file):
    # No validation, dangerous!
    with open(f"uploads/{file.filename}", "wb") as f:
        f.write(await file.read())  # Can write any file type
    return {"filename": file.filename}
```

✅ **Correct: Secure file upload**
```python
from fastapi import File, UploadFile, HTTPException
from pathlib import Path
import shutil
import mimetypes

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(exist_ok=True)

def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type not allowed: {file_ext}")

    # Check MIME type
    content_type, _ = mimetypes.guess_type(file.filename)
    if content_type not in ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']:
        raise HTTPException(400, "Invalid file type")

    # Check file size
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)  # Reset position

    if size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large: {size} bytes (max {MAX_FILE_SIZE})")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Secure file upload endpoint"""
    try:
        validate_file(file)

        # Generate safe filename
        import uuid
        safe_filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
        file_path = UPLOAD_DIR / safe_filename

        # Save file securely
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {
            "filename": safe_filename,
            "original_name": file.filename,
            "size": file_path.stat().st_size,
            "content_type": file.content_type
        }

    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")

# Multiple file upload
@app.post("/upload-multiple")
async def upload_multiple_files(files: List[UploadFile] = File(...)):
    uploaded_files = []

    for file in files:
        try:
            validate_file(file)
            safe_filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
            file_path = UPLOAD_DIR / safe_filename

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            uploaded_files.append({
                "filename": safe_filename,
                "original_name": file.filename
            })

        except Exception as e:
            # Clean up any partially uploaded files
            for uploaded in uploaded_files:
                (UPLOAD_DIR / uploaded["filename"]).unlink(missing_ok=True)
            raise HTTPException(400, f"Upload failed for {file.filename}: {str(e)}")

    return {"uploaded_files": uploaded_files}
```

**Common mistakes:**
- Not validating file types and sizes
- Using original filenames directly
- Storing files in web-accessible directories
- Not handling upload errors properly
- No cleanup on failed uploads

**When to apply:**
- Image upload endpoints
- Document upload APIs
- Media file handling
- Any file-based API functionality