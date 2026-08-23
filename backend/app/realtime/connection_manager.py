"""
PULSE — WebSocket Connection Manager

Manages active WebSocket connections per stream.
Broadcasts signal updates to all connected clients of a stream.
"""

from typing import Optional
from fastapi import WebSocket


class ConnectionManager:
    """
    Tracks active WebSocket connections grouped by stream_id.
    """

    def __init__(self):
        # stream_id -> list of WebSocket connections
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, stream_id: str, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        if stream_id not in self._connections:
            self._connections[stream_id] = []
        self._connections[stream_id].append(websocket)
        print(f"[WS] Connected to stream {stream_id}. Total: {len(self._connections[stream_id])}")

    def disconnect(self, stream_id: str, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        if stream_id in self._connections:
            try:
                self._connections[stream_id].remove(websocket)
                print(f"[WS] Disconnected from stream {stream_id}")
            except ValueError:
                pass
            if not self._connections[stream_id]:
                del self._connections[stream_id]

    async def broadcast(self, stream_id: str, message: dict) -> None:
        """Send a message to all connections for a given stream."""
        if stream_id not in self._connections:
            return

        dead_connections = []
        for ws in self._connections[stream_id]:
            try:
                await ws.send_json(message)
            except Exception as e:
                print(f"[WS] Send failed: {e}")
                dead_connections.append(ws)

        # Cleanup dead connections
        for ws in dead_connections:
            self.disconnect(stream_id, ws)

    def get_connection_count(self, stream_id: Optional[str] = None) -> int:
        if stream_id:
            return len(self._connections.get(stream_id, []))
        return sum(len(conns) for conns in self._connections.values())


# Global singleton
manager = ConnectionManager()