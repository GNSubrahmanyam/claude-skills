---
title: Debugging FastAPI Applications
impact: MEDIUM
impactDescription: Enables effective troubleshooting and development workflow
tags: fastapi, debugging, troubleshooting, development
---

## Debugging FastAPI Applications

**Problem:**
FastAPI applications can be difficult to debug without proper development setup, logging, and debugging tools. Production issues are hard to reproduce and diagnose.

**Solution:**
Configure comprehensive debugging setup with detailed logging, development server options, and debugging tools for effective troubleshooting.

❌ **Wrong: Minimal debugging setup**
```python
# No debugging configuration
app = FastAPI()

@app.get("/debug")
async def debug_endpoint():
    # Hard to debug without proper logging
    result = await some_complex_operation()
    return result
```

✅ **Correct: Comprehensive debugging setup**
```python
import logging
import sys
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Configure logging for debugging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('debug.log')
    ]
)

logger = logging.getLogger(__name__)

class DebugMiddleware(BaseHTTPMiddleware):
    """Middleware for request debugging"""

    async def dispatch(self, request: Request, call_next):
        # Log request details
        logger.debug(f"Request: {request.method} {request.url}")
        logger.debug(f"Headers: {dict(request.headers)}")
        logger.debug(f"Query params: {dict(request.query_params)}")

        try:
            response = await call_next(request)

            # Log response details
            logger.debug(f"Response status: {response.status_code}")
            logger.debug(f"Response headers: {dict(response.headers)}")

            return response

        except Exception as e:
            # Log exceptions with full traceback
            logger.error(f"Exception in request: {e}", exc_info=True)
            raise

# Create app with debug configuration
app = FastAPI(
    title="Debug API",
    debug=True,  # Enable debug mode
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
    openapi_url="/openapi.json"  # OpenAPI schema
)

# Add debug middleware in development
if __debug__:
    app.add_middleware(DebugMiddleware)

# Global exception handler for debugging
@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    """Global exception handler with debug information"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    # In debug mode, return detailed error information
    if app.debug:
        import traceback
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "traceback": traceback.format_exc(),
                "url": str(request.url),
                "method": request.method
            }
        )

    # In production, return generic error
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error"}
    )

# Debug endpoints
@app.get("/debug/info")
async def debug_info():
    """Debug information endpoint"""
    import platform
    import psutil
    import sys

    return {
        "python_version": sys.version,
        "platform": platform.platform(),
        "cpu_count": psutil.cpu_count(),
        "memory": {
            "total": psutil.virtual_memory().total,
            "available": psutil.virtual_memory().available,
            "percent": psutil.virtual_memory().percent
        },
        "debug_mode": app.debug,
        "environment": os.getenv("ENVIRONMENT", "unknown")
    }

@app.get("/debug/routes")
async def debug_routes():
    """List all registered routes"""
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "methods": list(route.methods) if hasattr(route, 'methods') else None,
            "name": route.name if hasattr(route, 'name') else None
        })

    return {"routes": routes}

@app.get("/debug/headers")
async def debug_headers(request: Request):
    """Debug request headers"""
    return {
        "headers": dict(request.headers),
        "client_ip": request.client.host,
        "user_agent": request.headers.get("user-agent")
    }

# Debug dependency for testing
async def debug_dependency():
    """Debug dependency that logs execution"""
    logger.debug("Debug dependency executed")
    return {"debug": True, "timestamp": datetime.utcnow()}

@app.get("/debug/dependency")
async def test_debug_dependency(debug_info: dict = Depends(debug_dependency)):
    """Test debug dependency"""
    return {"message": "Debug dependency working", "info": debug_info}

# Performance debugging
import time

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to measure request performance"""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        response = await call_next(request)

        process_time = time.time() - start_time

        # Log slow requests
        if process_time > 1.0:  # More than 1 second
            logger.warning(
                f"Slow request: {request.method} {request.url} "
                f"took {process_time:.3f}s"
            )

        # Add performance header
        response.headers["X-Process-Time"] = str(process_time)

        return response

# Add performance monitoring in debug mode
if app.debug:
    app.add_middleware(PerformanceMiddleware)

# Development server configuration
if __name__ == "__main__":
    # Run with reload and debug logging
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="debug",
        access_log=True
    )

# Hot reload configuration for development
# In development, use:
# uvicorn main:app --reload --log-level debug

# VS Code debug configuration (.vscode/launch.json)
"""
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "FastAPI Debug",
            "type": "python",
            "request": "launch",
            "module": "uvicorn",
            "args": ["main:app", "--reload"],
            "cwd": "${workspaceFolder}",
            "env": {"ENVIRONMENT": "development"}
        }
    ]
}
"""

# Pytest debugging
"""
# pytest.ini
[tool:pytest]
addopts = -v --tb=short --pdb
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests

# Debug specific test
pytest tests/test_users.py::test_create_user -v --pdb
"""

# SQLAlchemy debug logging
"""
# Add to database.py for SQL debug logging
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
logging.getLogger('sqlalchemy.pool').setLevel(logging.DEBUG)
"""

# Memory debugging
@app.get("/debug/memory")
async def debug_memory():
    """Debug memory usage"""
    import psutil
    import gc

    process = psutil.Process()
    memory_info = process.memory_info()

    # Force garbage collection for accurate measurement
    gc.collect()

    return {
        "rss": memory_info.rss,  # Resident Set Size
        "vms": memory_info.vms,  # Virtual Memory Size
        "percent": process.memory_percent(),
        "gc_stats": {
            "collections": gc.get_count(),
            "objects": len(gc.get_objects())
        }
    }

# Database connection debugging
@app.get("/debug/db-connections")
async def debug_db_connections():
    """Debug database connection pool"""
    from sqlalchemy import text

    async with async_session() as session:
        # Get connection pool stats
        result = await session.execute(text("""
            SELECT count(*) as active_connections
            FROM pg_stat_activity
            WHERE datname = current_database()
        """))

        active_connections = result.scalar()

        return {
            "active_connections": active_connections,
            "pool_size": engine.pool.size(),
            "checked_out": engine.pool.checkedout(),
            "invalid": engine.pool.invalid()
        }
```

**Common mistakes:**
- Running production code in debug mode
- Not configuring proper logging levels
- Missing error tracebacks in production
- Not monitoring performance issues
- Ignoring memory leaks during development

**When to apply:**
- Local development and testing
- Troubleshooting production issues
- Performance analysis
- API integration debugging
- Memory leak detection