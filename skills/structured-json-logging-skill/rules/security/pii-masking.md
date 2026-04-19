# Personal Identifiable Information Masking
**Impact:** CRITICAL - Prevents accidental exposure of sensitive user data in logs

**Problem:**
Logs containing personally identifiable information (PII) like emails, phone numbers, social security numbers, or credit card details can lead to privacy breaches, compliance violations, and legal consequences. Even in development environments, PII exposure can cause data leaks and security incidents.

**Solution:**
Implement comprehensive PII detection and masking in logging systems to automatically redact sensitive information while preserving debugging and monitoring capabilities.

## ✅ Correct: PII masking implementation

### 1. PII detection patterns
```javascript
// JavaScript PII detection patterns
const piiPatterns = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  postalCode: /\b\d{5}(?:[-\s]\d{4})?\b/g,
  apiKey: /\b[A-Za-z0-9]{32,}\b/g, // Generic long alphanumeric
  jwtToken: /\beyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\b/g
};
```

```python
# Python PII detection patterns
import re

PII_PATTERNS = {
    'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    'phone': re.compile(r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'),
    'ssn': re.compile(r'\b\d{3}[-]?\d{2}[-]?\d{4}\b'),
    'credit_card': re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),
    'api_key': re.compile(r'\b[A-Za-z0-9]{32,}\b'),
    'jwt_token': re.compile(r'\beyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\b'),
    'password': re.compile(r'\bpassword["\']?\s*[:=]\s*["\']([^"\']+)["\']', re.IGNORECASE)
}
```

### 2. Safe logging functions
```python
import re
import hashlib
from typing import Dict, Any, Union

class PIIMasker:
    def __init__(self):
        self.patterns = PII_PATTERNS

    def mask_value(self, value: str, pii_type: str) -> str:
        """Mask a PII value based on its type"""
        if not isinstance(value, str):
            return value

        if pii_type == 'email':
            # Mask email: user@domain.com -> u***@d***.com
            parts = value.split('@')
            if len(parts) == 2:
                user, domain = parts
                masked_user = user[0] + '***' if len(user) > 1 else '***'
                domain_parts = domain.split('.')
                if len(domain_parts) >= 2:
                    masked_domain = domain_parts[0][0] + '***' + '.' + '.'.join(domain_parts[1:])
                    return f"{masked_user}@{masked_domain}"
        elif pii_type in ['phone', 'ssn', 'credit_card']:
            # Mask last 4 digits
            return re.sub(r'\d(?=\d{4})', '*', value)
        elif pii_type in ['api_key', 'jwt_token', 'password']:
            # Complete masking
            return '***MASKED***'
        else:
            # Default masking - show first and last character
            if len(value) <= 2:
                return '***'
            return value[0] + '*' * (len(value) - 2) + value[-1]

    def mask_text(self, text: str) -> str:
        """Mask all PII in a text string"""
        if not isinstance(text, str):
            return text

        masked = text
        for pii_type, pattern in self.patterns.items():
            masked = pattern.sub(lambda m: self.mask_value(m.group(), pii_type), masked)

        return masked

    def mask_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively mask PII in nested dictionaries"""
        if not isinstance(data, dict):
            return data

        masked = {}
        for key, value in data.items():
            # Mask sensitive keys completely
            if any(sensitive in key.lower() for sensitive in ['password', 'token', 'secret', 'key']):
                masked[key] = '***MASKED***'
            elif isinstance(value, dict):
                masked[key] = self.mask_dict(value)
            elif isinstance(value, list):
                masked[key] = [self.mask_dict(item) if isinstance(item, dict) else
                              self.mask_text(item) if isinstance(item, str) else item
                              for item in value]
            elif isinstance(value, str):
                masked[key] = self.mask_text(value)
            else:
                masked[key] = value

        return masked

# Usage
masker = PIIMasker()

# Mask string
safe_message = masker.mask_text("User john@example.com logged in")
# Result: "User j***@e***.com logged in"

# Mask log data
log_data = {
    "user_id": "usr_123",
    "email": "john@example.com",
    "phone": "555-123-4567",
    "api_key": "sk_1234567890abcdef",
    "metadata": {
        "device_id": "device_789",
        "ip_address": "192.168.1.100"
    }
}

safe_log_data = masker.mask_dict(log_data)
# Result: {
#   "user_id": "usr_123",
#   "email": "j***@e***.com",
#   "phone": "***-***-4567",
#   "api_key": "***MASKED***",
#   "metadata": {...}
# }
```

### 3. Winston PII masking transport
```javascript
const winston = require('winston');
const Transform = require('stream').Transform;

class PIIMaskingTransform extends Transform {
  constructor(options = {}) {
    super(options);
    this.masker = new PIIMasker();
  }

  _transform(chunk, encoding, callback) {
    try {
      const logEntry = JSON.parse(chunk.toString());

      // Mask the message
      if (logEntry.message) {
        logEntry.message = this.masker.maskText(logEntry.message);
      }

      // Mask metadata
      if (logEntry.metadata) {
        logEntry.metadata = this.masker.maskObject(logEntry.metadata);
      }

      // Mask all other string fields
      for (const [key, value] of Object.entries(logEntry)) {
        if (typeof value === 'string') {
          logEntry[key] = this.masker.maskText(value);
        } else if (typeof value === 'object' && value !== null) {
          logEntry[key] = this.masker.maskObject(value);
        }
      }

      this.push(JSON.stringify(logEntry) + '\n');
    } catch (error) {
      // If parsing fails, mask the entire chunk
      this.push(this.masker.maskText(chunk.toString()));
    }

    callback();
  }
}

class PIIMasker {
  constructor() {
    this.patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
      creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      apiKey: /\b[A-Za-z0-9]{32,}\b/g,
      jwtToken: /\beyJ[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\b/g
    };
  }

  maskText(text) {
    if (typeof text !== 'string') return text;

    let masked = text;
    for (const [type, pattern] of Object.entries(this.patterns)) {
      masked = masked.replace(pattern, (match) => this.maskValue(match, type));
    }
    return masked;
  }

  maskValue(value, type) {
    switch (type) {
      case 'email':
        const [user, domain] = value.split('@');
        return `${user[0]}***@${domain.replace(/./g, '*').slice(0, -3)}***`;
      case 'phone':
        return value.replace(/\d(?=\d{4})/g, '*');
      case 'creditCard':
        return value.replace(/\d(?=\d{4})/g, '*');
      default:
        return '***MASKED***';
    }
  }

  maskObject(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    const masked = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (['password', 'token', 'secret', 'key'].some(sensitive =>
        key.toLowerCase().includes(sensitive))) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'string') {
        masked[key] = this.maskText(value);
      } else if (typeof value === 'object') {
        masked[key] = this.maskObject(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}

// Usage in Winston
const piiTransport = new winston.transports.Stream({
  stream: new PIIMaskingTransform(),
  level: 'info'
});

const logger = winston.createLogger({
  transports: [piiTransport]
});
```

### 4. Python logging filter
```python
import logging
import re
from typing import Dict, Any

class PIIMaskingFilter(logging.Filter):
    """Logging filter that masks PII in log records"""

    def __init__(self):
        self.masker = PIIMasker()

    def filter(self, record):
        # Mask the message
        if hasattr(record, 'getMessage'):
            record.msg = self.masker.mask_text(record.getMessage())

        # Mask all extra fields
        if hasattr(record, '__dict__'):
            for key, value in record.__dict__.items():
                if key.startswith(('msg', 'message')):
                    continue  # Already handled
                if isinstance(value, str):
                    setattr(record, key, self.masker.mask_text(value))
                elif isinstance(value, dict):
                    setattr(record, key, self.masker.mask_dict(value))

        return True

# Apply filter to all loggers
root_logger = logging.getLogger()
pii_filter = PIIMaskingFilter()
root_logger.addFilter(pii_filter)

# Usage
logger.info("User login", extra={
    "email": "user@example.com",
    "ip_address": "192.168.1.100",
    "api_key": "sk_1234567890abcdef"
})
# Output will have PII masked
```

### 5. Environment-specific masking
```python
class EnvironmentAwarePIIMasker(PIIMasker):
    def __init__(self, environment: str = 'development'):
        super().__init__()
        self.environment = environment

    def should_mask(self, pii_type: str) -> bool:
        """Determine if PII should be masked based on environment"""
        if self.environment == 'development':
            # In development, only mask highly sensitive data
            return pii_type in ['password', 'credit_card', 'ssn']
        elif self.environment == 'staging':
            # In staging, mask most PII
            return pii_type not in ['email']  # Maybe keep emails for testing
        else:
            # In production, mask everything
            return True

    def mask_value(self, value: str, pii_type: str) -> str:
        if not self.should_mask(pii_type):
            return value
        return super().mask_value(value, pii_type)

# Configure based on environment
import os
environment = os.getenv('ENVIRONMENT', 'development')
masker = EnvironmentAwarePIIMasker(environment)
```

### 6. Audit logging for PII access
```python
class PIIAuditLogger:
    """Logs PII access for compliance and security monitoring"""

    def __init__(self):
        self.audit_logger = logging.getLogger('pii_audit')
        self.audit_logger.setLevel(logging.INFO)

        # Separate handler for audit logs (no PII masking)
        handler = logging.FileHandler('logs/pii_audit.log')
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.audit_logger.addHandler(handler)

    def log_pii_access(self, user_id: str, action: str, pii_types: list,
                      resource: str, justification: str = None):
        """Log PII access for audit purposes"""
        self.audit_logger.info("PII Access", extra={
            "user_id": user_id,
            "action": action,  # read, write, delete, search
            "pii_types": pii_types,
            "resource": resource,
            "justification": justification,
            "timestamp": datetime.utcnow().isoformat(),
            "ip_address": self._get_client_ip(),
            "user_agent": self._get_user_agent()
        })

    def _get_client_ip(self) -> str:
        # Implementation to get client IP
        return "192.168.1.100"

    def _get_user_agent(self) -> str:
        # Implementation to get user agent
        return "Mozilla/5.0..."

# Usage
audit_logger = PIIAuditLogger()

# Before accessing PII
audit_logger.log_pii_access(
    user_id="usr_123",
    action="read",
    pii_types=["email", "phone"],
    resource="user_profile",
    justification="Customer support ticket #12345"
)
```

### 7. Compliance validation
```python
class ComplianceValidator:
    """Validates log data against compliance requirements"""

    def __init__(self):
        self.regulations = {
            'gdpr': self._check_gdpr_compliance,
            'ccpa': self._check_ccpa_compliance,
            'hipaa': self._check_hipaa_compliance
        }

    def validate_log_entry(self, log_entry: Dict[str, Any],
                          regulations: list = ['gdpr']) -> Dict[str, Any]:
        """Validate log entry against compliance requirements"""
        issues = []

        for regulation in regulations:
            if regulation in self.regulations:
                regulation_issues = self.regulations[regulation](log_entry)
                issues.extend(regulation_issues)

        if issues:
            # Log compliance issues (without exposing data)
            compliance_logger = logging.getLogger('compliance')
            compliance_logger.warning("Compliance violation detected", extra={
                "issues_count": len(issues),
                "regulations_checked": regulations,
                "log_level": log_entry.get('level'),
                "service": log_entry.get('service')
            })

        return log_entry

    def _check_gdpr_compliance(self, log_entry):
        issues = []
        sensitive_fields = ['email', 'phone', 'ip_address', 'user_id']

        for field in sensitive_fields:
            if field in log_entry:
                # Check if data is properly pseudonymized
                value = str(log_entry[field])
                if not self._is_pseudonymized(value):
                    issues.append(f"Field '{field}' contains non-pseudonymized PII")

        return issues

    def _is_pseudonymized(self, value: str) -> bool:
        """Check if a value appears to be pseudonymized"""
        # Simple heuristic: contains masking characters or is hashed
        return '***' in value or len(value) == 64  # SHA-256 length

    def _check_ccpa_compliance(self, log_entry):
        # Similar checks for CCPA
        return []

    def _check_hipaa_compliance(self, log_entry):
        # HIPAA-specific checks
        return []
```

## ❌ Incorrect: PII masking mistakes

```json
// ❌ Direct PII logging
{
  "message": "User john@example.com logged in",
  "user_data": {
    "email": "john@example.com",
    "phone": "555-123-4567",
    "ssn": "123-45-6789"
  }
}

// ❌ Insufficient masking
{
  "email": "j***@example.com",
  "phone": "555-***-****"
}
// Domain visible, last 4 digits exposed

// ❌ Masking sensitive keys but not values
{
  "password": "secret123",
  "token": "abc123def"
}
// Keys suggest sensitivity but values exposed

// ❌ Environment-agnostic masking
// Same masking in dev and prod
{
  "debug_info": "***MASKED***"
}
// Can't debug in development
```

## Key Benefits
- **Privacy protection**: Prevents accidental PII exposure
- **Compliance**: Meets GDPR, CCPA, HIPAA requirements
- **Security**: Reduces breach risk and legal liability
- **Flexibility**: Environment-specific masking levels
- **Auditability**: Tracks PII access for compliance
- **Debugging**: Balances security with development needs</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/security/pii-masking.md