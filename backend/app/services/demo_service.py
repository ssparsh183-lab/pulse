"""
PULSE — Demo Replay Service

Loads a deterministic dataset and streams it through the engine
at accelerated (or real-time) speed. Used for:
  - Demo day backup (no internet dependency)
  - Testing engine behavior
  - Frontend development without real YouTube stream
"""

import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import AsyncIterator

from sqlalchemy.orm import Session

from app.models.stream import Stream, StreamStatus, StreamSource
from app.models.user import User
from app.pulse_engine.domain import NormalizedMessage
from app.services.ingestion_service import get_engine_for_stream


DATASETS_DIR = Path(__file__).parent.parent.parent / "datasets"
DEFAULT_DATASET = "demo_stream.jsonl"


def load_demo_messages(dataset_name: str = DEFAULT_DATASET) -> list[dict]:
    """Load messages from a JSONL dataset file."""
    path = DATASETS_DIR / dataset_name
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    messages = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                messages.append(json.loads(line))
    return messages


def create_demo_stream(db: Session, user: User, dataset_name: str = DEFAULT_DATASET) -> Stream:
    """Create a Stream row for a demo replay session."""
    stream = Stream(
        user_id=user.id,
        source=StreamSource.DEMO,
        external_id=f"demo_{dataset_name}_{int(datetime.utcnow().timestamp())}",
        title=f"Demo Replay: {dataset_name}",
        status=StreamStatus.LIVE,
        started_at=datetime.utcnow(),
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return stream


async def replay_stream(
    db: Session,
    stream: Stream,
    dataset_name: str = DEFAULT_DATASET,
    speed_multiplier: float = 1.0,
) -> dict:
    """
    Replay messages through the engine with simulated timing.
    
    Args:
        speed_multiplier: 1.0 = real-time, 10.0 = 10x faster, 0.0 = instant
    
    Returns summary stats.
    """
    from app.api.videos import _safe_persist_signal  # reuse safe helper

    messages = load_demo_messages(dataset_name)
    if not messages:
        return {"error": "No messages in dataset"}

    base_time = datetime.utcnow()
    outcomes = {"attached_to_existing": 0, "created_new_signal": 0, "ignored_empty": 0, "errors": 0}
    last_offset = 0
    processed = 0

    engine = get_engine_for_stream(stream.id)

    for i, msg in enumerate(messages):
        # Simulate timing (if speed > 0)
        offset = msg.get("offset_seconds", i)
        if speed_multiplier > 0:
            delay = (offset - last_offset) / speed_multiplier
            if delay > 0:
                await asyncio.sleep(delay)
        last_offset = offset

        msg_time = base_time + timedelta(seconds=offset)

        try:
            norm_msg = NormalizedMessage(
                platform="demo",
                stream_id=stream.id,
                message_id=f"demo_{stream.id}_{i:04d}",
                participant_id=msg["user"],
                text=msg["text"],
                timestamp=msg_time,
                participant_name=msg["user"],
            )

            result = engine.ingest(norm_msg)
            outcome_key = result.outcome.value
            outcomes[outcome_key] = outcomes.get(outcome_key, 0) + 1
            processed += 1

        except Exception as e:
            print(f"[DEMO ERROR] {e}")
            outcomes["errors"] += 1
            continue

    # Get ranked signals + persist
    try:
        ranked = engine.get_ranked_signals()
    except Exception as e:
        print(f"[RANK ERROR] {e}")
        ranked = []

    persisted = 0
    for sig, _ in ranked:
        try:
            _safe_persist_signal(db, stream.id, sig)
            persisted += 1
        except Exception as e:
            print(f"[PERSIST WARN] {e}")
            db.rollback()

    # Update stream stats
    try:
        stream.total_messages = processed
        stream.total_signals = len(ranked)
        stream.unique_participants = len(set(m["user"] for m in messages))
        db.commit()
    except Exception as e:
        print(f"[STREAM UPDATE WARN] {e}")
        db.rollback()

    return {
        "stream_id": stream.id,
        "messages_replayed": processed,
        "outcomes": outcomes,
        "final_signals": len(ranked),
        "signals_persisted": persisted,
        "unique_users": len(set(m["user"] for m in messages)),
    }


async def stream_demo_iterator(
    dataset_name: str = DEFAULT_DATASET,
    speed_multiplier: float = 10.0,
) -> AsyncIterator[dict]:
    """
    Async generator that yields messages one-by-one with timing.
    Used for WebSocket streaming (later).
    """
    messages = load_demo_messages(dataset_name)
    last_offset = 0

    for i, msg in enumerate(messages):
        offset = msg.get("offset_seconds", i)
        if speed_multiplier > 0:
            delay = (offset - last_offset) / speed_multiplier
            if delay > 0:
                await asyncio.sleep(delay)
        last_offset = offset

        yield {
            "index": i,
            "user": msg["user"],
            "text": msg["text"],
            "offset_seconds": offset,
        }