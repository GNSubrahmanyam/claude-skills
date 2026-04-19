# Query Parameters (HIGH)

**Impact:** HIGH - Enables flexible API filtering and search functionality

**Problem:**
APIs need to support filtering, sorting, and pagination through query parameters. Manual parsing leads to inconsistent parameter handling and security vulnerabilities.

**Solution:**
Use FastAPI's Query parameter declaration with automatic validation, documentation, and type conversion. Provide sensible defaults and proper validation constraints.

❌ **Wrong: Manual query parameter parsing**
```python
from fastapi import Request

@app.get("/users/")
async def get_users(request: Request):
    # Manual parsing - error-prone
    query_params = dict(request.query_params)
    limit = int(query_params.get("limit", "10"))
    offset = int(query_params.get("offset", "0"))
    search = query_params.get("search", "")

    # Manual validation
    if limit > 100:
        limit = 100
    if limit < 1:
        limit = 10

    users = await search_users(search, limit, offset)
    return users
```

✅ **Correct: Automatic query parameter handling**
```python
from fastapi import Query
from typing import Optional, List

@app.get("/users/")
async def get_users(
    # Basic parameters
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of users to return"),

    # Optional parameters
    search: Optional[str] = Query(None, min_length=1, max_length=100, description="Search term"),
    status: Optional[str] = Query(None, regex="^(active|inactive)$", description="User status filter"),

    # Boolean parameters
    include_deleted: bool = Query(False, description="Include deleted users"),

    # List parameters
    tags: Optional[List[str]] = Query(None, description="Filter by tags")
):
    """Get users with comprehensive query parameter validation"""

    # Build query filters
    filters = {}
    if search:
        filters["search"] = search
    if status:
        filters["status"] = status
    if include_deleted:
        filters["include_deleted"] = True
    if tags:
        filters["tags"] = tags

    users = await get_users_with_filters(
        skip=skip,
        limit=limit,
        filters=filters
    )

    return {
        "users": users,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": len(users)  # In practice, get from database
        }
    }

# Advanced query parameters with aliases
@app.get("/search/")
async def search_items(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    category: Optional[str] = Query(None, alias="cat", description="Category filter"),
    sort_by: str = Query("relevance", regex="^(relevance|date|rating)$", description="Sort criteria"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order")
):
    """Search with aliased query parameters"""
    results = await perform_search(
        query=q,
        category=category,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return {"results": results}

# Query parameters with dependencies
def validate_date_range(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Validate date range query parameters"""
    if start_date and end_date:
        from datetime import datetime
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        if start > end:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
    return {"start_date": start_date, "end_date": end_date}

@app.get("/reports/")
async def get_reports(
    date_range: dict = Depends(validate_date_range),
    report_type: str = Query("summary", regex="^(summary|detailed|export)$")
):
    """Reports with validated date range"""
    return await generate_report(
        start_date=date_range["start_date"],
        end_date=date_range["end_date"],
        report_type=report_type
    )
```

**Common mistakes:**
- Not providing default values for optional parameters
- Missing validation constraints
- Using wrong parameter types
- Not documenting parameter purposes
- Handling query parsing manually

**When to apply:**
- API filtering and search
- Pagination controls
- Sorting and ordering
- Optional feature toggles
- Advanced search interfaces