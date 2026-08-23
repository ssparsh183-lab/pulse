"""
PULSE — WebSocket API

Real-time signal updates for the live dashboard.

Endpoints:
  WS /ws/streams/{stream_id}         Live signal broadcast
"""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.realtime.connection_manager import manager
from app.services.auth_service import decode_access_token
from app.models.user import User
from app.models.stream import Stream
from app.services.ingestion_service import get_engine_for_stream


router = APIRouter()


@router.websocket("/streams/{stream_id}")
async def stream_signals_ws(
    websocket: WebSocket,
    stream_id: str,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint for real-time signal updates.
    
    Client sends: nothing (server-push only)
    Server sends: JSON updates every 2 seconds with current ranked signals
    
    Connect URL: ws://localhost:8000/ws/streams/{stream_id}?token={jwt}
    """
    # Verify JWT token
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008, reason="Invalid token")
            return
    except Exception as e:
        await websocket.close(code=1008, reason=f"Auth failed: {str(e)}")
        return

    # Verify stream ownership
    db = SessionLocal()
    try:
        stream = (
            db.query(Stream)
            .filter(Stream.id == stream_id, Stream.user_id == user_id)
            .first()
        )
        if not stream:
            await websocket.close(code=1008, reason="Stream not found")
            return
    finally:
        db.close()

    # Register connection
    await manager.connect(stream_id, websocket)

    try:
        # Initial payload — send current signals immediately
        await _send_signals_snapshot(websocket, stream_id)

        # Keep-alive loop — push updates every 2 seconds
        while True:
            await asyncio.sleep(2)
            await _send_signals_snapshot(websocket, stream_id)

    except WebSocketDisconnect:
        manager.disconnect(stream_id, websocket)
    except Exception as e:
        print(f"[WS ERROR] {e}")
        manager.disconnect(stream_id, websocket)


async def _send_signals_snapshot(websocket: WebSocket, stream_id: str) -> None:
    """Send current ranked signals to the client."""
    try:
        engine = get_engine_for_stream(stream_id)
        ranked = engine.get_ranked_signals()

        payload = {
            "type": "signals_update",
            "stream_id": stream_id,
            "signal_count": len(ranked),
            "signals": [
                {
                    "id": sig.id,
                    "label": sig.label,
                    "category": sig.category,
                    "state": sig.state.value,
                    "unique_participant_count": sig.unique_support,
                    "message_count": sig.message_count,
                    "momentum": sig.momentum,
                    "priority": ranking.priority_score,
                    "reasons": ranking.reasons,
                    "representative_messages": sig.representative_messages[:3],
                }
                for sig, ranking in ranked
            ],
        }
        await websocket.send_json(payload)
    except Exception as e:
        print(f"[WS SNAPSHOT ERROR] {e}")