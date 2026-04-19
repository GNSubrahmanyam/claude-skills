---
title: Extra Data Types & JSON Encoding
impact: MEDIUM
impactDescription: Enables proper handling of complex data types and custom serialization
tags: fastapi, data-types, json, serialization, encoding
---

## Extra Data Types & JSON Encoding

**Problem:**
APIs need to handle complex data types like UUIDs, datetimes, enums, and custom objects. Default JSON serialization may not handle these properly, leading to serialization errors or inconsistent data formats.

**Solution:**
Use FastAPI's support for advanced data types and custom JSON encoders for proper serialization and validation.

❌ **Wrong: Manual data type handling**
```python
from datetime import datetime
import json

class Item:
    def __init__(self, id, name, created_at):
        self.id = id
        self.name = name
        self.created_at = created_at

@app.get("/items")
async def get_items():
    items = [
        Item(1, "Item 1", datetime.now()),
        Item(2, "Item 2", datetime.now())
    ]

    # Manual serialization - error-prone
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "name": item.name,
            "created_at": item.created_at.isoformat()
        })

    return result
```

✅ **Correct: Advanced data types and custom encoding**
```python
from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum
from typing import Optional, List
import json

class ItemStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

class Item(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(..., min_length=1, max_length=100)
    status: ItemStatus = ItemStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)

    class Config:
        # Custom JSON encoders for complex types
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: str
        }

@app.get("/items", response_model=List[Item])
async def get_items():
    """Items with advanced data types"""
    items = await get_items_from_db()

    # Automatic serialization with custom encoders
    return items

# UUID in path parameters
@app.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: UUID):
    """Get item by UUID"""
    item = await get_item_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

# Datetime handling
@app.get("/items/created-after")
async def get_items_created_after(
    created_after: datetime = Query(..., description="ISO 8601 datetime")
):
    """Query with datetime parameter"""
    items = await get_items_created_after(created_after)
    return {"items": items, "created_after": created_after}

# Enum validation
@app.patch("/items/{item_id}/status")
async def update_item_status(
    item_id: UUID,
    status: ItemStatus = Body(..., embed=True)
):
    """Update item status with enum validation"""
    item = await update_item_status(item_id, status)
    return item

# Custom JSON encoder for complex objects
from fastapi.encoders import jsonable_encoder

class ComplexObject:
    def __init__(self, data):
        self.data = data
        self.timestamp = datetime.utcnow()

    def to_dict(self):
        return {
            "data": self.data,
            "timestamp": self.timestamp,
            "type": "complex_object"
        }

# Custom JSON encoder in route
@app.get("/complex-data")
async def get_complex_data():
    """Return complex objects with custom encoding"""
    objects = [
        ComplexObject({"key": "value1"}),
        ComplexObject({"key": "value2"})
    ]

    # Use jsonable_encoder for custom objects
    encoded_objects = jsonable_encoder(objects, custom_encoder={
        ComplexObject: lambda obj: obj.to_dict()
    })

    return {"objects": encoded_objects}

# Decimal and numeric types
from decimal import Decimal

class Product(BaseModel):
    id: int
    name: str
    price: Decimal = Field(..., gt=0, decimal_places=2)
    weight_kg: float = Field(..., gt=0)
    in_stock: bool = True

    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)  # Convert to float for JSON
        }

@app.get("/products", response_model=List[Product])
async def get_products():
    """Products with decimal precision"""
    products = await get_products_from_db()
    return products

# URL and network types
from pydantic import HttpUrl, IPvAnyAddress

class Webhook(BaseModel):
    url: HttpUrl = Field(..., description="Webhook URL")
    secret: str = Field(..., min_length=16, description="Webhook secret")
    events: List[str] = Field(..., min_items=1, description="Events to listen for")
    ip_whitelist: Optional[List[IPvAnyAddress]] = Field(None, description="Allowed IP addresses")

@app.post("/webhooks")
async def create_webhook(webhook: Webhook):
    """Create webhook with URL and IP validation"""
    # URL and IP addresses are automatically validated
    await save_webhook(webhook.dict())
    return {"webhook_id": "generated_id", "url": str(webhook.url)}

# Color and custom types
from pydantic.color import Color

class Theme(BaseModel):
    name: str
    primary_color: Color
    secondary_color: Optional[Color] = None
    background_color: Color = Field(Color("white"), description="Background color")

@app.post("/themes")
async def create_theme(theme: Theme):
    """Create theme with color validation"""
    # Colors are automatically parsed and validated
    colors = {
        "primary": theme.primary_color.as_hex(),
        "secondary": theme.secondary_color.as_hex() if theme.secondary_color else None,
        "background": theme.background_color.as_hex()
    }

    await save_theme(theme.name, colors)
    return {"theme": theme.name, "colors": colors}

# Union types and discriminated unions
from typing import Union
from pydantic import Field

class Dog(BaseModel):
    name: str
    breed: str
    type: str = Field("dog", const=True)  # Discriminator

class Cat(BaseModel):
    name: str
    color: str
    type: str = Field("cat", const=True)  # Discriminator

class Bird(BaseModel):
    name: str
    can_fly: bool = True
    type: str = Field("bird", const=True)  # Discriminator

# Union with discriminator
Pet = Union[Dog, Cat, Bird]

@app.post("/pets")
async def create_pet(pet: Pet):
    """Create pet with discriminated union"""
    if pet.type == "dog":
        await save_dog(pet.dict())
    elif pet.type == "cat":
        await save_cat(pet.dict())
    else:
        await save_bird(pet.dict())

    return {"pet": pet.name, "type": pet.type}

# Custom validators for complex types
class EmailSettings(BaseModel):
    smtp_server: str = Field(..., min_length=1)
    smtp_port: int = Field(1, 65535)
    use_tls: bool = True
    username: str
    password: str

    @validator('smtp_server')
    def validate_smtp_server(cls, v):
        import socket
        try:
            # Basic DNS resolution check
            socket.gethostbyname(v)
            return v
        except socket.gaierror:
            raise ValueError('Invalid SMTP server hostname')

@app.post("/email-settings")
async def save_email_settings(settings: EmailSettings):
    """Save email settings with custom validation"""
    # SMTP server is validated for DNS resolution
    await save_email_config(settings.dict())
    return {"message": "Email settings saved"}
```

**Common mistakes:**
- Not using proper type hints for complex data
- Manual JSON serialization of custom objects
- Missing validation for network-related types
- Not handling timezone-aware datetimes properly
- Using wrong precision for decimal numbers

**When to apply:**
- APIs with complex data models
- UUID-based resources
- Time-sensitive data
- Financial calculations (decimals)
- Network configuration
- Custom object serialization