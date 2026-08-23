"""
PULSE — Streams API (Full: Score, DNA, Timeline, PDF Export, Noise-Inclusive Inject)
"""

from datetime import datetime
from typing import Optional

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

import numpy as np

router = APIRouter()

@router.post("/start", response_model=StreamResponse)
async def start_stream(body: StreamStartRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Stream).filter(Stream.user_id == current_user.id, Stream.external_id == body.external_id).first()
    if existing and existing.status == StreamStatus.LIVE:
        return existing

    source_enum = StreamSource.YOUTUBE_LIVE if body.source == "youtube_live" else StreamSource.YOUTUBE_VIDEO
    stream = Stream(
        user_id=current_user.id, source=source_enum, external_id=body.external_id,
        title=body.title, status=StreamStatus.LIVE, started_at=datetime.utcnow(),
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
def get_stream(stream_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_user_stream(db, current_user, stream_id)


@router.post("/{stream_id}/end")
def end_stream(stream_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stream = _get_user_stream(db, current_user, stream_id)
    stream.status = StreamStatus.ENDED
    stream.ended_at = datetime.utcnow()
    
    # Auto-calculate and update unique participants on session end
    unique_count = db.query(MessageModel.participant_id).filter(MessageModel.stream_id == stream_id).distinct().count()
    stream.unique_participants = unique_count
    
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
            
            # Auto-calculate unique participants on background auto-end
            unique_count = db.query(MessageModel.participant_id).filter(MessageModel.stream_id == stream_id).distinct().count()
            stream.unique_participants = unique_count
            
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
    stream_id: str, category: Optional[str] = Query(None), include_noise: bool = Query(False),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    stream = _get_user_stream(db, current_user, stream_id)
    
    # DB Fallback if Stream has Ended
    if stream.status in [StreamStatus.ENDED, StreamStatus.ARCHIVED]:
        db_signals = db.query(SignalModel).filter(SignalModel.stream_id == stream_id).all()
        if category:
            db_signals = [s for s in db_signals if s.category == category]
        return [
            {
                "id": s.id, "label": s.label, "category": s.category,
                "category_confidence": s.category_confidence, "state": s.state,
                "unique_participant_count": s.unique_participant_count, "message_count": s.message_count,
                "momentum": s.momentum, "priority": s.priority,
                "reasons": ["Loaded from database autopsy"], "representative_messages": s.representative_messages,
                "first_seen_at": s.first_seen_at.isoformat(), "last_seen_at": s.last_seen_at.isoformat(),
            }
            for s in db_signals
        ]

    engine = get_engine_for_stream(stream_id)
    ranked = engine.get_ranked_signals(include_noise=include_noise, category=category)

    return [
        {
            "id": sig.id, "label": sig.label, "category": sig.category,
            "category_confidence": sig.category_confidence, "state": sig.state.value,
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


# ============================================================
# ANALYTICS: Score, DNA, Timeline
# ============================================================

@router.get("/{stream_id}/score")
def get_pulse_score(stream_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stream = _get_user_stream(db, current_user, stream_id)
    
    if stream.status in [StreamStatus.ENDED, StreamStatus.ARCHIVED]:
        db_signals = db.query(SignalModel).filter(SignalModel.stream_id == stream_id).all()
        signals_raw = []
        for s in db_signals:
            signals_raw.append(DomainSignal(
                id=s.id, stream_id=stream_id, label=s.label, centroid=np.zeros(768),
                message_ids=s.representative_messages, unique_participant_ids=set(),
                representative_messages=s.representative_messages, state=s.state, category=s.category
            ))
    else:
        engine = get_engine_for_stream(stream_id)
        signals_raw = engine.get_all_signals(include_noise=False)
        
    result = calculate_pulse_score(signals_raw, total_messages=stream.total_messages)
    return {
        "score": result.score, "state": result.state, "label": result.label,
        "color": result.color, "components": result.components, "reasons": result.reasons,
    }


@router.get("/{stream_id}/audience")
def get_audience_dna(stream_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stream = _get_user_stream(db, current_user, stream_id)
    engine = get_engine_for_stream(stream_id)
    dna = classify_audience_dna(engine, db, stream_id)
    moments = get_stream_moments(engine)
    return {"dna": dna, "moments": moments}


@router.get("/{stream_id}/timeline")
def get_timeline(stream_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_user_stream(db, current_user, stream_id)
    return {"timeline": generate_timeline(db, stream_id)}


@router.get("/{stream_id}/full-analysis")
def get_full_analysis(stream_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stream = _get_user_stream(db, current_user, stream_id)
    engine = get_engine_for_stream(stream_id)
    db_signals = db.query(SignalModel).filter(SignalModel.stream_id == stream_id).all()
    
    unique_participants_count = stream.unique_participants
    if unique_participants_count == 0:
        unique_participants_count = db.query(MessageModel.participant_id).filter(MessageModel.stream_id == stream_id).distinct().count()
        stream.unique_participants = unique_participants_count
        db.commit()
    
    if stream.status == StreamStatus.LIVE and len(engine.get_all_signals()) > 0:
        signals_raw = engine.get_all_signals(include_noise=False)
        ranked = engine.get_ranked_signals()
        dna = classify_audience_dna(engine, db, stream_id)
        moments = get_stream_moments(engine)
    else:
        signals_raw = []
        for s in db_signals:
            mock_sig = DomainSignal(
                id=s.id, stream_id=stream_id, label=s.label, centroid=np.zeros(768),
                message_ids=s.representative_messages or [], unique_participant_ids=set(),
                representative_messages=s.representative_messages or [], first_seen_at=s.first_seen_at,
                last_seen_at=s.last_seen_at, state=SignalState.ACTIVE, category=s.category
            )
            mock_sig.priority = s.priority
            mock_sig.urgency = s.urgency
            mock_sig.momentum = s.momentum
            # 🔥 Save DB stats inside mocked objects for full compatibility
            mock_sig.unique_participant_count_db = s.unique_participant_count
            mock_sig.message_count_db = s.message_count
            signals_raw.append(mock_sig)
            
        from app.pulse_engine.ranking import RankingResult
        ranked = []
        for s in signals_raw:
            rr = RankingResult(priority_score=s.priority, support_component=0.0, momentum_component=0.0, recency_component=0.0, urgency_component=s.urgency, reasons=["Archived"])
            ranked.append((s, rr))
        ranked.sort(key=lambda x: -x[1].priority_score)
        
        dna = classify_audience_dna(engine, db, stream_id)
        moments = get_stream_moments(engine)

    from app.pulse_engine.pulse_score import calculate_pulse_score
    score = calculate_pulse_score(signals_raw, total_messages=stream.total_messages)
    timeline = generate_timeline(db, stream_id)

    signals_list = [
        {
            "id": sig.id, "label": sig.label, "category": sig.category,
            "state": sig.state.value if hasattr(sig.state, "value") else str(sig.state), "unique_participant_count": getattr(sig, "unique_participant_count_db", len(sig.unique_participant_ids) if sig.unique_participant_ids else sig.message_count),
            "message_count": getattr(sig, "message_count_db", sig.message_count), "momentum": sig.momentum,
            "priority": ranking.priority_score, "reasons": ranking.reasons,
            "representative_messages": sig.representative_messages,
        } for sig, ranking in ranked
    ]

    return {
        "stream": {
            "id": stream.id, "title": stream.title, "status": stream.status.value if hasattr(stream.status, 'value') else str(stream.status),
            "source": stream.source.value if hasattr(stream.source, 'value') else str(stream.source),
            "external_id": stream.external_id,
            "total_messages": stream.total_messages,
            "total_signals": stream.total_signals,
            "unique_participants": unique_participants_count,
        },
        "score": {
            "score": score.score, "state": score.state, "label": score.label,
            "color": score.color, "components": score.components, "reasons": score.reasons,
        },
        "audience": {"dna": dna, "moments": moments},
        "timeline": timeline,
        "signals": signals_list,
    }


@router.get("/{stream_id}/export")
def export_report(stream_id: str, token: str = Query(None), db: Session = Depends(get_db)):
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404)
        
    db_signals = db.query(SignalModel).filter(SignalModel.stream_id == stream_id).all()
    engine = get_engine_for_stream(stream_id)
    
    # Auto-calculate unique participants for download fallback
    unique_participants_count = stream.unique_participants
    if unique_participants_count == 0:
        unique_participants_count = db.query(MessageModel.participant_id).filter(MessageModel.stream_id == stream_id).distinct().count()
        stream.unique_participants = unique_participants_count
        db.commit()
    
    # Seamless Export DB Fallback to perfectly mirror Autopsy on Download
    if stream.status in [StreamStatus.ENDED, StreamStatus.ARCHIVED] or len(db_signals) > 0:
        signals_raw = []
        for s in db_signals:
            mock_sig = DomainSignal(
                id=s.id, stream_id=stream_id, label=s.label, centroid=np.zeros(768),
                message_ids=s.representative_messages or [], unique_participant_ids=set(),
                representative_messages=s.representative_messages or [], first_seen_at=s.first_seen_at,
                last_seen_at=s.last_seen_at, state=SignalState.ACTIVE, category=s.category
            )
            mock_sig.priority = s.priority
            mock_sig.urgency = s.urgency
            mock_sig.momentum = s.momentum
            # 🔥 FIX: Save actual unique participant and msg counts from DB into mock object
            mock_sig.unique_participant_count_db = s.unique_participant_count
            mock_sig.message_count_db = s.message_count
            signals_raw.append(mock_sig)
            
        from app.pulse_engine.ranking import RankingResult
        ranked = []
        for s in signals_raw:
            rr = RankingResult(priority_score=s.priority, support_component=0.0, momentum_component=0.0, recency_component=0.0, urgency_component=s.urgency, reasons=["Archived"])
            ranked.append((s, rr))
        ranked.sort(key=lambda x: -x[1].priority_score)
        
        dna = classify_audience_dna(engine, db, stream_id)
    else:
        signals_raw = engine.get_all_signals(include_noise=False)
        ranked = engine.get_ranked_signals()
        dna = classify_audience_dna(engine, db, stream_id)
    
    from app.pulse_engine.pulse_score import calculate_pulse_score
    score = calculate_pulse_score(signals_raw, total_messages=stream.total_messages)

    # 🔥 FIX: Pass all required data (reps, message counts, unique db counts) into export dict!
    signals_data_list = []
    for sig, _ in ranked:
        signals_data_list.append({
            "label": sig.label,
            "category": sig.category,
            "unique_participant_count": getattr(sig, "unique_participant_count_db", len(sig.unique_participant_ids) if hasattr(sig, "unique_participant_ids") and sig.unique_participant_ids else sig.unique_support),
            "message_count": getattr(sig, "message_count_db", sig.message_count),
            "representative_messages": sig.representative_messages or []
        })

    data = {
        "stream": {
            "title": stream.title, 
            "total_messages": stream.total_messages, 
            "total_signals": stream.total_signals, 
            "unique_participants": unique_participants_count
        },
        "score": {"score": score.score, "label": score.label, "color": score.color, "components": score.components},
        "audience": {"dna": dna},
        "signals": signals_data_list,
        "timeline": generate_timeline(db, stream_id),
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
def inject_message(stream_id: str, body: InjectMessageRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stream = _get_user_stream(db, current_user, stream_id)
    engine = get_engine_for_stream(stream_id)

    pid = body.participant_id or f"inject_{body.participant_name}_{int(datetime.utcnow().timestamp() * 1000)}"
    now = datetime.utcnow()

    norm = NormalizedMessage(
        platform="inject", stream_id=stream_id, message_id=f"inj_{pid}_{int(now.timestamp() * 1000)}",
        participant_id=pid, text=body.text.strip(), timestamp=now, participant_name=body.participant_name,
    )

    result = engine.ingest(norm)

    try:
        stream.total_messages = (stream.total_messages or 0) + 1
        if result.outcome == "created_new_signal":
            stream.total_signals = (stream.total_signals or 0) + 1
        db.commit()
    except Exception:
        db.rollback()

    ranked = engine.get_ranked_signals(include_noise=True)
    top = None
    if result.signal:
        for sig, ranking in ranked:
            if sig.id == result.signal.id:
                top = {
                    "id": sig.id, "label": sig.label, "category": sig.category,
                    "category_confidence": sig.category_confidence, "state": sig.state.value if hasattr(sig.state, "value") else str(sig.state),
                    "unique_participant_count": sig.unique_support, "message_count": sig.message_count,
                    "priority": ranking.priority_score, "reasons": ranking.reasons,
                    "representative_messages": sig.representative_messages[:3],
                }
                break

    return {
        "ok": True, "outcome": result.outcome.value, "similarity_score": result.similarity_score,
        "text": body.text.strip(), "signal": top, "signal_count": len(ranked),
    }


def _get_user_stream(db: Session, user: User, stream_id: str) -> Stream:
    stream = db.query(Stream).filter(Stream.id == stream_id, Stream.user_id == user.id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    return stream