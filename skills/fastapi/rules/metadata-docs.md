---
title: Metadata & Docs URLs
impact: MEDIUM
impactDescription: Customizes API documentation and metadata for better developer experience
tags: fastapi, metadata, docs, documentation, developer-experience
---

## Metadata & Docs URLs

**Problem:**
Default FastAPI documentation URLs and metadata may not fit enterprise requirements. APIs need customized documentation endpoints, metadata, and branding.

**Solution:**
Configure custom documentation URLs, metadata, and API information to match organizational requirements and provide better developer experience.

❌ **Wrong: Default documentation**
```python
app = FastAPI()
# Uses default /docs, /redoc, /openapi.json
# Basic metadata only
```

✅ **Correct: Customized documentation and metadata**
```python
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    # Custom metadata
    title="My Enterprise API",
    description="""
    ## Enterprise API for Business Operations

    This API provides comprehensive business functionality including:
    - User management and authentication
    - Product catalog and inventory
    - Order processing and fulfillment
    - Analytics and reporting

    ### Getting Started
    1. Register for an API key
    2. Review the authentication section
    3. Explore available endpoints

    ### Support
    - Documentation: [Developer Portal](https://developers.company.com)
    - Support: support@company.com
    - Status: [API Status](https://status.company.com)
    """,

    version="2.1.0",
    contact={
        "name": "API Support Team",
        "email": "api-support@company.com",
        "url": "https://support.company.com"
    },
    license_info={
        "name": "Enterprise License",
        "url": "https://legal.company.com/api-license"
    },

    # Custom documentation URLs
    docs_url="/api/docs",           # Instead of /docs
    redoc_url="/api/redoc",         # Instead of /redoc
    openapi_url="/api/openapi.json", # Instead of /openapi.json

    # Additional metadata
    terms_of_service="https://legal.company.com/terms",
    servers=[
        {"url": "https://api.company.com", "description": "Production server"},
        {"url": "https://staging-api.company.com", "description": "Staging server"},
        {"url": "http://localhost:8000", "description": "Development server"}
    ]
)

# Custom OpenAPI schema generation
def custom_openapi():
    """Generate custom OpenAPI schema with enterprise branding"""

    if app.openapi_schema:
        return app.openapi_schema

    # Generate base schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Add enterprise-specific extensions
    openapi_schema["info"]["x-logo"] = {
        "url": "https://company.com/logo.png",
        "backgroundColor": "#FFFFFF"
    }

    openapi_schema["info"]["x-api-id"] = "enterprise-api-v2"
    openapi_schema["info"]["x-environment"] = os.getenv("ENVIRONMENT", "development")

    # Add security schemes with detailed descriptions
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": """
            JWT token obtained from `/auth/login` endpoint.

            Include in header: `Authorization: Bearer {token}`
            """
        },
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": """
            API key obtained from developer portal.

            Rate limits: 1000 requests/hour
            """
        }
    }

    # Apply global security
    openapi_schema["security"] = [
        {"BearerAuth": []},
        {"ApiKeyAuth": []}
    ]

    # Add custom response headers
    for path_item in openapi_schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict) and "responses" in operation:
                for response in operation["responses"].values():
                    if isinstance(response, dict):
                        response.setdefault("headers", {})
                        response["headers"].update({
                            "X-API-Version": {
                                "schema": {"type": "string"},
                                "description": "API version used"
                            },
                            "X-Request-ID": {
                                "schema": {"type": "string"},
                                "description": "Unique request identifier"
                            }
                        })

    # Add custom tags with descriptions
    openapi_schema["tags"] = [
        {
            "name": "users",
            "description": "User management operations",
            "externalDocs": {
                "description": "User Guide",
                "url": "https://docs.company.com/users"
            }
        },
        {
            "name": "products",
            "description": "Product catalog management",
            "externalDocs": {
                "description": "Product API Guide",
                "url": "https://docs.company.com/products"
            }
        }
    ]

    app.openapi_schema = openapi_schema
    return openapi_schema

# Set custom OpenAPI generator
app.openapi = custom_openapi

# Custom documentation endpoints
@app.get("/api/docs-info")
async def docs_info():
    """Information about API documentation"""
    return {
        "documentation_urls": {
            "swagger_ui": "/api/docs",
            "redoc": "/api/redoc",
            "openapi_json": "/api/openapi.json"
        },
        "versions": {
            "current": app.version,
            "deprecated": ["1.0.0", "1.1.0"]
        },
        "support": {
            "documentation": "https://developers.company.com",
            "support_email": "api-support@company.com",
            "status_page": "https://status.company.com"
        }
    }

# API health and metadata
@app.get("/api/info")
async def api_info():
    """Comprehensive API information"""
    return {
        "name": app.title,
        "version": app.version,
        "description": "Enterprise API for business operations",
        "contact": app.contact,
        "license": app.license_info,
        "servers": app.servers,
        "terms_of_service": app.terms_of_service,
        "documentation": {
            "swagger": f"{app.docs_url}",
            "redoc": f"{app.redoc_url}",
            "openapi": f"{app.openapi_url}"
        },
        "features": [
            "JWT Authentication",
            "API Key Authentication",
            "Rate Limiting",
            "Request Validation",
            "Comprehensive Documentation"
        ],
        "limits": {
            "requests_per_hour": 1000,
            "max_request_size": "10MB",
            "max_response_size": "50MB"
        }
    }

# Version compatibility endpoint
@app.get("/api/versions")
async def api_versions():
    """API version compatibility information"""
    return {
        "current_version": app.version,
        "supported_versions": ["2.0.0", "2.1.0"],
        "deprecated_versions": ["1.0.0", "1.1.0", "1.2.0"],
        "breaking_changes": {
            "2.0.0": [
                "JWT tokens now required for all endpoints",
                "Removed basic authentication"
            ]
        },
        "migration_guides": {
            "1.x_to_2.x": "https://docs.company.com/migration-2x"
        }
    }

# Custom middleware for documentation headers
@app.middleware("http")
async def docs_headers_middleware(request, call_next):
    """Add documentation-related headers"""
    response = await call_next(request)

    # Add headers that help with API discovery
    response.headers["X-API-Docs"] = f"{request.base_url}{app.docs_url.lstrip('/')}"
    response.headers["X-API-Spec"] = f"{request.base_url}{app.openapi_url.lstrip('/')}"
    response.headers["X-API-Version"] = app.version

    return response

# Documentation redirect for old URLs
@app.get("/docs", include_in_schema=False)
async def redirect_old_docs():
    """Redirect old docs URL to new location"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/docs", status_code=301)

@app.get("/swagger", include_in_schema=False)
async def redirect_swagger():
    """Redirect swagger URL to docs"""
    return RedirectResponse(url="/api/docs", status_code=301)

# Environment-specific documentation
if os.getenv("ENVIRONMENT") == "development":
    # Add debug endpoints in development
    @app.get("/debug/endpoints")
    async def list_endpoints():
        """List all API endpoints (development only)"""
        endpoints = []
        for route in app.routes:
            if hasattr(route, 'path'):
                endpoints.append({
                    "path": route.path,
                    "methods": list(route.methods) if hasattr(route, 'methods') else None,
                    "name": route.name if hasattr(route, 'name') else None
                })
        return {"endpoints": endpoints}

# Documentation badges/links
@app.get("/badges/openapi")
async def openapi_badge():
    """OpenAPI badge for README"""
    return {
        "badge_url": f"https://img.shields.io/badge/OpenAPI-{app.version}-green",
        "spec_url": f"/api/openapi.json"
    }
```

**Common mistakes:**
- Using default documentation URLs in production
- Missing contact and license information
- Not providing server information for different environments
- Inconsistent API versioning in documentation
- Not customizing security scheme descriptions

**When to apply:**
- Enterprise APIs with multiple environments
- APIs used by external developers
- APIs requiring branding and customization
- APIs with complex authentication requirements
- Production APIs needing professional documentation