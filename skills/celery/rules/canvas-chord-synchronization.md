---
title: Canvas Chord Synchronization
impact: HIGH
impactDescription: Enables complex workflows with parallel execution and synchronization
tags: celery, canvas, chord, synchronization, workflows
---

## Canvas Chord Synchronization

**Problem:**
Some workflows require parallel processing followed by a synchronization step that depends on all parallel tasks completing. Without chords, implementing these patterns is complex and error-prone.

**Solution:**
Use Celery's chord primitive to execute a group of tasks in parallel, then run a callback task that receives all results once all parallel tasks complete.

**Examples:**

✅ **Correct: Basic chord pattern**
```python
from celery import chord, group

@app.task
def process_data_chunk(chunk_id, data):
    """Process a chunk of data"""
    # Process chunk
    processed = [item * 2 for item in data]
    return {
        'chunk_id': chunk_id,
        'processed_count': len(processed),
        'data': processed
    }

@app.task
def aggregate_results(chunk_results):
    """Aggregate results from all chunks"""
    total_processed = sum(r['processed_count'] for r in chunk_results)
    all_data = []
    for result in chunk_results:
        all_data.extend(result['data'])

    # Final aggregation
    final_result = sum(all_data) / len(all_data) if all_data else 0

    return {
        'total_chunks': len(chunk_results),
        'total_processed': total_processed,
        'average': final_result,
        'timestamp': timezone.now().isoformat()
    }

# Split data into chunks
data_chunks = [
    (0, [1, 2, 3, 4, 5]),
    (1, [6, 7, 8, 9, 10]),
    (2, [11, 12, 13, 14, 15])
]

# Create chord: process chunks in parallel, then aggregate
workflow = chord(
    group(process_data_chunk.s(chunk_id, data) for chunk_id, data in data_chunks),
    aggregate_results.s()
)

# Execute workflow
result = workflow.apply_async()
final_aggregate = result.get(timeout=300)
print(f"Processed {final_aggregate['total_processed']} items")
```

✅ **Correct: Chord with error handling**
```python
@app.task(bind=True)
def safe_process_chunk(self, chunk_id, data):
    """Process chunk with error handling"""
    try:
        # Simulate processing
        if chunk_id == 1 and random.random() < 0.3:  # 30% failure rate for demo
            raise ValueError(f"Random failure in chunk {chunk_id}")

        processed = [item * 2 for item in data]
        return {
            'chunk_id': chunk_id,
            'status': 'success',
            'processed_count': len(processed),
            'data': processed
        }
    except Exception as exc:
        logger.error(f"Chunk {chunk_id} processing failed: {exc}")
        # Return error result instead of failing
        return {
            'chunk_id': chunk_id,
            'status': 'error',
            'error': str(exc),
            'processed_count': 0,
            'data': []
        }

@app.task
def aggregate_with_errors(chunk_results):
    """Aggregate results, handling errors gracefully"""
    successful_chunks = [r for r in chunk_results if r['status'] == 'success']
    failed_chunks = [r for r in chunk_results if r['status'] == 'error']

    total_successful = sum(r['processed_count'] for r in successful_chunks)
    all_successful_data = []
    for result in successful_chunks:
        all_successful_data.extend(result['data'])

    average = sum(all_successful_data) / len(all_successful_data) if all_successful_data else 0

    return {
        'successful_chunks': len(successful_chunks),
        'failed_chunks': len(failed_chunks),
        'total_processed': total_successful,
        'average': average,
        'errors': [{'chunk_id': r['chunk_id'], 'error': r['error']} for r in failed_chunks]
    }

# Chord with error-tolerant processing
error_tolerant_workflow = chord(
    group(safe_process_chunk.s(chunk_id, data) for chunk_id, data in data_chunks),
    aggregate_with_errors.s()
)
```

✅ **Correct: Chord with immutable callback**
```python
# When callback doesn't need the group results
@app.task
def cleanup_temp_files():
    """Clean up temporary files after processing"""
    temp_dir = '/tmp/processing'
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
        logger.info("Cleaned up temporary files")
    return "cleanup_complete"

# Use immutable signature (.si()) since callback doesn't need results
cleanup_chord = chord(
    group(process_data_chunk.s(chunk_id, data) for chunk_id, data in data_chunks),
    cleanup_temp_files.si()  # Immutable - doesn't receive group results
)
```

❌ **Wrong: Manual synchronization**
```python
# Don't do this - complex and error-prone
results = []
for chunk_id, data in data_chunks:
    result = process_data_chunk.delay(chunk_id, data)
    results.append(result)

# Manual waiting - blocks and doesn't handle failures well
completed_results = []
for async_result in results:
    try:
        completed_results.append(async_result.get(timeout=60))
    except Exception as e:
        logger.error(f"Task failed: {e}")
        # Manual error handling...

# Manual aggregation
aggregate_results(completed_results)
```

**Common mistakes:**
- Not handling partial failures in chord header tasks
- Using chord when group + callback would suffice
- Missing error handling in chord callbacks
- Not understanding immutable vs mutable signatures
- Creating chords with too many parallel tasks

**When to apply:**
- Map-reduce style processing
- Batch processing with final aggregation
- Parallel computation with result combination
- Multi-step workflows with synchronization points
- Data pipeline processing
- A/B testing result aggregation

**Related rules:**
- `canvas-group-parallel`: Parallel execution basics
- `canvas-chain-workflows`: Sequential workflows
- `error-retry-strategy`: Error handling in complex workflows</content>
<parameter name="filePath">skills/celery-skill/rules/canvas-chord-synchronization.md