# Database Constraints Validation (CRITICAL)

**Impact:** CRITICAL - Ensures data integrity and prevents invalid data storage

**Problem:**
Missing constraints allow invalid data to be stored, leading to application bugs, data corruption, and inconsistent database state.

**Solution:**
Use model-level and database-level constraints to enforce data integrity. Combine Django model validation with database constraints for comprehensive protection.

**Examples:**

❌ **Wrong: No constraints**
```python
class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sku = models.CharField(max_length=50)
    stock_quantity = models.IntegerField()

    # No constraints - can store invalid data!
    # price = -100, stock_quantity = -50, duplicate SKUs, etc.
```

✅ **Correct: Multiple constraint levels**
```python
class Product(models.Model):
    name = models.CharField(max_length=100, validators=[validate_product_name])
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    sku = models.CharField(
        max_length=50,
        unique=True,
        validators=[validate_sku_format]
    )
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    stock_quantity = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            # Database-level constraints
            models.CheckConstraint(
                check=models.Q(price__gte=Decimal('0.00')),
                name='price_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(stock_quantity__gte=0),
                name='stock_quantity_non_negative'
            ),
            models.CheckConstraint(
                check=models.Q(price__lte=Decimal('999999.99')),
                name='price_reasonable_max'
            ),
            models.UniqueConstraint(
                fields=['category', 'name'],
                name='unique_product_per_category'
            ),
        ]

    def clean(self):
        """Model-level validation"""
        if self.price <= 0:
            raise ValidationError({'price': 'Price must be positive'})

        if len(self.name.strip()) < 3:
            raise ValidationError({'name': 'Name must be at least 3 characters'})

        if not self.sku or len(self.sku) < 5:
            raise ValidationError({'sku': 'SKU must be at least 5 characters'})

        # Business rule validation
        if self.category and self.category.name == 'Electronics':
            if self.price < Decimal('10.00'):
                raise ValidationError({
                    'price': 'Electronic products must cost at least $10'
                })

    def save(self, *args, **kwargs):
        """Ensure validation runs before save"""
        self.full_clean()  # Runs clean() and field validation
        super().save(*args, **kwargs)

# Custom validators
def validate_product_name(value):
    if not value or not value.strip():
        raise ValidationError('Product name cannot be empty')
    if any(char in value for char in ['<', '>', '&']):
        raise ValidationError('Product name contains invalid characters')

def validate_sku_format(value):
    import re
    if not re.match(r'^[A-Z]{2}\d{6}$', value):
        raise ValidationError('SKU must be in format AA123456')
```

**Common mistakes:**
- Relying only on model validation without database constraints
- Not using database constraints for data that must be enforced
- Missing validation in model `clean()` methods
- Not calling `full_clean()` before saving
- Using constraints that are too restrictive or permissive

**When to apply:**
- Designing new models
- Adding business rules
- Preventing data corruption
- During data integrity reviews
- When implementing complex validation logic