"""PULSE — Signal Schemas"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SignalCard(BaseModel):
    """Compact signal for dashboard display."""
    id: str
    label: str
    category: Optional[str]
    category_confidence: float
    state: str
    unique_participant_count: int
    message_count: int
    momentum: float
    priority: float
    representative_messages: Optional[list] = None
    first_seen_at: datetime
    last_seen_at: datetime

    class Config:
        from_attributes = True


class SignalDetail(SignalCard):
    """Full signal with ranking reasons."""
    reasons: list[str] = []
    support_current_window: int = 0
    support_previous_window: int = 0


class ResolveRequest(BaseModel):
    action: str = "resolve"    # or "dismiss"