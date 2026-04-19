# CORS Configuration (CRITICAL)

**Impact:** CRITICAL - Prevents unauthorized cross-origin requests while allowing legitimate access

**Problem:**
Improper CORS configuration can expose APIs to cross-site request forgery attacks or unnecessarily restrict legitimate client applications. Default permissive settings are dangerous in production.

**Solution:**
Configure CORS middleware with specific allowed origins, methods, and headers. Use environment-specific settings for development vs production.

❌ **Wrong: Dangerous CORS configuration**
```python
# Dangerous - allows all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows any website!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

✅ **Correct: Production CORS configuration**
```python
from fastapi.middleware.cors import CORSMiddleware
import os

# Environment-based CORS settings
allowed_origins = []

if os.getenv("ENVIRONMENT") == "development":
    allowed_origins = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
    ]
elif os.getenv("ENVIRONMENT") == "production":
    allowed_origins = [
        "https://yourapp.com",
        "https://app.yourapp.com",
    ]
else:
    # Staging environment
    allowed_origins = [
        "https://staging.yourapp.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
        "Origin",
    ],
    max_age=86400,  # Cache preflight for 24 hours
)
```

**Common mistakes:**
- Using `allow_origins=["*"]` in production
- Not restricting methods and headers
- Forgetting to handle credentials properly
- Not configuring for different environments

**When to apply:**
- All FastAPI applications serving web clients
- SPA (React, Vue, Angular) integrations
- Mobile app API access
- Third-party client integrations