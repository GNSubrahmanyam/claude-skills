# API Pagination (HIGH)

**Impact:** HIGH - Prevents performance issues with large datasets

**Problem:**
Returning all records without pagination can cause performance issues, memory exhaustion, and slow response times. Large result sets can crash applications or make responses unusable.

**Solution:**
Implement cursor-based or offset-based pagination with configurable page sizes and proper navigation metadata. Use database-efficient pagination queries.

❌ **Wrong: No pagination**
```python
@app.get("/users/")
async def get_users(db: AsyncSession = Depends(get_db)):
    users = await db.execute(select(User))  # Returns ALL users!
    return users.scalars().all()  # Can be millions of records!
```

✅ **Correct: Cursor-based pagination**
```python
from fastapi import Query
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import select

class PaginatedResponse(BaseModel):
    data: List[dict]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool

async def paginate_query(
    query,
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50
) -> PaginatedResponse:
    """Helper for efficient pagination"""
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.execute(count_query)
    total_count = total.scalar()

    # Apply pagination
    offset = (page - 1) * page_size
    paginated_query = query.offset(offset).limit(page_size)
    result = await db.execute(paginated_query)
    items = result.scalars().all()

    total_pages = (total_count + page_size - 1) // page_size

    return PaginatedResponse(
        data=[item.__dict__ for item in items],
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )

@app.get("/users/", response_model=PaginatedResponse)
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    query = select(User).order_by(User.created_at.desc())
    return await paginate_query(query, db, page, page_size)
```

**Common mistakes:**
- Loading all records into memory
- Not limiting page sizes
- Inefficient count queries
- Not providing navigation metadata

**When to apply:**
- Any endpoint returning multiple records
- Search and filter endpoints
- Admin interfaces
- Public APIs with variable data sizes