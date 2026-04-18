# FastAPI Development Best Practices - Complete Rules Reference

This document compiles all 50+ rules from the FastAPI Development Best Practices framework, organized by impact priority for comprehensive modern API development guidance.

---

## 1. Async & Concurrency (CRITICAL)

### Async Endpoints
**Impact:** CRITICAL - Ensures proper async execution and prevents blocking operations

**Problem:**
FastAPI applications can suffer from blocking operations that prevent proper async concurrency. Using synchronous functions in async contexts defeats the purpose of async frameworks and can cause performance bottlenecks.

**Solution:**
Always use `async def` for endpoint functions and ensure all I/O operations are properly awaited. Use appropriate async libraries for database, HTTP calls, and file operations.

❌ **Wrong: Synchronous endpoint**
```python
@app.get("/items/{item_id}")
def read_item(item_id: int):  # Synchronous function - blocks event loop
    time.sleep(1)  # This blocks the entire event loop!
    return {"item_id": item_id}
```

✅ **Correct: Async endpoint**
```python
@app.get("/items/{item_id}")
async def read_item(item_id: int):  # Async function - non-blocking
    await asyncio.sleep(1)  # Properly awaits async operation
    return {"item_id": item_id}
```

### Async Dependencies
**Impact:** CRITICAL - Maintains async context throughout the request lifecycle

**Problem:**
Mixing synchronous and asynchronous dependency injection can cause deadlocks, performance issues, and unexpected blocking behavior in FastAPI applications.

**Solution:**
Use `async def` for dependency functions that perform I/O operations. Ensure dependency chains maintain async context throughout.

✅ **Correct: Async dependency injection**
```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Async dependency for user authentication"""
    user = await authenticate_user(token)  # Properly awaited
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
```

### Async Database Operations
**Impact:** CRITICAL - Prevents database connection pool exhaustion and blocking

**Problem:**
Synchronous database operations in async FastAPI applications can exhaust connection pools and cause application deadlocks under load.

**Solution:**
Use async database drivers like `asyncpg` for PostgreSQL, `aiomysql` for MySQL, or async ORMs like `SQLAlchemy` with async support.

✅ **Correct: Async database operations**
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Async engine setup
engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
async_session = sessionmaker(engine, class_=AsyncSession)

async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session

@app.post("/items/")
async def create_item(item: ItemCreate, db: AsyncSession = Depends(get_db)):
    db_item = Item(**item.dict())
    db.add(db_item)
    await db.commit()  # Properly awaited
    await db.refresh(db_item)
    return db_item
```

### Async Background Tasks
**Impact:** CRITICAL - Ensures background work doesn't block request processing

**Problem:**
Long-running tasks executed synchronously can block the event loop and prevent concurrent request handling, causing poor application responsiveness.

**Solution:**
Use FastAPI's `BackgroundTasks` for fire-and-forget operations or external task queues like Celery for complex background processing.

✅ **Correct: Background task implementation**
```python
from fastapi import BackgroundTasks

def send_email_notification(email: str, message: str):
    """Synchronous email sending function"""
    # Email sending logic here
    pass

@app.post("/send-notification")
async def send_notification(email: str, message: str, background_tasks: BackgroundTasks):
    # Add task to background
    background_tasks.add_task(send_email_notification, email, message)
    return {"message": "Notification will be sent in background"}
```

---

## 11. Web & HTTP (MEDIUM)

### Cookie Parameters
**Impact:** MEDIUM - Enables client state management and authentication

**Problem:**
Web applications need to read and set cookies for session management, authentication, and user preferences. Manual cookie handling leads to security issues and inconsistent behavior.

**Solution:**
Use FastAPI's Cookie parameter declaration with automatic validation and type conversion. Handle cookie security properly.

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

    return {"user": user, "preferences": preferences}
```

### Header Parameters
**Impact:** MEDIUM - Enables metadata passing and API versioning

**Problem:**
APIs need to handle HTTP headers for authentication, content negotiation, versioning, and custom metadata. Manual header parsing leads to inconsistencies and security issues.

**Solution:**
Use FastAPI's Header parameter declaration with automatic validation and type conversion. Handle common headers like Authorization, Content-Type, and custom headers.

✅ **Correct: Automatic header parameter handling**
```python
from fastapi import Header, HTTPException

@app.get("/api/data")
async def get_data(
    authorization: str = Header(..., description="Bearer token for authentication"),
    x_api_version: str = Header("v1", regex=r"^v\d+$", description="API version"),
    accept_language: str = Header("en", description="Preferred language")
):
    """Get data with automatic header validation"""

    # Validate Bearer token format
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    token = authorization[7:]  # Extract token after "Bearer "

    return {
        "data": await get_data_by_version(x_api_version),
        "version": x_api_version,
        "language": accept_language
    }
```

### Static Files
**Impact:** MEDIUM - Enables serving of static assets and file resources

**Problem:**
Web applications need to serve static files like images, CSS, JavaScript, and documentation. Improper static file handling can expose sensitive files or cause performance issues.

**Solution:**
Use FastAPI's StaticFiles mounting with proper directory configuration and security considerations.

✅ **Correct: Secure static file serving**
```python
from fastapi.staticfiles import StaticFiles
from fastapi import HTTPException

# Mount static file directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Secure file serving with validation
@app.get("/files/{file_path:path}")
async def serve_secure_file(file_path: str):
    """Serve files with security validation"""

    # Validate file path (prevent directory traversal)
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    # Check if file exists in uploads directory
    full_path = UPLOADS_DIR / file_path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path=full_path)
```

### Lifespan Events
**Impact:** MEDIUM - Enables proper application initialization and cleanup

**Problem:**
Applications need to perform setup and teardown operations like database connections, cache initialization, and background task management. Manual lifecycle management leads to resource leaks and inconsistent state.

**Solution:**
Use FastAPI's lifespan event handlers for startup and shutdown operations. Ensure proper resource management and cleanup.

✅ **Correct: Lifespan event handlers**
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_database()
    await init_cache()

    yield

    # Shutdown
    await close_database_connections()
    await close_cache_connections()

app = FastAPI(lifespan=lifespan)
```

---

## 12. Data Handling (MEDIUM-HIGH)

### Form Data Handling
**Impact:** MEDIUM-HIGH - Enables form-based data submission and file uploads

**Problem:**
Web applications need to handle HTML forms and multipart form data. Manual form parsing leads to security vulnerabilities and inconsistent data handling.

**Solution:**
Use FastAPI's Form parameter declaration for secure form data handling with automatic validation and type conversion.

✅ **Correct: Automatic form data handling**
```python
from fastapi import Form, File, UploadFile
from pydantic import BaseModel

class ContactForm(BaseModel):
    name: str = Form(..., min_length=1, max_length=100)
    email: str = Form(...)
    message: str = Form(..., min_length=10, max_length=1000)

@app.post("/contact")
async def submit_contact_form(form: ContactForm):
    """Handle contact form with automatic validation"""
    await save_contact_form(form.dict())
    return {"message": "Contact form submitted successfully"}
```

### Extra Data Types & JSON Encoding
**Impact:** MEDIUM - Enables proper handling of complex data types and custom serialization

**Problem:**
APIs need to handle complex data types like UUIDs, datetimes, enums, and custom objects. Default JSON serialization may not handle these properly.

**Solution:**
Use FastAPI's support for advanced data types and custom JSON encoders for proper serialization and validation.

✅ **Correct: Advanced data types and custom encoding**
```python
from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from datetime import datetime

class Item(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: str
        }

@app.get("/items", response_model=List[Item])
async def get_items():
    """Items with advanced data types"""
    items = await get_items_from_db()
    return items
```

---

## 13. Application Structure (MEDIUM-HIGH)

### Bigger Applications & Multiple Files
**Impact:** MEDIUM-HIGH - Enables scalable application architecture and maintainable codebase

**Problem:**
Large FastAPI applications become unwieldy in a single file. Code organization, imports, and maintainability suffer as the application grows.

**Solution:**
Organize FastAPI applications across multiple files with proper module structure, dependency injection, and router organization.

✅ **Correct: Multi-file application structure**
```
myapp/
├── main.py              # Application entry point
├── config.py            # Configuration settings
├── routers/             # API route modules
│   ├── users.py
│   └── items.py
├── models/              # Pydantic models
│   ├── user.py
│   └── item.py
└── services/            # Business logic
    ├── user_service.py
    └── item_service.py
```

---

## 14. Development & Debug (MEDIUM)

### Debugging FastAPI Applications
**Impact:** MEDIUM - Enables effective troubleshooting and development workflow

**Problem:**
FastAPI applications can be difficult to debug without proper development setup, logging, and debugging tools.

**Solution:**
Configure comprehensive debugging setup with detailed logging, development server options, and debugging tools for effective troubleshooting.

✅ **Correct: Comprehensive debugging setup**
```python
import logging
from fastapi import FastAPI, Request

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(debug=True)

class DebugMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.debug(f"Request: {request.method} {request.url}")
        response = await call_next(request)
        logger.debug(f"Response status: {response.status_code}")
        return response

if app.debug:
    app.add_middleware(DebugMiddleware)

@app.get("/debug/info")
async def debug_info():
    """Debug information endpoint"""
    return {"debug_mode": app.debug}
```

---

## 16. Response Handling (MEDIUM)

### Custom Response Classes
**Impact:** MEDIUM - Enables flexible response formatting and specialized content types

**Problem:**
Standard JSON responses are sufficient for most APIs, but some applications need custom response formats, binary data, HTML responses, or specialized content types.

**Solution:**
Create custom response classes for different content types and response formats while maintaining FastAPI's type safety and documentation features.

✅ **Correct: Custom response classes**
```python
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi import Response

class CSVResponse(Response):
    """CSV response for data export"""

    def __init__(self, content: str, filename: str = "export.csv", **kwargs):
        super().__init__(
            content=content,
            media_type="text/csv",
            **kwargs
        )
        self.headers["Content-Disposition"] = f"attachment; filename={filename}"

@app.get("/export/csv")
async def export_csv():
    """Export data as CSV"""
    data = await get_export_data()
    csv_content = "id,name,value\n"
    for item in data:
        csv_content += f"{item['id']},{item['name']},{item['value']}\n"

    return CSVResponse(content=csv_content)
```

### Response Cookies
**Impact:** MEDIUM - Enables proper client-side state management and session handling

**Problem:**
APIs need to set cookies for authentication, preferences, and tracking, but improper cookie configuration can lead to security vulnerabilities and poor user experience.

**Solution:**
Use FastAPI's response cookie methods with secure defaults and proper validation. Handle cookie attributes correctly for security and compatibility.

✅ **Correct: Secure cookie handling**
```python
from fastapi import Response

@app.post("/login")
async def login(response: Response):
    """Login with secure cookie setting"""
    session_token = await create_secure_session_token()

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,      # Prevent JavaScript access
        secure=True,         # HTTPS only
        samesite="strict",   # CSRF protection
        max_age=3600,        # 1 hour expiration
    )

    return {"message": "Logged in successfully"}
```

### Response Headers
**Impact:** MEDIUM - Enables proper HTTP response metadata and client instructions

**Problem:**
APIs need to provide metadata, caching instructions, security policies, and client guidance through HTTP headers. Missing or incorrect headers can cause security issues, caching problems, and poor client behavior.

**Solution:**
Set appropriate response headers for security, caching, content negotiation, and API metadata using FastAPI's response manipulation capabilities.

✅ **Correct: Comprehensive response headers**
```python
from fastapi import Response

@app.middleware("http")
async def security_headers_middleware(request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)

    response.headers.update({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    })

    return response

@app.get("/api/data")
async def get_data(response: Response):
    """Data endpoint with caching headers"""
    data = await fetch_data()

    response.headers["Cache-Control"] = "public, max-age=300"
    response.headers["ETag"] = generate_etag(data)

    return data
```

---

## 17. Advanced Security (HIGH)

### Advanced Security
**Impact:** HIGH - Protects against sophisticated attacks and ensures enterprise-grade security

**Problem:**
Basic JWT authentication is insufficient for enterprise applications. Advanced threats require multi-layered security including API keys, OAuth2, role-based access control, and protection against common web vulnerabilities.

**Solution:**
Implement comprehensive security measures including OAuth2 flows, API key authentication, RBAC, input sanitization, and security best practices.

✅ **Correct: Advanced multi-layered security**
```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def get_api_key(api_key: str = Security(api_key_header)):
    """Validate API key"""
    if api_key not in VALID_API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return VALID_API_KEYS[api_key]

# Role-Based Access Control
async def require_permissions(*permissions):
    """Permission checking dependency"""
    def check_permissions(current_user: User = Depends(get_current_user)):
        user_permissions = get_user_permissions(current_user)
        for permission in permissions:
            if permission not in user_permissions:
                raise HTTPException(status_code=403, detail="Permission denied")
        return current_user
    return check_permissions
```

---

## 18. Advanced Patterns (LOW)

### OpenAPI Callbacks
**Impact:** LOW - Enables advanced API specifications for event-driven architectures

**Problem:**
Some APIs need to document asynchronous callbacks or webhooks in their OpenAPI specification. Standard OpenAPI doesn't handle callbacks well, making documentation incomplete for event-driven systems.

**Solution:**
Use FastAPI's OpenAPI callback support to document webhook endpoints and asynchronous operations in the API specification.

✅ **Correct: Documented OpenAPI callbacks**
```python
from fastapi import FastAPI

app = FastAPI()

# Define callback schemas
webhook_response_schema = {
    "type": "object",
    "properties": {
        "event_type": {"type": "string"},
        "data": {"type": "object"},
        "timestamp": {"type": "string", "format": "date-time"}
    }
}

@app.post(
    "/payments",
    callbacks={
        "stripeWebhook": {
            "https://example.com/webhooks/stripe": {
                "post": {
                    "summary": "Stripe webhook callback",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/WebhookPayload"}
                            }
                        }
                    },
                    "responses": {"200": {"description": "OK"}}
                }
            }
        }
    }
)
async def create_payment(amount: float, currency: str = "usd"):
    """Create payment with documented webhook callback"""
    payment_id = await process_payment(amount, currency)
    return {"payment_id": payment_id, "status": "pending"}
```

### Path Operation Advanced Configuration
**Impact:** MEDIUM - Enables rich API documentation and proper API lifecycle management

**Problem:**
APIs need detailed documentation, examples, deprecation notices, and proper response definitions. Basic endpoint definitions lack the richness needed for professional APIs.

**Solution:**
Use FastAPI's advanced path operation configuration for comprehensive API documentation, examples, and lifecycle management.

✅ **Correct: Advanced path operation configuration**
```python
from fastapi import Path, Query, status

@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get User by ID",
    responses={
        200: {"model": UserResponse, "description": "User found"},
        404: {"model": ErrorResponse, "description": "User not found"}
    },
    tags=["users"]
)
async def get_user(user_id: int = Path(..., ge=1)):
    """Get user with comprehensive configuration"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

### WebSocket Support
**Impact:** LOW - Enables real-time bidirectional communication

**Problem:**
Traditional HTTP APIs are request-response based, making real-time features like chat, notifications, and live updates difficult to implement efficiently.

**Solution:**
Use FastAPI's WebSocket support for real-time bidirectional communication. Implement proper connection management, error handling, and security.

✅ **Correct: WebSocket implementation**
```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")

                if message_type == "chat":
                    await manager.broadcast(
                        f"{client_id}: {message_data['message']}"
                    )
                elif message_type == "ping":
                    await manager.send_json(
                        {"type": "pong", "timestamp": time.time()},
                        websocket
                    )
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    "Invalid JSON format",
                    websocket
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(f"{client_id} left the chat")
```

### API Versioning
**Impact:** LOW - Enables backward compatibility and controlled API evolution

**Problem:**
API changes without versioning break existing clients and cause integration failures. APIs evolve over time, but clients need stability.

**Solution:**
Implement URL-based versioning with clear deprecation policies. Support multiple versions simultaneously and communicate breaking changes.

✅ **Correct: URL-based versioning**
```python
# API v1 router
v1_router = APIRouter(prefix="/api/v1")

@v1_router.get("/users/")
async def get_users_v1(db: AsyncSession = Depends(get_db)):
    """V1: Basic user list"""
    users = await db.execute(select(User))
    return {"users": users.scalars().all()}

# API v2 router with enhancements
v2_router = APIRouter(prefix="/api/v2")

@v2_router.get("/users/")
async def get_users_v2(
    include_deleted: bool = False,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """V2: Enhanced with pagination and deleted users"""
    query = select(User)
    if not include_deleted:
        query = query.where(User.is_active == True)

    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    users = result.scalars().all()

    return {
        "users": users,
        "page": page,
        "page_size": page_size
    }

# Mount routers
app.include_router(v1_router)
app.include_router(v2_router)
```

### Monitoring & Observability
**Impact:** LOW - Enables proactive issue detection and performance monitoring

**Problem:**
Production APIs without monitoring become black boxes when issues occur. Performance problems, errors, and usage patterns remain invisible.

**Solution:**
Implement comprehensive monitoring with structured logging, metrics collection, health checks, and distributed tracing.

✅ **Correct: Monitoring setup**
```python
import structlog
from fastapi import Request

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Request logging middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.time()

    logger.info(
        "request_started",
        method=request.method,
        url=str(request.url),
        client_ip=request.client.host
    )

    try:
        response = await call_next(request)
        process_time = time.time() - start_time

        logger.info(
            "request_completed",
            status_code=response.status_code,
            process_time=process_time
        )

        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            "request_failed",
            error=str(e),
            process_time=process_time,
            exc_info=True
        )
        raise

# Health check endpoints
@app.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Comprehensive health check"""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database unhealthy")
```

### OpenAPI Documentation
**Impact:** MEDIUM - Enables automatic API documentation and client generation

**Problem:**
Poor or missing API documentation leads to integration difficulties and maintenance issues.

**Solution:**
Configure comprehensive OpenAPI documentation with examples, descriptions, and proper schema definitions.

✅ **Correct: OpenAPI documentation setup**
```python
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="FastAPI Application",
    description="A comprehensive FastAPI application with best practices",
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
    },
)

# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="FastAPI Application",
        version="1.0.0",
        description="A comprehensive FastAPI application with best practices",
        routes=app.routes,
    )

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    # Apply security globally
    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Example endpoint with comprehensive documentation
@app.post(
    "/users/",
    response_model=User,
    status_code=201,
    summary="Create a new user",
    description="Create a new user account with the provided information.",
    response_description="The created user object",
    tags=["users"],
)
async def create_user(
    user: UserCreate = Body(
        ...,
        example={
            "username": "johndoe",
            "email": "john@example.com",
            "password": "securepassword123"
        }
    ),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user account.

    - **username**: Unique username (3-20 characters)
    - **email**: Valid email address
    - **password**: Strong password (min 8 characters)
    """
    # Implementation here
    pass
```

### Response Models
**Impact:** MEDIUM - Ensures consistent API responses and client compatibility

**Problem:**
Inconsistent response formats lead to integration issues and poor developer experience.

**Solution:**
Use Pydantic response models for all endpoints with proper field descriptions and examples.

✅ **Correct: Response model implementation**
```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Base response models
class APIResponse(BaseModel):
    """Base response model for all API responses"""
    success: bool = Field(default=True, description="Operation success status")
    message: Optional[str] = Field(None, description="Optional message")

class ErrorResponse(APIResponse):
    """Error response model"""
    success: bool = False
    error_code: str = Field(..., description="Error code for programmatic handling")
    details: Optional[dict] = Field(None, description="Additional error details")

# User models
class UserBase(BaseModel):
    username: str = Field(..., description="Unique username")
    email: str = Field(..., description="User email address")
    is_active: bool = Field(default=True, description="Account activation status")
    created_at: datetime = Field(..., description="Account creation timestamp")

class UserCreate(BaseModel):
    """Request model for user creation"""
    username: str = Field(..., min_length=3, max_length=20, example="johndoe")
    email: str = Field(..., example="john@example.com")
    password: str = Field(..., min_length=8, example="securepass123")

class User(UserBase):
    """Full user response model"""
    id: int = Field(..., description="User ID", example=1)

class UserList(BaseModel):
    """Paginated user list response"""
    users: List[User] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users", example=150)
    page: int = Field(..., description="Current page number", example=1)
    page_size: int = Field(..., description="Items per page", example=50)
    total_pages: int = Field(..., description="Total number of pages", example=3)

# Usage in endpoints
@app.post("/users/", response_model=User, responses={
    201: {"model": User, "description": "User created successfully"},
    400: {"model": ErrorResponse, "description": "Validation error"},
    409: {"model": ErrorResponse, "description": "User already exists"}
})
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user"""
    try:
        # Check if user exists
        existing = await db.execute(
            select(User).where(User.username == user.username)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail=ErrorResponse(
                    success=False,
                    error_code="USER_EXISTS",
                    message="Username already taken"
                ).dict()
            )

        # Create user
        db_user = User(
            username=user.username,
            email=user.email,
            hashed_password=get_password_hash(user.password)
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)

        return db_user

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                success=False,
                error_code="VALIDATION_ERROR",
                message="Failed to create user",
                details={"error": str(e)}
            ).dict()
        )

@app.get("/users/", response_model=UserList)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List users with pagination"""
    # Implementation here
    pass
```

---

## 10. Advanced Patterns (LOW)

### Dependency Injection Patterns
**Impact:** LOW - Enables clean architecture and testability

**Problem:**
Tight coupling between components makes testing and maintenance difficult.

**Solution:**
Use FastAPI's dependency injection system for clean architecture patterns.

✅ **Correct: Advanced dependency injection**
```python
from fastapi import Depends, HTTPException
from typing import Callable, TypeVar, Generic
from abc import ABC, abstractmethod

# Repository pattern
T = TypeVar('T')

class BaseRepository(ABC, Generic[T]):
    @abstractmethod
    async def get_by_id(self, id: int) -> T:
        pass

    @abstractmethod
    async def create(self, obj: T) -> T:
        pass

    @abstractmethod
    async def update(self, id: int, obj: T) -> T:
        pass

    @abstractmethod
    async def delete(self, id: int) -> bool:
        pass

class SQLAlchemyUserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int) -> User:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

# Service layer
class UserService:
    def __init__(self, user_repo: BaseRepository[User]):
        self.user_repo = user_repo

    async def create_user(self, user_data: dict) -> User:
        # Business logic here
        user = User(**user_data)
        return await self.user_repo.create(user)

    async def get_user_profile(self, user_id: int) -> dict:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Return profile data (could include additional processing)
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "created_at": user.created_at
        }

# Dependency providers
def get_user_repository(db: AsyncSession = Depends(get_db)) -> BaseRepository[User]:
    return SQLAlchemyUserRepository(db)

def get_user_service(
    user_repo: BaseRepository[User] = Depends(get_user_repository)
) -> UserService:
    return UserService(user_repo)

# Usage in endpoints
@app.post("/users/", response_model=User)
async def create_user(
    user_data: UserCreate,
    user_service: UserService = Depends(get_user_service)
):
    user = await user_service.create_user(user_data.dict())
    return user

@app.get("/users/{user_id}/profile")
async def get_user_profile(
    user_id: int,
    user_service: UserService = Depends(get_user_service)
):
    return await user_service.get_user_profile(user_id)
```

### Custom Middleware
**Impact:** LOW - Enables cross-cutting concerns and request processing

**Problem:**
Built-in middleware insufficient for complex request processing needs.

**Solution:**
Create custom middleware for logging, monitoring, and request processing.

✅ **Correct: Custom middleware implementation**
```python
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for comprehensive request logging"""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Log request
        logger.info(f"Request: {request.method} {request.url} - Client: {request.client.host}")

        try:
            response = await call_next(request)

            # Log response
            process_time = time.time() - start_time
            logger.info(
                f"Response: {response.status_code} - "
                f"Time: {process_time:.3f}s - "
                f"Size: {response.headers.get('content-length', 'unknown')}"
            )

            return response

        except Exception as e:
            # Log exceptions
            process_time = time.time() - start_time
            logger.error(
                f"Exception: {type(e).__name__}: {str(e)} - "
                f"Time: {process_time:.3f}s - "
                f"URL: {request.url}"
            )
            raise

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting middleware"""

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = {}

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        current_time = time.time()
        window_start = current_time - 60  # 1 minute window

        # Clean old requests
        if client_ip in self.requests:
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if req_time > window_start
            ]
        else:
            self.requests[client_ip] = []

        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return Response(
                content="Rate limit exceeded",
                status_code=429,
                headers={"Retry-After": "60"}
            )

        # Add current request
        self.requests[client_ip].append(current_time)

        response = await call_next(request)
        return response

# Application setup with middleware
app = FastAPI()

# Add custom middleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitingMiddleware, requests_per_minute=100)

# Additional built-in middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Event-Driven Architecture
**Impact:** LOW - Enables decoupled component communication

**Problem:**
Tight coupling between components makes systems hard to maintain and scale.

**Solution:**
Implement event-driven patterns using background tasks and message queues.

✅ **Correct: Event-driven patterns**
```python
from fastapi import BackgroundTasks, APIRouter
from typing import Callable, Awaitable
import asyncio
from concurrent.futures import ThreadPoolExecutor

router = APIRouter()

# Event system
class Event:
    def __init__(self, name: str, data: dict):
        self.name = name
        self.data = data

class EventBus:
    def __init__(self):
        self.listeners: dict[str, list[Callable[[Event], Awaitable[None]]]] = {}

    def subscribe(self, event_name: str, handler: Callable[[Event], Awaitable[None]]):
        if event_name not in self.listeners:
            self.listeners[event_name] = []
        self.listeners[event_name].append(handler)

    async def publish(self, event: Event):
        if event.name in self.listeners:
            tasks = [
                handler(event) for handler in self.listeners[event.name]
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

# Global event bus
event_bus = EventBus()

# Event handlers
async def send_welcome_email(event: Event):
    """Handle user registration event"""
    user_data = event.data
    # Send welcome email logic
    print(f"Sending welcome email to {user_data['email']}")

async def log_user_registration(event: Event):
    """Log user registration"""
    user_data = event.data
    print(f"User registered: {user_data['username']}")

async def update_user_stats(event: Event):
    """Update user statistics"""
    # Update global user count, etc.
    print("User statistics updated")

# Register event handlers
event_bus.subscribe("user_registered", send_welcome_email)
event_bus.subscribe("user_registered", log_user_registration)
event_bus.subscribe("user_registered", update_user_stats)

@app.post("/users/")
async def create_user(
    user: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Create user in database
    db_user = User(**user.dict())
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    # Publish event asynchronously
    event = Event("user_registered", {
        "user_id": db_user.id,
        "username": db_user.username,
        "email": db_user.email
    })

    # Add to background tasks to avoid blocking response
    background_tasks.add_task(event_bus.publish, event)

    return db_user

# Webhook-style event handling
@app.post("/webhooks/stripe")
async def stripe_webhook(payload: dict, background_tasks: BackgroundTasks):
    """Handle Stripe webhooks"""
    event_type = payload.get("type")

    if event_type == "payment_intent.succeeded":
        event = Event("payment_succeeded", payload)
        background_tasks.add_task(event_bus.publish, event)

    elif event_type == "customer.subscription.created":
        event = Event("subscription_created", payload)
        background_tasks.add_task(event_bus.publish, event)

    return {"status": "processed"}
```

---

## 17. Documentation & Examples (MEDIUM)

### Request Example Data
**Impact:** MEDIUM - Improves API usability and documentation clarity

**Problem:**
APIs need clear examples of request data to help developers understand how to use the endpoints. Without examples, developers struggle to understand the expected request format and data structure.

**Solution:**
Add comprehensive examples to Pydantic models and request schemas to provide clear guidance for API consumers.

✅ **Correct: Models with comprehensive examples**
```python
from pydantic import BaseModel, Field

class UserCreate(BaseModel):
    username: str = Field(..., examples=["johndoe", "admin_user"])
    email: str = Field(..., examples=["john@example.com", "user@company.org"])
    password: str = Field(..., min_length=8, examples=["MySecurePass123!"])

    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john@example.com",
                "password": "MySecurePass123!"
            }
        }

@app.post("/users/")
async def create_user(user: UserCreate):
    """Create user with comprehensive request examples"""
    return await create_user_in_db(user.dict())
```

### Metadata & Docs URLs
**Impact:** MEDIUM - Customizes API documentation and metadata for better developer experience

**Problem:**
Default FastAPI documentation URLs and metadata may not fit enterprise requirements. APIs need customized documentation endpoints, metadata, and branding.

**Solution:**
Configure custom documentation URLs, metadata, and API information to match organizational requirements.

✅ **Correct: Customized documentation and metadata**
```python
app = FastAPI(
    title="My Enterprise API",
    docs_url="/api/docs",           # Custom docs URL
    redoc_url="/api/redoc",         # Custom redoc URL
    openapi_url="/api/openapi.json", # Custom openapi URL
    contact={
        "name": "API Support Team",
        "email": "api-support@company.com"
    },
    license_info={
        "name": "Enterprise License",
        "url": "https://legal.company.com/api-license"
    }
)

def custom_openapi():
    """Generate custom OpenAPI schema"""
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Add custom security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "description": "JWT token for authentication"
        }
    }

    app.openapi_schema = openapi_schema
    return openapi_schema

app.openapi = custom_openapi
```

---

## 18. Advanced Patterns (LOW)

### Body Updates & Partial Data
**Impact:** HIGH - Enables efficient resource updates and proper REST API design

**Problem:**
APIs need to support partial updates (PATCH operations) where clients can update only specific fields without sending complete resource data.

**Solution:**
Implement proper PATCH operations with partial models, validation of updatable fields, and support for conditional updates.

✅ **Correct: Partial updates with PATCH**
```python
from pydantic import BaseModel, Field
from typing import Optional

class UserUpdatePartial(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
    age: Optional[int] = Field(None, ge=13, le=120)

    def dict_for_update(self):
        return {k: v for k, v in self.dict().items() if v is not None}

@app.patch("/users/{user_id}")
async def update_user_partial(user_id: int, user_update: UserUpdatePartial):
    update_data = user_update.dict_for_update()
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    updated_user = await update_user_fields(user_id, update_data)
    return updated_user
```

### Custom Response Classes
**Impact:** MEDIUM - Enables flexible response formatting and specialized content types

**Problem:**
Standard JSON responses are sufficient for most APIs, but some applications need custom response formats, binary data, HTML responses, or specialized content types.

**Solution:**
Create custom response classes for different content types and response formats while maintaining FastAPI's type safety and documentation features.

✅ **Correct: Custom response classes**
```python
from fastapi.responses import HTMLResponse, FileResponse
from fastapi import Response

class CSVResponse(Response):
    def __init__(self, content: str, filename: str = "export.csv", **kwargs):
        super().__init__(
            content=content,
            media_type="text/csv",
            **kwargs
        )
        self.headers["Content-Disposition"] = f"attachment; filename={filename}"

@app.get("/export/csv")
async def export_csv():
    data = await get_export_data()
    csv_content = "id,name,value\n"
    for item in data:
        csv_content += f"{item['id']},{item['name']},{item['value']}\n"

    return CSVResponse(content=csv_content)
```

### Response Cookies
**Impact:** MEDIUM - Enables proper client-side state management and session handling

**Problem:**
APIs need to set cookies for authentication, preferences, and tracking, but improper cookie configuration can lead to security vulnerabilities and poor user experience.

**Solution:**
Use FastAPI's response cookie methods with secure defaults and proper validation. Handle cookie attributes correctly for security and compatibility.

✅ **Correct: Secure cookie handling**
```python
from fastapi import Response

@app.post("/login")
async def login(response: Response):
    session_token = await create_secure_session_token()

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,      # Prevent JavaScript access
        secure=True,         # HTTPS only
        samesite="strict",   # CSRF protection
        max_age=3600,        # 1 hour expiration
    )

    return {"message": "Logged in successfully"}
```

### Response Headers
**Impact:** MEDIUM - Enables proper HTTP response metadata and client instructions

**Problem:**
APIs need to provide metadata, caching instructions, security policies, and client guidance through HTTP headers.

**Solution:**
Set appropriate response headers for security, caching, content negotiation, and API metadata using FastAPI's response manipulation capabilities.

✅ **Correct: Comprehensive response headers**
```python
from fastapi import Response

@app.middleware("http")
async def security_headers_middleware(request, call_next):
    response = await call_next(request)

    response.headers.update({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    })

    return response

@app.get("/api/data")
async def get_data(response: Response):
    data = await fetch_data()

    response.headers["Cache-Control"] = "public, max-age=300"
    response.headers["ETag"] = generate_etag(data)

    return data
```

### WebSocket Support
**Impact:** LOW - Enables real-time bidirectional communication

**Problem:**
Traditional HTTP APIs are request-response based, making real-time features difficult to implement efficiently.

**Solution:**
Use FastAPI's WebSocket support for real-time bidirectional communication with proper connection management.

✅ **Correct: WebSocket implementation**
```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import List

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"{client_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### OpenAPI Callbacks
**Impact:** LOW - Enables advanced API specifications for event-driven architectures

**Problem:**
Some APIs need to document asynchronous callbacks or webhooks in their OpenAPI specification.

**Solution:**
Use FastAPI's OpenAPI callback support to document webhook endpoints and asynchronous operations.

✅ **Correct: Documented OpenAPI callbacks**
```python
from fastapi import FastAPI

app = FastAPI()

@app.post(
    "/payments",
    callbacks={
        "stripeWebhook": {
            "https://example.com/webhooks/stripe": {
                "post": {
                    "summary": "Stripe webhook callback",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/WebhookPayload"}
                            }
                        }
                    },
                    "responses": {"200": {"description": "OK"}}
                }
            }
        }
    }
)
async def create_payment(amount: float, currency: str = "usd"):
    payment_id = await process_payment(amount, currency)
    return {"payment_id": payment_id, "status": "pending"}
```

### Path Operation Advanced Configuration
**Impact:** MEDIUM - Enables rich API documentation and proper API lifecycle management

**Problem:**
APIs need detailed documentation, examples, deprecation notices, and proper response definitions.

**Solution:**
Use FastAPI's advanced path operation configuration for comprehensive API documentation, examples, and lifecycle management.

✅ **Correct: Advanced path operation configuration**
```python
from fastapi import Path, Query, status

@app.get(
    "/users/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get User by ID",
    responses={
        200: {"model": UserResponse, "description": "User found"},
        404: {"model": ErrorResponse, "description": "User not found"}
    },
    tags=["users"]
)
async def get_user(user_id: int = Path(..., ge=1)):
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

### Monitoring & Observability
**Impact:** LOW - Enables proactive issue detection and performance monitoring

**Problem:**
Production APIs without monitoring become black boxes when issues occur.

**Solution:**
Implement comprehensive monitoring with structured logging, metrics collection, health checks, and distributed tracing.

✅ **Correct: Monitoring setup**
```python
import logging
from fastapi import FastAPI, Request

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.time()

    logger.info(f"Request: {request.method} {request.url}")

    response = await call_next(request)

    process_time = time.time() - start_time
    logger.info(f"Response: {response.status_code} - Time: {process_time:.3f}s")

    return response

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```