"""
PULSE — Domain Models

Foundation of the entire project. Defines what a Message, Signal,
and EngineResult are. Depends on nothing external (no FastAPI, DB, etc).

All other modules import from here.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid

import numpy as np


# Signal lifecycle states (Point 9)
class SignalState(str, Enum):
    NOISE = "noise"              # < 2 unique users, hidden from dashboard
    EMERGING = "emerging"        # 2+ unique users, just started
    RISING = "rising"            # rapidly gaining support
    ACTIVE = "active"            # steady support
    DECLINING = "declining"      # losing momentum
    RESOLVED = "resolved"        # organizer marked resolved
    RE_EMERGING = "re_emerging"  # resolved signal reactivated


# Common format for messages from any platform (Point 15)
@dataclass
class NormalizedMessage:
    platform: str
    stream_id: str
    message_id: str
    participant_id: str
    text: str
    timestamp: datetime

    participant_name: Optional[str] = None
    is_moderator: bool = False
    is_owner: bool = False
    raw_data: Optional[dict] = None

    def __repr__(self) -> str:
        preview = self.text[:40] + "..." if len(self.text) > 40 else self.text
        return f"<Msg [{self.platform}] {self.participant_id}: {preview}>"


# Core unit of PULSE — a collective audience concern (Point 5, 22)
@dataclass
class Signal:
    id: str
    stream_id: str
    label: str
    centroid: np.ndarray  # average embedding of all supporting messages

    message_ids: list[str] = field(default_factory=list)
    unique_participant_ids: set[str] = field(default_factory=set)
    representative_messages: list[str] = field(default_factory=list)

    first_seen_at: datetime = field(default_factory=datetime.utcnow)
    last_seen_at: datetime = field(default_factory=datetime.utcnow)
    participant_join_times: dict[str, datetime] = field(default_factory=dict)

    # Rolling window support counts for momentum (Point 27)
    support_current_window: int = 0
    support_previous_window: int = 0
    momentum: float = 0.0

    priority: float = 0.0
    urgency: float = 0.0
    state: SignalState = SignalState.EMERGING

    # Category (assigned by category_classifier — imported lazily to avoid circular deps)
    category: Optional[str] = None            # SignalCategory value as string
    category_confidence: float = 0.0

    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def message_count(self) -> int:
        return len(self.message_ids)

    # Distinct users — the real strength measure (Point 6)
    @property
    def unique_support(self) -> int:
        return len(self.unique_participant_ids)

    def __repr__(self) -> str:
        return (
            f"<Signal '{self.label}' "
            f"users={self.unique_support} "
            f"msgs={self.message_count} "
            f"state={self.state.value}>"
        )


# What happened to a message after engine processed it
class MessageOutcome(str, Enum):
    ATTACHED_TO_EXISTING = "attached_to_existing"
    CREATED_NEW_SIGNAL = "created_new_signal"
    IGNORED_SPAM = "ignored_spam"
    IGNORED_EMPTY = "ignored_empty"


# Engine's output per message — used for broadcasting via WebSocket
@dataclass
class EngineResult:
    message: NormalizedMessage
    outcome: MessageOutcome
    signal: Optional[Signal] = None
    similarity_score: Optional[float] = None
    state_changed: bool = False
    previous_state: Optional[SignalState] = None

    def __repr__(self) -> str:
        signal_info = f" → {self.signal.label}" if self.signal else ""
        return f"<EngineResult {self.outcome.value}{signal_info}>"


def generate_signal_id() -> str:
    return f"sig_{uuid.uuid4().hex[:12]}"


def generate_message_id() -> str:
    return f"msg_{uuid.uuid4().hex[:12]}"