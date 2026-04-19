---
title: Lifespan Events
impact: MEDIUM
impactDescription: Enables proper application initialization and cleanup
tags: fastapi, lifespan, events, initialization, cleanup
---

## Lifespan Events

**Problem:**
Applications need to perform setup and teardown operations like database connections, cache initialization, and background task management. Manual lifecycle management leads to resource leaks and inconsistent state.

**Solution:**
Use FastAPI's lifespan event handlers for startup and shutdown operations. Ensure proper resource management and cleanup.

❌ **Wrong: Manual lifecycle management**
```python
# Global variables - hard to manage
db_connection = None
cache_client = None

@app.on_event("startup")
async def startup_event():
    global db_connection, cache_client
    db_connection = await create_db_connection()
    cache_client = await create_cache_client()

@app.on_event("shutdown")
async def shutdown_event():
    global db_connection, cache_client
    if db_connection:
        await db_connection.close()
    if cache_client:
        await cache_client.close()
```

✅ **Correct: Lifespan event handlers**
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
import asyncio

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")

    # Initialize database
    await init_database()
    print("Database initialized")

    # Initialize cache
    await init_cache()
    print("Cache initialized")

    # Initialize background tasks
    task_manager = BackgroundTaskManager()
    await task_manager.start()
    print("Background tasks started")

    # Store references for cleanup
    app.state.task_manager = task_manager

    yield

    # Shutdown
    print("Shutting down...")

    # Stop background tasks
    await task_manager.stop()
    print("Background tasks stopped")

    # Close database connections
    await close_database_connections()
    print("Database connections closed")

    # Close cache connections
    await close_cache_connections()
    print("Cache connections closed")

# Create app with lifespan
app = FastAPI(lifespan=lifespan)

# Database lifecycle management
async def init_database():
    """Initialize database connections and run migrations"""
    try:
        # Create engine
        engine = create_async_engine(DATABASE_URL)

        # Run migrations
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Store engine in app state
        app.state.db_engine = engine

        # Create session factory
        app.state.db_session_factory = sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

        print("Database initialized successfully")

    except Exception as e:
        print(f"Database initialization failed: {e}")
        raise

async def close_database_connections():
    """Clean up database connections"""
    if hasattr(app.state, 'db_engine'):
        await app.state.db_engine.dispose()
        print("Database connections closed")

# Cache lifecycle management
async def init_cache():
    """Initialize cache connection"""
    try:
        if REDIS_URL:
            cache_client = aioredis.from_url(REDIS_URL)
            await cache_client.ping()  # Test connection
            app.state.cache_client = cache_client
            print("Cache initialized successfully")
        else:
            print("Cache not configured, skipping initialization")

    except Exception as e:
        print(f"Cache initialization failed: {e}")
        # Don't raise - cache is optional

async def close_cache_connections():
    """Clean up cache connections"""
    if hasattr(app.state, 'cache_client'):
        await app.state.cache_client.close()
        print("Cache connections closed")

# Background task lifecycle management
class BackgroundTaskManager:
    def __init__(self):
        self.tasks = []

    async def start(self):
        """Start background tasks"""
        # Example: Periodic cleanup task
        cleanup_task = asyncio.create_task(self.periodic_cleanup())
        self.tasks.append(cleanup_task)

        # Example: Metrics collection task
        metrics_task = asyncio.create_task(self.collect_metrics())
        self.tasks.append(metrics_task)

    async def stop(self):
        """Stop all background tasks"""
        for task in self.tasks:
            task.cancel()

        # Wait for tasks to complete
        await asyncio.gather(*self.tasks, return_exceptions=True)

    async def periodic_cleanup(self):
        """Periodic cleanup task"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                await perform_cleanup()
                print("Cleanup completed")
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Cleanup task error: {e}")

    async def collect_metrics(self):
        """Metrics collection task"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                await collect_application_metrics()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Metrics collection error: {e}")

# Health check using app state
@app.get("/health")
async def health_check():
    """Health check using initialized resources"""

    health_status = {
        "status": "healthy",
        "checks": {}
    }

    # Check database
    try:
        if hasattr(app.state, 'db_session_factory'):
            async with app.state.db_session_factory() as session:
                await session.execute(text("SELECT 1"))
            health_status["checks"]["database"] = "healthy"
        else:
            health_status["checks"]["database"] = "not_initialized"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    # Check cache
    try:
        if hasattr(app.state, 'cache_client'):
            await app.state.cache_client.ping()
            health_status["checks"]["cache"] = "healthy"
        else:
            health_status["checks"]["cache"] = "not_configured"
    except Exception as e:
        health_status["checks"]["cache"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check background tasks
    try:
        if hasattr(app.state, 'task_manager'):
            # Check if tasks are running
            running_tasks = [not task.done() for task in app.state.task_manager.tasks]
            if all(running_tasks):
                health_status["checks"]["background_tasks"] = "healthy"
            else:
                health_status["checks"]["background_tasks"] = "some_tasks_stopped"
                health_status["status"] = "degraded"
        else:
            health_status["checks"]["background_tasks"] = "not_initialized"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["background_tasks"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    return health_status
```

**Common mistakes:**
- Not properly cleaning up resources
- Global variables for state management
- Missing error handling in lifecycle events
- Not testing startup/shutdown scenarios
- Resource leaks on application crashes

**When to apply:**
- Database connection management
- Cache initialization
- Background task management
- External service connections
- Resource cleanup and teardown