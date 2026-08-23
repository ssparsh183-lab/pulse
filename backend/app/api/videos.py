"""
PULSE — Past Video Analysis API (High Performance Batch Persistence)
"""

import traceback
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.stream import Stream, StreamStatus, StreamSource
from app.models.signal import Signal as SignalModel
from app.models.signal_membership import SignalMembership
from app.models.message import Message as MessageModel
from app.services.youtube_service import YouTubeService
from app.services.ingestion_service import get_engine_for_stream, clear_engine_cache
from app.pulse_engine.domain import NormalizedMessage


router = APIRouter()


def _safe_persist_signal(db: Session, stream_id: str, engine_signal) -> None:
    """
    High-performance batch persistence in 1 transaction instead of loop commits.
    """
    try:
        existing = db.query(SignalModel).filter(SignalModel.id == engine_signal.id).first()

        if existing:
            existing.label = engine_signal.label
            existing.representative_messages = list(engine_signal.representative_messages)
            existing.category = engine_signal.category
            existing.category_confidence = float(engine_signal.category_confidence)
            existing.state = engine_signal.state.value if hasattr(engine_signal.state, 'value') else str(engine_signal.state)
            existing.unique_participant_count = engine_signal.unique_support
            existing.message_count = engine_signal.message_count
            existing.momentum = float(engine_signal.momentum)
            existing.support_current_window = engine_signal.support_current_window
            existing.support_previous_window = engine_signal.support_previous_window
            existing.priority = float(engine_signal.priority)
            existing.urgency = float(engine_signal.urgency)
            existing.last_seen_at = engine_signal.last_seen_at
            existing.updated_at = datetime.utcnow()
        else:
            row = SignalModel(
                id=engine_signal.id,
                stream_id=stream_id,
                label=engine_signal.label,
                representative_messages=list(engine_signal.representative_messages),
                category=engine_signal.category,
                category_confidence=float(engine_signal.category_confidence),
                state=engine_signal.state.value if hasattr(engine_signal.state, 'value') else str(engine_signal.state),
                unique_participant_count=engine_signal.unique_support,
                message_count=engine_signal.message_count,
                momentum=float(engine_signal.momentum),
                support_current_window=engine_signal.support_current_window,
                support_previous_window=engine_signal.support_previous_window,
                priority=float(engine_signal.priority),
                urgency=float(engine_signal.urgency),
                centroid=engine_signal.centroid.tolist(),
                first_seen_at=engine_signal.first_seen_at,
                last_seen_at=engine_signal.last_seen_at,
            )
            db.add(row)

        # Batch check existing memberships in 1 query
        existing_members = set(
            p[0] for p in db.query(SignalMembership.participant_id)
            .filter(SignalMembership.signal_id == engine_signal.id)
            .all()
        )

        for participant_id, join_time in engine_signal.participant_join_times.items():
            if participant_id not in existing_members:
                m = SignalMembership(
                    signal_id=engine_signal.id,
                    participant_id=participant_id,
                    joined_at=join_time,
                )
                db.add(m)

        db.commit()
    except Exception as e:
        print(f"[PERSIST ERROR] Signal {engine_signal.id}: {e}")
        db.rollback()


@router.post("/{video_id}/analyze")
async def analyze_video(
    video_id: str,
    max_pages: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outcomes = {"attached_to_existing": 0, "created_new_signal": 0, "ignored_empty": 0, "errors": 0}
    processed = 0
    unique_ids_seen = set()
    ranked = []
    total_signals = 0
    persisted_signals = 0

    stream = (
        db.query(Stream)
        .filter(
            Stream.user_id == current_user.id,
            Stream.external_id == video_id,
            Stream.source == StreamSource.YOUTUBE_VIDEO,
        )
        .first()
    )

    if not stream:
        stream = Stream(
            user_id=current_user.id,
            source=StreamSource.YOUTUBE_VIDEO,
            external_id=video_id,
            status=StreamStatus.LIVE,
            started_at=datetime.utcnow(),
        )
        db.add(stream)
        db.commit()
        db.refresh(stream)
    else:
        # 🔥 FIX: Wipe old analysis data and clear engine cache to prevent duplicate signal accumulation
        db.query(SignalMembership).filter(SignalMembership.signal_id.in_(
            db.query(SignalModel.id).filter(SignalModel.stream_id == stream.id)
        )).delete(synchronize_session=False)

        db.query(SignalModel).filter(SignalModel.stream_id == stream.id).delete(synchronize_session=False)
        db.query(MessageModel).filter(MessageModel.stream_id == stream.id).delete(synchronize_session=False)
        db.commit()
        clear_engine_cache(stream.id)

    stream_id = stream.id

    yt = YouTubeService(db, current_user)
    try:
        comments = await yt.fetch_video_comments(video_id, max_pages=max_pages)
    except Exception as e:
        stream.status = StreamStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail=f"YouTube fetch failed: {str(e)}")

    if not comments:
        return {
            "stream_id": stream_id,
            "comments_fetched": 0,
            "message": "No comments found (or comments disabled)",
        }

    engine = get_engine_for_stream(stream_id)

    for c in comments:
        try:
            published_str = c.get("published_at", "")
            if not published_str:
                outcomes["errors"] += 1
                continue

            published_at = datetime.fromisoformat(
                published_str.replace("Z", "+00:00")
            ).replace(tzinfo=None)

            author_id = (c.get("author_id") or "").strip()
            if not author_id:
                author_id = f"anon_{c.get('comment_id', 'x')[:8]}"

            text = (c.get("text") or "").strip()
            if not text:
                outcomes["ignored_empty"] += 1
                continue

            norm_msg = NormalizedMessage(
                platform="youtube",
                stream_id=stream_id,
                message_id=c.get("comment_id", f"unknown_{processed}"),
                participant_id=author_id,
                text=text,
                timestamp=published_at,
                participant_name=c.get("author_name"),
            )

            result = engine.ingest(norm_msg)

            outcome_key = result.outcome.value
            outcomes[outcome_key] = outcomes.get(outcome_key, 0) + 1
            unique_ids_seen.add(author_id)
            processed += 1

        except Exception as e:
            print(f"[ENGINE ERROR] {e}")
            traceback.print_exc()
            outcomes["errors"] += 1
            continue

    try:
        ranked = engine.get_ranked_signals()
        total_signals = len(ranked)
    except Exception as e:
        print(f"[RANK ERROR] {e}")
        traceback.print_exc()

    for sig, _ranking in ranked:
        try:
            _safe_persist_signal(db, stream_id, sig)
            persisted_signals += 1
        except Exception as persist_err:
            print(f"[PERSIST WARN] Signal {sig.id}: {persist_err}")
            db.rollback()

    try:
        stream.total_messages = processed
        stream.status = StreamStatus.ARCHIVED
        stream.ended_at = datetime.utcnow()
        stream.total_signals = total_signals
        stream.unique_participants = len(unique_ids_seen)
        db.commit()
    except Exception as e:
        print(f"[STREAM UPDATE WARN] {e}")
        db.rollback()

    return {
        "stream_id": stream_id,
        "video_id": video_id,
        "comments_fetched": len(comments),
        "comments_processed": processed,
        "outcomes": outcomes,
        "signals_created": total_signals,
        "signals_persisted": persisted_signals,
        "unique_commenters": len(unique_ids_seen),
    }


@router.get("/{video_id}/signals")
def get_video_signals(
    video_id: str,
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stream = _get_video_stream(db, current_user, video_id)

    engine = get_engine_for_stream(stream.id)
    ranked = engine.get_ranked_signals(category=category)

    return [
        {
            "id": sig.id,
            "label": sig.label,
            "category": sig.category,
            "category_confidence": sig.category_confidence,
            "state": sig.state.value if hasattr(sig.state, 'value') else str(sig.state),
            "unique_participant_count": sig.unique_support,
            "message_count": sig.message_count,
            "priority": ranking.priority_score,
            "reasons": ranking.reasons,
            "representative_messages": sig.representative_messages,
            "first_seen_at": sig.first_seen_at.isoformat(),
            "last_seen_at": sig.last_seen_at.isoformat(),
        }
        for sig, ranking in ranked
    ]


@router.get("/{video_id}/summary")
def get_video_summary(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stream = _get_video_stream(db, current_user, video_id)

    engine = get_engine_for_stream(stream.id)
    all_signals = engine.get_all_signals(include_noise=False)

    category_counts: dict[str, int] = {}
    for sig in all_signals:
        cat = sig.category or "unclassified"
        category_counts[cat] = category_counts.get(cat, 0) + 1

    ranked = engine.get_ranked_signals()[:5]

    return {
        "stream_id": stream.id,
        "video_id": video_id,
        "status": stream.status.value if hasattr(stream.status, 'value') else str(stream.status),
        "total_comments": stream.total_messages,
        "unique_commenters": stream.unique_participants,
        "total_signals": len(all_signals),
        "category_breakdown": category_counts,
        "top_signals": [
            {
                "label": sig.label,
                "category": sig.category,
                "unique_users": sig.unique_support,
                "priority": ranking.priority_score,
                "sample_messages": sig.representative_messages[:2] if sig.representative_messages else [],
            }
            for sig, ranking in ranked
        ],
        "analyzed_at": stream.ended_at.isoformat() if stream.ended_at else None,
    }


def _get_video_stream(db: Session, user: User, video_id: str) -> Stream:
    stream = (
        db.query(Stream)
        .filter(
            Stream.user_id == user.id,
            Stream.external_id == video_id,
            Stream.source == StreamSource.YOUTUBE_VIDEO,
        )
        .first()
    )
    if not stream:
        raise HTTPException(
            status_code=404,
            detail=f"Video {video_id} not analyzed yet. Call POST /api/videos/{video_id}/analyze first.",
        )
    return stream