# Response Cookies (MEDIUM)

**Impact:** MEDIUM - Enables proper client-side state management and session handling

**Problem:**
APIs need to set cookies for authentication, preferences, and tracking, but improper cookie configuration can lead to security vulnerabilities and poor user experience.

**Solution:**
Use FastAPI's response cookie methods with secure defaults and proper validation. Handle cookie attributes correctly for security and compatibility.

❌ **Wrong: Insecure cookie setting**
```python
@app.post("/login")
async def login():
    token = create_token()
    response = JSONResponse({"message": "Logged in"})
    # Dangerous - missing security attributes
    response.set_cookie("session", token)
    return response
```

✅ **Correct: Secure cookie handling**
```python
from fastapi.responses import JSONResponse
from fastapi import Response, Cookie
import uuid

@app.post("/login")
async def login(response: Response):
    """Login with secure cookie setting"""
    session_token = await create_secure_session_token()

    # Set secure session cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,      # Prevent JavaScript access (XSS protection)
        secure=True,         # HTTPS only (production)
        samesite="strict",   # CSRF protection
        max_age=3600,        # 1 hour expiration
        path="/",            # Available site-wide
        domain=None,         # Current domain only
    )

    # Set additional security headers
    response.headers["X-Content-Type-Options"] = "nosniff"

    return {"message": "Logged in successfully"}

@app.post("/logout")
async def logout(response: Response):
    """Logout with proper cookie deletion"""
    # Delete session cookie
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        httponly=True,
        samesite="strict"
    )

    # Also delete any refresh tokens
    response.delete_cookie(
        key="refresh_token",
        path="/api/auth",
        secure=True,
        httponly=True
    )

    return {"message": "Logged out successfully"}

# Cookie-based authentication dependency
async def get_current_user_via_cookie(
    session_token: str = Cookie(None, alias="session_token")
):
    """Authenticate user via session cookie"""
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = await validate_session_token(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    return user

@app.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user_via_cookie)):
    """Protected route using cookie authentication"""
    return {"user": current_user}

# Preference cookies
@app.get("/set-preferences")
async def set_user_preferences(
    response: Response,
    theme: str = "light",
    language: str = "en"
):
    """Set user preferences via cookies"""

    # Validate inputs
    if theme not in ["light", "dark", "auto"]:
        theme = "light"
    if language not in ["en", "es", "fr", "de"]:
        language = "en"

    # Set preference cookies (not httpOnly for client access)
    response.set_cookie(
        key="theme",
        value=theme,
        max_age=31536000,  # 1 year
        path="/",
        samesite="lax"     # Allow from same site and top-level navigation
    )

    response.set_cookie(
        key="language",
        value=language,
        max_age=31536000,
        path="/",
        samesite="lax"
    )

    return {"message": "Preferences saved"}

# CSRF token cookies
@app.get("/csrf-token")
async def get_csrf_token(response: Response):
    """Generate and set CSRF token cookie"""
    csrf_token = str(uuid.uuid4())

    # Store token server-side (simplified - use Redis in production)
    await store_csrf_token(csrf_token)

    # Set cookie (accessible by JavaScript for forms)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,     # Allow JavaScript access
        secure=True,
        samesite="strict",
        max_age=3600        # 1 hour
    )

    return {"csrf_token": csrf_token}

# Cookie with SameSite and cross-site handling
@app.get("/cross-site")
async def handle_cross_site_request(response: Response):
    """Handle cross-site requests with appropriate cookies"""

    # For cross-site requests, use 'lax' instead of 'strict'
    response.set_cookie(
        key="cross_site_data",
        value="some_value",
        samesite="lax",     # Allow top-level navigation
        secure=True,
        max_age=86400       # 24 hours
    )

    return {"message": "Cross-site cookie set"}

# Cookie attributes for different use cases
COOKIES = {
    "session": {
        "httponly": True,
        "secure": True,
        "samesite": "strict",
        "max_age": 3600,
        "path": "/"
    },
    "preferences": {
        "httponly": False,
        "secure": True,
        "samesite": "lax",
        "max_age": 31536000,
        "path": "/"
    },
    "tracking": {
        "httponly": False,
        "secure": True,
        "samesite": "lax",
        "max_age": 86400,
        "path": "/"
    }
}

def set_typed_cookie(response: Response, cookie_type: str, value: str):
    """Set cookie with predefined security attributes"""
    if cookie_type not in COOKIES:
        raise ValueError(f"Unknown cookie type: {cookie_type}")

    cookie_config = COOKIES[cookie_type]
    response.set_cookie(key=cookie_type, value=value, **cookie_config)

@app.post("/login-advanced")
async def advanced_login(response: Response):
    """Advanced login with multiple cookie types"""
    session_token = await create_session_token()
    user_id = "user123"

    # Set session cookie
    set_typed_cookie(response, "session", session_token)

    # Set user preferences cookie (if exists)
    preferences = await get_user_preferences(user_id)
    if preferences:
        set_typed_cookie(response, "preferences", json.dumps(preferences))

    # Set anonymous tracking cookie
    tracking_id = str(uuid.uuid4())
    set_typed_cookie(response, "tracking", tracking_id)

    return {"message": "Login successful with cookies set"}

# Cookie consent and GDPR compliance
@app.post("/accept-cookies")
async def accept_cookies(response: Response, consent: str = "essential"):
    """Handle cookie consent"""

    if consent == "all":
        # Set all cookies
        response.set_cookie("analytics", "accepted", max_age=31536000)
        response.set_cookie("marketing", "accepted", max_age=31536000)

    elif consent == "essential":
        # Only essential cookies
        response.set_cookie("essential", "accepted", max_age=31536000)

    response.set_cookie("consent", consent, max_age=31536000)

    return {"message": f"Cookie consent set to: {consent}"}
```

**Common mistakes:**
- Missing httponly flag for sensitive cookies
- Not setting secure flag in production
- Using samesite="strict" for cross-site navigation
- Not setting appropriate max_age values
- Setting cookies without path restrictions

**When to apply:**
- User authentication and sessions
- User preferences and settings
- CSRF protection
- Tracking and analytics
- GDPR cookie consent
- Cross-site request handling