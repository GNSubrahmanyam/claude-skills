# Request Example Data (MEDIUM)

**Impact:** MEDIUM - Improves API usability and documentation clarity

**Problem:**
APIs need clear examples of request data to help developers understand how to use the endpoints. Without examples, developers struggle to understand the expected request format and data structure.

**Solution:**
Add comprehensive examples to Pydantic models and request schemas to provide clear guidance for API consumers.

❌ **Wrong: Models without examples**
```python
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

# No examples - developers don't know what to send
```

✅ **Correct: Models with comprehensive examples**
```python
from pydantic import BaseModel, Field
from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Unique username for the user",
        examples=["johndoe", "admin_user"]
    )
    email: str = Field(
        ...,
        description="Valid email address",
        examples=["john@example.com", "user@company.org"]
    )
    password: str = Field(
        ...,
        min_length=8,
        description="Strong password (min 8 characters)",
        examples=["MySecurePass123!"]
    )
    age: Optional[int] = Field(
        None,
        ge=13,
        le=120,
        description="User age in years",
        examples=[25, 30]
    )
    preferences: Optional[dict] = Field(
        default_factory=dict,
        description="User preferences",
        examples=[{"theme": "dark", "language": "en"}]
    )

    class Config:
        schema_extra = {
            "example": {
                "username": "johndoe",
                "email": "john@example.com",
                "password": "MySecurePass123!",
                "age": 30,
                "preferences": {"theme": "dark", "notifications": True}
            }
        }

# Complex nested examples
class Address(BaseModel):
    street: str = Field(..., examples=["123 Main St", "456 Oak Avenue"])
    city: str = Field(..., examples=["New York", "San Francisco"])
    country: str = Field(..., examples=["US", "CA"])
    postal_code: str = Field(..., examples=["10001", "94105"])

class CompanyCreate(BaseModel):
    name: str = Field(..., examples=["Acme Corp", "Tech Solutions Inc"])
    website: Optional[str] = Field(None, examples=["https://acme.com"])
    address: Address
    employee_count: int = Field(..., ge=1, examples=[50, 1000])

    class Config:
        schema_extra = {
            "example": {
                "name": "Acme Corp",
                "website": "https://acme.com",
                "address": {
                    "street": "123 Main St",
                    "city": "New York",
                    "country": "US",
                    "postal_code": "10001"
                },
                "employee_count": 500
            }
        }

# API endpoint with examples
@app.post(
    "/users/",
    response_model=User,
    summary="Create User",
    description="Create a new user account with profile information"
)
async def create_user(
    user: UserCreate = Body(
        ...,
        examples={
            "basic_user": {
                "summary": "Basic user creation",
                "description": "Create a standard user account",
                "value": {
                    "username": "johndoe",
                    "email": "john@example.com",
                    "password": "MySecurePass123!",
                    "age": 30
                }
            },
            "premium_user": {
                "summary": "Premium user creation",
                "description": "Create a premium user with preferences",
                "value": {
                    "username": "premium_user",
                    "email": "premium@example.com",
                    "password": "PremiumPass456!",
                    "age": 35,
                    "preferences": {
                        "theme": "dark",
                        "notifications": True,
                        "marketing_emails": False
                    }
                }
            }
        }
    )
):
    """Create user with comprehensive request examples"""
    # Implementation here
    pass

# Query parameter examples
@app.get("/search/")
async def search_items(
    q: str = Query(..., min_length=1, examples=["laptop", "wireless headphones"]),
    category: Optional[str] = Query(None, examples=["electronics", "books"]),
    min_price: Optional[float] = Query(None, ge=0, examples=[10.99, 99.99]),
    max_price: Optional[float] = Query(None, ge=0, examples=[500.00, 2000.00]),
    sort_by: str = Query("relevance", examples=["price", "rating", "newest"])
):
    """Search with comprehensive query examples"""
    # Implementation here
    pass

# Form data examples
@app.post("/contact/")
async def contact_form(
    name: str = Form(..., examples=["John Doe", "Jane Smith"]),
    email: str = Form(..., examples=["john@example.com"]),
    message: str = Form(..., min_length=10, examples=["I need help with my order"]),
    priority: str = Form("normal", examples=["low", "normal", "high"])
):
    """Contact form with examples"""
    # Implementation here
    pass

# File upload with examples
@app.post("/upload/")
async def upload_file(
    file: UploadFile = File(..., description="File to upload"),
    description: str = Form("", examples=["Product image", "User avatar"]),
    category: str = Form(..., examples=["images", "documents"])
):
    """File upload with examples"""
    # Implementation here
    pass

# Advanced examples with conditional logic
class OrderCreate(BaseModel):
    items: List[dict] = Field(..., min_items=1)
    shipping_address: dict
    payment_method: str = Field(..., examples=["credit_card", "paypal"])

    class Config:
        schema_extra = {
            "examples": [
                {
                    "summary": "Single item order",
                    "value": {
                        "items": [{"product_id": "123", "quantity": 1}],
                        "shipping_address": {
                            "street": "123 Main St",
                            "city": "Anytown",
                            "zip": "12345"
                        },
                        "payment_method": "credit_card"
                    }
                },
                {
                    "summary": "Bulk order",
                    "value": {
                        "items": [
                            {"product_id": "456", "quantity": 2},
                            {"product_id": "789", "quantity": 1}
                        ],
                        "shipping_address": {
                            "street": "456 Oak Ave",
                            "city": "Somewhere",
                            "zip": "67890"
                        },
                        "payment_method": "paypal"
                    }
                }
            ]
        }

@app.post("/orders/")
async def create_order(order: OrderCreate):
    """Create order with multiple examples"""
    # Implementation here
    pass
```

**Common mistakes:**
- Missing examples in API documentation
- Examples that don't match validation rules
- Not providing examples for complex nested structures
- Examples that use invalid data formats

**When to apply:**
- All public API endpoints
- Complex request models
- Multiple valid input formats
- APIs used by external developers
- Form-based endpoints