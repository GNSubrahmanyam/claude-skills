# Canvas Map and Starmap Operations (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Enables efficient batch processing and data transformations

**Problem:**
Processing multiple items with similar operations requires efficient patterns. Manual iteration or individual task calls can be inefficient and hard to manage.

**Solution:**
Use Celery's map and starmap primitives to apply tasks to sequences of data efficiently, with proper error handling and result aggregation.

**Examples:**

✅ **Correct: Using map for simple transformations**
```python
from celery import shared_task

@shared_task
def square_number(x):
    """Square a single number"""
    return x * x

# Map: apply square_number to each element
@app.task
def process_numbers():
    """Process a list of numbers using map"""
    numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    # Create map operation
    map_result = square_number.map(numbers)

    # Execute and get results
    results = map_result.apply_async().get(timeout=30)

    # Results: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
    return results

# Usage in workflow
workflow = chain(
    generate_data.s(),  # Generate list of data
    process_data.map(), # Apply processing to each item
    aggregate_results.s()  # Combine results
)
```

✅ **Correct: Using starmap for complex arguments**
```python
@shared_task
def resize_image(image_path, width, height, quality=85):
    """Resize an image with specific dimensions"""
    from PIL import Image

    with Image.open(image_path) as img:
        resized = img.resize((width, height), Image.LANCZOS)
        output_path = f"{image_path.rsplit('.', 1)[0]}_{width}x{height}.jpg"

        resized.save(output_path, 'JPEG', quality=quality)
        return output_path

@app.task
def batch_resize_images():
    """Resize multiple images with different specifications"""
    # List of (path, width, height, quality) tuples
    image_specs = [
        ('/images/photo1.jpg', 800, 600, 90),
        ('/images/photo2.jpg', 1024, 768, 85),
        ('/images/photo3.jpg', 640, 480, 80),
        ('/images/photo4.jpg', 1920, 1080, 95),
    ]

    # Use starmap to unpack arguments
    resize_tasks = resize_image.starmap(image_specs)

    # Execute all resizes in parallel
    results = resize_tasks.apply_async().get(timeout=300)

    return {
        'resized_images': results,
        'total_processed': len(results)
    }

# Alternative: starmap with error handling
@app.task(bind=True)
def safe_resize_image(self, image_path, width, height, quality=85):
    """Resize with error handling"""
    try:
        return resize_image(image_path, width, height, quality)
    except Exception as exc:
        logger.error(f"Failed to resize {image_path}: {exc}")
        return {
            'error': str(exc),
            'image_path': image_path,
            'status': 'failed'
        }

@app.task
def batch_resize_with_error_handling():
    """Batch resize with individual error handling"""
    image_specs = [
        ('/images/photo1.jpg', 800, 600, 90),
        ('/images/corrupted.jpg', 1024, 768, 85),  # This will fail
        ('/images/photo3.jpg', 640, 480, 80),
    ]

    # Use starmap with error-resilient task
    resize_tasks = safe_resize_image.starmap(image_specs)
    results = resize_tasks.apply_async().get(timeout=300)

    # Separate successful and failed operations
    successful = [r for r in results if isinstance(r, str) and not r.get('error')]
    failed = [r for r in results if isinstance(r, dict) and r.get('error')]

    return {
        'successful': successful,
        'failed': failed,
        'success_count': len(successful),
        'failure_count': len(failed)
    }
```

✅ **Correct: Map operations in complex workflows**
```python
@shared_task
def validate_record(record):
    """Validate a single data record"""
    errors = []

    if not record.get('email'):
        errors.append('Missing email')
    elif '@' not in record['email']:
        errors.append('Invalid email format')

    if not record.get('name'):
        errors.append('Missing name')
    elif len(record['name'].strip()) < 2:
        errors.append('Name too short')

    return {
        'record': record,
        'valid': len(errors) == 0,
        'errors': errors
    }

@shared_task
def process_valid_record(record_data):
    """Process a validated record"""
    record = record_data['record']

    # Create user from valid record
    user = User.objects.create(
        email=record['email'],
        name=record['name'],
        created_from_import=True
    )

    return {
        'user_id': user.id,
        'email': user.email,
        'status': 'created'
    }

@shared_task
def generate_import_report(validation_results, processing_results):
    """Generate report from import operation"""
    total_records = len(validation_results)
    valid_records = sum(1 for r in validation_results if r['valid'])
    invalid_records = total_records - valid_records

    processed_count = len(processing_results)

    # Collect all validation errors
    all_errors = []
    for result in validation_results:
        if not result['valid']:
            all_errors.extend(result['errors'])

    return {
        'total_records': total_records,
        'valid_records': valid_records,
        'invalid_records': invalid_records,
        'processed_count': processed_count,
        'errors': all_errors[:100],  # Limit error details
        'success_rate': valid_records / total_records if total_records > 0 else 0
    }

@app.task
def import_user_data(data_records):
    """Complete import workflow using map operations"""
    # Step 1: Validate all records in parallel
    validation_results = validate_record.map(data_records).apply_async().get()

    # Step 2: Extract valid records
    valid_records = [r['record'] for r in validation_results if r['valid']]

    if not valid_records:
        return generate_import_report(validation_results, [])

    # Step 3: Process valid records in parallel
    processing_results = process_valid_record.map(valid_records).apply_async().get()

    # Step 4: Generate final report
    return generate_import_report(validation_results, processing_results)

# Usage
data = [
    {'email': 'user1@example.com', 'name': 'User One'},
    {'email': 'invalid-email', 'name': 'User Two'},
    {'email': 'user3@example.com', 'name': ''},  # Invalid: empty name
    {'email': 'user4@example.com', 'name': 'User Four'},
]

result = import_user_data.delay(data)
final_report = result.get(timeout=300)
```

❌ **Wrong: Manual iteration instead of map**
```python
# Inefficient and error-prone
@app.task
def process_items_manually(items):
    """Manual processing - slow and hard to monitor"""
    results = []

    for item in items:
        try:
            # Manual error handling for each item
            result = process_single_item(item)
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to process {item}: {e}")
            results.append({'error': str(e)})

    return results
    # No parallel processing, slower execution
```

❌ **Wrong: Map without proper error handling**
```python
# Map operation that fails completely on first error
@app.task
def fragile_batch_processing(items):
    """Map without error handling - all or nothing"""
    return process_item.map(items).apply_async().get()
    # If any single item fails, entire batch fails
```

**Common mistakes:**
- Using manual loops instead of map operations
- Not handling individual failures in map operations
- Creating map operations that are too large
- Ignoring result ordering from map operations
- Not considering memory implications of large maps

**When to apply:**
- Batch processing of similar items
- Data transformations on collections
- Parallel validation of multiple records
- Bulk operations on datasets
- Image or file processing pipelines
- API calls to multiple endpoints

**Related rules:**
- `canvas-group-parallel`: Alternative parallel execution patterns
- `canvas-chord-synchronization`: Synchronization with parallel operations
- `perf-concurrency-tuning`: Worker configuration for map operations</content>
<parameter name="filePath">skills/celery-skill/rules/canvas-map-starmap.md