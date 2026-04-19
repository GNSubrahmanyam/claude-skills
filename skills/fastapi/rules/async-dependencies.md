# Async Dependencies (CRITICAL)

**Impact:** CRITICAL - Maintains async context throughout the request lifecycle

**Problem:**
Mixing synchronous and asynchronous dependency injection can cause deadlocks, performance issues, and unexpected blocking behavior in FastAPI applications. Dependencies that perform I/O must be properly async.

**Solution:**
Use `async def` for dependency functions that perform I/O operations. Ensure dependency chains maintain async context throughout.

❌ **Wrong: Synchronous dependency**
```python
def get_current_user(token: str = Depends(oauth2_scheme)):
    """Synchronous dependency - can cause blocking"""
    user = authenticate_user(token)  # Synchronous call in async context
    return user

@app.get("/users/me")
async def read_users_me(current_user = Depends(get_current_user)):
    return current_user  # May block or deadlock
```

✅ **Correct: Async dependency injection**
```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Async dependency for user authentication"""
    user = await authenticate_user(token)  # Properly awaited
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

async def get_db():
    """Database session dependency"""
    async with async_session() as session:
        yield session

async def get_user_service(db: AsyncSession = Depends(get_db)):
    """Service layer dependency"""
    return UserService(db)

@app.get("/users/me")
async def read_users_me(
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    # All dependencies are properly async
    profile = await user_service.get_user_profile(current_user.id)
    return profile
```

**Common mistakes:**
- Synchronous dependencies that perform I/O
- Not awaiting async operations in dependencies
- Complex dependency chains that can deadlock
- Dependencies that don't handle errors properly

**When to apply:**
- Authentication and authorization dependencies
- Database session dependencies
- External service client dependencies
- Any dependency that performs I/O operations