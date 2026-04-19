---
title: Signing Cryptography
impact: MEDIUM
impactDescription: Protects data integrity and prevents tampering
tags: django, security, signing, cryptography
---

## Signing Cryptography

**Problem:**
Web applications need to protect data integrity and prevent tampering when passing information through untrusted channels. Without proper cryptographic signing, sensitive data like password reset tokens, form values, or temporary access URLs can be manipulated by attackers, leading to security vulnerabilities.

**Solution:**
Use Django's signing framework to protect data integrity:

```python
from django.core import signing

# Basic signing
signer = signing.Signer()
signed_value = signer.sign("sensitive-data")
original_value = signer.unsign(signed_value)

# With custom key and salt for different namespaces
signer = signing.Signer(key="custom-key", salt="namespace")
signed = signer.sign("data")
```

Use TimestampSigner for time-limited signatures:

```python
from django.core.signing import TimestampSigner
from datetime import timedelta

signer = TimestampSigner()

# Sign with timestamp
token = signer.sign("user-123")

# Verify within time limit
try:
    user_id = signer.unsign(token, max_age=3600)  # 1 hour
except signing.SignatureExpired:
    # Token expired
    pass
except signing.BadSignature:
    # Invalid token
    pass
```

Protect complex data structures:

```python
# Sign objects (uses JSON serialization)
data = {"user_id": 123, "action": "reset_password"}
signed_data = signer.sign_object(data)
original_data = signer.unsign_object(signed_data)

# Or use the module-level functions
import signing
signed = signing.dumps(data)
original = signing.loads(signed, max_age=300)
```

Generate secure one-time URLs:

```python
def get_reset_url(user):
    signer = TimestampSigner(salt="password-reset")
    token = signer.sign(str(user.id))
    return f"/reset-password/{token}/"

def verify_reset_token(token):
    try:
        signer = TimestampSigner(salt="password-reset")
        user_id = signer.unsign(token, max_age=86400)  # 24 hours
        return User.objects.get(id=user_id)
    except (signing.BadSignature, signing.SignatureExpired, User.DoesNotExist):
        return None
```

## Common Mistakes

- Not using salt to separate different signing contexts
- Using weak or predictable secret keys
- Not setting max_age on timestamped signatures
- Exposing signed data in URLs without proper encoding
- Using the same salt for different purposes
- Not handling SignatureExpired and BadSignature exceptions
- Committing SECRET_KEY to version control

## When to Apply

- Creating password reset or account recovery URLs
- Protecting hidden form fields from tampering
- Generating temporary access tokens for downloads
- Implementing secure cookie-based sessions
- Building one-time login links
- Protecting API tokens or access keys
- Validating data integrity in webhooks or callbacks