# Form Data Handling (HIGH)

**Impact:** HIGH - Enables form-based data submission and file uploads

**Problem:**
Web applications need to handle HTML forms and multipart form data. Manual form parsing leads to security vulnerabilities and inconsistent data handling.

**Solution:**
Use FastAPI's Form parameter declaration for secure form data handling with automatic validation and type conversion.

❌ **Wrong: Manual form parsing**
```python
from fastapi import Request

@app.post("/contact")
async def contact_form(request: Request):
    # Manual form parsing - dangerous
    form_data = await request.form()
    name = form_data.get("name")
    email = form_data.get("email")

    # No validation, no type safety
    return {"name": name, "email": email}
```

✅ **Correct: Automatic form data handling**
```python
from fastapi import Form, File, UploadFile
from pydantic import BaseModel, EmailStr, validator
from typing import Optional

class ContactForm(BaseModel):
    name: str = Form(..., min_length=1, max_length=100)
    email: EmailStr = Form(...)
    message: str = Form(..., min_length=10, max_length=1000)
    priority: str = Form("normal", regex="^(low|normal|high|urgent)$")

    @validator('name')
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

@app.post("/contact")
async def submit_contact_form(form: ContactForm):
    """Handle contact form with automatic validation"""
    # Form data is automatically validated and converted
    await save_contact_form(form.dict())

    return {
        "message": "Contact form submitted successfully",
        "priority": form.priority
    }

# File upload forms
@app.post("/upload-document")
async def upload_document(
    title: str = Form(..., min_length=1, max_length=200),
    description: Optional[str] = Form(None, max_length=500),
    category: str = Form(..., regex="^(report|document|image|other)$"),
    file: UploadFile = File(...)
):
    """Upload document with metadata form"""

    # Validate file
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large")

    allowed_types = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")

    # Save file
    file_path = await save_upload_file(file)

    # Save metadata
    metadata = {
        "title": title,
        "description": description,
        "category": category,
        "file_path": file_path,
        "file_size": file.size,
        "content_type": file.content_type
    }

    await save_document_metadata(metadata)

    return {
        "message": "Document uploaded successfully",
        "document_id": metadata["id"]
    }

# Multiple files with form data
@app.post("/upload-multiple")
async def upload_multiple_files(
    project_name: str = Form(..., min_length=1, max_length=100),
    tags: str = Form("", description="Comma-separated tags"),
    files: List[UploadFile] = File(..., description="Multiple files to upload")
):
    """Upload multiple files with project metadata"""

    # Parse tags
    tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

    uploaded_files = []
    total_size = 0

    for file in files:
        # Validate each file
        if file.size > 50 * 1024 * 1024:  # 50MB per file
            raise HTTPException(status_code=413, detail=f"File {file.filename} too large")

        # Save file
        file_path = await save_upload_file(file)
        total_size += file.size

        uploaded_files.append({
            "filename": file.filename,
            "path": file_path,
            "size": file.size,
            "content_type": file.content_type
        })

    # Create project record
    project_data = {
        "name": project_name,
        "tags": tag_list,
        "files": uploaded_files,
        "total_size": total_size,
        "file_count": len(files)
    }

    project = await create_project(project_data)

    return {
        "project_id": project.id,
        "uploaded_files": len(files),
        "total_size": total_size
    }

# Form with conditional fields
@app.post("/register")
async def register_user(
    username: str = Form(..., min_length=3, max_length=50),
    email: EmailStr = Form(...),
    password: str = Form(..., min_length=8),
    user_type: str = Form(..., regex="^(individual|business)$"),

    # Business-specific fields (optional)
    company_name: Optional[str] = Form(None, max_length=100),
    tax_id: Optional[str] = Form(None, regex=r'^\d{9}$'),
    business_address: Optional[str] = Form(None, max_length=500),

    # Individual-specific fields (optional)
    first_name: Optional[str] = Form(None, max_length=50),
    last_name: Optional[str] = Form(None, max_length=50),
    date_of_birth: Optional[str] = Form(None, regex=r'^\d{4}-\d{2}-\d{2}$')
):
    """Registration form with conditional fields"""

    # Validate conditional fields based on user type
    if user_type == "business":
        if not company_name:
            raise HTTPException(status_code=400, detail="Company name required for business accounts")
        if not tax_id:
            raise HTTPException(status_code=400, detail="Tax ID required for business accounts")

        user_data = {
            "type": "business",
            "username": username,
            "email": email,
            "company_name": company_name,
            "tax_id": tax_id,
            "business_address": business_address
        }

    else:  # individual
        if not first_name or not last_name:
            raise HTTPException(status_code=400, detail="First and last name required for individual accounts")

        user_data = {
            "type": "individual",
            "username": username,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": date_of_birth
        }

    # Hash password
    user_data["hashed_password"] = get_password_hash(password)

    user = await create_user(user_data)
    return {"user_id": user.id, "message": "User registered successfully"}

# Form with file and data validation
class DocumentUpload(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: str = Field(..., regex="^(contract|invoice|report|other)$")
    is_public: bool = Field(default=False)

    @validator('title')
    def title_not_reserved(cls, v):
        reserved_words = ["admin", "system", "test"]
        if v.lower() in reserved_words:
            raise ValueError('Title contains reserved word')
        return v

@app.post("/upload-validated")
async def upload_with_validation(
    file: UploadFile = File(...),
    title: str = Form(..., min_length=1, max_length=200),
    description: Optional[str] = Form(None, max_length=1000),
    category: str = Form(..., regex="^(contract|invoice|report|other)$"),
    is_public: bool = Form(False)
):
    """Upload with both file and form validation"""

    # Validate form data
    form_data = DocumentUpload(
        title=title,
        description=description,
        category=category,
        is_public=is_public
    )

    # Validate file
    max_size = 25 * 1024 * 1024  # 25MB
    if file.size > max_size:
        raise HTTPException(status_code=413, detail="File too large")

    allowed_mimes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "image/jpeg",
        "image/png"
    ]

    if file.content_type not in allowed_mimes:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    # Process upload
    file_path = await save_secure_file(file)
    document = await create_document(form_data.dict(), file_path)

    return {
        "document_id": document.id,
        "title": form_data.title,
        "file_size": file.size,
        "uploaded_at": document.created_at
    }
```

**Common mistakes:**
- Not validating file types and sizes
- Mixing form data with JSON in same endpoint
- Not handling multipart boundaries properly
- Missing CSRF protection for forms
- Storing uploaded files insecurely

**When to apply:**
- HTML form submissions
- File uploads with metadata
- Complex multipart forms
- Registration and contact forms
- Document management systems