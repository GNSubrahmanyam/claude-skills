# Streaming Responses (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Enables efficient handling of large data and real-time responses

**Problem:**
Loading entire large datasets into memory before sending responses can cause memory exhaustion and poor performance. Real-time data streams need efficient handling.

**Solution:**
Use FastAPI's streaming responses for large files, real-time data, and memory-efficient processing.

❌ **Wrong: Loading entire file into memory**
```python
@app.get("/download/{file_id}")
async def download_file(file_id: str):
    # Loads entire file into memory - bad for large files
    file_content = await read_entire_file(file_id)
    return Response(content=file_content, media_type="application/octet-stream")
```

✅ **Correct: Streaming file responses**
```python
from fastapi.responses import StreamingResponse
import aiofiles
from pathlib import Path

@app.get("/download/{file_id}")
async def download_file(file_id: str):
    """Stream large files without loading into memory"""
    file_path = Path(f"uploads/{file_id}")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Stream file in chunks
    async def file_generator():
        async with aiofiles.open(file_path, 'rb') as f:
            chunk_size = 8192  # 8KB chunks
            while chunk := await f.read(chunk_size):
                yield chunk

    return StreamingResponse(
        file_generator(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={file_id}"}
    )

# Streaming JSON responses for large datasets
@app.get("/export/users")
async def export_users(db: AsyncSession = Depends(get_db)):
    """Stream large user exports as JSON"""
    async def user_generator():
        # Stream opening bracket
        yield '{"users": ['

        first = True
        async for user in await get_users_streaming(db):
            if not first:
                yield ','
            else:
                first = False

            # Stream user data
            user_json = json.dumps({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "created_at": user.created_at.isoformat()
            })
            yield user_json

        # Stream closing bracket
        yield ']}'

    return StreamingResponse(
        user_generator(),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=users_export.json"}
    )

# Real-time streaming with Server-Sent Events
@app.get("/events/stream")
async def stream_events():
    """Server-Sent Events for real-time updates"""

    async def event_generator():
        import asyncio

        while True:
            # Simulate real-time event
            event_data = {
                "type": "update",
                "timestamp": time.time(),
                "data": {"message": "Real-time update"}
            }

            # Send SSE formatted data
            yield f"data: {json.dumps(event_data)}\n\n"

            # Wait before next event
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# Streaming text responses
@app.get("/logs/stream")
async def stream_logs(log_file: str = "app.log"):
    """Stream log file contents"""

    async def log_generator():
        """Generator that yields log lines"""
        try:
            async with aiofiles.open(f"logs/{log_file}", 'r') as f:
                async for line in f:
                    yield f"data: {line.strip()}\n\n"
                    await asyncio.sleep(0.1)  # Small delay for readability
        except FileNotFoundError:
            yield f"data: Error: Log file {log_file} not found\n\n"

    return StreamingResponse(
        log_generator(),
        media_type="text/event-stream"
    )

# Database streaming for very large queries
@app.get("/analytics/stream")
async def stream_analytics(db: AsyncSession = Depends(get_db)):
    """Stream analytics data without loading all into memory"""

    async def analytics_generator():
        yield '{"analytics": ['

        first = True
        # Use server-side cursor for large datasets
        async for row in await get_analytics_streaming(db):
            if not first:
                yield ','
            first = False

            yield json.dumps({
                "date": row.date.isoformat(),
                "metric": row.metric,
                "value": row.value
            })

        yield ']}'

    return StreamingResponse(
        analytics_generator(),
        media_type="application/json"
    )
```

**Common mistakes:**
- Loading entire datasets into memory
- Not handling connection drops during streaming
- Poor chunk sizing
- Not setting appropriate headers
- Blocking operations in streaming generators

**When to apply:**
- Large file downloads
- Real-time data feeds
- Log streaming
- Analytics exports
- Any response larger than available memory