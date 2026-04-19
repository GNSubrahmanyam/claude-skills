# Async Background Tasks (CRITICAL)

**Impact:** CRITICAL - Ensures background work doesn't block request processing

**Problem:**
Long-running tasks executed synchronously can block the event loop and prevent concurrent request handling, causing poor application responsiveness and timeouts.

**Solution:**
Use FastAPI's `BackgroundTasks` for fire-and-forget operations or external task queues like Celery for complex background processing. Ensure background tasks are properly async.

❌ **Wrong: Synchronous background work**
```python
import time

@app.post("/send-email")
async def send_email():
    time.sleep(5)  # Blocks the event loop for 5 seconds!
    return {"message": "Email sent"}
```

✅ **Correct: Background task implementation**
```python
from fastapi import BackgroundTasks
import asyncio

async def send_email_async(email: str, message: str):
    """Async email sending function"""
    await asyncio.sleep(1)  # Simulate async I/O
    print(f"Sending email to {email}: {message}")

@app.post("/send-notification")
async def send_notification(
    email: str,
    message: str,
    background_tasks: BackgroundTasks
):
    # Add to background - doesn't block response
    background_tasks.add_task(send_email_async, email, message)
    return {"message": "Notification will be sent"}

# Complex background tasks
async def process_large_dataset(dataset_id: int):
    """Process large dataset in background"""
    # Simulate long-running async work
    await asyncio.sleep(30)
    print(f"Processed dataset {dataset_id}")

@app.post("/process-dataset/{dataset_id}")
async def process_dataset(
    dataset_id: int,
    background_tasks: BackgroundTasks
):
    # Validate dataset exists first
    if not await dataset_exists(dataset_id):
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Start background processing
    background_tasks.add_task(process_large_dataset, dataset_id)

    return {
        "message": "Dataset processing started",
        "dataset_id": dataset_id,
        "status": "processing"
    }
```

**Common mistakes:**
- Using synchronous operations in background tasks
- Not handling background task errors
- Blocking the main thread with background work
- Not providing feedback about background task status

**When to apply:**
- Email sending and notifications
- Data processing and cleanup
- External API calls
- Any operation that takes more than a few seconds