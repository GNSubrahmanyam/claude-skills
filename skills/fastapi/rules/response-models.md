# Response Models (HIGH)

**Impact:** HIGH - Ensures consistent API responses and automatic documentation

**Problem:**
Inconsistent response formats lead to poor API usability and integration difficulties. Manual response construction misses validation and documentation opportunities.

**Solution:**
Use Pydantic models for response validation with automatic JSON serialization, documentation generation, and type safety.

❌ **Wrong: Manual response construction**
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await get_user_from_db(user_id)
    if not user:
        return {"error": "User not found", "status": 404}

    # Manual response construction - inconsistent
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
        "is_active": user.is_active,
        "status": 200
    }
```

✅ **Correct: Response model validation**
```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserResponse(BaseModel):
    id: int = Field(..., description="Unique user identifier")
    username: str = Field(..., description="User's username")
    email: str = Field(..., description="User's email address")
    created_at: datetime = Field(..., description="Account creation timestamp")
    is_active: bool = Field(..., description="Account activation status")
    profile_url: Optional[str] = Field(None, description="Profile image URL")

    class Config:
        orm_mode = True  # For SQLAlchemy compatibility
        schema_extra = {
            "example": {
                "id": 123,
                "username": "johndoe",
                "email": "john@example.com",
                "created_at": "2023-01-01T00:00:00Z",
                "is_active": True,
                "profile_url": "https://example.com/profiles/johndoe.jpg"
            }
        }

class UserListResponse(BaseModel):
    users: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    has_next: bool = Field(..., description="Whether there are more pages")

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    """Get user with validated response"""
    user = await get_user_from_db(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user  # Automatic validation and serialization

@app.get("/users/", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    """List users with paginated response"""
    users = await get_users_paginated(page, page_size)
    total = await get_total_user_count()

    return {
        "users": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": (page * page_size) < total
    }

# Multiple response models
class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0)
    category: str

class ItemResponse(BaseModel):
    id: int
    name: str
    price: float
    category: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class ItemListResponse(BaseModel):
    items: List[ItemResponse]
    total: int
    page: int
    page_size: int

@app.post("/items/", response_model=ItemResponse, status_code=201)
async def create_item(item: ItemCreate):
    """Create item with specific response model and status"""
    db_item = await create_item_in_db(item.dict())
    return db_item

@app.get("/items/", response_model=ItemListResponse)
async def list_items(page: int = 1, page_size: int = 10):
    """List items with list response model"""
    items = await get_items_paginated(page, page_size)
    total = await get_total_item_count()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

# Response with different models for different status codes
@app.get(
    "/items/{item_id}",
    response_model=ItemResponse,
    responses={
        200: {"model": ItemResponse, "description": "Item found"},
        404: {"model": ErrorResponse, "description": "Item not found"},
        403: {"model": ErrorResponse, "description": "Not authorized"}
    }
)
async def get_item(item_id: int, current_user: User = Depends(get_current_user)):
    """Get item with multiple possible response models"""
    item = await get_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if not can_access_item(current_user, item):
        raise HTTPException(status_code=403, detail="Not authorized to view this item")

    return item

# Union response types
from typing import Union

@app.get("/search/")
async def search(query: str = Query(..., min_length=1)):
    """Search with union response types"""
    if query.startswith("user:"):
        # Return user results
        users = await search_users(query[5:])
        return {"type": "users", "results": users}
    else:
        # Return item results
        items = await search_items(query)
        return {"type": "items", "results": items}

# Custom response classes
from fastapi.responses import JSONResponse
from starlette.responses import Response

class CustomResponse(JSONResponse):
    """Custom response with additional headers"""
    def __init__(self, content, status_code=200, headers=None, **kwargs):
        super().__init__(content, status_code, **kwargs)
        if headers:
            for key, value in headers.items():
                self.headers[key] = value

@app.get("/export/data")
async def export_data():
    """Export with custom response headers"""
    data = await generate_export_data()

    return CustomResponse(
        content={"data": data, "exported_at": datetime.utcnow().isoformat()},
        headers={
            "X-Export-ID": str(uuid.uuid4()),
            "X-Export-Format": "json",
            "Cache-Control": "no-cache"
        }
    )
```

**Common mistakes:**
- Not using response_model declarations
- Manual JSON serialization
- Inconsistent response formats
- Missing error response models
- Not providing examples in schemas

**When to apply:**
- All API endpoints returning data
- Ensuring response consistency
- Automatic OpenAPI documentation generation
- Type-safe response validation
- Complex response structures