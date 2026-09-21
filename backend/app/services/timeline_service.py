# backend/app/services/timeline_service.py

"""
PULSE — Timeline Service (With Dynamic YouTube Ground-Truth Alignments)
"""

import re
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from app.models.message import Message as MessageModel
from app.models.signal import Signal as SignalModel
from app.services.ingestion_service import get_engine_for_stream
from app.config import settings

BIN_SIZE_MINUTES = 5

# Context-Aware Categories mapping for dynamic slider
GENRE_CATEGORIES = {
    "coding": ["technical_issue", "doubt", "content_request", "feedback", "engagement", "off_topic", "unclassified"],
    "gaming": ["technical_issue", "doubt", "content_request", "feedback", "engagement", "off_topic", "unclassified"],
    "mixed": ["technical_issue", "doubt", "content_request", "feedback", "engagement", "off_topic", "unclassified"]
}

def fetch_youtube_duration_seconds_sync(video_id: str) -> Optional[int]:
    """Fetch the exact, true playback duration of a video/stream from YouTube API (Strict Sync)"""
    try:
        api_key = settings.youtube_api_key
        if not api_key:
            return None
            
        url = "https://www.googleapis.com/youtube/v3/videos"
        with httpx.Client() as client:
            res = client.get(url, params={
                "part": "contentDetails",
                "id": video_id,
                "key": api_key
            })
            if res.status_code == 200:
                items = res.json().get("items", [])
                if items:
                    duration_str = items[0]["contentDetails"].get("duration", "PT0M")
                    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_str)
                    if match:
                        h = int(match.group(1) or 0)
                        m = int(match.group(2) or 0)
                        s = int(match.group(3) or 0)
                        return h * 3600 + m * 60 + s
    except Exception as e:
        print(f"[TIMELINE DURATION WARN] {e}")
    return None


def generate_timeline(db: Session, stream_id: str, genre: str = "mixed") -> List[Dict[str, Any]]:
    from app.models.stream import Stream as StreamModel
    stream = db.query(StreamModel).filter(StreamModel.id == stream_id).first()
    if not stream:
        return []

    # Filter allowed categories dynamically based on selected context genre (no "general" fallback!)
    target_genre = (genre or "mixed").lower()
    allowed_cats = GENRE_CATEGORIES.get(target_genre, GENRE_CATEGORIES["mixed"])

    rows = (
        db.query(MessageModel.timestamp, SignalModel.category)
        .join(SignalModel, MessageModel.signal_id == SignalModel.id, isouter=True)
        .filter(MessageModel.stream_id == stream_id)
        .filter(SignalModel.category.in_(allowed_cats))
        .order_by(MessageModel.timestamp.asc())
        .all()
    )

    if not rows:
        return []

    duration_seconds = fetch_youtube_duration_seconds_sync(stream.external_id)
    
    if not duration_seconds:
        if stream.started_at and stream.ended_at:
            duration_seconds = (stream.ended_at - stream.started_at).total_seconds()
            
    if not duration_seconds or duration_seconds <= 10:
        start_time = rows[0].timestamp
        end_time = rows[-1].timestamp
        duration_seconds = (end_time - start_time).total_seconds()

    if duration_seconds <= 10:
        duration_seconds = 180.0  # 3 minutes default

    NUM_BINS = 8
    bin_width_seconds = duration_seconds / NUM_BINS
    bins_list = []

    # Generate the 8 relative bin labels (strictly formatted as relative playback time)
    for i in range(NUM_BINS):
        if i == NUM_BINS - 1:
            bin_sec = int(duration_seconds)
        else:
            bin_sec = int(i * bin_width_seconds)
            
        if bin_sec >= 3600:
            time_label = f"{bin_sec // 3600:02d}:{(bin_sec % 3600) // 60:02d}:{bin_sec % 60:02d}"
        else:
            time_label = f"{bin_sec // 60:02d}:{bin_sec % 60:02d}"
        
        bins_list.append({
            "time": time_label, "technical_issue": 0, "doubt": 0,
            "content_request": 0, "feedback": 0, "engagement": 0,
            "off_topic": 0, "total": 0,
        })

    # Map messages
    total_messages = len(rows)
    start_time = rows[0].timestamp
    end_time = rows[-1].timestamp
    rows_duration = (end_time - start_time).total_seconds() or 1.0

    for idx, row in enumerate(rows):
        category = row.category or "off_topic"
        source_str = str(stream.source).lower()
        
        if "video" in source_str:
            position = idx / max(1, total_messages - 1)
            msg_offset = position * duration_seconds
        else:
            msg_offset_relative = (row.timestamp - start_time).total_seconds()
            position = msg_offset_relative / rows_duration
            msg_offset = position * duration_seconds

        bin_idx = min(NUM_BINS - 1, max(0, int(msg_offset / bin_width_seconds)))
        
        if category in bins_list[bin_idx]:
            bins_list[bin_idx][category] += 1
        bins_list[bin_idx]["total"] += 1
        
    return bins_list