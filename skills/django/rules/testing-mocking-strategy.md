# Testing Mocking Strategy (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Ensures tests are isolated, fast, and reliable

**Problem:**
Tests that make real network calls, database queries, or depend on external services are slow, unreliable, and hard to control. Without proper mocking, tests can fail due to external factors.

**Solution:**
Use mocking strategically to isolate code under test, control external dependencies, and create predictable test scenarios.

**Examples:**

❌ **Wrong: No mocking - slow and unreliable**
```python
# tests.py - FLAKY TESTS
class EmailServiceTest(TestCase):
    def test_send_welcome_email(self):
        # Makes real HTTP call to email service!
        user = User.objects.create(email='test@example.com')
        result = send_welcome_email(user)

        # Test depends on external service being available
        self.assertTrue(result['success'])

class APITest(TestCase):
    def test_external_api_call(self):
        # Makes real API call!
        data = fetch_user_data_from_api('123')

        # Test fails if API is down or data changes
        self.assertEqual(data['name'], 'John Doe')
```

✅ **Correct: Strategic mocking**
```python
# tests.py - RELIABLE TESTS
from unittest.mock import patch, Mock, MagicMock
import responses

class EmailServiceTest(TestCase):
    @patch('myapp.services.send_email')
    def test_send_welcome_email(self, mock_send):
        """Test email sending logic without real email service"""
        # Mock the email service
        mock_send.return_value = {'success': True, 'message_id': '123'}

        user = User.objects.create(email='test@example.com')
        result = send_welcome_email(user)

        # Verify the function was called correctly
        mock_send.assert_called_once_with(
            to=user.email,
            subject='Welcome!',
            template='welcome.html',
            context={'user': user}
        )

        # Test our logic, not the external service
        self.assertTrue(result['success'])

    @patch('myapp.services.EmailService')
    def test_email_service_class(self, mock_service_class):
        """Mock entire service class"""
        mock_instance = Mock()
        mock_instance.send.return_value = True
        mock_service_class.return_value = mock_instance

        user = User.objects.create(email='test@example.com')
        result = send_welcome_email_with_service(user)

        mock_instance.send.assert_called_once()
        self.assertTrue(result)

class APITest(TestCase):
    @responses.activate
    def test_external_api_call(self):
        """Mock HTTP requests with responses library"""
        # Mock the API response
        responses.add(
            responses.GET,
            'https://api.example.com/users/123',
            json={'name': 'John Doe', 'id': 123},
            status=200
        )

        data = fetch_user_data_from_api('123')

        # Test our parsing logic with predictable data
        self.assertEqual(data['name'], 'John Doe')
        self.assertEqual(data['id'], 123)

    @patch('requests.get')
    def test_api_with_requests_mock(self, mock_get):
        """Mock requests library directly"""
        mock_response = Mock()
        mock_response.json.return_value = {'name': 'Jane Doe'}
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        data = fetch_user_data_from_api('456')

        mock_get.assert_called_once_with('https://api.example.com/users/456')
        self.assertEqual(data['name'], 'Jane Doe')

# Mocking database operations
class DatabaseOperationTest(TestCase):
    @patch('myapp.models.Article.objects.filter')
    def test_complex_query(self, mock_filter):
        """Mock Django ORM queries"""
        # Create mock queryset
        mock_queryset = Mock()
        mock_queryset.select_related.return_value = mock_queryset
        mock_queryset.filter.return_value = mock_queryset
        mock_queryset.order_by.return_value = [
            Mock(title='Article 1'),
            Mock(title='Article 2')
        ]
        mock_filter.return_value = mock_queryset

        articles = get_featured_articles()

        # Verify query construction
        mock_filter.assert_called_once_with(featured=True, published=True)
        mock_queryset.select_related.assert_called_once_with('author')
        mock_queryset.order_by.assert_called_once_with('-published_date')

        self.assertEqual(len(articles), 2)

# Mocking time-dependent code
from unittest.mock import patch
import datetime

class TimeDependentTest(TestCase):
    @patch('django.utils.timezone.now')
    def test_time_based_logic(self, mock_now):
        """Mock timezone.now() for predictable time testing"""
        fixed_time = datetime.datetime(2024, 1, 15, 12, 0, 0, tzinfo=datetime.timezone.utc)
        mock_now.return_value = fixed_time

        # Test logic that depends on current time
        result = get_current_season()
        self.assertEqual(result, 'winter')  # January is winter

        # Test edge cases
        mock_now.return_value = datetime.datetime(2024, 6, 15, 12, 0, 0, tzinfo=datetime.timezone.utc)
        result = get_current_season()
        self.assertEqual(result, 'summer')

# Mocking file operations
class FileOperationTest(TestCase):
    @patch('builtins.open', new_callable=MagicMock)
    def test_file_processing(self, mock_open):
        """Mock file operations"""
        mock_file = MagicMock()
        mock_file.read.return_value = 'file content'
        mock_open.return_value.__enter__.return_value = mock_file

        result = process_file('test.txt')

        mock_open.assert_called_once_with('test.txt', 'r')
        mock_file.read.assert_called_once()
        self.assertEqual(result, 'processed: file content')

# Mocking external services with side_effect
class ExternalServiceTest(TestCase):
    @patch('myapp.services.PaymentService.charge')
    def test_payment_processing(self, mock_charge):
        """Test payment processing with different scenarios"""

        # Test successful payment
        mock_charge.return_value = {'status': 'success', 'transaction_id': 'txn_123'}
        result = process_payment(100.00, 'card_123')
        self.assertTrue(result['success'])

        # Test failed payment
        mock_charge.return_value = {'status': 'failed', 'error': 'insufficient_funds'}
        result = process_payment(100.00, 'card_123')
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'insufficient_funds')

        # Test exception handling
        mock_charge.side_effect = ConnectionError('Service unavailable')
        with self.assertRaises(PaymentError):
            process_payment(100.00, 'card_123')

# Partial mocking for testing specific methods
class PartialMockTest(TestCase):
    def test_partial_mock(self):
        """Mock only specific methods while keeping others real"""
        with patch.object(SomeClass, 'expensive_method') as mock_method:
            mock_method.return_value = 'mocked_result'

            obj = SomeClass()
            # expensive_method is mocked, other methods work normally
            result = obj.do_something()
            self.assertEqual(result, 'expected_result')
            mock_method.assert_called_once()
```

**Mocking best practices:**
```python
# Use patch as decorator for simple cases
@patch('module.function')
def test_simple_mock(self, mock_function):
    mock_function.return_value = 'mocked'
    # test code

# Use patch as context manager for complex scenarios
def test_complex_mock(self):
    with patch('module.function') as mock_func:
        mock_func.return_value = 'mocked'
        # test code that needs different return values
        mock_func.return_value = 'different_mock'
        # more test code

# Use patch.object for class methods
@patch.object(MyClass, 'method_name')
def test_class_method(self, mock_method):
    # Only mocks the specific method

# Mock properties
@patch.object(MyClass, 'property_name', new_callable=PropertyMock)
def test_property(self, mock_property):
    mock_property.return_value = 'mocked_value'

# Assert call patterns
mock.assert_called_once()
mock.assert_called_with(arg1, arg2)
mock.assert_has_calls([call('a'), call('b')])
```

**Common mistakes:**
- Over-mocking (mocking things that should be tested)
- Under-mocking (not isolating external dependencies)
- Not verifying mock interactions
- Using mocks when real objects would work
- Mocking the code under test instead of dependencies
- Not resetting mocks between tests

**When to apply:**
- Testing code with external API calls
- Isolating database operations in unit tests
- Controlling time-based or random behavior
- Testing error conditions and edge cases
- Speeding up slow tests
- Making tests deterministic and reliable