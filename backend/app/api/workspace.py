"""
PULSE — Workspace API (Optimized Parallel Fetch with Auto-Sync)
"""

import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.youtube_service import YouTubeService
from app.models.stream import Stream as StreamModel, StreamStatus, StreamSource

router = APIRouter()


@router.get("/")
async def get_workspace(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    yt = YouTubeService(db, current_user)

    channel = None
    try:
        channel = await yt.get_my_channel()
    except Exception as e:
        print(f"[WORKSPACE WARN] Channel fetch failed: {e}")

    uploads_playlist_id = channel.get("uploads_playlist_id") if channel else None

    # Parallel YouTube calls
    results = await asyncio.gather(
        yt.get_active_live_streams(),
        yt.get_upcoming_live_streams(),
        yt.get_past_videos(uploads_playlist_id=uploads_playlist_id, max_results=20),
        return_exceptions=True,
    )

    active_streams = results[0] if not isinstance(results[0], Exception) else []
    upcoming_streams = results[1] if not isinstance(results[1], Exception) else []
    all_content = results[2] if not isinstance(results[2], Exception) else []

    # 🔥 AUTO-SYNC WORKSPACE STATE:
    # If we have streams marked "live" in DB but they are no longer active on YouTube,
    # auto-archive them dynamically so their telemetry isn't lost!
    db_live_streams = db.query(StreamModel).filter(
        StreamModel.user_id == current_user.id,
        StreamModel.status == StreamStatus.LIVE,
        StreamModel.source == StreamSource.YOUTUBE_LIVE
    ).all()

    active_yt_ids = {s["id"] for s in active_streams}
    for dbs in db_live_streams:
        if dbs.external_id not in active_yt_ids:
            # Broadcast ended on YouTube! Force transition status to ended
            dbs.status = StreamStatus.ENDED
            dbs.ended_at = datetime.utcnow()
            db.commit()

    pure_videos = [v for v in all_content if not v.get("is_live_vod")]
    past_live_vods = [v for v in all_content if v.get("is_live_vod")]

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "picture_url": current_user.picture_url,
        },
        "channel": channel,
        "live_now": active_streams,
        "upcoming": upcoming_streams,
        "past_videos": pure_videos,
        "past_live_vods": past_live_vods,
    }