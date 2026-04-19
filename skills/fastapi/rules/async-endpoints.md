# Async Endpoints (CRITICAL)

**Impact:** CRITICAL - Ensures proper async execution and prevents blocking operations

**Problem:**
FastAPI applications can suffer from blocking operations that prevent proper async concurrency. Using synchronous functions in async contexts defeats the purpose of async frameworks and can cause performance bottlenecks, especially under load.

**Solution:**
Always use `async def` for endpoint functions and ensure all I/O operations are properly awaited. Use appropriate async libraries for database, HTTP calls, and file operations.

❌ **Wrong: Synchronous endpoint**
```python
@app.get("/items/{item_id}")
def read_item(item_id: int):  # Synchronous function - blocks event loop
    time.sleep(1)  # This blocks the entire event loop!
    return {"item_id": item_id}
```

✅ **Correct: Async endpoint**
```python
@app.get("/items/{item_id}")
async def read_item(item_id: int):  # Async function - non-blocking
    await asyncio.sleep(1)  # Properly awaits async operation
    return {"item_id": item_id}
```

**Common mistakes:**
- Using synchronous database drivers in async endpoints
- Calling synchronous I/O operations without proper async wrappers
- Mixing async and sync code without understanding the implications

**When to apply:**
- All endpoint functions in FastAPI applications
- Any function that performs I/O operations (database, network, file system)
- Background task functions