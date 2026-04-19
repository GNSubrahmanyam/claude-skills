---
title: Body Updates & Partial Data
impact: HIGH
impactDescription: Enables efficient resource updates and proper REST API design
tags: fastapi, body, updates, partial-data, patch
---

## Body Updates & Partial Data

**Problem:**
APIs need to support partial updates (PATCH operations) where clients can update only specific fields without sending complete resource data. Full updates (PUT) require all fields, while partial updates allow flexible modifications.

**Solution:**
Implement proper PATCH operations with partial models, validation of updatable fields, and support for conditional updates.

❌ **Wrong: Only full updates**
```python
# Only supports full replacement
@app.put("/users/{user_id}")
async def update_user(user_id: int, user: UserUpdate):
    # Requires all fields to be sent
    existing_user = await get_user(user_id)
    # Replace entire user object - inefficient and error-prone
    await update_user_in_db(user_id, user.dict())
    return user
```

✅ **Correct: Partial updates with PATCH**
```python
from pydantic import BaseModel, Field
from typing import Optional
from fastapi import HTTPException

class UserUpdatePartial(BaseModel):
    """Model for partial user updates"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
    age: Optional[int] = Field(None, ge=13, le=120)
    is_active: Optional[bool] = None

    # Custom validation for partial updates
    def dict_for_update(self):
        """Return only non-None values for database update"""
        return {k: v for k, v in self.dict().items() if v is not None}

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[float] = Field(None, gt=0)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = Field(None, min_length=1)
    in_stock: Optional[bool] = None

    def get_update_data(self):
        """Get update data with validation"""
        update_data = self.dict(exclude_unset=True)

        # Business rules for partial updates
        if 'price' in update_data and update_data['price'] < 0.01:
            raise ValueError("Price must be greater than 0.01")

        return update_data

# PATCH endpoint for partial updates
@app.patch(
    "/users/{user_id}",
    response_model=User,
    summary="Update User (Partial)",
    description="Update user fields partially. Only provided fields will be updated."
)
async def update_user_partial(
    user_id: int,
    user_update: UserUpdatePartial,
    current_user: User = Depends(get_current_user)
):
    """Partial user update with field-level validation"""

    # Check permissions
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")

    # Get existing user
    existing_user = await get_user_by_id(user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get only the fields that should be updated
    update_data = user_update.dict_for_update()

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Check for conflicts (e.g., username uniqueness)
    if 'username' in update_data:
        existing_with_username = await get_user_by_username(update_data['username'])
        if existing_with_username and existing_with_username.id != user_id:
            raise HTTPException(status_code=409, detail="Username already taken")

    # Apply updates
    updated_user = await update_user_fields(user_id, update_data)

    return updated_user

# PUT endpoint for full updates
@app.put(
    "/users/{user_id}",
    response_model=User,
    summary="Update User (Full)",
    description="Replace entire user object. All fields must be provided."
)
async def update_user_full(
    user_id: int,
    user: UserCreate,  # Full model required
    current_user: User = Depends(get_current_user)
):
    """Full user update requiring all fields"""

    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    existing_user = await get_user_by_id(user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Full replacement - all fields required
    updated_user = await replace_user(user_id, user.dict())

    return updated_user

# Advanced partial update with field validation
class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=10)
    tags: Optional[List[str]] = Field(None, max_items=10)
    published: Optional[bool] = None
    category_id: Optional[int] = Field(None, gt=0)

    def validate_update(self, current_user: User, existing_article: dict):
        """Validate partial update based on business rules"""

        # Only authors and admins can update
        if (existing_article['author_id'] != current_user.id and
            not current_user.is_admin):
            raise HTTPException(status_code=403, detail="Not authorized")

        # Only admins can change published status
        if 'published' in self.__dict__ and self.published is not None:
            if not current_user.is_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Only admins can change publication status"
                )

        # Validate category exists if provided
        if self.category_id is not None:
            category = await get_category_by_id(self.category_id)
            if not category:
                raise HTTPException(status_code=400, detail="Invalid category")

    def get_safe_update_data(self):
        """Return update data excluding None values"""
        return self.dict(exclude_unset=True, exclude_none=True)

@app.patch("/articles/{article_id}")
async def update_article(
    article_id: int,
    article_update: ArticleUpdate,
    current_user: User = Depends(get_current_user)
):
    """Advanced partial article update"""

    # Get existing article
    article = await get_article_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Validate the update
    await article_update.validate_update(current_user, article)

    # Get safe update data
    update_data = article_update.get_safe_update_data()

    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    # Apply update with audit trail
    updated_article = await update_article_with_audit(
        article_id,
        update_data,
        current_user.id
    )

    return updated_article

# Bulk partial updates
class BulkUpdateRequest(BaseModel):
    ids: List[int] = Field(..., min_items=1, max_items=100)
    updates: ProductUpdate  # Reuse partial update model

@app.patch("/products/bulk")
async def bulk_update_products(
    bulk_update: BulkUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Bulk partial update of multiple products"""

    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Validate all products exist
    products = await get_products_by_ids(bulk_update.ids)
    if len(products) != len(bulk_update.ids):
        raise HTTPException(status_code=400, detail="Some products not found")

    # Validate update data
    try:
        update_data = bulk_update.updates.get_update_data()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Apply bulk update
    updated_count = await bulk_update_products_in_db(
        bulk_update.ids,
        update_data
    )

    return {
        "message": f"Updated {updated_count} products",
        "updated_ids": bulk_update.ids
    }

# Conditional updates with versioning
@app.patch(
    "/resources/{resource_id}",
    summary="Update Resource with Versioning",
    description="Update resource with optimistic concurrency control"
)
async def update_resource_versioned(
    resource_id: int,
    updates: dict,
    version: int = Header(..., description="Current resource version"),
    current_user: User = Depends(get_current_user)
):
    """Versioned partial update"""

    # Get resource with current version
    resource = await get_resource_with_version(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Check version for optimistic locking
    if resource['version'] != version:
        raise HTTPException(
            status_code=409,
            detail="Resource has been modified by another user",
            headers={"X-Conflict": "true"}
        )

    # Apply partial updates
    updated_resource = await update_resource_partial(
        resource_id,
        updates,
        new_version=version + 1
    )

    return updated_resource
```

**Common mistakes:**
- Using PUT for partial updates
- Not validating partial update permissions
- Missing conflict resolution for concurrent updates
- Not providing clear documentation for partial vs full updates
- Allowing updates to immutable fields

**When to apply:**
- Resource modification endpoints
- User profile updates
- Configuration management
- Content management systems
- Any scenario requiring flexible field updates