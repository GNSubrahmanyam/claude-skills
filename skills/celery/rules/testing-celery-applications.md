---
title: Testing Celery Applications
impact: MEDIUM-HIGH
impactDescription: Ensures reliability and prevents production issues
tags: celery, testing, reliability, asynchronous
---

## Testing Celery Applications

**Problem:**
Celery applications are distributed and asynchronous, making testing complex. Without proper testing strategies, bugs can remain undetected until production, causing data corruption, lost tasks, or system failures.

**Solution:**
Implement comprehensive testing strategies including unit tests, integration tests, and end-to-end tests specifically designed for Celery's asynchronous nature.

**Examples:**

✅ **Correct: Unit testing tasks**
```python
import pytest
from unittest.mock import patch, MagicMock
from django.test import TestCase
from myapp.tasks import process_payment, send_email

class TaskUnitTests(TestCase):
    """Unit tests for individual tasks"""

    @patch('myapp.tasks.payment_gateway.charge')
    def test_process_payment_success(self, mock_charge):
        """Test successful payment processing"""
        # Mock the payment gateway
        mock_charge.return_value = MagicMock(success=True, transaction_id='txn_123')

        # Call the task synchronously for testing
        result = process_payment.apply(args=[123, 99.99])

        # Assert the result
        self.assertEqual(result.get(), "Payment processed for order 123")

        # Verify the mock was called correctly
        mock_charge.assert_called_once_with(99.99)

    @patch('myapp.tasks.payment_gateway.charge')
    def test_process_payment_failure(self, mock_charge):
        """Test payment processing failure"""
        # Mock payment failure
        mock_charge.return_value = MagicMock(success=False)

        result = process_payment.apply(args=[123, 99.99])

        # Should handle failure gracefully
        self.assertIn("failed", result.get().lower())

    @patch('myapp.tasks.send_email')
    def test_send_email_task(self, mock_send):
        """Test email sending task"""
        mock_send.return_value = True

        result = send_email.apply(args=['user@example.com', 'Subject', 'Body'])

        # Task should complete without error
        self.assertIsNone(result.get())  # Assuming task returns None

        mock_send.assert_called_once_with('user@example.com', 'Subject', 'Body')

    def test_task_validation(self):
        """Test task input validation"""
        # Test with invalid arguments
        with self.assertRaises(TypeError):
            process_payment.apply(args=['invalid_id'])  # Should require order_id and amount
```

✅ **Correct: Testing task chains and workflows**
```python
from celery import chain
from unittest.mock import patch

class WorkflowTests(TestCase):
    """Test complex task workflows"""

    @patch('myapp.tasks.validate_order')
    @patch('myapp.tasks.process_payment')
    @patch('myapp.tasks.send_confirmation')
    def test_order_processing_workflow(self, mock_confirm, mock_payment, mock_validate):
        """Test complete order processing workflow"""
        # Setup mocks
        mock_validate.return_value = {'order_id': 123, 'amount': 99.99}
        mock_payment.return_value = {'status': 'success', 'txn_id': 'txn_123'}
        mock_confirm.return_value = {'email_sent': True}

        # Create workflow
        workflow = chain(
            validate_order.s(order_id=123),
            process_payment.s(),
            send_confirmation.s()
        )

        # Execute workflow synchronously for testing
        result = workflow.apply()

        # Assert final result
        self.assertTrue(result.get()['email_sent'])

        # Verify all tasks were called in sequence
        mock_validate.assert_called_once_with(order_id=123)
        mock_payment.assert_called_once_with({'order_id': 123, 'amount': 99.99})
        mock_confirm.assert_called_once_with({'status': 'success', 'txn_id': 'txn_123'})

    @patch('myapp.tasks.process_batch')
    def test_group_processing(self, mock_process):
        """Test parallel group processing"""
        from celery import group

        mock_process.side_effect = [f"result_{i}" for i in range(3)]

        # Create group
        batch_group = group(
            process_batch.s([1, 2]),
            process_batch.s([3, 4]),
            process_batch.s([5, 6])
        )

        # Execute group
        result = batch_group.apply()

        # Assert results
        self.assertEqual(result.get(), ["result_0", "result_1", "result_2"])

        # Verify parallel execution
        self.assertEqual(mock_process.call_count, 3)
```

✅ **Correct: Integration testing with real Celery**
```python
from django.test import TransactionTestCase
from myapp.models import Order, Payment
import time

class CeleryIntegrationTests(TransactionTestCase):
    """Integration tests with real Celery workers"""

    def setUp(self):
        # Ensure we're using eager mode for testing
        from django.conf import settings
        self.old_task_always_eager = settings.CELERY_TASK_ALWAYS_EAGER
        settings.CELERY_TASK_ALWAYS_EAGER = True

        # Clean up any existing data
        Order.objects.all().delete()
        Payment.objects.all().delete()

    def tearDown(self):
        # Restore original setting
        from django.conf import settings
        settings.CELERY_TASK_ALWAYS_EAGER = self.old_task_always_eager

    def test_full_payment_workflow_integration(self):
        """Test complete payment workflow with database"""
        from myapp.tasks import create_order, process_payment

        # Create order
        order_result = create_order.apply(args=['user123', [{'item': 'widget', 'price': 50}]])

        order_id = order_result.get()['order_id']

        # Verify order was created
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.total, 50)
        self.assertEqual(order.status, 'pending')

        # Process payment
        payment_result = process_payment.apply(args=[order_id, 50])

        # Verify payment processing
        self.assertIn("processed", payment_result.get())

        # Verify database state
        order.refresh_from_db()
        self.assertEqual(order.status, 'paid')

        payment = Payment.objects.get(order=order)
        self.assertEqual(payment.amount, 50)
        self.assertEqual(payment.status, 'completed')
```

✅ **Correct: Testing error scenarios and retries**
```python
class ErrorHandlingTests(TestCase):
    """Test error handling and retry behavior"""

    @patch('myapp.tasks.external_api_call')
    def test_task_retry_on_failure(self, mock_api):
        """Test that task retries on recoverable errors"""
        from myapp.tasks import api_sync_task

        # First call fails, second succeeds
        mock_api.side_effect = [ConnectionError("Network error"), "success"]

        # Execute task
        result = api_sync_task.apply(args=['data'])

        # Should eventually succeed
        self.assertEqual(result.get(), "success")

        # Should have been called twice (initial + 1 retry)
        self.assertEqual(mock_api.call_count, 2)

    @patch('myapp.tasks.external_api_call')
    def test_task_max_retries_exceeded(self, mock_api):
        """Test behavior when max retries exceeded"""
        mock_api.side_effect = ConnectionError("Persistent error")

        result = api_sync_task.apply(args=['data'])

        # Should raise MaxRetriesExceededError
        with self.assertRaises(MaxRetriesExceededError):
            result.get()

    def test_task_validation_errors(self):
        """Test that invalid inputs are rejected"""
        from myapp.tasks import process_payment

        # Test with invalid order ID
        result = process_payment.apply(args=['invalid_id', 100])

        # Should handle gracefully without crashing
        self.assertIn("failed", result.get().lower())
```

✅ **Correct: Testing periodic tasks**
```python
from django_celery_beat.models import PeriodicTask, IntervalSchedule
from myapp.tasks import cleanup_expired_data

class PeriodicTaskTests(TestCase):
    """Test periodic task configuration and execution"""

    def test_cleanup_task_execution(self):
        """Test that cleanup task works correctly"""
        # Create some test data
        ExpiredData.objects.create(created_at=timezone.now() - timedelta(days=30))
        ExpiredData.objects.create(created_at=timezone.now() - timedelta(days=10))
        ValidData.objects.create(created_at=timezone.now())

        # Execute cleanup task
        result = cleanup_expired_data.apply()

        deleted_count = result.get()

        # Should have deleted only expired data
        self.assertEqual(deleted_count, 1)
        self.assertEqual(ExpiredData.objects.count(), 1)  # Only recent one remains
        self.assertEqual(ValidData.objects.count(), 1)

    def test_periodic_task_scheduling(self):
        """Test periodic task is properly scheduled"""
        # Create interval schedule
        schedule, created = IntervalSchedule.objects.get_or_create(
            every=1,
            period=IntervalSchedule.HOURS
        )

        # Create periodic task
        task = PeriodicTask.objects.create(
            name='Test cleanup',
            task='myapp.tasks.cleanup_expired_data',
            interval=schedule,
            enabled=True
        )

        # Verify task is registered
        from django_celery_beat import schedulers
        scheduler = schedulers.DatabaseScheduler()
        scheduled_tasks = scheduler.all_as_schedule()

        # Should include our task
        task_names = [t.name for t in scheduled_tasks]
        self.assertIn('myapp.tasks.cleanup_expired_data', task_names)
```

❌ **Wrong: Testing async tasks synchronously without setup**
```python
def test_async_task():
    """Wrong: Testing async task without proper setup"""
    result = my_task.delay(arg)
    # Immediate get() may fail or timeout
    self.assertEqual(result.get(), expected)  # Unreliable
```

❌ **Wrong: Not testing error conditions**
```python
def test_task_only_success_path():
    """Wrong: Only testing happy path"""
    result = my_task.apply(args=[valid_input])
    self.assertEqual(result.get(), "success")
    # No testing of failure cases, retries, or edge conditions
```

**Common mistakes:**
- Not using CELERY_TASK_ALWAYS_EAGER for unit tests
- Testing async behavior with synchronous expectations
- Not mocking external dependencies properly
- Ignoring error conditions and edge cases
- Not testing retry behavior and failure scenarios
- Testing workflows without proper setup

**When to apply:**
- Developing new Celery tasks and workflows
- Refactoring existing task code
- Preparing for production deployment
- Implementing CI/CD pipelines
- Debugging production issues

**Related rules:**
- `task-atomic-operations`: Ensuring tasks are testable
- `error-retry-strategy`: Testing retry behavior
- `canvas-chain-workflows`: Testing complex workflows</content>
<parameter name="filePath">skills/celery-skill/rules/testing-celery-applications.md