"""
PULSE — Timeline Service (With Accurate Truncated Bins)
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session

from app.models.message import Message as MessageModel
from app.models.signal import Signal as SignalModel
from app.services.ingestion_service import get_engine_for_stream

BIN_SIZE_MINUTES = 5


def generate_timeline(db: Session, stream_id: str) -> List[Dict[str, Any]]:
    rows = (
        db.query(MessageModel.timestamp, SignalModel.category)
        .join(SignalModel, MessageModel.signal_id == SignalModel.id, isouter=True)
        .filter(MessageModel.stream_id == stream_id)
        .order_by(MessageModel.timestamp.asc())
        .all()
    )

    # Fallback to In-Memory Engine Signals if DB messages are empty (Demo mode)
    if not rows:
        engine = get_engine_for_stream(stream_id)
        signals = engine.get_all_signals(include_noise=True)
        if not signals:
            return []

        # Synthesize timeline bins from engine signal join times
        bins: Dict[str, Dict[str, Any]] = {}
        for s in signals:
            cat = s.category or "off_topic"
            for join_time in s.participant_join_times.values():
                minutes = (join_time.minute // BIN_SIZE_MINUTES) * BIN_SIZE_MINUTES
                bin_time = join_time.replace(minute=minutes, second=0, microsecond=0)
                bin_key = bin_time.strftime("%H:%M")

                if bin_key not in bins:
                    bins[bin_key] = {
                        "time": bin_key, "technical_issue": 0, "doubt": 0,
                        "content_request": 0, "feedback": 0, "engagement": 0,
                        "off_topic": 0, "total": 0,
                    }
                
                if cat in bins[bin_key]:
                    bins[bin_key][cat] += 1
                bins[bin_key]["total"] += 1

        return sorted(bins.values(), key=lambda x: x["time"])

    start_time = rows[0].timestamp
    end_time = rows[-1].timestamp

    bins: Dict[str, Dict[str, Any]] = {}
    
    # 🔥 FIX: Truncate start_time's minute to a multiple of 5 to align with message bin_keys!
    start_min = (start_time.minute // BIN_SIZE_MINUTES) * BIN_SIZE_MINUTES
    start_time_truncated = start_time.replace(minute=start_min, second=0, microsecond=0)
    current = start_time_truncated

    while current <= end_time + timedelta(minutes=BIN_SIZE_MINUTES):
        bin_key = current.strftime("%H:%M")
        bins[bin_key] = {
            "time": bin_key, "technical_issue": 0, "doubt": 0,
            "content_request": 0, "feedback": 0, "engagement": 0,
            "off_topic": 0, "total": 0,
        }
        current += timedelta(minutes=BIN_SIZE_MINUTES)

    for row in rows:
        ts = row.timestamp
        category = row.category or "off_topic"
        minutes = (ts.minute // BIN_SIZE_MINUTES) * BIN_SIZE_MINUTES
        bin_time = ts.replace(minute=minutes, second=0, microsecond=0)
        bin_key = bin_time.strftime("%H:%M")

        if bin_key in bins:
            if category in bins[bin_key]:
                bins[bin_key][category] += 1
            bins[bin_key]["total"] += 1

    return sorted(bins.values(), key=lambda x: x["time"])