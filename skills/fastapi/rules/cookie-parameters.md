# Cookie Parameters (MEDIUM)

**Impact:** MEDIUM - Enables client state management and authentication

**Problem:**
Web applications need to read and set cookies for session management, authentication, and user preferences. Manual cookie handling leads to security issues and inconsistent behavior.

**Solution:**
Use FastAPI's Cookie parameter declaration with automatic validation and type conversion. Handle cookie security properly.

❌ **Wrong: Manual cookie parsing**
```python
from fastapi import Request

@app.get("/profile")
async def get_profile(request: Request):
    # Manual cookie parsing - error-prone
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Manual validation
    if len(session_id) != 32:
        raise HTTPException(status_code=401, detail="Invalid session")
```

✅ **Correct: Automatic cookie parameter handling**
```python
from fastapi import Cookie, Response
from typing import Optional

@app.get("/profile")
async def get_profile(
    session_id: str = Cookie(..., description="User session identifier"),
    preferences: Optional[str] = Cookie(None, description="User preferences JSON")
):
    """Get user profile with automatic cookie validation"""
    # session_id is automatically validated as required string
    user = await get_user_by_session(session_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    # Parse preferences if provided
    user_prefs = {}
    if preferences:
        try:
            user_prefs = json.loads(preferences)
        except json.JSONDecodeError:
            user_prefs = {}

    return {
        "user": user,
        "preferences": user_prefs
    }

# Setting cookies in responses
@app.post("/login")
async def login(response: Response):
    """Login with automatic cookie setting"""
    session_id = await create_session()

    # Set session cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,  # Prevent JavaScript access
        secure=True,     # HTTPS only
        samesite="strict", # CSRF protection
        max_age=3600     # 1 hour
    )

    return {"message": "Logged in successfully"}

# Cookie-based authentication dependency
async def get_current_user(
    session_id: Optional[str] = Cookie(None)
) -> Optional[User]:
    """Dependency for cookie-based authentication"""
    if not session_id:
        return None

    user = await get_user_by_session(session_id)
    return user

@app.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    """Protected route using cookie authentication"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return {"user": current_user}

# Cookie options and validation
@app.get("/settings")
async def get_settings(
    theme: str = Cookie("light", description="UI theme preference"),
    language: str = Cookie("en", regex="^(en|es|fr)$", description="Language preference")
):
    """Get user settings with validated cookie parameters"""
    return {
        "theme": theme,
        "language": language
    }
```

**Common mistakes:**
- Not setting secure cookie flags (httponly, secure, samesite)
- Storing sensitive data in cookies
- Not validating cookie values
- Manual cookie parsing and serialization

**When to apply:**
- Session management
- Authentication tokens
- User preferences
- Feature flags
- A/B testing identifiers