# backend/app/services/ingestion_service.py

from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.stream import Stream, StreamStatus
from app.models.message import Message as MessageModel
from app.models.signal import Signal as SignalModel
from app.models.signal_membership import SignalMembership
from app.pulse_engine.engine import PulseEngine
from app.pulse_engine.domain import NormalizedMessage, MessageOutcome

# In-memory compound engine caches for the 4 isolated brains
_engine_cache: dict[str, PulseEngine] = {}

AVAILABLE_GENRES = ["mixed", "coding", "gaming"]

def get_engine_for_stream(stream_id: str, genre: Optional[str] = None, db: Session = None) -> PulseEngine:
    """
    Get or create an isolated PulseEngine session for this stream and specific context genre.
    Maintains 4 parallel brain states simultaneously.
    """
    resolved_genre = genre
    if not resolved_genre and db:
        stream = db.query(Stream).filter(Stream.id == stream_id).first()
        if stream and stream.genre:
            resolved_genre = stream.genre
            
    genre_clean = (resolved_genre or "mixed").lower()
    if genre_clean not in AVAILABLE_GENRES:
        genre_clean = "mixed"
    
    engine_key = f"{stream_id}_{genre_clean}"
    if engine_key not in _engine_cache:
        _engine_cache[engine_key] = PulseEngine(stream_id=stream_id, genre=genre_clean)
        
    return _engine_cache[engine_key]

def clear_engine_cache(stream_id: str) -> None:
    keys_to_remove = [k for k in _engine_cache.keys() if k.startswith(f"{stream_id}_") or k == stream_id]
    for k in keys_to_remove:
        _engine_cache.pop(k, None)


def ingest_youtube_message(db: Session, stream: Stream, youtube_msg: dict) -> Optional[dict]:
    """
    Ingests a message across ALL 4 parallel context brains simultaneously
    so that background states are fully pre-computed and instant on tab switch.
    """
    published_at = datetime.fromisoformat(
        youtube_msg["published_at"].replace("Z", "+00:00")
    ).replace(tzinfo=None)

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

    primary_result = None

    # 🔥 PARALLEL 4-BRAIN DISPATCH: Ingest into all 4 brains concurrently!
    for g in AVAILABLE_GENRES:
        brain_engine = get_engine_for_stream(stream.id, genre=g, db=db)
        res = brain_engine.ingest(norm_msg)
        if g == (stream.genre or "mixed").lower():
            primary_result = res

    if not primary_result:
        primary_result = get_engine_for_stream(stream.id, genre="mixed", db=db).ingest(norm_msg)

    # Persist primary raw message in database
    msg_row = MessageModel(
        stream_id=stream.id,
        platform="youtube",
        platform_message_id=norm_msg.message_id,
        participant_id=norm_msg.participant_id,
        participant_name=norm_msg.participant_name,
        text_original=norm_msg.text,
        text_cleaned=None,
        is_valid=primary_result.outcome != MessageOutcome.IGNORED_EMPTY,
        invalid_reason=None if primary_result.outcome != MessageOutcome.IGNORED_EMPTY else "preprocess_dropped",
        signal_id=primary_result.signal.id if primary_result.signal else None,
        similarity_score=primary_result.similarity_score,
        timestamp=norm_msg.timestamp,
    )
    db.add(msg_row)

    if primary_result.signal:
        _upsert_signal(db, stream.id, primary_result.signal, norm_msg)

    stream.total_messages += 1
    if primary_result.outcome == MessageOutcome.CREATED_NEW_SIGNAL:
        stream.total_signals += 1

    db.commit()

    return {
        "outcome": primary_result.outcome.value,
        "signal_id": primary_result.signal.id if primary_result.signal else None,
        "signal_label": primary_result.signal.label if primary_result.signal else None,
        "similarity_score": primary_result.similarity_score,
    }


def _upsert_signal(db: Session, stream_id: str, engine_signal, norm_msg: NormalizedMessage) -> None:
    existing = db.query(SignalModel).filter(SignalModel.id == engine_signal.id).first()
    if existing is None:
        row = SignalModel(
            id=engine_signal.id,
            stream_id=stream_id,
            label=engine_signal.label,
            representative_messages=list(engine_signal.representative_messages),
            category=engine_signal.category,
            category_confidence=engine_signal.category_confidence,
            state=engine_signal.state.value if hasattr(engine_signal.state, 'value') else str(engine_signal.state),
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
        db.flush()
    else:
        existing.label = engine_signal.label
        existing.representative_messages = list(engine_signal.representative_messages)
        existing.category = engine_signal.category
        existing.category_confidence = engine_signal.category_confidence
        existing.state = engine_signal.state.value if hasattr(engine_signal.state, 'value') else str(engine_signal.state)
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


def ingest_batch(db: Session, stream: Stream, youtube_messages: list[dict]) -> dict:
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
        except Exception:
            continue
    return outcomes