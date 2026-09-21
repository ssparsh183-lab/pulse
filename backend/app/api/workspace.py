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

    channels = []
    try:
        channels = await yt.get_my_channels()
    except Exception as e:
        print(f"[WORKSPACE WARN] Channels fetch failed: {e}")

    # Default to the first channel for initial workspace state if available
    primary_channel = channels[0] if channels else None
    uploads_playlist_id = primary_channel.get("uploads_playlist_id") if primary_channel else None

    # Parallel YouTube calls for active/upcoming/past videos of primary channel
    results = await asyncio.gather(
        yt.get_active_live_streams(),
        yt.get_upcoming_live_streams(),
        yt.get_past_videos(uploads_playlist_id=uploads_playlist_id, max_results=20),
        return_exceptions=True,
    )

    active_streams = results[0] if not isinstance(results[0], Exception) else []
    upcoming_streams = results[1] if not isinstance(results[1], Exception) else []
    all_content = results[2] if not isinstance(results[2], Exception) else []

    # Auto-sync workspace state
    db_live_streams = db.query(StreamModel).filter(
        StreamModel.user_id == current_user.id,
        StreamModel.status == StreamStatus.LIVE,
        StreamModel.source == StreamSource.YOUTUBE_LIVE
    ).all()

    active_yt_ids = {s["id"] for s in active_streams}
    for dbs in db_live_streams:
        if dbs.external_id not in active_yt_ids:
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
        "channel": primary_channel,     # Primary legacy support
        "channels": channels,           # 🔥 MULTI-CHANNEL ARRAY SENT TO FRONTEND!
        "live_now": active_streams,
        "upcoming": upcoming_streams,
        "past_videos": pure_videos,
        "past_live_vods": past_live_vods,
    }
