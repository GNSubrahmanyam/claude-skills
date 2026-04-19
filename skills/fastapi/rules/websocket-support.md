# WebSocket Support (HIGH)

**Impact:** HIGH - Enables real-time bidirectional communication

**Problem:**
Traditional HTTP APIs are request-response based, making real-time features like chat, notifications, and live updates difficult to implement efficiently.

**Solution:**
Use FastAPI's WebSocket support for real-time bidirectional communication. Implement proper connection management, error handling, and security.

❌ **Wrong: Polling for real-time updates**
```python
# Inefficient polling approach
@app.get("/notifications/{user_id}")
async def get_notifications(user_id: int):
    # Client polls every 5 seconds - wasteful
    notifications = await get_new_notifications(user_id)
    return {"notifications": notifications}
```

✅ **Correct: WebSocket implementation**
```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

    async def send_json(self, data: dict, websocket: WebSocket):
        await websocket.send_json(data)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        # Send welcome message
        await manager.send_personal_message(
            f"Connected as {client_id}",
            websocket
        )

        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)
                message_type = message_data.get("type")

                if message_type == "chat":
                    # Broadcast chat message
                    await manager.broadcast(
                        f"{client_id}: {message_data['message']}"
                    )

                elif message_type == "ping":
                    # Respond to ping
                    await manager.send_json(
                        {"type": "pong", "timestamp": time.time()},
                        websocket
                    )

                else:
                    await manager.send_personal_message(
                        f"Unknown message type: {message_type}",
                        websocket
                    )

            except json.JSONDecodeError:
                await manager.send_personal_message(
                    "Invalid JSON format",
                    websocket
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # Notify others about disconnection
        await manager.broadcast(f"{client_id} left the chat")

# Integration with regular endpoints
@app.post("/broadcast/")
async def broadcast_message(message: str):
    """Send message to all connected WebSocket clients"""
    await manager.broadcast(message)
    return {"message": "Broadcast sent", "clients": len(manager.active_connections)}

# Authenticated WebSocket
async def get_websocket_user(token: str = Query(...)):
    """Authenticate WebSocket connection"""
    try:
        username = verify_token(token)
        if username is None:
            await websocket.close(code=1008)  # Policy violation
        return username
    except:
        await websocket.close(code=1008)

@app.websocket("/ws/auth/")
async def authenticated_websocket(websocket: WebSocket, token: str = Query(...)):
    username = await get_websocket_user(token)
    if not username:
        return

    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle authenticated messages
            await manager.send_personal_message(
                f"Authenticated message from {username}",
                websocket
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

**Common mistakes:**
- Not handling connection disconnections properly
- Blocking operations in WebSocket handlers
- Poor error handling and recovery
- Not implementing authentication for WebSockets
- Memory leaks from unclosed connections

**When to apply:**
- Real-time chat applications
- Live notifications and updates
- Collaborative editing
- Real-time dashboards
- Gaming applications