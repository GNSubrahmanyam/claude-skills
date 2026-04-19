# Dockerfile Optimization (CRITICAL)

**Impact:** CRITICAL - Ensures fast builds, small images, and efficient deployments

**Problem:**
Poorly optimized Dockerfiles result in slow build times, large image sizes, and inefficient deployments. Layer caching issues and unnecessary dependencies increase build times and storage costs.

**Solution:**
Implement multi-stage builds, optimize layer caching, minimize image size, and use build-time optimizations for production-ready containers.

❌ **Wrong: Inefficient Dockerfile**
```dockerfile
FROM python:3.11
WORKDIR /app
COPY . .                    # Copy everything first
RUN pip install -r requirements.txt  # Install after copying all files
RUN apt-get update          # No cleanup
EXPOSE 8000
CMD ["uvicorn", "main:app"]
```

✅ **Correct: Optimized Dockerfile**
```dockerfile
# ================================
# Build stage for dependencies
# ================================
FROM python:3.11-slim-bookworm AS builder

# Install system dependencies
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

# Runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create non-root user
RUN groupadd -r appuser && \
    useradd -r -g appuser -s /bin/bash -m appuser

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app
RUN chown -R appuser:appuser /app

# Copy application code (only necessary files)
COPY --chown=appuser:appuser main.py .
COPY --chown=appuser:appuser app/ ./app/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Use exec form
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Common mistakes:**
- Not using multi-stage builds
- Copying unnecessary files
- Installing development dependencies in production
- Not cleaning up package manager cache
- Poor layer ordering for caching

**When to apply:**
- Production container builds
- CI/CD pipeline optimization
- Reducing deployment time and storage costs
- Improving development workflow speed