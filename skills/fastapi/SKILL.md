---
name: fastapi-development-best-practices
description: Comprehensive FastAPI development framework with prioritized rules across async patterns, validation, security, testing, and deployment. Use when building FastAPI applications, designing APIs, implementing authentication, or optimizing async services.
---

# FastAPI Development Best Practices

Comprehensive modern API development framework with 100+ individual rules across 40 rule categories covering the complete FastAPI ecosystem. Fully aligned with official FastAPI documentation from basic parameters to advanced security, covering async programming, validation, security, API design, web standards, application architecture, debugging, and production deployment. Designed for production-ready FastAPI applications with proper async/await handling, type safety, and scalable architecture.

## When to Apply

Reference these guidelines when:
- Building new FastAPI applications or APIs
- Implementing async endpoints and background tasks
- Designing data models with Pydantic
- Implementing authentication and authorization
- Writing tests for async applications
- Deploying FastAPI applications to production
- Optimizing async performance and concurrency

## Rule Categories by Priority

| Priority | Category | Impact | Files | Individual Rules | Prefix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Async & Concurrency | CRITICAL | 4 | 12 | `async-` |
| 2 | Security & Authentication | CRITICAL | 3 | 8 | `security-` |
| 3 | Validation & Models | HIGH | 1 | 5 | `validation-` |
| 4 | Core Parameters | HIGH | 4 | 12 | `core-` |
| 5 | API Design | HIGH | 6 | 15 | `api-` |
| 6 | Data Handling | MEDIUM-HIGH | 2 | 8 | `data-` |
| 7 | Application Structure | MEDIUM-HIGH | 1 | 5 | `app-` |
| 8 | Database & ORM | MEDIUM-HIGH | 1 | 4 | `db-` |
| 9 | Testing | MEDIUM-HIGH | 1 | 4 | `testing-` |
| 10 | Performance | MEDIUM | 2 | 4 | `perf-` |
| 11 | Deployment | MEDIUM | 1 | 3 | `deploy-` |
| 12 | Documentation | MEDIUM | 1 | 2 | `docs-` |
| 13 | Web & HTTP | MEDIUM | 4 | 10 | `web-` |
| 14 | Development & Debug | MEDIUM | 1 | 6 | `dev-` |
| 15 | Response Handling | MEDIUM | 3 | 8 | `response-` |
| 16 | Documentation & Examples | MEDIUM | 2 | 6 | `docs-` |
| 17 | Advanced Patterns | LOW | 4 | 9 | `advanced-` |
| **Total** | **17 Categories** | | **40 Files** | **100+ Rules** | |

## Quick Reference

### 1. Async & Concurrency (CRITICAL)
- `async-endpoints`: Always use async def for endpoint functions
- `async-dependencies`: Use async dependency injection properly
- `async-database`: Handle async database operations correctly
- `async-background`: Implement background tasks with proper async handling

### 2. Security & Authentication (CRITICAL)
- `security-jwt`: Implement JWT tokens securely
- `security-cors`: Configure CORS properly for production
- `security-rate-limiting`: Implement rate limiting for APIs

### 3. Validation & Models (HIGH)
- `validation-pydantic`: Use Pydantic models for all data validation

### 4. Core Parameters (HIGH)
- `path-parameters`: Handle dynamic URL routing with type safety
- `query-parameters`: Flexible API filtering with validation
- `request-body`: Structured data submission with Pydantic
- `response-models`: Consistent API responses with documentation

### 5. API Design (HIGH)
- `api-restful`: Follow RESTful API design principles
- `api-pagination`: Add pagination for large datasets
- `api-error-handling`: Return proper validation error responses
- `api-file-handling`: Handle file uploads securely
- `api-versioning`: Implement API versioning strategies
- `streaming-responses`: Handle large data and real-time responses

### 6. Database & ORM (MEDIUM-HIGH)
- `async-database`: Handle async database operations correctly

### 7. Testing (MEDIUM-HIGH)
- `testing-async`: Set up proper async testing

### 8. Performance (MEDIUM)
- Response caching and concurrency limits

### 9. Deployment (MEDIUM)
- `deploy-production`: Production server setup

### 10. Documentation (MEDIUM)
- OpenAPI documentation setup

### 11. Web & HTTP (MEDIUM)
- `cookie-parameters`: Client state management and authentication
- `header-parameters`: Metadata passing and API versioning
- `static-files`: Serving static assets and file resources
- `lifespan-events`: Application initialization and cleanup

### 12. Data Handling (MEDIUM-HIGH)
- `form-data-handling`: HTML form processing and validation
- `extra-data-types`: Advanced data types and JSON encoding

### 13. Application Structure (MEDIUM-HIGH)
- `bigger-applications`: Multi-file application organization

### 14. Development & Debug (MEDIUM)
- `debugging-fastapi`: Development debugging and troubleshooting

### 15. Response Handling (MEDIUM)
- `custom-response-classes`: HTML, CSV, XML, streaming responses
- `response-cookies`: Secure cookie management, sessions, preferences
- `response-headers`: Security headers, caching, CORS, metadata

### 16. Documentation & Examples (MEDIUM)
- `request-examples`: Comprehensive request model examples
- `metadata-docs`: Custom documentation URLs and API metadata

### 17. Advanced Patterns (LOW)
- `websocket-support`: Real-time bidirectional communication
- `body-updates`: Partial updates and PATCH operations
- `monitoring-observability`: Comprehensive monitoring setup
- `path-operation-config`: Advanced endpoint configuration

## Quick Start
- 📖 **Overview:** `skills/fastapi-skill/SKILL.md`
- 📚 **Complete Reference:** `skills/fastapi-skill/AGENTS.md`
- 🔍 **Specific Rules:** `skills/fastapi-skill/rules/[category]-[rule-name].md`