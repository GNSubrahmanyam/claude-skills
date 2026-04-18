# OpenAPI Callbacks (LOW)

**Impact:** LOW - Enables advanced API specifications for event-driven architectures

**Problem:**
Some APIs need to document asynchronous callbacks or webhooks in their OpenAPI specification. Standard OpenAPI doesn't handle callbacks well, making documentation incomplete for event-driven systems.

**Solution:**
Use FastAPI's OpenAPI callback support to document webhook endpoints and asynchronous operations in the API specification.

❌ **Wrong: Undocumented callbacks**
```python
# Webhook endpoint exists but not documented in OpenAPI
@app.post("/webhooks/stripe")
async def stripe_webhook(payload: dict, signature: str = Header(...)):
    # Process webhook but no OpenAPI documentation
    return {"status": "processed"}
```

✅ **Correct: Documented OpenAPI callbacks**
```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

# Define callback schemas
webhook_response_schema = {
    "type": "object",
    "properties": {
        "event_type": {"type": "string"},
        "data": {"type": "object"},
        "timestamp": {"type": "string", "format": "date-time"}
    }
}

# Configure OpenAPI callbacks in app startup
@app.on_event("startup")
async def configure_callbacks():
    # Add callback definitions to OpenAPI schema
    if app.openapi_schema:
        app.openapi_schema.setdefault("components", {}).setdefault("callbacks", {})

        # Stripe webhook callback
        app.openapi_schema["components"]["callbacks"]["stripeWebhook"] = {
            "https://example.com/webhooks/stripe": {
                "post": {
                    "summary": "Stripe webhook callback",
                    "requestBody": {
                        "description": "Stripe webhook payload",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/WebhookPayload"}
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Webhook processed successfully",
                            "content": {
                                "application/json": {
                                    "schema": webhook_response_schema
                                }
                            }
                        }
                    }
                }
            }
        }

@app.post(
    "/payments",
    summary="Create Payment",
    callbacks={
        "stripeWebhook": {
            "https://example.com/webhooks/stripe": {
                "post": {
                    "summary": "Payment webhook",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/StripeWebhook"}
                            }
                        }
                    },
                    "responses": {"200": {"description": "OK"}}
                }
            }
        }
    }
)
async def create_payment(amount: float, currency: str = "usd"):
    """Create payment with documented webhook callback"""
    payment_id = await process_payment(amount, currency)

    return {
        "payment_id": payment_id,
        "status": "pending",
        "webhook_url": "https://example.com/webhooks/stripe"
    }

@app.post("/webhooks/stripe")
async def stripe_webhook(payload: dict, signature: str = Header(...)):
    """Stripe webhook endpoint (documented via callback)"""
    # Verify signature
    if not verify_stripe_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Process webhook
    await handle_stripe_event(payload)

    return {"status": "processed"}
```

**Common mistakes:**
- Implementing webhooks without documenting them
- Not specifying callback schemas in OpenAPI
- Missing callback security documentation
- Not handling callback failures properly

**When to apply:**
- APIs with webhook/callback functionality
- Event-driven architectures
- Third-party integrations
- Asynchronous processing workflows