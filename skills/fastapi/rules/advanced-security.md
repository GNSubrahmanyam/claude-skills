---
title: Advanced Security
impact: HIGH
impactDescription: Protects against sophisticated attacks and ensures enterprise-grade security
tags: fastapi, security, oauth2, rbac, authentication
---

## Advanced Security

**Problem:**
Basic JWT authentication is insufficient for enterprise applications. Advanced threats require multi-layered security including API keys, OAuth2, role-based access control, and protection against common web vulnerabilities.

**Solution:**
Implement comprehensive security measures including OAuth2 flows, API key authentication, RBAC, input sanitization, and security best practices.

❌ **Wrong: Basic security only**
```python
# Only JWT - vulnerable to advanced attacks
@app.get("/protected")
async def protected(token: str = Depends(oauth2_scheme)):
    return {"message": "protected"}
```

✅ **Correct: Advanced multi-layered security**
```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import (
    HTTPBearer, HTTPAuthorizationCredentials,
    APIKeyHeader, APIKeyCookie, APIKeyQuery
)
from pydantic import BaseModel
from typing import List, Optional
import secrets

# Multiple authentication schemes
oauth2_scheme = HTTPBearer()
api_key_header = APIKeyHeader(name="X-API-Key")
api_key_query = APIKeyQuery(name="api_key")
api_key_cookie = APIKeyCookie(name="api_key")

class User(BaseModel):
    id: int
    username: str
    email: str
    roles: List[str] = []
    permissions: List[str] = []

class TokenData(BaseModel):
    username: Optional[str] = None
    scopes: List[str] = []

# API Key authentication
API_KEYS = {
    "dev-key-123": {"user": "developer", "scopes": ["read", "write"]},
    "admin-key-456": {"user": "admin", "scopes": ["read", "write", "admin"]},
}

async def get_api_key(api_key: str = Security(api_key_header)):
    """Validate API key from header"""
    if api_key not in API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return API_KEYS[api_key]

async def get_api_key_query(api_key: str = Security(api_key_query)):
    """Validate API key from query parameter"""
    if api_key not in API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return API_KEYS[api_key]

# JWT with scopes
def create_access_token(data: dict, scopes: List[str] = None):
    """Create JWT token with scopes"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=15)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "scopes": scopes or []
    })

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user_with_scopes(
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)
):
    """Get current user with scope validation"""
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_scopes = payload.get("scopes", [])

        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await get_user_by_username(username)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    # Add scopes to user object
    user.scopes = token_scopes
    return user

# Role-Based Access Control (RBAC)
class Permission:
    def __init__(self, name: str):
        self.name = name

    def __str__(self):
        return self.name

# Define permissions
READ_USER = Permission("read:user")
WRITE_USER = Permission("write:user")
DELETE_USER = Permission("delete:user")
ADMIN_USER = Permission("admin:user")

# Role definitions
ROLES = {
    "user": [READ_USER],
    "moderator": [READ_USER, WRITE_USER],
    "admin": [READ_USER, WRITE_USER, DELETE_USER, ADMIN_USER]
}

def require_permissions(*required_permissions: Permission):
    """Decorator for permission checking"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs (added by Depends)
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")

            user_permissions = []
            for role in current_user.roles:
                user_permissions.extend(ROLES.get(role, []))

            for permission in required_permissions:
                if permission not in user_permissions:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Permission denied: {permission}"
                    )

            return await func(*args, **kwargs)
        return wrapper
    return decorator

# OAuth2 scopes
oauth2_scheme_scopes = OAuth2AuthorizationCodeBearer(
    authorizationUrl="/auth/authorize",
    tokenUrl="/auth/token",
    scopes={
        "read": "Read access",
        "write": "Write access",
        "admin": "Admin access"
    }
)

async def get_current_user_with_oauth_scopes(
    security_scopes: SecurityScopes,
    credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme_scopes)
):
    """Get user with OAuth2 scope validation"""
    if security_scopes.scopes:
        authenticate_value = f'Bearer scope="{security_scopes.scope_str}"'
    else:
        authenticate_value = "Bearer"

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_scopes = payload.get("scopes", [])

        # Check if token has required scopes
        for scope in security_scopes.scopes:
            if scope not in token_scopes:
                raise HTTPException(
                    status_code=403,
                    detail="Not enough permissions",
                    headers={"WWW-Authenticate": authenticate_value}
                )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
            headers={"WWW-Authenticate": authenticate_value}
        )

    user = await get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

# Multi-authentication dependency
async def get_current_user_multi_auth(
    # Try JWT first
    jwt_user: Optional[User] = Depends(get_current_user_secure),
    # Try API key as fallback
    api_key_data: Optional[dict] = Depends(get_api_key_optional)
):
    """Multi-authentication: JWT or API key"""
    if jwt_user:
        return jwt_user

    if api_key_data:
        # Create user object from API key data
        user = User(
            id=api_key_data["user_id"],
            username=api_key_data["username"],
            roles=["api_user"],
            scopes=api_key_data["scopes"]
        )
        return user

    raise HTTPException(status_code=401, detail="Authentication required")

# Security middleware
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """Security middleware for request validation"""

    # Rate limiting check
    client_ip = request.client.host
    if not await rate_limiter.is_allowed(f"global:{client_ip}", 1000, 3600):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"}
        )

    # Request size validation
    if request.headers.get("content-length"):
        content_length = int(request.headers["content-length"])
        if content_length > 10 * 1024 * 1024:  # 10MB limit
            return JSONResponse(
                status_code=413,
                content={"error": "Request too large"}
            )

    response = await call_next(request)
    return response

# CSRF protection for state-changing operations
@app.middleware("http")
async def csrf_protection_middleware(request: Request, call_next):
    """CSRF protection for unsafe methods"""

    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        # Check for CSRF token in header or form
        csrf_token = (
            request.headers.get("X-CSRF-Token") or
            request.headers.get("X-XSRF-Token") or
            (await request.form()).get("csrf_token") if request.headers.get("content-type", "").startswith("multipart") else None
        )

        if not csrf_token:
            return JSONResponse(
                status_code=403,
                content={"error": "CSRF token missing"}
            )

        # Validate CSRF token
        if not await validate_csrf_token(csrf_token, request.session.get("csrf_secret")):
            return JSONResponse(
                status_code=403,
                content={"error": "CSRF token invalid"}
            )

    response = await call_next(request)
    return response

# Secure headers middleware (expanded)
@app.middleware("http")
async def advanced_security_headers_middleware(request: Request, call_next):
    """Advanced security headers"""

    response = await call_next(request)

    # Comprehensive security headers
    response.headers.update({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin"
    })

    return response

# Input sanitization
def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS"""
    import html
    import re

    # HTML escape
    text = html.escape(text)

    # Remove potentially dangerous patterns
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+=', '', text, flags=re.IGNORECASE)

    return text

@app.post("/posts")
async def create_post(
    title: str,
    content: str,
    current_user: User = Depends(get_current_user)
):
    """Create post with input sanitization"""

    # Sanitize inputs
    title = sanitize_input(title)
    content = sanitize_input(content)

    # Additional validation
    if len(title) > 200:
        raise HTTPException(status_code=400, detail="Title too long")
    if len(content) > 10000:
        raise HTTPException(status_code=400, detail="Content too long")

    post = await create_post_in_db(title, content, current_user.id)
    return post

# Audit logging for sensitive operations
@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    """Audit logging for sensitive operations"""

    # Log sensitive operations
    if request.url.path.startswith(("/admin", "/users")) and request.method in ["POST", "PUT", "DELETE"]:
        # Extract user info (if available)
        auth_header = request.headers.get("authorization")
        user_info = "unknown"
        if auth_header and auth_header.startswith("Bearer "):
            try:
                # Decode JWT to get user info (simplified)
                user_info = "authenticated_user"
            except:
                pass

        # Log audit event
        logger.info(
            "Audit: Sensitive operation",
            extra={
                "user": user_info,
                "method": request.method,
                "path": request.url.path,
                "ip": request.client.host,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    response = await call_next(request)
    return response
```

**Common mistakes:**
- Using only JWT without additional security layers
- Not implementing proper RBAC
- Missing input sanitization
- Inadequate audit logging
- Not using HTTPS in production
- Weak password policies

**When to apply:**
- Enterprise applications
- APIs handling sensitive data
- Multi-tenant systems
- Financial or healthcare applications
- Public-facing APIs with high security requirements