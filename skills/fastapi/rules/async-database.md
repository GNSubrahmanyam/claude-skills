# Async Database Operations (CRITICAL)

**Impact:** CRITICAL - Prevents database connection pool exhaustion and blocking

**Problem:**
Synchronous database operations in async FastAPI applications can exhaust connection pools and cause application deadlocks under load. Using the wrong database driver defeats the async benefits.

**Solution:**
Use async-compatible database drivers and ORMs. Configure proper connection pooling and ensure all database operations are awaited.

❌ **Wrong: Synchronous database operations**
```python
import sqlite3  # Synchronous driver

@app.get("/users/")
async def get_users():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")  # Blocks event loop!
    users = cursor.fetchall()
    conn.close()
    return users
```

✅ **Correct: Async database operations**
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Async engine setup
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    echo=False,
)

async_session = sessionmaker(engine, class_=AsyncSession)

async def get_db():
    async with async_session() as session:
        yield session

@app.get("/users/")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))  # Properly awaited
    users = result.scalars().all()
    return users

@app.post("/users/")
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = User(**user.dict())
    db.add(db_user)
    await db.commit()  # Properly awaited
    await db.refresh(db_user)
    return db_user
```

**Common mistakes:**
- Using synchronous database drivers (sqlite3, pymysql)
- Not awaiting database operations
- Improper session management
- Not configuring connection pools

**When to apply:**
- All database operations in FastAPI
- Database initialization and teardown
- Connection pool configuration
- ORM configuration for async contexts