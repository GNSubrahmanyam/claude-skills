# Path Parameters (HIGH)

**Impact:** HIGH - Enables dynamic URL routing and resource identification

**Problem:**
Hardcoded URLs make APIs inflexible and difficult to maintain. Path parameters allow dynamic resource identification but improper handling can lead to routing conflicts and security issues.

**Solution:**
Use FastAPI's path parameter syntax with proper type hints and validation. Handle parameter conversion and validation automatically.

❌ **Wrong: Manual parameter extraction**
```python
from fastapi import Request

@app.get("/users/{user_id}")
async def get_user(request: Request):
    user_id = request.path_params.get("user_id")  # Manual extraction
    if not user_id:
        return {"error": "User ID required"}
    # Manual validation and conversion
    try:
        user_id = int(user_id)
    except ValueError:
        return {"error": "Invalid user ID"}
    # Rest of logic...
```

✅ **Correct: Automatic path parameter handling**
```python
from fastapi import Path, HTTPException

@app.get("/users/{user_id}")
async def get_user(
    user_id: int = Path(..., title="User ID", description="The ID of the user to retrieve", ge=1)
):
    """Get user by ID with automatic validation"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Multiple path parameters
@app.get("/users/{user_id}/posts/{post_id}")
async def get_user_post(
    user_id: int = Path(..., ge=1),
    post_id: int = Path(..., ge=1, description="The ID of the post")
):
    """Get specific post from specific user"""
    post = await get_post_by_user_and_id(user_id, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

# Path with validation and examples
@app.get("/items/{item_id}")
async def read_item(
    item_id: int = Path(
        ...,
        title="Item ID",
        description="The ID of the item to retrieve",
        ge=1,
        le=1000,
        examples={"default": 123, "max": 1000}
    )
):
    """Read item with comprehensive path parameter validation"""
    return {"item_id": item_id}
```

**Common mistakes:**
- Not using type hints for path parameters
- Missing validation constraints
- Not handling parameter conversion errors
- Using string parameters when integers are expected

**When to apply:**
- Resource identification in REST APIs
- Dynamic URL routing
- Hierarchical resource access
- Any endpoint needing variable path segments