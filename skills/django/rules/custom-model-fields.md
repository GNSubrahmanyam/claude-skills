# Impact: LOW

## Problem

Django's built-in field types don't cover all database column types or complex Python objects. Developers creating custom fields often struggle with proper serialization, database type mapping, form integration, and migration compatibility. Incorrect field implementation can lead to data corruption, migration failures, and admin interface issues.

## Solution

Create custom fields by subclassing Django's Field class with proper conversion methods:

```python
from django.db import models
from django.core.exceptions import ValidationError

class JSONField(models.Field):
    """Custom field for storing JSON data"""
    
    description = "A field for storing JSON-encoded data"
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def db_type(self, connection):
        """Database column type"""
        return 'text'  # Or 'json' for PostgreSQL
    
    def from_db_value(self, value, expression, connection):
        """Convert database value to Python object"""
        if value is None:
            return value
        import json
        return json.loads(value)
    
    def to_python(self, value):
        """Convert input to Python object"""
        if value is None:
            return value
        if isinstance(value, dict):
            return value
        import json
        return json.loads(value)
    
    def get_prep_value(self, value):
        """Convert Python object to query value"""
        if value is None:
            return value
        import json
        return json.dumps(value)
    
    def get_db_prep_value(self, value, connection, prepared=False):
        """Convert to database value"""
        return self.get_prep_value(value)
    
    def value_to_string(self, obj):
        """Convert for serialization"""
        value = self.value_from_object(obj)
        return self.get_prep_value(value)
```

Handle complex objects that need custom serialization:

```python
class Hand:
    """Bridge hand representation"""
    def __init__(self, north, east, south, west):
        self.north, self.east, self.south, self.west = north, east, south, west

class HandField(models.Field):
    """Field for storing bridge hands"""
    
    def __init__(self, *args, **kwargs):
        kwargs['max_length'] = 104  # Fixed size for card data
        super().__init__(*args, **kwargs)
    
    def deconstruct(self):
        """For migrations - remove our forced max_length"""
        name, path, args, kwargs = super().deconstruct()
        del kwargs['max_length']
        return name, path, args, kwargs
    
    def from_db_value(self, value, expression, connection):
        """Parse stored string back to Hand object"""
        if value is None:
            return value
        # Parse the concatenated card string back into Hand
        return self._parse_hand_string(value)
    
    def to_python(self, value):
        """Handle various input types"""
        if isinstance(value, Hand):
            return value
        if value is None:
            return value
        return self._parse_hand_string(value)
    
    def get_prep_value(self, value):
        """Convert Hand to storable string"""
        if isinstance(value, Hand):
            return self._hand_to_string(value)
        return value
    
    def _parse_hand_string(self, hand_string):
        """Parse 'AH9S...' format to Hand object"""
        # Implementation to parse card string
        pass
    
    def _hand_to_string(self, hand):
        """Convert Hand object to string"""
        # Implementation to serialize hand
        pass
```

Implement proper migration support:

```python
class CustomField(models.Field):
    def __init__(self, custom_param=None, *args, **kwargs):
        self.custom_param = custom_param or 'default'
        super().__init__(*args, **kwargs)
    
    def deconstruct(self):
        """Ensure migrations capture custom parameters"""
        name, path, args, kwargs = super().deconstruct()
        if self.custom_param != 'default':
            kwargs['custom_param'] = self.custom_param
        return name, path, args, kwargs
```

Handle database-specific types:

```python
class UUIDField(models.Field):
    """Cross-database UUID field"""
    
    def db_type(self, connection):
        """Return appropriate type for each database"""
        if connection.vendor == 'postgresql':
            return 'uuid'
        elif connection.vendor == 'mysql':
            return 'char(36)'
        elif connection.vendor == 'oracle':
            return 'VARCHAR2(36)'
        else:  # SQLite
            return 'text'
    
    def rel_db_type(self, connection):
        """Type for foreign keys pointing to this field"""
        return self.db_type(connection)
```

## Common Mistakes

- Not implementing all conversion methods (from_db_value, to_python, get_prep_value)
- Forgetting deconstruct() method for migrations
- Using wrong database types for different backends
- Not handling None values properly
- Missing validation in to_python method
- Not providing proper __str__ method on stored objects
- Using field for data that could use built-in types
- Not testing field with all database backends
- Forgetting to handle serialization in value_to_string

## When to Apply

- Storing complex Python objects in database
- Using database-specific column types
- Creating reusable field types for your projects
- Implementing custom data validation at field level
- Handling legacy database schemas
- Creating domain-specific data types
- When built-in Django fields are insufficient