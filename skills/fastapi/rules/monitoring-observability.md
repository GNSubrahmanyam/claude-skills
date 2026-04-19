---
title: Monitoring & Observability
impact: MEDIUM
impactDescription: Enables proactive issue detection and performance monitoring
tags: fastapi, monitoring, observability, logging, metrics
---

## Monitoring & Observability

**Problem:**
Production APIs without monitoring become black boxes when issues occur. Performance problems, errors, and usage patterns remain invisible.

**Solution:**
Implement comprehensive monitoring with structured logging, metrics collection, health checks, and distributed tracing.

❌ **Wrong: No monitoring**
```python
@app.get("/api/data")
async def get_data():
    # No visibility into performance or errors
    return await fetch_data()
```

✅ **Correct: Comprehensive monitoring setup**
```python
import logging
import time
from fastapi import Request, Response
from typing import Callable
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Request logging middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.time()

    # Log request
    logger.info(
        "request_started",
        method=request.method,
        url=str(request.url),
        headers=dict(request.headers),
        client_ip=request.client.host,
        user_agent=request.headers.get("user-agent")
    )

    try:
        response = await call_next(request)

        # Log response
        process_time = time.time() - start_time
        logger.info(
            "request_completed",
            status_code=response.status_code,
            process_time=process_time,
            response_size=response.headers.get("content-length", 0)
        )

        return response

    except Exception as e:
        # Log exceptions
        process_time = time.time() - start_time
        logger.error(
            "request_failed",
            error=str(e),
            error_type=type(e).__name__,
            process_time=process_time,
            exc_info=True
        )
        raise

# Health check endpoints
@app.get("/health/live")
async def liveness_check():
    """Kubernetes liveness probe - basic health check"""
    return {"status": "alive", "timestamp": time.time()}

@app.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Kubernetes readiness probe - comprehensive health check"""
    health_status = {
        "status": "ready",
        "timestamp": time.time(),
        "checks": {}
    }

    # Database health
    try:
        start_time = time.time()
        await db.execute(text("SELECT 1"))
        db_time = time.time() - start_time
        health_status["checks"]["database"] = {
            "status": "healthy",
            "response_time": f"{db_time:.3f}s"
        }
    except Exception as e:
        health_status["status"] = "not ready"
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }

    # Redis health (if used)
    if redis_client:
        try:
            await redis_client.ping()
            health_status["checks"]["redis"] = {"status": "healthy"}
        except Exception as e:
            health_status["checks"]["redis"] = {
                "status": "unhealthy",
                "error": str(e)
            }

    # External service health
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("https://api.external.com/health", timeout=5) as resp:
                if resp.status == 200:
                    health_status["checks"]["external_api"] = {"status": "healthy"}
                else:
                    health_status["checks"]["external_api"] = {"status": "degraded"}
    except Exception as e:
        health_status["checks"]["external_api"] = {
            "status": "unhealthy",
            "error": str(e)
        }

    # Return appropriate status
    if health_status["status"] == "not ready":
        raise HTTPException(status_code=503, detail=health_status)

    return health_status

# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    # This would integrate with prometheus_client
    return {
        "requests_total": 1000,
        "requests_duration_seconds": {"p50": 0.1, "p95": 0.5, "p99": 2.0},
        "active_connections": 45,
        "error_rate": 0.02
    }

# Custom metrics decorator
def track_performance(operation: str):
    """Decorator to track endpoint performance"""
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time

                # Log performance metrics
                logger.info(
                    "operation_completed",
                    operation=operation,
                    duration=duration,
                    status="success"
                )

                return result

            except Exception as e:
                duration = time.time() - start_time
                logger.error(
                    "operation_failed",
                    operation=operation,
                    duration=duration,
                    error=str(e),
                    status="error"
                )
                raise

        return wrapper
    return decorator

@app.get("/api/data")
@track_performance("fetch_data")
async def get_data():
    """Endpoint with performance tracking"""
    return await fetch_data()

# Error tracking integration (example with Sentry)
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastAPIIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastAPIIntegration()],
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )

# Distributed tracing (example with OpenTelemetry)
if settings.ENABLE_TRACING:
    from opentelemetry import trace
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    # Configure tracing
    trace.set_tracer_provider(TracerProvider())
    tracer = trace.get_tracer(__name__)

    # Add Jaeger exporter
    jaeger_exporter = JaegerExporter(
        agent_host_name="localhost",
        agent_port=14268,
    )

    span_processor = BatchSpanProcessor(jaeger_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)

    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)

# Custom metrics collection
class MetricsCollector:
    def __init__(self):
        self.requests_total = 0
        self.requests_duration = []
        self.errors_total = 0

    def record_request(self, duration: float, status_code: int):
        self.requests_total += 1
        self.requests_duration.append(duration)
        if status_code >= 400:
            self.errors_total += 1

    def get_summary(self):
        if not self.requests_duration:
            return {}

        sorted_durations = sorted(self.requests_duration)
        n = len(sorted_durations)

        return {
            "requests_total": self.requests_total,
            "errors_total": self.errors_total,
            "duration_p50": sorted_durations[int(n * 0.5)],
            "duration_p95": sorted_durations[int(n * 0.95)],
            "duration_p99": sorted_durations[int(n * 0.99)],
        }

metrics = MetricsCollector()

# Metrics collection middleware
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()

    try:
        response = await call_next(request)
        duration = time.time() - start_time
        metrics.record_request(duration, response.status_code)
        return response
    except Exception as e:
        duration = time.time() - start_time
        metrics.record_request(duration, 500)
        raise

@app.get("/internal/metrics")
async def internal_metrics():
    """Internal metrics for monitoring dashboards"""
    return metrics.get_summary()
```

**Common mistakes:**
- Logging sensitive information
- Not handling async context in logging
- Missing health checks for dependencies
- Not monitoring performance metrics
- Poor error context in logs

**When to apply:**
- All production deployments
- APIs with external clients
- Systems requiring high availability
- Distributed applications