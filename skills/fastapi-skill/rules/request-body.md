# Request Body (HIGH)

**Impact:** HIGH - Enables data submission and complex input handling

**Problem:**
APIs need to accept structured data through request bodies. Manual JSON parsing leads to inconsistent handling, validation issues, and security vulnerabilities.

**Solution:**
Use Pydantic models for request body validation with automatic type conversion, validation, and documentation generation.

❌ **Wrong: Manual request body parsing**
```python
from fastapi import Request, HTTPException

@app.post("/users/")
async def create_user(request: Request):
    try:
        data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Manual validation - error-prone
    required_fields = ["username", "email", "password"]
    for field in required_fields:
        if field not in data:
            raise HTTPException(status_code=400, detail=f"{field} is required")

    if len(data["username"]) < 3:
        raise HTTPException(status_code=400, detail="Username too short")

    # Manual type checking
    if not isinstance(data.get("age", 0), int):
        raise HTTPException(status_code=400, detail="Age must be integer")

    user = await create_user_in_db(data)
    return user
```

✅ **Correct: Automatic request body validation**
```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from fastapi import Body

class Address(BaseModel):
    street: str = Field(..., min_length=1, max_length=100)
    city: str = Field(..., min_length=1, max_length=50)
    zip_code: str = Field(..., regex=r'^\d{5}(-\d{4})?$')

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: str = Field(..., regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', description="Valid email address")
    password: str = Field(..., min_length=8, description="Strong password")
    age: Optional[int] = Field(None, ge=0, le=150, description="Age in years")
    addresses: List[Address] = Field(default_factory=list, description="User addresses")
    is_active: bool = Field(default=True, description="Account status")

    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric, underscore, or dash')
        return v

    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john@example.com",
                "password": "securepass123",
                "age": 30,
                "addresses": [
                    {
                        "street": "123 Main St",
                        "city": "Anytown",
                        "zip_code": "12345"
                    }
                ]
            }
        }

@app.post("/users/", response_model=User)
async def create_user(user: UserCreate):
    """Create user with automatic request body validation"""
    # user is automatically validated and converted
    db_user = await create_user_in_db(user.dict())
    return db_user

# Multiple body parameters
@app.post("/users/{user_id}/posts/")
async def create_post(
    user_id: int,
    post: PostCreate,
    metadata: Optional[PostMetadata] = None
):
    """Create post with multiple body parameters"""
    post_data = post.dict()
    if metadata:
        post_data.update(metadata.dict())

    db_post = await create_post_in_db(user_id, post_data)
    return db_post

# Form data handling
from fastapi import Form

@app.post("/login/")
async def login(
    username: str = Form(..., description="Username or email"),
    password: str = Form(..., description="Password"),
    remember_me: bool = Form(False, description="Stay logged in")
):
    """Login with form data"""
    user = await authenticate_user(username, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "remember_me": remember_me
    }

# Mixed parameters
@app.post("/upload/")
async def upload_file_with_metadata(
    file: UploadFile = File(...),
    description: str = Form(..., max_length=500),
    tags: List[str] = Form(..., description="Comma-separated tags")
):
    """Upload file with mixed form and file data"""
    # Process file and metadata
    file_path = await save_upload_file(file)
    metadata = await save_file_metadata(file_path, description, tags)

    return {
        "file_path": file_path,
        "metadata": metadata
    }

# Embedded body in other parameters
@app.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user with embedded body parameter"""
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    updated_user = await update_user_in_db(user_id, user_update.dict())
    return updated_user
```

**Common mistakes:**
- Not using Pydantic models for request bodies
- Manual JSON parsing and validation
- Missing field validation and constraints
- Not providing examples in schemas
- Handling complex nested data manually

**When to apply:**
- Creating resources (POST endpoints)
- Updating resources (PUT/PATCH endpoints)
- Complex data submission
- Form data handling
- File uploads with metadata