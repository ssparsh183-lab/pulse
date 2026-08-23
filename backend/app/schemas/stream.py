"""PULSE — Stream Schemas"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class StreamStartRequest(BaseModel):
    """Request to start analyzing a YouTube live stream."""
    source: str = "youtube_live"        # or "youtube_video" for past video
    external_id: str                     # YouTube video/broadcast ID
    title: Optional[str] = None


class StreamResponse(BaseModel):
    id: str
    source: str
    external_id: str
    title: Optional[str]
    status: str
    total_messages: int
    total_signals: int
    unique_participants: int
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True