# Sensitive Data Protection in Logs
**Impact:** CRITICAL - Prevents security breaches and ensures compliance with data protection regulations

**Problem:**
Logs containing sensitive information like passwords, API keys, personal data, or financial information can lead to security breaches, data leaks, and compliance violations. Attackers often target logs to extract sensitive data, and accidental exposure can result in severe legal and financial consequences.

**Solution:**
Implement comprehensive data sanitization, masking, and filtering to prevent sensitive information from entering logs while maintaining debugging and monitoring capabilities.

## ✅ Correct: Sensitive data protection

### 1. Data classification and identification
```python
import re
from typing import Dict, List, Pattern, Set

class SensitiveDataClassifier:
    """Classify and identify sensitive data patterns"""

    def __init__(self):
        # Define sensitive data patterns
        self.sensitive_patterns = {
            'password': [
                re.compile(r'password["\s:=]+([^&\s]+)', re.IGNORECASE),
                re.compile(r'passwd["\s:=]+([^&\s]+)', re.IGNORECASE),
                re.compile(r'pwd["\s:=]+([^&\s]+)', re.IGNORECASE),
            ],
            'api_key': [
                re.compile(r'api[_-]?key["\s:=]+([A-Za-z0-9_-]{20,})', re.IGNORECASE),
                re.compile(r'auth[_-]?token["\s:=]+([A-Za-z0-9_.-]{20,})', re.IGNORECASE),
                re.compile(r'bearer["\s:=]+([A-Za-z0-9_.-]{20,})', re.IGNORECASE),
            ],
            'credit_card': [
                re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),
            ],
            'ssn': [
                re.compile(r'\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b'),  # US SSN
            ],
            'email': [
                re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            ],
            'phone': [
                re.compile(r'\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b'),  # US phone
            ],
        }

        # High-risk fields that should never be logged
        self.high_risk_fields = {
            'password', 'passwd', 'pwd', 'secret', 'token', 'key',
            'credit_card', 'card_number', 'ssn', 'social_security',
            'private_key', 'certificate', 'ssl_key'
        }

    def classify_data(self, key: str, value: str) -> Dict[str, any]:
        """Classify a key-value pair for sensitivity"""
        key_lower = key.lower()
        value_lower = value.lower() if isinstance(value, str) else str(value).lower()

        # Check for high-risk field names
        if any(risk_term in key_lower for risk_term in self.high_risk_fields):
            return {
                'sensitivity': 'high',
                'type': 'field_name',
                'masked_value': self.mask_value(value),
                'reason': f'High-risk field name: {key}'
            }

        # Check for sensitive patterns in value
        for data_type, patterns in self.sensitive_patterns.items():
            for pattern in patterns:
                if pattern.search(value):
                    return {
                        'sensitivity': 'high',
                        'type': 'pattern_match',
                        'data_type': data_type,
                        'masked_value': self.mask_value(value),
                        'reason': f'Sensitive {data_type} pattern detected'
                    }

        # Check for potential PII in longer values
        if len(str(value)) > 10 and self._contains_pii_indicators(value_lower):
            return {
                'sensitivity': 'medium',
                'type': 'pii_indicators',
                'masked_value': self.mask_value(value),
                'reason': 'Potential PII indicators detected'
            }

        return {
            'sensitivity': 'low',
            'type': 'safe',
            'masked_value': value
        }

    def _contains_pii_indicators(self, text: str) -> bool:
        """Check for PII indicators"""
        pii_indicators = [
            'name', 'address', 'phone', 'email', 'birth', 'social',
            'medical', 'financial', 'personal', 'private'
        ]
        return any(indicator in text for indicator in pii_indicators)

    def mask_value(self, value: str, visible_chars: int = 4) -> str:
        """Mask sensitive values"""
        if not isinstance(value, str):
            value = str(value)

        if len(value) <= visible_chars * 2:
            return '***MASKED***'

        # Show first and last few characters
        return value[:visible_chars] + '***' + value[-visible_chars:]
```

### 2. Log sanitization processor
```python
import structlog
from typing import Dict, Any

class LogSanitizer:
    """Sanitize sensitive data from log entries"""

    def __init__(self):
        self.classifier = SensitiveDataClassifier()

    def __call__(self, logger, method_name, event_dict):
        """Sanitize log event dictionary"""
        sanitized_event = {}

        for key, value in event_dict.items():
            if isinstance(value, dict):
                # Recursively sanitize nested dictionaries
                sanitized_event[key] = self._sanitize_dict(value)
            elif isinstance(value, list):
                # Sanitize list items
                sanitized_event[key] = self._sanitize_list(value)
            else:
                # Sanitize individual values
                classification = self.classifier.classify_data(key, str(value))

                if classification['sensitivity'] == 'high':
                    # Log the sanitization action
                    structlog.get_logger().debug(
                        "Sensitive data sanitized",
                        field=key,
                        reason=classification['reason'],
                        original_length=len(str(value))
                    )
                    sanitized_event[key] = classification['masked_value']
                else:
                    sanitized_event[key] = value

        return sanitized_event

    def _sanitize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize nested dictionary"""
        sanitized = {}
        for key, value in data.items():
            classification = self.classifier.classify_data(key, str(value))
            if classification['sensitivity'] == 'high':
                sanitized[key] = classification['masked_value']
            else:
                sanitized[key] = value
        return sanitized

    def _sanitize_list(self, data: list) -> list:
        """Sanitize list items"""
        return [item for item in data if not self._is_sensitive_item(item)]

    def _is_sensitive_item(self, item) -> bool:
        """Check if list item contains sensitive data"""
        classification = self.classifier.classify_data('item', str(item))
        return classification['sensitivity'] == 'high'

# Configure structlog with sanitization
structlog.configure(
    processors=[
        LogSanitizer(),
        structlog.processors.JSONRenderer()
    ]
)
```

### 3. Database query logging protection
```python
import sqlalchemy
from sqlalchemy import event
import re

class SQLSanitizer:
    """Sanitize sensitive data in SQL queries"""

    def __init__(self):
        self.sensitive_patterns = [
            re.compile(r"'(password|passwd|pwd|secret|token|key)'[\s]*=[\s]*'([^']+)'", re.IGNORECASE),
            re.compile(r"'(email|phone|ssn)'[\s]*=[\s]*'([^']+)'", re.IGNORECASE),
        ]

    def sanitize_query(self, query: str) -> str:
        """Sanitize sensitive values in SQL queries"""
        sanitized = query

        for pattern in self.sensitive_patterns:
            sanitized = pattern.sub(r"'\1' = '***MASKED***'", sanitized)

        return sanitized

# SQLAlchemy event listener
@event.listens_for(sqlalchemy.engine.Engine, "before_cursor_execute")
def sanitize_sql_log(conn, cursor, statement, parameters, context, executemany):
    """Log sanitized SQL queries"""
    sanitizer = SQLSanitizer()
    sanitized_query = sanitizer.sanitize_query(statement)

    # Log sanitized query
    logger.debug(
        "SQL query executed",
        query=sanitized_query,
        parameters=self._sanitize_parameters(parameters)
    )

    def _sanitize_parameters(self, parameters):
        """Sanitize SQL parameters"""
        if not parameters:
            return parameters

        sanitized = {}
        for key, value in parameters.items():
            if any(term in key.lower() for term in ['password', 'token', 'key', 'secret']):
                sanitized[key] = '***MASKED***'
            else:
                sanitized[key] = value
        return sanitized
```

### 4. HTTP request/response logging protection
```python
from fastapi import Request, Response
from typing import Dict, Any
import json

class HTTPLogSanitizer:
    """Sanitize HTTP requests and responses for logging"""

    def __init__(self):
        self.classifier = SensitiveDataClassifier()

    def sanitize_request(self, request: Request) -> Dict[str, Any]:
        """Sanitize request data for logging"""
        sanitized = {
            'method': request.method,
            'url': str(request.url),
            'headers': self._sanitize_headers(dict(request.headers)),
            'query_params': self._sanitize_query_params(dict(request.query_params)),
        }

        # Don't log request body for sensitive endpoints
        if not self._is_sensitive_endpoint(str(request.url)):
            try:
                # Only log body for safe content types and small sizes
                if (request.headers.get('content-type', '').startswith('application/json') and
                    int(request.headers.get('content-length', 0)) < 1024):
                    body = await request.body()
                    sanitized['body'] = self._sanitize_json_body(body.decode())
            except:
                pass

        return sanitized

    def sanitize_response(self, response: Response) -> Dict[str, Any]:
        """Sanitize response data for logging"""
        sanitized = {
            'status_code': response.status_code,
            'headers': self._sanitize_headers(dict(response.headers)),
        }

        # Don't log response body for sensitive data
        if not self._is_sensitive_response(response):
            try:
                # Check if response has body to log
                if hasattr(response, 'body') and len(response.body) < 1024:
                    sanitized['body'] = self._sanitize_json_body(response.body.decode())
            except:
                pass

        return sanitized

    def _sanitize_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """Sanitize HTTP headers"""
        sanitized = {}
        sensitive_headers = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']

        for name, value in headers.items():
            if any(sensitive in name.lower() for sensitive in sensitive_headers):
                sanitized[name] = '***MASKED***'
            elif name.lower() == 'user-agent':
                # Truncate user agent for privacy
                sanitized[name] = value[:50] + '...' if len(value) > 50 else value
            else:
                sanitized[name] = value

        return sanitized

    def _sanitize_query_params(self, params: Dict[str, str]) -> Dict[str, str]:
        """Sanitize URL query parameters"""
        sanitized = {}
        sensitive_params = ['password', 'token', 'key', 'secret', 'api_key']

        for name, value in params.items():
            if any(sensitive in name.lower() for sensitive in sensitive_params):
                sanitized[name] = '***MASKED***'
            else:
                sanitized[name] = value

        return sanitized

    def _sanitize_json_body(self, body: str) -> Dict[str, Any]:
        """Sanitize JSON request/response body"""
        try:
            data = json.loads(body)
            return self._sanitize_json_data(data)
        except:
            return {'content': '***BINARY_OR_INVALID***'}

    def _sanitize_json_data(self, data: Any) -> Any:
        """Recursively sanitize JSON data"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                classification = self.classifier.classify_data(key, str(value))
                if classification['sensitivity'] == 'high':
                    sanitized[key] = classification['masked_value']
                else:
                    sanitized[key] = self._sanitize_json_data(value)
            return sanitized
        elif isinstance(data, list):
            return [self._sanitize_json_data(item) for item in data]
        else:
            return data

    def _is_sensitive_endpoint(self, url: str) -> bool:
        """Check if endpoint handles sensitive data"""
        sensitive_paths = ['/auth', '/login', '/password', '/payment', '/credit-card']
        return any(path in url for path in sensitive_paths)

    def _is_sensitive_response(self, response: Response) -> bool:
        """Check if response contains sensitive data"""
        return response.status_code >= 400 or 'auth' in str(response.url).lower()
```

### 5. Configuration and environment variable protection
```python
import os
from typing import Set

class ConfigSanitizer:
    """Sanitize configuration and environment variables"""

    def __init__(self):
        self.sensitive_env_vars: Set[str] = {
            'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'API_KEY', 'DATABASE_URL',
            'REDIS_URL', 'AWS_SECRET', 'GOOGLE_CREDENTIALS', 'SSL_KEY'
        }

    def sanitize_config_dict(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize configuration dictionary"""
        sanitized = {}

        for key, value in config.items():
            if self._is_sensitive_key(key):
                sanitized[key] = '***MASKED***'
            else:
                sanitized[key] = value

        return sanitized

    def sanitize_env_vars(self) -> Dict[str, str]:
        """Sanitize environment variables for logging"""
        sanitized = {}

        for key, value in os.environ.items():
            if self._is_sensitive_key(key):
                sanitized[key] = '***MASKED***'
            else:
                sanitized[key] = value

        return sanitized

    def _is_sensitive_key(self, key: str) -> bool:
        """Check if configuration key contains sensitive data"""
        key_upper = key.upper()
        return any(sensitive in key_upper for sensitive in self.sensitive_env_vars)

# Usage in logging
config_sanitizer = ConfigSanitizer()

logger.info(
    "Application started",
    config=config_sanitizer.sanitize_config_dict(app.config),
    environment=config_sanitizer.sanitize_env_vars()
)
```

### 6. Compliance and audit logging
```python
import hashlib
from datetime import datetime

class ComplianceLogger:
    """Compliance and audit logging with data protection"""

    def __init__(self):
        self.sanitizer = SensitiveDataClassifier()

    def log_audit_event(self, event_type: str, user_id: str,
                       resource: str, action: str, **context):
        """Log audit events with compliance requirements"""

        # Sanitize context data
        sanitized_context = {}
        for key, value in context.items():
            classification = self.sanitizer.classify_data(key, str(value))
            if classification['sensitivity'] == 'high':
                sanitized_context[key] = classification['masked_value']
            else:
                sanitized_context[key] = value

        # Create audit log entry
        audit_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'event_type': event_type,
            'user_id': self._hash_user_id(user_id),  # Hash PII
            'resource': resource,
            'action': action,
            'ip_address': context.get('ip_address', 'unknown'),
            'user_agent': context.get('user_agent', 'unknown')[:100],  # Truncate
            'context': sanitized_context,
            'compliance_level': 'gdpr_hipaa_compliant'
        }

        # Log to secure audit system
        audit_logger.info(
            "Audit event",
            audit_entry=audit_entry,
            immutable=True  # Mark as tamper-evident
        )

    def _hash_user_id(self, user_id: str) -> str:
        """Hash user ID for privacy while maintaining auditability"""
        return hashlib.sha256(f"{user_id}:audit".encode()).hexdigest()[:16]

    def log_data_access(self, user_id: str, data_type: str,
                       access_type: str, record_ids: List[str]):
        """Log data access events"""
        self.log_audit_event(
            event_type='data_access',
            user_id=user_id,
            resource=f"{data_type}:{','.join(record_ids[:10])}",  # Limit record IDs
            action=access_type,
            data_type=data_type,
            record_count=len(record_ids),
            record_ids_preview=record_ids[:3]  # Only log first few
        )

# Usage
compliance_logger = ComplianceLogger()

# Log user login
compliance_logger.log_audit_event(
    event_type='authentication',
    user_id='user123',
    resource='login',
    action='success',
    ip_address='192.168.1.100',
    method='password'
)

# Log data access
compliance_logger.log_data_access(
    user_id='user123',
    data_type='medical_records',
    access_type='read',
    record_ids=['rec1', 'rec2', 'rec3']
)
```

## ❌ Incorrect: Data exposure mistakes

```python
# ❌ Logging passwords
logger.info("User login", password=user.password)
# Password exposed in logs!

# ❌ Logging API keys
logger.debug("API call", api_key=request.headers['X-API-Key'])
# API key leaked!

# ❌ Logging credit cards
logger.info("Payment processed", card_number=payment.card_number)
# PCI violation!

# ❌ Logging PII
logger.error("User error", email=user.email, ssn=user.ssn)
# GDPR/HIPAA violation!

# ❌ Logging full request bodies
logger.debug("Request received", body=request.get_json())
# May contain sensitive data
```

## Key Benefits
- **Security compliance**: Meet GDPR, HIPAA, PCI-DSS requirements
- **Data breach prevention**: Sensitive data never enters logs
- **Legal protection**: Avoid costly data exposure incidents
- **Audit trails**: Maintain compliance logging without data risks
- **Privacy protection**: PII and sensitive data automatically masked
- **Regulatory compliance**: Support for multiple compliance frameworks</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/security/sensitive-data-protection.md