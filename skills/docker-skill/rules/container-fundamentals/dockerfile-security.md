# Dockerfile Security (CRITICAL)

**Impact:** CRITICAL - Prevents container-based security vulnerabilities and breaches

**Problem:**
Containers can expose applications to security risks through vulnerable base images, improper user permissions, and exposed sensitive data. Insecure Dockerfiles lead to compromised production environments and data breaches.

**Solution:**
Use secure base images, implement proper user management, scan for vulnerabilities, and follow container security best practices.

❌ **Wrong: Insecure Dockerfile**
```dockerfile
FROM ubuntu:latest  # Latest tag - vulnerable
RUN apt-get update && apt-get install -y python3
COPY . /app
RUN chmod 777 /app  # Dangerous permissions
USER root           # Running as root
EXPOSE 8000
CMD ["python3", "app.py"]
```

✅ **Correct: Secure Dockerfile**
```dockerfile
# Use specific version tags
FROM python:3.11-slim-bookworm

# Add metadata for security scanning
LABEL maintainer="security@company.com" \
      version="1.0.0" \
      description="Secure application container"

# Install security updates and required packages
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        curl \
        && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create non-root user
RUN groupadd -r appuser && \
    useradd -r -g appuser -s /bin/bash -m appuser

# Set working directory with proper permissions
WORKDIR /app
RUN chown -R appuser:appuser /app

# Copy requirements first for better caching
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

# Health check for container monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Use exec form for proper signal handling
CMD ["python3", "app.py"]
```

**Common mistakes:**
- Using `latest` tags for base images
- Running containers as root user
- Not updating base images for security patches
- Exposing unnecessary ports or volumes
- Not implementing health checks

**When to apply:**
- Building any production container images
- Creating base images for applications
- Implementing CI/CD container builds
- Security compliance requirements