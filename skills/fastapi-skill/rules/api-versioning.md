# API Versioning (HIGH)

**Impact:** HIGH - Enables backward compatibility and controlled API evolution

**Problem:**
API changes without versioning break existing clients and cause integration failures. APIs evolve over time, but clients need stability.

**Solution:**
Implement URL-based versioning with clear deprecation policies. Support multiple versions simultaneously and communicate breaking changes.

❌ **Wrong: No versioning**
```python
# API evolves without versioning - breaks clients
@app.get("/users/")
async def get_users():  # v1 behavior
    return {"users": [...]}

# Later, change breaks existing clients
@app.get("/users/")
async def get_users(include_deleted: bool = False):  # Breaking change!
    return {"users": [...], "deleted": [...]}
```

✅ **Correct: URL-based versioning**
```python
from fastapi import APIRouter

# API v1 router
v1_router = APIRouter(prefix="/api/v1")

@v1_router.get("/users/")
async def get_users_v1(db: AsyncSession = Depends(get_db)):
    """V1: Basic user list"""
    users = await db.execute(select(User))
    return {"users": users.scalars().all()}

# API v2 router with enhancements
v2_router = APIRouter(prefix="/api/v2")

@v2_router.get("/users/")
async def get_users_v2(
    include_deleted: bool = False,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """V2: Enhanced with pagination and deleted users"""
    query = select(User)
    if not include_deleted:
        query = query.where(User.is_active == True)

    # Apply pagination
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    users = result.scalars().all()

    return {
        "users": users,
        "page": page,
        "page_size": page_size,
        "total": len(users)  # Simplified - use count in production
    }

# Mount routers
app = FastAPI()
app.include_router(v1_router)
app.include_router(v2_router)

# Version information endpoint
@app.get("/api/versions")
async def get_api_versions():
    """List available API versions"""
    return {
        "versions": ["v1", "v2"],
        "current": "v2",
        "deprecated": ["v1"],
        "sunset_date": "2024-12-31",
        "changelog": {
            "v2": ["Added pagination", "Added include_deleted parameter"]
        }
    }

# Custom middleware for version headers
@app.middleware("http")
async def add_version_header(request: Request, call_next):
    response = await call_next(request)

    # Extract version from URL path
    path_parts = request.url.path.split("/")
    if "api" in path_parts:
        api_index = path_parts.index("api")
        if api_index + 1 < len(path_parts):
            version = path_parts[api_index + 1]
            response.headers["X-API-Version"] = version

    return response
```

**Common mistakes:**
- Breaking changes without version bumps
- Not supporting multiple versions simultaneously
- Poor communication of deprecated versions
- Not providing migration guides

**When to apply:**
- Any public API
- APIs with external clients
- Breaking schema changes
- Feature additions that change behavior