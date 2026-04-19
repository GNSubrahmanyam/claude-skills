---
name: docker-containerization-best-practices
description: Comprehensive containerization framework with production-ready patterns for Django, FastAPI, and Celery applications. Use when deploying applications, managing environments, or implementing microservices architecture.
---

# Docker Containerization Best Practices

Comprehensive containerization framework with 60+ rules across Dockerfile optimization, multi-service orchestration, production deployment, and development workflows. Designed for reliable, scalable container deployments from development to production.

## When to Apply

Reference these guidelines when:
- Containerizing Django, FastAPI, or Celery applications
- Setting up multi-service architectures with Docker Compose
- Implementing production deployment pipelines
- Managing development environments consistently
- Scaling containerized applications
- Optimizing container performance and security

## Rule Categories by Priority

| Priority | Category | Impact | Files Created | Prefix |
| --- | --- | --- | --- | --- | --- |
| 1 | Container Fundamentals | CRITICAL | 4 | `dockerfile-` |
| 2 | Docker Build | CRITICAL | 4 | `build-` |
| 3 | Application Containers | CRITICAL | 5 | `app-` |
| 4 | Docker Compose | HIGH | 8 | `compose-` |
| 5 | Orchestration | HIGH | 3 | `swarm-` |
| 6 | Security | HIGH | 3 | `security-` |
| 7 | Production Deployment | HIGH | 2 | `deploy-` |
| 8 | Observability | MEDIUM | 3 | `logging-` |
| 9 | Development Workflow | MEDIUM | 2 | `dev-` |
| 10 | Infrastructure | MEDIUM | 3 | `infra-` |
| 11 | Advanced Features | LOW | 3 | `advanced-` |

## Quick Reference

### 1. Container Fundamentals (CRITICAL)
- `dockerfile-security`: Secure base images and vulnerability scanning
- `dockerfile-optimization`: Multi-stage builds and layer caching
- `dockerfile-best-practices`: Proper user management and signal handling
- `image-management`: Tagging strategies and registry usage

### 2. Docker Build (CRITICAL)
- `build-buildx`: Advanced build features with Buildx
- `build-multiplatform`: Cross-platform image building
- `build-cache`: Build caching for faster builds
- `build-security`: Secrets, SSH, and attestations in builds

### 3. Application Containers (CRITICAL)
- `app-django`: Django containerization with static files and migrations
- `app-fastapi`: FastAPI async containerization with Uvicorn
- `app-celery`: Celery containerization with broker integration
- `app-database`: Database containerization with persistence
- `app-redis`: Redis containerization for caching and data structures

### 4. Docker Compose (HIGH)
- `compose-development`: Development environment orchestration
- `compose-production`: Production-ready service composition
- `compose-networking`: Service communication and isolation
- `compose-volumes`: Data persistence and sharing
- `compose-configs-secrets`: Configuration and secrets management
- `compose-multiple-files`: Multiple compose files and includes
- `compose-environment`: Environment variables and interpolation
- `compose-cli-advanced`: Advanced CLI commands and project management

### 5. Orchestration (HIGH)
- `swarm-setup`: Docker Swarm cluster management
- `swarm-services`: Swarm service deployment and scaling
- `swarm-networking`: Swarm overlay networking and security

### 6. Security (HIGH)
- `security-scanning`: Docker Scout vulnerability scanning
- `security-hardening`: Container runtime security hardening
- `security-compliance`: Security compliance and best practices

### 7. Production Deployment (HIGH)
- `deploy-registry`: Container registry management and security
- `deploy-scaling`: Horizontal scaling and load balancing

### 8. Observability (MEDIUM)
- `logging-drivers`: Docker logging drivers and configuration
- `logging-aggregation`: Log aggregation and monitoring
- `logging-troubleshooting`: Debugging and troubleshooting containers

### 9. Development Workflow (MEDIUM)
- `dev-hot-reload`: Development with live code reloading
- `dev-testing`: Testing in containerized environments
- `dev-debugging`: Container debugging and troubleshooting
- `dev-testing`: Testing in containerized environments

### 10. Infrastructure (MEDIUM)
- `infra-networking`: Container networking patterns
- `infra-security`: Container runtime security
- `infra-storage`: Persistent storage and backups

### 11. Advanced Features (LOW)
- `advanced-desktop`: Docker Desktop features and development
- `advanced-context`: Docker context management
- `advanced-api`: Docker API and programmatic access

## Quick Start
- 📖 **Overview:** `skills/docker-skill/SKILL.md`
- 📚 **Complete Reference:** `skills/docker-skill/AGENTS.md`
- 🔍 **Specific Rules:** `skills/docker-skill/rules/[category]-[rule-name].md`

| **Total** | **11 Categories** | | **42 Files** | **170+ Rules** | |