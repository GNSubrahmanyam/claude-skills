# Pydantic Model Usage (HIGH)

**Impact:** HIGH - Ensures type safety and automatic validation

**Problem:**
Manual data validation leads to inconsistent error handling, type errors, and security vulnerabilities from unvalidated input. Without proper models, applications accept malformed data and fail unexpectedly.

**Solution:**
Use Pydantic BaseModel for all data structures. Leverage automatic validation, type conversion, and JSON schema generation. Define models for request/response data, configuration, and internal data structures.

❌ **Wrong: Manual validation**
```python
@app.post("/users/")
async def create_user(request):
    data = await request.json()

    # Manual validation - error-prone and incomplete
    if "username" not in data:
        return {"error": "username required"}
    if len(data["username"]) < 3:
        return {"error": "username too short"}

    user = User(username=data["username"], email=data.get("email"))
    # No type checking, validation, or documentation
```

✅ **Correct: Pydantic models**
```python
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
    age: int = Field(None, ge=0, le=150)

    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john@example.com",
                "age": 30
            }
        }

@app.post("/users/", response_model=User)
async def create_user(user: UserCreate):
    # Automatic validation, type conversion, and documentation
    return await create_user_in_db(user)
```

**Common mistakes:**
- Not using Field() for additional validation constraints
- Missing response_model declarations
- Not handling validation errors properly
- Using dict instead of proper models for complex data

**When to apply:**
- All API request/response models
- Configuration classes
- Internal data transfer objects
- Any structured data that needs validation