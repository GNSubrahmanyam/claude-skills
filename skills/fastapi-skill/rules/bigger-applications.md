# Bigger Applications & Multiple Files (MEDIUM)

**Impact:** MEDIUM - Enables scalable application architecture and maintainable codebase

**Problem:**
Large FastAPI applications become unwieldy in a single file. Code organization, imports, and maintainability suffer as the application grows.

**Solution:**
Organize FastAPI applications across multiple files with proper module structure, dependency injection, and router organization.

❌ **Wrong: Single file application**
```python
# main.py - Everything in one file
from fastapi import FastAPI

app = FastAPI()

# Models, routes, database, auth all mixed together
class User:
    pass

def get_user():
    pass

@app.get("/users")
async def get_users():
    pass

@app.post("/users")
async def create_user():
    pass

# Hundreds of lines of mixed concerns...
```

✅ **Correct: Multi-file application structure**
```
myapp/
├── main.py              # Application entry point
├── config.py            # Configuration settings
├── database.py          # Database setup and utilities
├── models/              # Pydantic models
│   ├── __init__.py
│   ├── user.py
│   └── item.py
├── routers/             # API route modules
│   ├── __init__.py
│   ├── users.py
│   ├── items.py
│   └── auth.py
├── dependencies/        # Dependency injection modules
│   ├── __init__.py
│   ├── auth.py
│   └── database.py
├── services/            # Business logic services
│   ├── __init__.py
│   ├── user_service.py
│   └── item_service.py
├── utils/               # Utility functions
│   ├── __init__.py
│   └── validation.py
└── tests/               # Test modules
    ├── __init__.py
    ├── test_users.py
    └── test_items.py
```

**Implementation:**

**main.py - Application entry point**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import create_tables
from .routers import users, items, auth

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Scalable FastAPI application"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    auth.router,
    prefix="/auth",
    tags=["authentication"]
)
app.include_router(
    users.router,
    prefix="/users",
    tags=["users"]
)
app.include_router(
    items.router,
    prefix="/items",
    tags=["items"]
)

# Startup event
@app.on_event("startup")
async def startup_event():
    await create_tables()
    print("Application started")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

**config.py - Configuration management**
```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = "My FastAPI App"
    version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql://user:pass@localhost/db"

    # Security
    secret_key: str = "your-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expiration: int = 30

    # CORS
    cors_origins: list = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()
```

**database.py - Database setup**
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_async_engine(settings.database_url, echo=settings.debug)
async_session = sessionmaker(engine, class_=AsyncSession)

async def get_db():
    async with async_session() as session:
        yield session

async def create_tables():
    # Import all models here to ensure they are registered
    from .models import user, item

    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
```

**models/user.py - User models**
```python
from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime)

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

    class Config:
        orm_mode = True
```

**routers/users.py - User routes**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..models.user import UserCreate, UserResponse, UserDB
from ..services.user_service import UserService

router = APIRouter()

@router.get("/", response_model=list[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """Get all users"""
    users = await UserService.get_users(db, skip, limit)
    return users

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create new user"""
    db_user = await UserService.create_user(db, user)
    return db_user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID"""
    user = await UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

**services/user_service.py - Business logic**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from ..models.user import UserCreate, UserDB

class UserService:
    @staticmethod
    async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100):
        result = await db.execute(
            select(UserDB).offset(skip).limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int):
        result = await db.execute(
            select(UserDB).where(UserDB.id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_user(db: AsyncSession, user: UserCreate):
        # Hash password
        hashed_password = get_password_hash(user.password)

        db_user = UserDB(
            username=user.username,
            email=user.email,
            hashed_password=hashed_password
        )

        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user
```

**dependencies/auth.py - Authentication dependencies**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..models.user import UserDB
from ..database import get_db
from .database import get_db

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """Get current authenticated user"""
    token = credentials.credentials

    # Verify token and get user
    user = await verify_token_and_get_user(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return user

async def get_current_active_user(current_user: UserDB = Depends(get_current_user)):
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
```

**APIRouter with dependencies:**
```python
from fastapi import APIRouter, Depends
from ..dependencies.auth import get_current_active_user
from ..models.user import UserResponse

router = APIRouter(dependencies=[Depends(get_current_active_user)])

@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: UserDB = Depends(get_current_active_user)):
    """Get current user profile"""
    return current_user
```

**Router prefixes and tags:**
```python
from fastapi import APIRouter

# API v1 router
v1_router = APIRouter(prefix="/api/v1")

# Include sub-routers
v1_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"]
)

v1_router.include_router(
    items.router,
    prefix="/items",
    tags=["items"]
)

# API v2 router
v2_router = APIRouter(prefix="/api/v2")
# Different version implementations...

# Include in main app
app.include_router(v1_router)
app.include_router(v2_router)
```

**Common mistakes:**
- Circular imports between modules
- Not organizing related functionality together
- Missing __init__.py files
- Inconsistent naming conventions
- Not separating concerns properly

**When to apply:**
- Applications with more than 500 lines of code
- Multiple domain areas (users, products, orders)
- Team development with multiple contributors
- Applications requiring maintenance and scalability