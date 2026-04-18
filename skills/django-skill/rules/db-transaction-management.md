# Database Transaction Management (CRITICAL)

**Impact:** CRITICAL - Ensures data consistency and prevents partial updates

**Problem:**
Related database operations not wrapped in transactions can leave data in inconsistent states if errors occur midway through operations, leading to data corruption and application bugs.

**Solution:**
Use database transactions for related operations that must succeed or fail together. Use Django's `transaction.atomic()` decorator or context manager.

**Examples:**

❌ **Wrong: No transaction management**
```python
# Dangerous - partial updates possible!
def transfer_money(from_account, to_account, amount):
    # What if second update fails?
    from_account.balance -= amount
    from_account.save()  # This succeeds

    # Network error here - money is lost!
    to_account.balance += amount
    to_account.save()  # This fails
```

✅ **Correct: Transaction management**
```python
from django.db import transaction

# Method 1: Atomic decorator
@transaction.atomic
def transfer_money(from_account, to_account, amount):
    from_account.balance -= amount
    to_account.balance += amount
    from_account.save()
    to_account.save()

# Method 2: Context manager
def create_order_with_items(order_data, items_data):
    with transaction.atomic():
        order = Order.objects.create(**order_data)

        # If any item creation fails, the whole transaction rolls back
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)

        # All operations succeed or all fail
        return order

# Nested transactions
@transaction.atomic
def complex_business_operation():
    with transaction.atomic():
        # Inner transaction - can be rolled back independently
        account = Account.objects.select_for_update().get(id=account_id)
        account.balance -= amount

        # If validation fails, only inner transaction rolls back
        if account.balance < 0:
            raise ValidationError("Insufficient funds")

        account.save()

    # Outer transaction continues
    # Additional operations here...

# Select for update to prevent race conditions
@transaction.atomic
def reserve_inventory(product_id, quantity):
    product = Product.objects.select_for_update().get(id=product_id)

    if product.stock_quantity >= quantity:
        product.stock_quantity -= quantity
        product.save()
        return Reservation.objects.create(product=product, quantity=quantity)
    else:
        raise ValidationError("Insufficient stock")
```

**Common mistakes:**
- Not using transactions for related database operations
- Using transactions unnecessarily for single operations
- Not using `select_for_update()` for race condition prevention
- Nested transactions without understanding isolation levels
- Long-running transactions that hold locks unnecessarily

**When to apply:**
- Transferring money or resources between accounts
- Creating related objects that must exist together
- Updating inventory levels
- Any operation with multiple related database changes
- Preventing race conditions in concurrent operations