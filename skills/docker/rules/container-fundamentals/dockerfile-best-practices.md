---
title: Dockerfile Best Practices
impact: CRITICAL
impactDescription: Ensures reliable and maintainable container builds
tags: docker, dockerfile, best-practices, builds, maintainability
---

## Dockerfile Best Practices

**Problem:**
Inconsistent Dockerfile practices lead to unreliable builds, maintenance issues, and production failures. Without standardized practices, containers become difficult to debug and maintain.

**Solution:**
Follow Dockerfile best practices for proper user management, signal handling, build optimization, and maintainability.

❌ **Wrong: Poor Dockerfile practices**
```dockerfile
FROM ubuntu
RUN apt-get update
COPY . /app
RUN pip install -r requirements.txt
EXPOSE 80
CMD python app.py
```

✅ **Correct: Dockerfile best practices**
```dockerfile
# Use specific, minimal base images
FROM python:3.11-slim-bookworm

# Add metadata labels
LABEL maintainer="team@company.com" \
      version="1.0.0" \
      description="Production application container"

# Set environment variables early
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies in one layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        build-essential \
        && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create non-root user and directories
RUN groupadd -r appuser && \
    useradd -r -g appuser -s /bin/bash -m appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Copy dependency files first (for better caching)
COPY --chown=appuser:appuser requirements.txt pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

# Make scripts executable if needed
RUN chmod +x scripts/*.sh 2>/dev/null || true

# Health check with proper signal handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Use exec form for proper signal handling
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Key best practices:**
- **Minimal base images**: Use slim/alpine variants
- **Metadata labels**: Include maintainer, version, description
- **Environment variables**: Set early for better layer caching
- **Single responsibility**: One command per RUN instruction
- **Cleanup**: Remove package manager cache and temporary files
- **Non-root user**: Never run as root in production
- **Working directory**: Set explicitly and use absolute paths
- **Dependency ordering**: Copy requirements before code for caching
- **Health checks**: Implement proper health monitoring
- **Exec form**: Use for proper signal handling
- **File permissions**: Set proper ownership and permissions

**Common mistakes:**
- Using latest tags without pinning versions
- Not cleaning up after package installation
- Running as root user
- Using WORKDIR inconsistently
- Not implementing health checks
- Using shell form instead of exec form for CMD

**When to apply:**
- All production container builds
- CI/CD pipeline containers
- Base images for applications
- Multi-stage build optimization