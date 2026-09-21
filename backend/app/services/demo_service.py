# backend/app/services/demo_service.py

import asyncio
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import AsyncIterator

from sqlalchemy.orm import Session

from app.models.stream import Stream, StreamStatus, StreamSource
from app.models.user import User
from app.models.message import Message as MessageModel
from app.pulse_engine.domain import NormalizedMessage
from app.services.ingestion_service import get_engine_for_stream, AVAILABLE_GENRES
from app.api.videos import _safe_persist_signal

DATASETS_DIR = Path(__file__).resolve().parent.parent.parent / "datasets"
DEFAULT_DATASET = "demo_stream.jsonl"


def load_demo_messages(dataset_name: str = DEFAULT_DATASET) -> list[dict]:
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


def create_demo_stream(db: Session, user: User, dataset_name: str = DEFAULT_DATASET, genre: str = "mixed") -> Stream:
    clean_genre = (genre or "mixed").lower()
    if clean_genre not in AVAILABLE_GENRES:
        clean_genre = "mixed"

    stream = Stream(
        user_id=user.id,
        source=StreamSource.DEMO,
        external_id=f"demo_{dataset_name}_{int(datetime.utcnow().timestamp())}",
        title=f"Demo Replay: {dataset_name}",
        status=StreamStatus.LIVE,
        started_at=datetime.utcnow(),
        genre=clean_genre,
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return stream


async def replay_stream(
    db: Session,
    stream: Stream,
    dataset_name: str = DEFAULT_DATASET,
    speed_multiplier: float = 0.0,
) -> dict:
    messages = load_demo_messages(dataset_name)
    if not messages:
        return {"error": "No messages in dataset"}

    base_time = datetime.utcnow()
    outcomes = {"attached_to_existing": 0, "created_new_signal": 0, "ignored_empty": 0, "errors": 0}
    last_offset = 0
    processed = 0

    clean_genre = (stream.genre or "mixed").lower()
    if clean_genre not in AVAILABLE_GENRES:
        clean_genre = "mixed"

    engines = {g: get_engine_for_stream(stream.id, genre=g, db=db) for g in AVAILABLE_GENRES}
    primary_engine = engines[clean_genre]

    for i, msg in enumerate(messages):
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

            primary_result = primary_engine.ingest(norm_msg)
            for g, eng in engines.items():
                if eng != primary_engine:
                    eng.ingest(norm_msg)

            msg_row = MessageModel(
                stream_id=stream.id,
                platform="demo",
                platform_message_id=norm_msg.message_id,
                participant_id=norm_msg.participant_id,
                participant_name=norm_msg.participant_name,
                text_original=norm_msg.text,
                text_cleaned=None,
                is_valid=True,
                signal_id=None,
                similarity_score=primary_result.similarity_score,
                timestamp=norm_msg.timestamp,
            )
            db.add(msg_row)
            outcome_key = primary_result.outcome.value
            outcomes[outcome_key] = outcomes.get(outcome_key, 0) + 1
            processed += 1

        except Exception as e:
            print(f"[DEMO ERROR] {e}")
            outcomes["errors"] += 1
            continue

    try:
        db.commit()
    except Exception:
        db.rollback()

    # Persist signals from primary engine
    try:
        ranked = primary_engine.get_ranked_signals()
    except Exception:
        ranked = []

    persisted = 0
    for sig, _ in ranked:
        try:
            _safe_persist_signal(db, stream.id, sig)
            persisted += 1
        except Exception:
            db.rollback()

    try:
        for sig, _ in ranked:
            db.query(MessageModel).filter(
                MessageModel.stream_id == stream.id,
                MessageModel.platform_message_id.in_(sig.message_ids)
            ).update({MessageModel.signal_id: sig.id}, synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()

    try:
        stream.total_messages = processed
        stream.total_signals = len(ranked)
        stream.unique_participants = len(set(m["user"] for m in messages))
        db.commit()
    except Exception:
        db.rollback()

    return {
        "stream_id": stream.id,
        "messages_replayed": processed,
        "outcomes": outcomes,
        "final_signals": len(ranked),
        "signals_persisted": persisted,
        "unique_users": len(set(m["user"] for m in messages)),
    }