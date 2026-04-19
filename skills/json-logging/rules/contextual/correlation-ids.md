# Correlation IDs and Request Tracing
**Impact:** HIGH - Enables end-to-end request tracing across distributed systems and services

**Problem:**
In microservices architectures, a single user request spans multiple services. Without correlation IDs, it's impossible to trace requests across service boundaries, making debugging distributed issues extremely difficult and time-consuming.

**Solution:**
Implement correlation ID propagation across all services with automatic injection, context management, and tracing integration for comprehensive request observability.

## ✅ Correct: Correlation ID implementation

### 1. Correlation ID generation and propagation
```python
import uuid
from contextvars import ContextVar
from typing import Optional

# Context variables for correlation
correlation_id: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)
request_id: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id: ContextVar[Optional[str]] = ContextVar('user_id', default=None)

class CorrelationManager:
    """Manages correlation context across requests"""

    @staticmethod
    def generate_correlation_id() -> str:
        """Generate a new correlation ID"""
        return str(uuid.uuid4())

    @staticmethod
    def get_correlation_id() -> Optional[str]:
        """Get current correlation ID"""
        return correlation_id.get()

    @staticmethod
    def set_correlation_id(corr_id: str) -> None:
        """Set correlation ID in context"""
        correlation_id.set(corr_id)

    @staticmethod
    def get_request_id() -> Optional[str]:
        """Get current request ID"""
        return request_id.get()

    @staticmethod
    def set_request_id(req_id: str) -> None:
        """Set request ID in context"""
        request_id.set(req_id)

    @staticmethod
    def get_user_id() -> Optional[str]:
        """Get current user ID"""
        return user_id.get()

    @staticmethod
    def set_user_id(uid: str) -> None:
        """Set user ID in context"""
        user_id.set(uid)

    @classmethod
    def initialize_request_context(cls, corr_id: Optional[str] = None,
                                 req_id: Optional[str] = None,
                                 uid: Optional[str] = None):
        """Initialize context for new request"""
        if corr_id is None:
            corr_id = cls.generate_correlation_id()

        cls.set_correlation_id(corr_id)

        if req_id:
            cls.set_request_id(req_id)

        if uid:
            cls.set_user_id(uid)

        return corr_id
```

### 2. HTTP header propagation
```python
from fastapi import Request, Response, HTTPException
from typing import Callable
import functools

# Standard header names
CORRELATION_ID_HEADER = 'X-Correlation-ID'
REQUEST_ID_HEADER = 'X-Request-ID'
USER_ID_HEADER = 'X-User-ID'

def correlation_middleware(get_response: Callable) -> Callable:
    """Middleware to handle correlation ID propagation"""

    @functools.wraps(get_response)
    async def middleware(request: Request) -> Response:
        # Extract correlation ID from headers
        corr_id = request.headers.get(CORRELATION_ID_HEADER)
        req_id = request.headers.get(REQUEST_ID_HEADER)
        user_id = request.headers.get(USER_ID_HEADER)

        # Initialize context
        correlation_manager = CorrelationManager()
        final_corr_id = correlation_manager.initialize_request_context(
            corr_id, req_id, user_id
        )

        # Add correlation ID to request state for use in handlers
        request.state.correlation_id = final_corr_id
        request.state.request_id = req_id

        try:
            response = await get_response(request)

            # Add correlation headers to response
            response.headers[CORRELATION_ID_HEADER] = final_corr_id
            if req_id:
                response.headers[REQUEST_ID_HEADER] = req_id

            return response

        except Exception as exc:
            # Log with correlation context
            logger.error(
                "Request failed",
                error=str(exc),
                correlation_id=final_corr_id,
                request_id=req_id,
                exc_info=True
            )
            raise

    return middleware

# Usage in FastAPI
from fastapi import FastAPI

app = FastAPI()
app.middleware("http")(correlation_middleware)
```

### 3. Database operation correlation
```python
import sqlalchemy
from sqlalchemy import event
from typing import Any

class CorrelationAwareSession:
    """SQLAlchemy session with correlation context"""

    def __init__(self, session_factory):
        self.session_factory = session_factory

    def __enter__(self):
        self.session = self.session_factory()
        # Add correlation context to session
        corr_id = CorrelationManager.get_correlation_id()
        if corr_id:
            # Store in session info for logging
            self.session.info['correlation_id'] = corr_id
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            # Log database errors with correlation
            logger.error(
                "Database operation failed",
                error=str(exc_val),
                correlation_id=self.session.info.get('correlation_id'),
                exc_info=True
            )
        self.session.close()

# SQLAlchemy event listeners for query logging
@event.listens_for(sqlalchemy.engine.Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log SQL queries with correlation context"""
    corr_id = CorrelationManager.get_correlation_id()
    if corr_id:
        logger.debug(
            "SQL query",
            sql=statement,
            parameters=str(parameters)[:500],  # Truncate long params
            correlation_id=corr_id
        )

@event.listens_for(sqlalchemy.engine.Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log query completion"""
    corr_id = CorrelationManager.get_correlation_id()
    if corr_id:
        logger.debug(
            "SQL query completed",
            correlation_id=corr_id,
            rowcount=cursor.rowcount
        )
```

### 4. External API call correlation
```python
import aiohttp
import requests

class CorrelatedHTTPClient:
    """HTTP client that propagates correlation headers"""

    def __init__(self, session=None):
        self.session = session or requests.Session()

    def _get_headers(self):
        """Get correlation headers for outgoing requests"""
        headers = {}
        corr_id = CorrelationManager.get_correlation_id()
        if corr_id:
            headers[CORRELATION_ID_HEADER] = corr_id

        req_id = CorrelationManager.get_request_id()
        if req_id:
            headers[REQUEST_ID_HEADER] = req_id

        return headers

    def get(self, url, **kwargs):
        """GET request with correlation headers"""
        headers = kwargs.get('headers', {})
        headers.update(self._get_headers())
        kwargs['headers'] = headers

        logger.info(
            "HTTP GET request",
            url=url,
            correlation_id=CorrelationManager.get_correlation_id()
        )

        response = self.session.get(url, **kwargs)

        logger.info(
            "HTTP GET response",
            url=url,
            status_code=response.status_code,
            correlation_id=CorrelationManager.get_correlation_id()
        )

        return response

    async def async_get(self, url, **kwargs):
        """Async GET request with correlation headers"""
        async with aiohttp.ClientSession() as session:
            headers = kwargs.get('headers', {})
            headers.update(self._get_headers())
            kwargs['headers'] = headers

            logger.info(
                "HTTP GET request",
                url=url,
                correlation_id=CorrelationManager.get_correlation_id()
            )

            async with session.get(url, **kwargs) as response:
                logger.info(
                    "HTTP GET response",
                    url=url,
                    status_code=response.status,
                    correlation_id=CorrelationManager.get_correlation_id()
                )

                return await response.text()

# Usage
http_client = CorrelatedHTTPClient()

@app.get("/api/external-data")
async def get_external_data():
    """API endpoint that calls external service"""
    try:
        response = await http_client.async_get("https://api.external.com/data")
        return {"data": response}
    except Exception as e:
        logger.error(
            "External API call failed",
            error=str(e),
            correlation_id=CorrelationManager.get_correlation_id(),
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="External service error")
```

### 5. Message queue correlation
```python
import aio_pika
from typing import Dict, Any

class CorrelatedMessagePublisher:
    """Message publisher that adds correlation headers"""

    def __init__(self, connection_url: str):
        self.connection_url = connection_url

    async def publish_message(self, exchange_name: str, routing_key: str,
                            message: Dict[str, Any]):
        """Publish message with correlation headers"""

        # Add correlation context to message
        corr_id = CorrelationManager.get_correlation_id()
        req_id = CorrelationManager.get_request_id()
        user_id = CorrelationManager.get_user_id()

        message_headers = message.get('headers', {})
        if corr_id:
            message_headers['correlation_id'] = corr_id
        if req_id:
            message_headers['request_id'] = req_id
        if user_id:
            message_headers['user_id'] = user_id

        message['headers'] = message_headers

        connection = await aio_pika.connect_robust(self.connection_url)

        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange(exchange_name, auto_delete=False)

            await exchange.publish(
                aio_pika.Message(
                    body=json.dumps(message).encode(),
                    headers=message_headers,
                    correlation_id=corr_id
                ),
                routing_key=routing_key
            )

        logger.info(
            "Message published",
            exchange=exchange_name,
            routing_key=routing_key,
            correlation_id=corr_id,
            message_id=str(uuid.uuid4())
        )

class CorrelatedMessageConsumer:
    """Message consumer that extracts correlation context"""

    async def process_message(self, message: aio_pika.IncomingMessage):
        """Process message with correlation context"""

        # Extract correlation from headers
        headers = message.headers or {}
        corr_id = headers.get('correlation_id')
        req_id = headers.get('request_id')
        user_id = headers.get('user_id')

        # Set correlation context for this message processing
        correlation_manager = CorrelationManager()
        correlation_manager.initialize_request_context(corr_id, req_id, user_id)

        try:
            # Process message
            message_data = json.loads(message.body.decode())

            logger.info(
                "Processing message",
                message_type=message_data.get('type'),
                correlation_id=corr_id,
                request_id=req_id
            )

            # Process message logic here
            await self.handle_message(message_data)

            # Acknowledge message
            await message.ack()

        except Exception as e:
            logger.error(
                "Message processing failed",
                error=str(e),
                correlation_id=corr_id,
                request_id=req_id,
                exc_info=True
            )

            # Negative acknowledge (requeue or dead letter)
            await message.nack(requeue=False)
```

### 6. OpenTelemetry integration
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger import JaegerExporter

# Set up OpenTelemetry tracing
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# Add Jaeger exporter
jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=14268,
)
span_processor = BatchSpanProcessor(jaeger_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)

class TracedCorrelationManager(CorrelationManager):
    """Correlation manager with OpenTelemetry integration"""

    @classmethod
    def initialize_request_context(cls, corr_id: Optional[str] = None,
                                 req_id: Optional[str] = None,
                                 uid: Optional[str] = None):
        # Call parent method
        final_corr_id = super().initialize_request_context(corr_id, req_id, uid)

        # Start OpenTelemetry span with correlation context
        with tracer.start_as_current_span("request_processing") as span:
            span.set_attribute("correlation_id", final_corr_id)
            if req_id:
                span.set_attribute("request_id", req_id)
            if uid:
                span.set_attribute("user_id", uid)

            # Store span context for later use
            cls._current_span = span

        return final_corr_id

    @classmethod
    def add_trace_attribute(cls, key: str, value: Any):
        """Add attribute to current trace span"""
        if hasattr(cls, '_current_span') and cls._current_span:
            cls._current_span.set_attribute(key, str(value))

# Usage in request handlers
@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    """Get user with tracing"""
    TracedCorrelationManager.add_trace_attribute("user_id", user_id)
    TracedCorrelationManager.add_trace_attribute("operation", "get_user")

    # Your business logic here
    user = await get_user_from_db(user_id)

    TracedCorrelationManager.add_trace_attribute("user_found", user is not None)

    return {"user": user}
```

### 7. Log correlation with tracing
```python
import structlog

class TracingProcessor:
    """Structlog processor that adds trace context"""

    def __call__(self, logger, method_name, event_dict):
        # Add trace context
        current_span = trace.get_current_span()
        if current_span.is_recording():
            trace_id = format(current_span.get_span_context().trace_id, '032x')
            span_id = format(current_span.get_span_context().span_id, '016x')

            event_dict['trace_id'] = trace_id
            event_dict['span_id'] = span_id

        # Add correlation context
        corr_id = CorrelationManager.get_correlation_id()
        if corr_id:
            event_dict['correlation_id'] = corr_id

        req_id = CorrelationManager.get_request_id()
        if req_id:
            event_dict['request_id'] = req_id

        user_id = CorrelationManager.get_user_id()
        if user_id:
            event_dict['user_id'] = user_id

        return event_dict

# Configure structlog with tracing processor
structlog.configure(
    processors=[
        TracingProcessor(),
        structlog.processors.JSONRenderer()
    ]
)
```

## ❌ Incorrect: Correlation ID antipatterns

```python
# ❌ No correlation across services
logger.info("Processing request", user_id=123)
# No way to correlate with other service logs

# ❌ Generating new IDs for each service
correlation_id = str(uuid.uuid4())  # Each service creates its own
# Breaks request tracing across services

# ❌ Not propagating in async operations
async def call_external_api():
    # Correlation context lost in async call
    response = await aiohttp.get("https://api.example.com")
    return response

# ❌ Manual header management
@app.get("/api/data")
def get_data(request):
    # Manual header extraction/parsing
    corr_id = request.headers.get('X-Correlation-ID')
    logger.info("Processing", correlation_id=corr_id)
```

## Key Benefits
- **End-to-end tracing**: Follow requests across all services
- **Distributed debugging**: Correlate logs from multiple services
- **Performance monitoring**: Track request latency across services
- **Error correlation**: Link errors to specific user requests
- **Observability**: Complete request lifecycle visibility
- **Compliance**: Audit trails for regulatory requirements</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/contextual/correlation-ids.md