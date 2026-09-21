# backend/app/api/streams.py

"""
PULSE — Streams API (Full: Context-Aware Dynamic Filters, Live Switch & 100% Platform Isolation)
"""

from datetime import datetime
from typing import Optional
import copy
import numpy as np

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.stream import Stream, StreamStatus, StreamSource
from app.services.youtube_service import YouTubeService
from app.services.ingestion_service import (
    ingest_batch,
    get_engine_for_stream,
    clear_engine_cache,
)
from app.schemas.stream import StreamStartRequest, StreamResponse
from app.pulse_engine.domain import NormalizedMessage, Signal as DomainSignal, SignalState
from app.pulse_engine.pulse_score import calculate_pulse_score
from app.services.audience_dna import classify_audience_dna, get_stream_moments
from app.services.timeline_service import generate_timeline
from app.services.report_service import generate_html_report, html_to_pdf_bytes
from app.models.signal import Signal as SignalModel
from app.models.message import Message as MessageModel
from app.pulse_engine.category_classifier import get_classifier

router = APIRouter()


def _get_user_stream(db: Session, user: User, stream_id: str) -> Stream:
    stream = db.query(Stream).filter(Stream.id == stream_id, Stream.user_id == user.id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    return stream


@router.post("/start", response_model=StreamResponse)
async def start_stream(body: StreamStartRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Stream).filter(
        Stream.user_id == current_user.id, 
        Stream.external_id == body.external_id
    ).first()
    
    if existing and existing.status == StreamStatus.LIVE:
        existing.genre = body.genre
        db.commit()
        return existing

    source_enum = StreamSource.YOUTUBE_LIVE if body.source == "youtube_live" else StreamSource.YOUTUBE_VIDEO
    
    stream = Stream(
        user_id=current_user.id, 
        source=source_enum, 
        external_id=body.external_id,
        title=body.title, 
        status=StreamStatus.LIVE, 
        started_at=datetime.utcnow(),
        genre=body.genre,
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return stream


@router.get("", response_model=list[StreamResponse])
def list_streams(status: Optional[str] = Query(None), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Stream).filter(Stream.user_id == current_user.id)
    if status:
        query = query.filter(Stream.status == status)
    return query.order_by(Stream.created_at.desc()).all()


@router.get("/{stream_id}", response_model=StreamResponse)
def get_stream(
    stream_id: str, 
    genre: str = Query("mixed", description="Dynamic context genre"),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    stream = _get_user_stream(db, current_user, stream_id)
    return stream


@router.post("/{stream_id}/end")
def end_stream(stream_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stream = _get_user_stream(db, current_user, stream_id)
    stream.status = StreamStatus.ENDED
    stream.ended_at = datetime.utcnow()
    
    unique_count = db.query(MessageModel.participant_id).filter(MessageModel.stream_id == stream_id).distinct().count()
    stream.unique_participants = max(unique_count, 1)
    
    db.commit()
    return {"status": "ended", "stream_id": stream_id}


@router.post("/{stream_id}/fetch-chat")
async def fetch_and_ingest_chat(
    stream_id: str,
    live_chat_id: str = Query(..., description="YouTube liveChatId"),
    page_token: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    stream = _get_user_stream(db, current_user, stream_id)
    yt = YouTubeService(db, current_user)
    
    try:
        chat_data = await yt.fetch_live_chat_messages(live_chat_id, page_token)
        stats = ingest_batch(db, stream, chat_data["messages"])
    except Exception as e:
        err_str = str(e).lower()
        if "403" in err_str or "400" in err_str or "active" in err_str or "expired" in err_str:
            stream.status = StreamStatus.ENDED
            stream.ended_at = datetime.utcnow()
            unique_count = db.query(MessageModel.participant_id).filter(MessageModel.stream_id == stream_id).distinct().count()
            stream.unique_participants = max(unique_count, 1)
            db.commit()
            return {
                "fetched": 0, "outcomes": {}, "next_page_token": None,
                "polling_interval_ms": 10000, "messages": [], "status_auto_ended": True
            }
        raise HTTPException(status_code=400, detail=f"YouTube fetch failed: {e}")

    return {
        "fetched": len(chat_data["messages"]),
        "outcomes": stats,
        "next_page_token": chat_data["next_page_token"],
        "polling_interval_ms": chat_data["polling_interval_ms"],
        "messages": [
            {
                "message_id": m.get("message_id"), "text": m.get("text"),
                "author_name": m.get("author_name"), "author_id": m.get("author_id"),
                "published_at": m.get("published_at"),
            }
            for m in chat_data["messages"]
        ],
    }


@router.get("/{stream_id}/signals")
def get_stream_signals(
    stream_id: str, 
    category: Optional[str] = None, 
    include_noise: bool = False,
    genre: str = Query("mixed", description="Dynamic context genre"),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    stream = _get_user_stream(db, current_user, stream_id)
    stream_genre = (genre or "mixed").lower()
    
    # 🔥 DYNAMIC ROUTING: Pull directly from the target brain engine!
    target_engine = get_engine_for_stream(stream_id, genre=stream_genre, db=db)
    ranked = target_engine.get_ranked_signals(include_noise=include_noise, category=category)

    return [
        {
            "id": sig.id, "label": sig.label, "category": sig.category,
            "category_confidence": getattr(sig, "category_confidence", 0.9),
            "state": sig.state.value if hasattr(sig.state, "value") else str(sig.state),
            "unique_participant_count": sig.unique_support, "message_count": sig.message_count,
            "momentum": sig.momentum, "priority": ranking.priority_score,
            "reasons": ranking.reasons, "representative_messages": sig.representative_messages,
            "first_seen_at": sig.first_seen_at.isoformat(), "last_seen_at": sig.last_seen_at.isoformat(),
        }
        for sig, ranking in ranked
    ]



@router.post("/{stream_id}/signals/{signal_id}/resolve")
def resolve_signal(stream_id: str, signal_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_user_stream(db, current_user, stream_id)
    engine = get_engine_for_stream(stream_id)
    engine.resolve_signal(signal_id)
    row = db.query(SignalModel).filter(SignalModel.id == signal_id).first()
    if row:
        row.state = "resolved"
        row.updated_at = datetime.utcnow()
        db.commit()
    return {"status": "resolved", "signal_id": signal_id}


@router.post("/{stream_id}/signals/{signal_id}/dismiss")
def dismiss_signal(stream_id: str, signal_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_user_stream(db, current_user, stream_id)
    engine = get_engine_for_stream(stream_id)
    engine.dismiss_signal(signal_id)
    row = db.query(SignalModel).filter(SignalModel.id == signal_id).first()
    if row:
        row.state = "resolved"
        row.updated_at = datetime.utcnow()
        db.commit()
    return {"status": "dismissed", "signal_id": signal_id}


@router.get("/{stream_id}/score")
def get_pulse_score(
    stream_id: str, 
    genre: str = Query("mixed", description="Dynamic context genre"),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    stream = _get_user_stream(db, current_user, stream_id)
    stream_genre = (genre or "mixed").lower()
    
    target_engine = get_engine_for_stream(stream_id, genre=stream_genre, db=db)
    signals_raw = target_engine.get_all_signals(include_noise=False)

    result = calculate_pulse_score(signals_raw, total_messages=stream.total_messages)
    return {
        "score": result.score, "state": result.state, "label": result.label,
        "color": result.color, "components": result.components, "reasons": result.reasons,
    }



@router.get("/{stream_id}/audience")
def get_audience_dna(
    stream_id: str, 
    genre: str = Query("mixed", description="Dynamic context genre"),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    stream = _get_user_stream(db, current_user, stream_id)
    stream_genre = (genre or "mixed").lower()
    
    target_engine = get_engine_for_stream(stream_id, genre=stream_genre, db=db)
    dna = classify_audience_dna(target_engine, db, stream_id, genre=stream_genre)
    moments = get_stream_moments(target_engine, genre=stream_genre)
    return {"dna": dna, "moments": moments}


@router.get("/{stream_id}/timeline")
def get_timeline(stream_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_user_stream(db, current_user, stream_id)
    return {"timeline": generate_timeline(db, stream_id)}


@router.get("/{stream_id}/full-analysis")
def get_full_analysis(
    stream_id: str, 
    genre: str = Query("mixed", description="Dynamic context genre"),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    stream = _get_user_stream(db, current_user, stream_id)
    
    # 🔥 POST-STREAM LOCK: Agar stream khatam ho chuki hai, toh analysis hamesha "mixed" rahegi!
    if stream.status in [StreamStatus.ENDED, StreamStatus.ARCHIVED]:
        stream_genre = "mixed"
    else:
        stream_genre = (genre or "mixed").lower()
    
    real_msgs_count = db.query(MessageModel).filter(MessageModel.stream_id == stream_id).count()
    real_users_count = db.query(MessageModel.participant_id).filter(MessageModel.stream_id == stream_id).distinct().count()
    
    final_msgs = real_msgs_count if real_msgs_count > 0 else (stream.total_messages or 0)
    final_users = real_users_count if real_users_count > 0 else (stream.unique_participants or 1)

    # Pull from target brain engine
    target_engine = get_engine_for_stream(stream_id, genre=stream_genre, db=db)
    
    # If in-memory engine has signals (active stream or recent demo)
    if len(target_engine.get_all_signals()) > 0:
        engine_ranked = target_engine.get_ranked_signals(include_noise=False)
        signals_raw = [s for s, _ in engine_ranked]
    else:
        # Fallback to DB persisted signals (for past sessions after server reboot)
        db_signals = db.query(SignalModel).filter(SignalModel.stream_id == stream_id).all()
        signals_raw = [
            DomainSignal(
                id=s.id, stream_id=stream_id, label=s.label, centroid=np.zeros(768),
                message_ids=s.representative_messages or [], unique_participant_ids=set(),
                representative_messages=s.representative_messages or [], first_seen_at=s.first_seen_at,
                last_seen_at=s.last_seen_at, state=SignalState.ACTIVE, category=s.category
            )
            for s in db_signals
        ]
        from app.pulse_engine.ranking import calculate_priority
        engine_ranked = [(s, calculate_priority(s)) for s in signals_raw]

    score = calculate_pulse_score(signals_raw, total_messages=final_msgs)
    dna = classify_audience_dna(target_engine, db, stream_id, genre=stream_genre)
    moments = get_stream_moments(target_engine, genre=stream_genre)
    timeline = generate_timeline(db, stream_id, genre=stream_genre)

    signals_list = [
        {
            "id": sig.id, "label": sig.label, "category": sig.category,
            "state": sig.state.value if hasattr(sig.state, "value") else str(sig.state), 
            "unique_participant_count": getattr(sig, "unique_participant_count_db", sig.unique_support),
            "message_count": getattr(sig, "message_count_db", sig.message_count), "momentum": sig.momentum,
            "priority": ranking.priority_score, "reasons": ranking.reasons,
            "representative_messages": sig.representative_messages,
        } for sig, ranking in engine_ranked
    ]

    db_messages = (
        db.query(MessageModel)
        .filter(MessageModel.stream_id == stream_id)
        .order_by(MessageModel.timestamp.asc())
        .all()
    )
    
    messages_list = [
        {
            "id": m.id,
            "user": m.participant_name or m.participant_id,
            "text": m.text_original,
            "time": m.timestamp.strftime("%M:%S") if m.timestamp else "00:00"
        }
        for m in db_messages
    ]

    return {
        "stream": {
            "id": stream.id, "title": stream.title, "status": stream.status.value if hasattr(stream.status, 'value') else str(stream.status),
            "source": stream.source.value if hasattr(stream.source, 'value') else str(stream.source),
            "external_id": stream.external_id,
            "total_messages": final_msgs,
            "total_signals": len(signals_list),
            "unique_participants": final_users,
            "active_genre": stream_genre
        },
        "score": {
            "score": score.score, "state": score.state, "label": score.label,
            "color": score.color, "components": score.components, "reasons": score.reasons,
        },
        "audience": {"dna": dna, "moments": moments},
        "timeline": timeline,
        "signals": signals_list,
        "messages": messages_list,
    }

@router.get("/{stream_id}/export")
def export_report(
    stream_id: str, 
    token: str = Query(None), 
    genre: str = Query("mixed", description="Dynamic context genre"),
    db: Session = Depends(get_db)
):
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404)
        
    stream_genre = (genre or "mixed").lower()
    
    # Accurate DB count
    real_msgs_count = db.query(MessageModel).filter(MessageModel.stream_id == stream_id).count()
    real_users_count = db.query(MessageModel.participant_id).filter(MessageModel.stream_id == stream_id).distinct().count()
    
    final_msgs = real_msgs_count if real_msgs_count > 0 else (stream.total_messages or 0)
    final_users = real_users_count if real_users_count > 0 else (stream.unique_participants or 1)

    db_signals = db.query(SignalModel).filter(SignalModel.stream_id == stream_id).all()
    signals_raw = []
    for s in db_signals:
        mock_sig = DomainSignal(
            id=s.id, stream_id=stream_id, label=s.label, centroid=np.zeros(768),
            message_ids=s.representative_messages or [], unique_participant_ids=set(),
            representative_messages=s.representative_messages or [], first_seen_at=s.first_seen_at,
            last_seen_at=s.last_seen_at, state=SignalState.ACTIVE, category=s.category
        )
        mock_sig.unique_participant_count_db = s.unique_participant_count
        mock_sig.message_count_db = s.message_count
        signals_raw.append(mock_sig)
        
    classifier = get_classifier()
    for sig in signals_raw:
        res = classifier.classify_text(sig.label, stream_genre=stream_genre)
        sig.category = res.category.value

    score = calculate_pulse_score(signals_raw, total_messages=final_msgs)
    engine = get_engine_for_stream(stream_id, genre="mixed", db=db)
    dna = classify_audience_dna(engine, db, stream_id, genre="mixed")

    signals_data_list = []
    for sig in signals_raw:
        signals_data_list.append({
            "label": sig.label,
            "category": sig.category,
            "unique_participant_count": getattr(sig, "unique_participant_count_db", sig.unique_support),
            "message_count": getattr(sig, "message_count_db", sig.message_count),
            "representative_messages": sig.representative_messages or []
        })

    data = {
        "stream": {
            "title": stream.title, 
            "total_messages": final_msgs, 
            "total_signals": len(signals_data_list), 
            "unique_participants": final_users
        },
        "score": {"score": score.score, "label": score.label, "color": score.color, "components": score.components},
        "audience": {"dna": dna},
        "signals": signals_data_list,
        "timeline": generate_timeline(db, stream_id, genre=stream_genre),
    }

    html = generate_html_report(data)
    output_bytes = html_to_pdf_bytes(html)
    
    is_pdf = output_bytes[:4] == b'%PDF'
    
    if is_pdf:
        return Response(content=output_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=pulse_report_{stream_id[:8]}.pdf"})
    else:
        return Response(content=output_bytes, media_type="text/html", headers={"Content-Disposition": f"attachment; filename=pulse_report_{stream_id[:8]}.html"})


class InjectMessageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    participant_name: str = Field(default="judge_demo")
    participant_id: Optional[str] = None


@router.post("/{stream_id}/inject")
def inject_message(
    stream_id: str, 
    body: InjectMessageRequest, 
    genre: str = Query("mixed", description="Current UI context genre"),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    stream = _get_user_stream(db, current_user, stream_id)
    current_genre = (genre or "mixed").lower()
    pid = body.participant_id or f"inject_{body.participant_name}_{int(datetime.utcnow().timestamp() * 1000)}"
    now = datetime.utcnow()

    norm = NormalizedMessage(
        platform="inject", stream_id=stream_id, message_id=f"inj_{pid}_{int(now.timestamp() * 1000)}",
        participant_id=pid, text=body.text.strip(), timestamp=now, participant_name=body.participant_name,
    )

    from app.services.ingestion_service import AVAILABLE_GENRES, get_engine_for_stream

    # 🔥 INGEST SIMULTANEOUSLY INTO ALL 4 PARALLEL CONTEXT BRAINS!
    primary_result = None
    for g in AVAILABLE_GENRES:
        b_engine = get_engine_for_stream(stream_id, genre=g, db=db)
        res = b_engine.ingest(norm)
        if g == current_genre:
            primary_result = res

    if not primary_result:
        primary_result = get_engine_for_stream(stream_id, genre="mixed", db=db).ingest(norm)

    # Persist message in DB
    msg_row = MessageModel(
        stream_id=stream_id,
        platform="inject",
        platform_message_id=norm.message_id,
        participant_id=norm.participant_id,
        participant_name=norm.participant_name,
        text_original=norm.text,
        text_cleaned=None,
        is_valid=primary_result.outcome != "ignored_empty",
        invalid_reason=None if primary_result.outcome != "ignored_empty" else "preprocess_dropped",
        signal_id=primary_result.signal.id if primary_result.signal else None,
        similarity_score=primary_result.similarity_score,
        timestamp=norm.timestamp,
    )
    db.add(msg_row)

    try:
        stream.total_messages = (stream.total_messages or 0) + 1
        if primary_result.outcome == "created_new_signal":
            stream.total_signals = (stream.total_signals or 0) + 1
        db.commit()
    except Exception:
        db.rollback()

    target_engine = get_engine_for_stream(stream_id, genre=current_genre, db=db)
    ranked = target_engine.get_ranked_signals(include_noise=True)
    top = None
    if primary_result.signal:
        for sig, ranking in ranked:
            if sig.id == primary_result.signal.id:
                top = {
                    "id": sig.id, "label": sig.label, "category": sig.category,
                    "category_confidence": getattr(sig, "category_confidence", 0.9),
                    "state": sig.state.value if hasattr(sig.state, "value") else str(sig.state),
                    "unique_participant_count": sig.unique_support, "message_count": sig.message_count,
                    "priority": ranking.priority_score, "reasons": ranking.reasons,
                    "representative_messages": sig.representative_messages[:3],
                }
                break

    return {
        "ok": True, 
        "outcome": primary_result.outcome.value, 
        "similarity_score": primary_result.similarity_score, 
        "text": body.text.strip(), 
        "signal": top, 
        "signal_count": len(ranked),
    }