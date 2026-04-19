# Path Operation Advanced Configuration (MEDIUM)

**Impact:** MEDIUM - Enables rich API documentation and proper API lifecycle management

**Problem:**
APIs need detailed documentation, examples, deprecation notices, and proper response definitions. Basic endpoint definitions lack the richness needed for professional APIs.

**Solution:**
Use FastAPI's advanced path operation configuration for comprehensive API documentation, examples, and lifecycle management.

❌ **Wrong: Basic endpoint definition**
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    return {"user_id": user_id}
```

✅ **Correct: Advanced path operation configuration**
```python
from fastapi import Path, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool = True
    created_at: str

    class Config:
        schema_extra = {
            "example": {
                "id": 123,
                "username": "johndoe",
                "email": "john@example.com",
                "is_active": True,
                "created_at": "2023-01-01T00:00:00Z"
            }
        }

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None

@app.get(
    "/users/{user_id}",
    # Response configuration
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,

    # Documentation
    summary="Get User by ID",
    description="""
    Retrieve a specific user by their unique identifier.

    This endpoint returns detailed user information including:
    - Basic profile data
    - Account status
    - Creation timestamp

    **Note:** Requires authentication for accessing other users' data.
    """,

    # Response examples and schemas
    responses={
        200: {
            "model": UserResponse,
            "description": "User found and returned successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": 123,
                        "username": "johndoe",
                        "email": "john@example.com",
                        "is_active": True,
                        "created_at": "2023-01-01T00:00:00Z"
                    }
                }
            }
        },
        404: {
            "model": ErrorResponse,
            "description": "User not found",
            "content": {
                "application/json": {
                    "example": {
                        "error": "NOT_FOUND",
                        "message": "User with ID 123 not found"
                    }
                }
            }
        },
        403: {
            "description": "Access forbidden",
            "content": {
                "application/json": {
                    "example": {
                        "error": "FORBIDDEN",
                        "message": "You don't have permission to view this user"
                    }
                }
            }
        }
    },

    # Additional metadata
    tags=["users"],
    deprecated=False,
    operation_id="getUserById"
)
async def get_user(
    user_id: int = Path(
        ...,
        title="User ID",
        description="The unique identifier of the user to retrieve",
        ge=1,
        examples={"default": 123, "admin": 1}
    ),
    include_profile: bool = Query(
        False,
        description="Include detailed profile information",
        alias="includeProfile"
    )
):
    """
    Get user by ID with comprehensive configuration.

    **Parameters:**
    - `user_id`: Unique user identifier (must be positive integer)
    - `include_profile`: Whether to include detailed profile data

    **Returns:**
    User object with all profile information

    **Raises:**
    - 404: User not found
    - 403: Access forbidden
    """
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "NOT_FOUND",
                "message": f"User with ID {user_id} not found"
            }
        )

    # Convert to response format
    response_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat()
    }

    if include_profile:
        response_data["profile"] = await get_user_profile(user_id)

    return response_data

# Deprecated endpoint
@app.get(
    "/users/search",
    deprecated=True,
    summary="Search Users (Deprecated)",
    description="""
    **⚠️ DEPRECATED**: Use `/api/v2/users/search` instead.

    This endpoint will be removed in API version 3.0.
    Please migrate to the new search endpoint for better performance.
    """,
    tags=["users", "deprecated"],
    responses={
        200: {"description": "Search results"},
        410: {"description": "Endpoint permanently removed"}
    }
)
async def search_users_deprecated(
    query: str = Query(..., min_length=1, max_length=100)
):
    """Deprecated search endpoint"""
    # Implementation here
    pass

# Advanced configuration with multiple examples
@app.post(
    "/users/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New User",
    description="Create a new user account with profile information",
    tags=["users"],

    # Multiple examples
    responses={
        201: {
            "model": UserResponse,
            "description": "User created successfully",
            "content": {
                "application/json": {
                    "examples": {
                        "regular_user": {
                            "summary": "Regular user creation",
                            "value": {
                                "id": 124,
                                "username": "janedoe",
                                "email": "jane@example.com",
                                "is_active": True,
                                "created_at": "2023-01-02T00:00:00Z"
                            }
                        },
                        "admin_user": {
                            "summary": "Admin user creation",
                            "value": {
                                "id": 125,
                                "username": "admin",
                                "email": "admin@company.com",
                                "is_active": True,
                                "created_at": "2023-01-02T00:00:00Z"
                            }
                        }
                    }
                }
            }
        },
        400: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "error": "VALIDATION_ERROR",
                        "message": "Username already exists",
                        "details": {"field": "username", "value": "johndoe"}
                    }
                }
            }
        },
        409: {
            "description": "Conflict - user already exists",
            "content": {
                "application/json": {
                    "example": {
                        "error": "CONFLICT",
                        "message": "User with this email already exists"
                    }
                }
            }
        }
    }
)
async def create_user(
    username: str = Body(..., examples={"johndoe": "johndoe", "admin": "admin"}),
    email: str = Body(..., examples={"personal": "user@example.com", "work": "user@company.com"}),
    password: str = Body(..., min_length=8, examples={"strong": "MySecurePass123!"})
):
    """Create user with comprehensive documentation"""
    # Implementation here
    pass

# Endpoint with custom operation ID and security
@app.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete User",
    description="Permanently delete a user account",
    tags=["users"],
    operation_id="deleteUserAccount",
    responses={
        204: {"description": "User deleted successfully"},
        404: {"description": "User not found"},
        403: {"description": "Forbidden - cannot delete own account"}
    }
)
async def delete_user(
    user_id: int = Path(..., ge=1, description="User ID to delete"),
    current_user: User = Depends(get_current_user)
):
    """Delete user with security checks"""
    if current_user.id == user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete your own account"
        )

    # Check permissions
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )

    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await delete_user_from_db(user_id)
    return None

# Webhook endpoint with custom content types
@app.post(
    "/webhooks/stripe",
    status_code=status.HTTP_200_OK,
    summary="Stripe Webhook",
    description="Handle Stripe webhook events",
    tags=["webhooks"],
    responses={
        200: {"description": "Webhook processed successfully"},
        400: {"description": "Invalid webhook signature"}
    }
)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(..., alias="Stripe-Signature")
):
    """Stripe webhook with custom headers"""
    # Verify webhook signature
    body = await request.body()
    try:
        # Verify signature logic here
        event = await verify_stripe_signature(body, stripe_signature)
    except:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Process webhook
    await process_stripe_event(event)
    return {"status": "processed"}
```

**Common mistakes:**
- Missing response examples in documentation
- Not documenting error responses
- Forgetting to mark deprecated endpoints
- Inconsistent operation IDs
- Missing parameter descriptions

**When to apply:**
- Public API endpoints
- Complex business logic endpoints
- Endpoints with multiple response types
- APIs requiring detailed documentation
- Endpoints undergoing deprecation