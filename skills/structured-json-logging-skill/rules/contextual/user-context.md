# User Context Logging
**Impact:** HIGH - Enables user-centric log analysis and debugging for personalized services

**Problem:**
In user-facing applications, logs lack user context making it impossible to track user journeys, debug user-specific issues, or analyze user behavior patterns. Without user context, support teams cannot correlate log events to specific users, leading to poor customer experience and inefficient troubleshooting.

**Solution:**
Implement comprehensive user context logging that captures user identity, session information, and user-specific metadata while respecting privacy and security requirements.

## ✅ Correct: User context implementation

### 1. User identification fields
```json
{
  "user_id": "usr_12345",                    // Primary user identifier
  "user_external_id": "user@example.com",    // External identifier (email, etc.)
  "account_id": "acc_67890",                 // Account identifier
  "organization_id": "org_abc123",           // Organization identifier
  "tenant_id": "tenant_xyz789",              // Multi-tenant identifier
  "customer_id": "cust_456def",              // Customer identifier
  "client_id": "client_app123",              // OAuth client identifier
  "session_id": "sess_abc123def",            // User session identifier
  "device_id": "device_ios_789",             // Device identifier
  "user_type": "premium",                    // User type/role
  "user_segment": "enterprise",              // User segment
  "geographic_region": "us-west",            // User geographic region
  "account_status": "active",                // Account status
  "last_login_at": "2024-01-14T09:30:00Z",   // Last login timestamp
  "login_count": 42,                         // Total login count
  "registration_date": "2023-06-15",         // User registration date
  "subscription_tier": "pro",                // Subscription level
  "feature_access_level": "full"             // Feature access level
}
```

### 2. Session and authentication context
```json
{
  "session_id": "sess_abc123def456",
  "session_start_at": "2024-01-15T10:00:00Z",
  "session_duration_seconds": 1800,
  "authentication_method": "oauth2",
  "auth_provider": "google",
  "mfa_enabled": true,
  "mfa_verified": true,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "device_type": "desktop",
  "browser": "chrome",
  "browser_version": "120.0",
  "operating_system": "macOS",
  "timezone": "America/New_York",
  "language": "en-US",
  "screen_resolution": "1920x1080",
  "is_mobile": false,
  "is_bot": false,
  "vpn_detected": false,
  "proxy_detected": false
}
```

### 3. Privacy-compliant user context

#### PII-safe user logging
```json
// ✅ Safe: Use hashed/encoded identifiers
{
  "user_id": "usr_12345",              // Internal ID only
  "user_hash": "sha256_hash_of_email", // Hashed identifier
  "account_type": "premium",           // Non-PII metadata
  "region": "us-west",                 // Geographic region only
  "signup_month": "2023-06",           // Month precision only
  "login_streak_days": 7,              // Behavioral data
  "feature_usage_score": 85.5          // Usage metrics
}

// ❌ Unsafe: Direct PII in logs
{
  "email": "user@example.com",         // PII - don't log
  "phone": "+1234567890",              // PII - don't log
  "full_name": "John Doe",             // PII - don't log
  "address": "123 Main St",            // PII - don't log
  "ssn_last4": "1234"                  // PII - don't log
}
```

### 4. User journey tracking
```json
{
  "user_journey": {
    "session_id": "sess_abc123",
    "step": "checkout",
    "step_number": 3,
    "total_steps": 5,
    "previous_step": "cart_review",
    "next_step": "payment",
    "time_in_step_seconds": 45,
    "abandoned": false,
    "conversion_probability": 0.85
  },
  "user_behavior": {
    "page_views_today": 12,
    "actions_today": 8,
    "time_on_site_minutes": 25,
    "bounce_rate": 0.15,
    "engagement_score": 7.2
  }
}
```

### 5. User context middleware (Python/Flask)
```python
from flask import Flask, request, g, session
import logging
from pythonjsonlogger import jsonlogger
import hashlib
import uuid

app = Flask(__name__)

class UserContextFilter(logging.Filter):
    def filter(self, record):
        # Add user context to all log records
        try:
            record.user_id = getattr(g, 'user_id', None)
            record.session_id = getattr(g, 'session_id', None)
            record.account_id = getattr(g, 'account_id', None)
            record.organization_id = getattr(g, 'organization_id', None)

            # Safe user identifiers
            user_email = getattr(g, 'user_email', None)
            if user_email:
                record.user_hash = hashlib.sha256(user_email.encode()).hexdigest()[:16]

            # Session context
            record.ip_address = request.remote_addr
            record.user_agent = request.headers.get('User-Agent')
            record.request_path = request.path
            record.request_method = request.method

        except (AttributeError, RuntimeError):
            # Handle cases where context is not available
            record.user_id = None
            record.session_id = None

        return True

# Add user context filter to all loggers
logging.getLogger().addFilter(UserContextFilter())

@app.before_request
def setup_user_context():
    # Generate or retrieve session ID
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

    g.session_id = session['session_id']
    g.request_id = str(uuid.uuid4())

    # Set user context if authenticated
    if 'user_id' in session:
        g.user_id = session['user_id']
        g.account_id = session.get('account_id')
        g.organization_id = session.get('organization_id')
        g.user_email = session.get('user_email')

@app.route('/api/user/profile')
def user_profile():
    app.logger.info("User accessed profile", extra={
        'action': 'profile_view',
        'resource': 'user_profile',
        'access_level': 'owner'
    })
    return {"message": "Profile accessed"}
```

### 6. User context in FastAPI
```python
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging
import hashlib

app = FastAPI()
security = HTTPBearer()

class UserContext:
    def __init__(self):
        self.user_id = None
        self.account_id = None
        self.organization_id = None
        self.roles = []
        self.permissions = []
        self.session_id = None
        self.ip_address = None
        self.user_agent = None

# Context variable for request-scoped user data
user_context = ContextVar('user_context', default=UserContext())

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Validate token and extract user info
    # This is a simplified example
    user_id = "usr_12345"  # From token validation
    account_id = "acc_67890"
    organization_id = "org_abc123"

    context = UserContext()
    context.user_id = user_id
    context.account_id = account_id
    context.organization_id = organization_id
    context.roles = ["user", "premium"]
    context.permissions = ["read", "write"]

    user_context.set(context)
    return context

class UserContextFilter(logging.Filter):
    def filter(self, record):
        context = user_context.get()
        record.user_id = context.user_id
        record.account_id = context.account_id
        record.organization_id = context.organization_id
        record.user_roles = ','.join(context.roles) if context.roles else None
        record.user_permissions = ','.join(context.permissions) if context.permissions else None
        return True

# Add filter to logger
logging.getLogger().addFilter(UserContextFilter())

@app.middleware("http")
async def user_context_middleware(request: Request, call_next):
    context = user_context.get()
    context.ip_address = request.client.host
    context.user_agent = request.headers.get("User-Agent")
    context.session_id = request.headers.get("X-Session-ID")

    response = await call_next(request)
    return response

@app.get("/api/user/data")
async def get_user_data(user=Depends(get_current_user)):
    logging.info("User data accessed", extra={
        'action': 'data_access',
        'resource_type': 'user_data',
        'access_type': 'read',
        'data_sensitivity': 'personal'
    })
    return {"data": "user data"}
```

### 7. User segmentation and analytics
```json
{
  "user_segmentation": {
    "demographic": {
      "age_group": "25-34",
      "income_bracket": "high",
      "industry": "technology"
    },
    "behavioral": {
      "user_type": "power_user",
      "engagement_level": "high",
      "usage_frequency": "daily",
      "feature_adoption": ["advanced_search", "api_access", "integrations"]
    },
    "technical": {
      "device_category": "desktop",
      "connection_type": "broadband",
      "browser_category": "modern"
    }
  },
  "analytics_context": {
    "campaign_id": "summer_promo_2024",
    "traffic_source": "google_ads",
    "landing_page": "/pricing",
    "conversion_funnel_step": 3,
    "attribution_model": "last_click"
  }
}
```

## ❌ Incorrect: User context mistakes

```json
// ❌ Missing user context
{
  "message": "Payment processed",
  "amount": 99.99
}
// No user identification - impossible to correlate

// ❌ Insufficient user context
{
  "message": "User login failed",
  "user_id": "usr_12345"
}
// Missing authentication method, failure reason, IP, etc.

// ❌ Privacy violations
{
  "message": "User updated profile",
  "email": "user@example.com",
  "phone": "+1234567890",
  "ssn": "123-45-6789"
}
// PII directly in logs - major privacy violation

// ❌ Over-logging sensitive actions
{
  "message": "Password changed",
  "user_id": "usr_12345",
  "old_password_hash": "sha256_hash",
  "new_password_hash": "sha256_new_hash"
}
// Password hashes shouldn't be logged even if hashed
```

## Key Benefits
- **User journey tracking**: Complete visibility into user interactions
- **Personalized debugging**: User-specific issue resolution
- **Behavioral analytics**: Understand user patterns and preferences
- **Security monitoring**: Track suspicious user activities
- **Support efficiency**: Quick user issue identification and resolution
- **Privacy compliance**: Safe logging without PII exposure</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/contextual/user-context.md