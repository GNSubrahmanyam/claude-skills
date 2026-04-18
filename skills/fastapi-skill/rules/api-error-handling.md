# API Error Handling (HIGH)

**Impact:** HIGH - Provides proper error responses and debugging information

**Problem:**
Poor error handling leads to confusing error messages, exposed internal details, and inconsistent API responses. Users get generic 500 errors instead of meaningful feedback.

**Solution:**
Use FastAPI's HTTPException for proper error responses. Create custom exception handlers for different error types. Provide consistent error response formats.

❌ **Wrong: Generic error handling**
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    user = await get_user_from_db(user_id)
    if not user:
        return {"error": "User not found"}  # Wrong status code (200)
    return user
```

✅ **Correct: Proper error handling**
```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None

# Custom exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            message=get_error_message(exc.status_code),
            details={"path": str(request.url)}
        ).dict()
    )

# Validation error handler
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error="Validation Error",
            message="Request data is invalid",
            details={"errors": exc.errors()}
        ).dict()
    )

# Generic error handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Log the error (don't expose in production)
    logger.error(f"Unhandled error: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal Server Error",
            message="Something went wrong"
        ).dict()
    )

# Usage in endpoints
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    try:
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        return user
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Database error"
        )

@app.post("/users/")
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check for duplicates
    existing = await db.execute(
        select(User).where(User.email == user.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="User with this email already exists"
        )

    # Business logic validation
    if await is_email_blacklisted(user.email):
        raise HTTPException(
            status_code=400,
            detail="Email domain not allowed"
        )

    try:
        db_user = User(**user.dict())
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="User creation failed due to constraint violation"
        )

def get_error_message(status_code: int) -> str:
    """Get user-friendly error message"""
    messages = {
        400: "Bad Request",
        401: "Authentication required",
        403: "Access forbidden",
        404: "Resource not found",
        409: "Resource conflict",
        422: "Validation error",
        500: "Internal server error"
    }
    return messages.get(status_code, "Unknown error")
```

**Common mistakes:**
- Returning wrong HTTP status codes
- Exposing internal error details
- Inconsistent error response formats
- Not logging errors properly
- Not handling database constraint errors

**When to apply:**
- All API endpoints
- Database operations
- External service calls
- User input validation
- Business logic errors