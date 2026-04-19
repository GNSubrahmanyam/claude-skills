---
title: Canvas Group Parallel Execution
impact: HIGH
impactDescription: Enables parallel task execution for performance optimization
tags: celery, canvas, group, parallel, performance
---

## Canvas Group Parallel Execution

**Problem:**
Tasks that can run independently should execute in parallel to improve performance, but improper parallelization can lead to resource exhaustion, race conditions, or coordination issues.

**Solution:**
Use Celery's group primitive to execute multiple tasks in parallel, with proper error handling and result aggregation.

**Examples:**

✅ **Correct: Parallel task execution with group**
```python
from celery import group

@app.task
def process_image(image_id, operation):
    """Process a single image"""
    image = Image.objects.get(id=image_id)
    if operation == 'resize':
        return resize_image(image)
    elif operation == 'optimize':
        return optimize_image(image)
    return image

# Process multiple images in parallel
image_ids = [1, 2, 3, 4, 5]
operations = ['resize', 'optimize', 'resize', 'optimize', 'resize']

# Create group of parallel tasks
parallel_tasks = group(
    process_image.s(image_id, op)
    for image_id, op in zip(image_ids, operations)
)

# Execute in parallel
result_group = parallel_tasks.apply_async()

# Wait for all to complete
results = result_group.get(timeout=300)  # 5 minute timeout
print(f"Processed {len(results)} images")
```

✅ **Correct: Group with error handling**
```python
from celery import group

@app.task(bind=True)
def resilient_task(self, item_id):
    """Task that handles its own errors"""
    try:
        # Process item
        item = Item.objects.get(id=item_id)
        return process_item(item)
    except Item.DoesNotExist:
        logger.warning(f"Item {item_id} not found, skipping")
        return None  # Return None for missing items
    except Exception as exc:
        logger.error(f"Failed to process item {item_id}: {exc}")
        # Don't retry - log and continue
        return {'error': str(exc), 'item_id': item_id}

# Group with individual error handling
items_to_process = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
task_group = group(
    resilient_task.s(item_id) for item_id in items_to_process
)

results = task_group.apply_async().get()

# Process results - some may be None or error dicts
successful_results = [r for r in results if r is not None and 'error' not in r]
errors = [r for r in results if isinstance(r, dict) and 'error' in r]

logger.info(f"Successfully processed {len(successful_results)} items")
if errors:
    logger.warning(f"Encountered {len(errors)} errors")
```

✅ **Correct: Group result aggregation**
```python
@app.task
def collect_results(partial_results):
    """Aggregate results from parallel tasks"""
    total_processed = 0
    total_errors = 0
    aggregated_data = []

    for result in partial_results:
        if result is None:
            continue
        elif isinstance(result, dict) and 'error' in result:
            total_errors += 1
            logger.warning(f"Task error: {result['error']}")
        else:
            total_processed += 1
            aggregated_data.extend(result.get('data', []))

    return {
        'total_processed': total_processed,
        'total_errors': total_errors,
        'aggregated_data': aggregated_data
    }

# Group with result aggregation
batch_size = 50
batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]

processing_group = group(
    process_batch.s(batch) for batch in batches
)

# Chain group with aggregation
workflow = (processing_group | collect_results.s())
final_result = workflow.apply_async().get()
```

❌ **Wrong: Synchronous processing**
```python
# Don't do this - slow and blocking
results = []
for item_id in item_ids:
    result = process_item_sync(item_id)  # Synchronous call
    results.append(result)
# Takes much longer than parallel execution
```

❌ **Wrong: Group without error handling**
```python
# Risky - any task failure fails the entire group
task_group = group(process_item.s(i) for i in range(100))
results = task_group.apply_async().get()  # Fails if any task fails
```

**Common mistakes:**
- Not handling individual task failures in groups
- Creating groups that are too large (resource exhaustion)
- Ignoring result ordering from parallel execution
- Not considering task dependencies within groups
- Missing timeouts for group completion

**When to apply:**
- Batch processing operations
- Independent calculations or transformations
- API calls to multiple services
- File processing or image manipulation
- Data validation across multiple items
- Parallel computation tasks

**Related rules:**
- `canvas-chain-workflows`: Sequential execution patterns
- `canvas-chord-synchronization`: Group synchronization
- `perf-concurrency-tuning`: Worker concurrency for groups</content>
<parameter name="filePath">skills/celery-skill/rules/canvas-group-parallel.md