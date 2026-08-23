"""
PULSE — Demo Replay API

Endpoints for running deterministic demo streams.
Perfect for hackathon demo day (no internet/YouTube dependency).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.demo_service import (
    create_demo_stream,
    replay_stream,
    load_demo_messages,
    DEFAULT_DATASET,
)


router = APIRouter()


@router.post("/start")
async def start_demo(
    dataset: str = Query(DEFAULT_DATASET, description="Dataset filename"),
    speed: float = Query(0.0, ge=0.0, le=100.0, description="0=instant, 1=real-time, 10=10x fast"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Start a demo replay stream.
    speed=0 means process all messages instantly (for quick testing).
    speed=1 means real-time (for live demo).
    speed=10 means 10x faster (for compressed demo).
    """
    try:
        stream = create_demo_stream(db, current_user, dataset)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = await replay_stream(db, stream, dataset, speed_multiplier=speed)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Replay failed: {str(e)}")

    return result


@router.get("/preview")
def preview_dataset(
    dataset: str = Query(DEFAULT_DATASET),
    limit: int = Query(10, ge=1, le=100),
):
    """Preview first N messages from a dataset without running through engine."""
    try:
        messages = load_demo_messages(dataset)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "dataset": dataset,
        "total_messages": len(messages),
        "preview": messages[:limit],
    }