"""
PULSE — Ingestion Service

Bridge between platform data (YouTube) and the PULSE engine.
Handles:
  - Converting platform messages to NormalizedMessage
  - Running through engine
  - Persisting to database
  - Managing per-stream engine instances
"""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.stream import Stream, StreamStatus
from app.models.message import Message as MessageModel
from app.models.signal import Signal as SignalModel
from app.models.signal_membership import SignalMembership
from app.pulse_engine.engine import PulseEngine
from app.pulse_engine.domain import NormalizedMessage, MessageOutcome


# Cache of PulseEngine instances per stream (in-memory for now)
# In production, this would be Redis-backed for multi-worker setups
_engine_cache: dict[str, PulseEngine] = {}


def get_engine_for_stream(stream_id: str) -> PulseEngine:
    """Get or create the PulseEngine instance for a stream."""
    if stream_id not in _engine_cache:
        _engine_cache[stream_id] = PulseEngine(stream_id=stream_id)
    return _engine_cache[stream_id]


def clear_engine_cache(stream_id: str) -> None:
    """Remove engine from cache (when stream ends)."""
    _engine_cache.pop(stream_id, None)


def ingest_youtube_message(
    db: Session,
    stream: Stream,
    youtube_msg: dict,
) -> Optional[dict]:
    """
    Process a single YouTube chat message through the engine and persist.
    
    Args:
        db: SQLAlchemy session
        stream: Stream ORM object
        youtube_msg: Dict from YouTubeService.fetch_live_chat_messages()
    
    Returns:
        Dict with outcome info, or None if invalid
    """
    # Parse published_at ISO string
    published_at = datetime.fromisoformat(
        youtube_msg["published_at"].replace("Z", "+00:00")
    ).replace(tzinfo=None)  # store as naive UTC

    # Build NormalizedMessage for engine
    norm_msg = NormalizedMessage(
        platform="youtube",
        stream_id=stream.id,
        message_id=youtube_msg["message_id"],
        participant_id=youtube_msg["author_id"] or "anonymous",
        text=youtube_msg["text"],
        timestamp=published_at,
        participant_name=youtube_msg.get("author_name"),
        is_moderator=youtube_msg.get("is_moderator", False),
        is_owner=youtube_msg.get("is_owner", False),
    )

    # Run through engine
    engine = get_engine_for_stream(stream.id)
    result = engine.ingest(norm_msg)

    # Persist message to DB
    msg_row = MessageModel(
        stream_id=stream.id,
        platform="youtube",
        platform_message_id=norm_msg.message_id,
        participant_id=norm_msg.participant_id,
        participant_name=norm_msg.participant_name,
        text_original=norm_msg.text,
        text_cleaned=None,
        is_valid=result.outcome != MessageOutcome.IGNORED_EMPTY,
        invalid_reason=None if result.outcome != MessageOutcome.IGNORED_EMPTY else "preprocess_dropped",
        signal_id=result.signal.id if result.signal else None,
        similarity_score=result.similarity_score,
        timestamp=norm_msg.timestamp,
    )
    db.add(msg_row)

    # Persist/update signal if we have one
    if result.signal:
        _upsert_signal(db, stream.id, result.signal, norm_msg)

    # Update stream stats
    stream.total_messages += 1
    if result.outcome == MessageOutcome.CREATED_NEW_SIGNAL:
        stream.total_signals += 1

    db.commit()

    return {
        "outcome": result.outcome.value,
        "signal_id": result.signal.id if result.signal else None,
        "signal_label": result.signal.label if result.signal else None,
        "similarity_score": result.similarity_score,
    }


def _upsert_signal(
    db: Session,
    stream_id: str,
    engine_signal,
    norm_msg: NormalizedMessage,
) -> None:
    """
    Insert or update the persisted Signal row + membership.
    Uses merge() to safely handle both new and existing signals
    without duplicate-key errors from SQLAlchemy identity map.
    """
    # Check if already exists in DB
    existing = db.query(SignalModel).filter(SignalModel.id == engine_signal.id).first()

    if existing is None:
        # Check if already pending in current session (identity map)
        pending = db.get(SignalModel, engine_signal.id)
        if pending is not None:
            existing = pending

    if existing is None:
        # Truly new — insert
        row = SignalModel(
            id=engine_signal.id,
            stream_id=stream_id,
            label=engine_signal.label,
            representative_messages=list(engine_signal.representative_messages),
            category=engine_signal.category,
            category_confidence=engine_signal.category_confidence,
            state=engine_signal.state.value,
            unique_participant_count=engine_signal.unique_support,
            message_count=engine_signal.message_count,
            momentum=engine_signal.momentum,
            support_current_window=engine_signal.support_current_window,
            support_previous_window=engine_signal.support_previous_window,
            priority=engine_signal.priority,
            urgency=engine_signal.urgency,
            centroid=engine_signal.centroid.tolist(),
            first_seen_at=engine_signal.first_seen_at,
            last_seen_at=engine_signal.last_seen_at,
        )
        db.add(row)
        db.flush()  # push to DB immediately so subsequent queries find it
    else:
        # Update existing signal
        existing.label = engine_signal.label
        existing.representative_messages = list(engine_signal.representative_messages)
        existing.category = engine_signal.category
        existing.category_confidence = engine_signal.category_confidence
        existing.state = engine_signal.state.value
        existing.unique_participant_count = engine_signal.unique_support
        existing.message_count = engine_signal.message_count
        existing.momentum = engine_signal.momentum
        existing.support_current_window = engine_signal.support_current_window
        existing.support_previous_window = engine_signal.support_previous_window
        existing.priority = engine_signal.priority
        existing.urgency = engine_signal.urgency
        existing.centroid = engine_signal.centroid.tolist()
        existing.last_seen_at = engine_signal.last_seen_at
        existing.updated_at = datetime.utcnow()

    # Track membership (unique participant per signal)
    membership_exists = (
        db.query(SignalMembership)
        .filter(
            SignalMembership.signal_id == engine_signal.id,
            SignalMembership.participant_id == norm_msg.participant_id,
        )
        .first()
    )

    if not membership_exists:
        membership = SignalMembership(
            signal_id=engine_signal.id,
            participant_id=norm_msg.participant_id,
            joined_at=norm_msg.timestamp,
        )
        db.add(membership)
def ingest_batch(
    db: Session,
    stream: Stream,
    youtube_messages: list[dict],
) -> dict:
    """
    Batch process multiple messages. Returns summary stats.
    """
    outcomes = {"attached": 0, "new_signal": 0, "ignored": 0}

    for msg in youtube_messages:
        try:
            result = ingest_youtube_message(db, stream, msg)
            if result is None:
                outcomes["ignored"] += 1
            elif result["outcome"] == "created_new_signal":
                outcomes["new_signal"] += 1
            elif result["outcome"] == "attached_to_existing":
                outcomes["attached"] += 1
            else:
                outcomes["ignored"] += 1
        except Exception as e:
            print(f"Error ingesting message {msg.get('message_id')}: {e}")
            continue

    return outcomes