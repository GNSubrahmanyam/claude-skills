---
title: FastAPI Containerization
impact: CRITICAL
impactDescription: Ensures optimal FastAPI performance and async handling in containers
tags: docker, fastapi, containerization, async, uvicorn
---

## FastAPI Containerization

**Problem:**
FastAPI applications require specific containerization for async workers, proper signal handling, and optimized ASGI server configuration. Incorrect containerization leads to poor async performance, memory leaks, and unreliable deployments.

**Solution:**
Implement FastAPI-specific containerization with Uvicorn optimization, proper async worker configuration, and production-ready ASGI server setup.

❌ **Wrong: Basic FastAPI containerization**
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

✅ **Correct: Optimized FastAPI containerization**
```dockerfile
# ================================
# Build stage
# ================================
FROM python:3.11-slim-bookworm AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        && \
    rm -rf /var/lib/apt/lists/*

# Create virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ================================
# Production stage
# ================================
FROM python:3.11-slim-bookworm AS production

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create FastAPI user
RUN groupadd -r fastapi && \
    useradd -r -g fastapi -s /bin/bash -m fastapi

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set Python environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# Create application directory
WORKDIR /app
RUN chown -R fastapi:fastapi /app

# Copy application code
COPY --chown=fastapi:fastapi . .

# Health check with async support
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "
import asyncio
import aiohttp
async def check():
    async with aiohttp.ClientSession() as session:
        async with session.get('http://localhost:8000/health') as resp:
            return resp.status == 200
asyncio.run(check())
" || exit 1

# Switch to FastAPI user
USER fastapi

# Expose port
EXPOSE 8000

# Optimized Uvicorn configuration for production
CMD ["uvicorn", \
     "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--loop", "uvloop", \
     "--http", "httptools", \
     "--access-log", \
     "--log-level", "info", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*", \
     "--server-header", "false"]
```

**FastAPI-specific considerations:**
- **Async workers:** Use UvicornWorker for proper async handling
- **Performance libraries:** Include uvloop and httptools
- **Health checks:** Implement async health check endpoints
- **Proxy headers:** Handle reverse proxy headers properly
- **Worker count:** Calculate based on CPU cores and async nature

**Common mistakes:**
- Using wrong worker class for async applications
- Not installing performance libraries (uvloop, httptools)
- Incorrect worker count calculation
- Not handling proxy headers in containerized environments
- Missing async health checks

**When to apply:**
- Deploying FastAPI applications to production
- Containerizing async Python web services
- Implementing microservices with FastAPI
- Optimizing container performance for async workloads