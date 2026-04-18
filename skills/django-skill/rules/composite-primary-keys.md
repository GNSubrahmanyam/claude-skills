# Impact: HIGH

## Problem

Django 5.2 introduced composite primary keys, but they come with significant limitations and complexity. Developers using composite keys often encounter issues with ForeignKey relationships, form validation, admin interface, and migration challenges. Incorrect usage can lead to data integrity problems and application errors.

## Solution

Define composite primary keys using constraints:

```python
from django.db import models

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['order', 'product'],
                name='unique_order_product'
            ),
        ]

    # No ForeignKey pointing TO composite keys
    # This won't work:
    # class Review(models.Model):
    #     order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE)  # ERROR

    def __str__(self):
        return f"{self.order} - {self.product} ({self.quantity})"
```

Work around ForeignKey limitations:

```python
# Instead of ForeignKey, use alternative approaches
class OrderItemReview(models.Model):
    # Use separate fields instead of composite FK
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField()
    review_text = models.TextField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['order', 'product'],
                name='unique_review_per_order_item'
            ),
        ]

    def clean(self):
        # Ensure order/product combination exists
        if not OrderItem.objects.filter(order=self.order, product=self.product).exists():
            raise ValidationError("Invalid order/product combination")
```

Handle admin interface limitations:

```python
from django.contrib import admin

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'total_price']
    list_filter = ['order__customer', 'product__category']

    # Can't use default get_queryset for composite keys
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('order', 'product')
```

Implement custom form validation:

```python
class OrderItemForm(forms.ModelForm):
    class Meta:
        model = OrderItem
        fields = ['order', 'product', 'quantity']

    def clean(self):
        cleaned_data = super().clean()
        order = cleaned_data.get('order')
        product = cleaned_data.get('product')

        if order and product:
            # Check for existing order item
            existing = OrderItem.objects.filter(order=order, product=product)
            if self.instance.pk:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise forms.ValidationError("Product already in order")

        return cleaned_data
```

Handle migrations carefully:

```python
# When adding composite constraints, ensure data uniqueness first
# Run this in a data migration if needed

def forwards(apps, schema_editor):
    OrderItem = apps.get_model('shop', 'OrderItem')
    duplicates = OrderItem.objects.values('order', 'product').annotate(
        count=models.Count('id')
    ).filter(count__gt=1)

    if duplicates.exists():
        # Handle duplicates before adding constraint
        raise MigrationError("Duplicate order/product combinations exist")

# Then add the constraint in schema migration
operations = [
    migrations.AddConstraint(
        model_name='orderitem',
        constraint=models.UniqueConstraint(
            fields=['order', 'product'],
            name='unique_order_product'
        ),
    ),
]
```

## Common Mistakes

- Trying to create ForeignKey relationships to models with composite primary keys
- Assuming composite keys work like single primary keys in all contexts
- Not handling uniqueness constraints properly in forms
- Forgetting that admin interface has limited support for composite keys
- Not considering migration data validation
- Using composite keys when a single surrogate key would suffice
- Assuming all Django features support composite keys equally

## When to Apply

- Natural composite keys from existing database schemas
- Business rules requiring compound uniqueness
- Legacy database integration with composite keys
- Data modeling where compound keys are semantically meaningful
- Avoiding surrogate keys for performance or integration reasons
- When working with Django 5.2+ and understanding the limitations