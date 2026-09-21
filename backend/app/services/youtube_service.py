"""
PULSE — YouTube Data Service (Optimized + Fallback Safe)
"""

from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.models.platform_connection import PlatformConnection
from app.models.user import User
from app.config import settings


YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class YouTubeService:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self._connection: Optional[PlatformConnection] = None

    def _get_connection(self) -> PlatformConnection:
        if self._connection is None:
            self._connection = (
                self.db.query(PlatformConnection)
                .filter(
                    PlatformConnection.user_id == self.user.id,
                    PlatformConnection.platform == "youtube",
                )
                .first()
            )
            if not self._connection:
                raise ValueError("User has no YouTube connection")
        return self._connection

    async def _get_valid_access_token(self) -> str:
        conn = self._get_connection()

        if conn.token_expires_at and conn.token_expires_at <= datetime.utcnow() + timedelta(minutes=5):
            await self._refresh_access_token(conn)

        return conn.access_token

    async def _refresh_access_token(self, conn: PlatformConnection) -> None:
        if not conn.refresh_token:
            raise ValueError("No refresh token available — user must re-login")

        data = {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "refresh_token": conn.refresh_token,
            "grant_type": "refresh_token",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(GOOGLE_TOKEN_URL, data=data)
            response.raise_for_status()
            tokens = response.json()

        conn.access_token = tokens["access_token"]
        if tokens.get("expires_in"):
            conn.token_expires_at = datetime.utcnow() + timedelta(seconds=int(tokens["expires_in"]))
        conn.last_used_at = datetime.utcnow()
        self.db.commit()

    async def _api_get(self, endpoint: str, params: dict) -> dict:
        token = await self._get_valid_access_token()
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{YOUTUBE_API_BASE}/{endpoint}",
                headers=headers,
                params=params,
            )
            response.raise_for_status()
            return response.json()

    async def get_my_channels(self) -> list[dict]:
        """Fetch ALL channels owned/managed by the authenticated Google user."""
        conn = self._get_connection()
        try:
            data = await self._api_get("channels", {
                "part": "snippet,statistics,contentDetails",
                "mine": "true",
            })

            items = data.get("items", [])
            if not items:
                return []

            channels_list = []
            for channel in items:
                snippet = channel["snippet"]
                stats = channel.get("statistics", {})
                channels_list.append({
                    "id": channel["id"],
                    "title": snippet.get("title"),
                    "description": snippet.get("description", ""),
                    "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url"),
                    "custom_url": snippet.get("customUrl"),
                    "subscriber_count": int(stats.get("subscriberCount", 0)),
                    "video_count": int(stats.get("videoCount", 0)),
                    "view_count": int(stats.get("viewCount", 0)),
                    "uploads_playlist_id": channel.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads"),
                })
            return channels_list
        except Exception as e:
            print(f"[YOUTUBE SERVICE WARN] get_my_channels failed: {e}")
            return []
        
    async def get_active_live_streams(self) -> list[dict]:
        try:
            data = await self._api_get("liveBroadcasts", {
                "part": "snippet,status,contentDetails",
                "broadcastStatus": "active",
                "broadcastType": "all",
            })

            streams = []
            for item in data.get("items", []):
                snippet = item["snippet"]
                status = item.get("status", {})
                content = item.get("contentDetails", {})

                streams.append({
                    "id": item["id"],
                    "title": snippet.get("title"),
                    "description": snippet.get("description", ""),
                    "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url"),
                    "scheduled_start": snippet.get("scheduledStartTime"),
                    "actual_start": snippet.get("actualStartTime"),
                    "life_cycle_status": status.get("lifeCycleStatus"),
                    "live_chat_id": snippet.get("liveChatId"),
                    "concurrent_viewers": content.get("concurrentViewers"),
                })

            return streams
        except Exception as e:
            print(f"[YOUTUBE SERVICE WARN] get_active_live_streams failed: {e}")
            return []

    async def get_upcoming_live_streams(self) -> list[dict]:
        try:
            data = await self._api_get("liveBroadcasts", {
                "part": "snippet,status",
                "broadcastStatus": "upcoming",
            })

            return [
                {
                    "id": item["id"],
                    "title": item["snippet"].get("title"),
                    "scheduled_start": item["snippet"].get("scheduledStartTime"),
                    "thumbnail_url": item["snippet"].get("thumbnails", {}).get("high", {}).get("url"),
                }
                for item in data.get("items", [])
            ]
        except Exception as e:
            print(f"[YOUTUBE SERVICE WARN] get_upcoming_live_streams failed: {e}")
            return []

    async def get_past_videos(self, uploads_playlist_id: Optional[str] = None, max_results: int = 20) -> list[dict]:
        try:
            if not uploads_playlist_id:
                channel = await self.get_my_channel()
                uploads_playlist_id = channel.get("uploads_playlist_id")

            if not uploads_playlist_id:
                return []

            data = await self._api_get("playlistItems", {
                "part": "snippet,contentDetails",
                "playlistId": uploads_playlist_id,
                "maxResults": max_results,
            })

            video_ids = [item["contentDetails"]["videoId"] for item in data.get("items", [])]

            if not video_ids:
                return []

            stats_data = await self._api_get("videos", {
                "part": "snippet,statistics,contentDetails,liveStreamingDetails",
                "id": ",".join(video_ids),
            })

            videos = []
            for item in stats_data.get("items", []):
                snippet = item["snippet"]
                stats = item.get("statistics", {})
                content = item.get("contentDetails", {})

                is_live_vod = bool(
                    item.get("liveStreamingDetails")
                    or snippet.get("liveBroadcastContent") in ["wasLive", "completed", "live"]
                )

                videos.append({
                    "id": item["id"],
                    "title": snippet.get("title"),
                    "description": snippet.get("description", "")[:200],
                    "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url"),
                    "published_at": snippet.get("publishedAt"),
                    "duration": content.get("duration", "PT0M"),
                    "view_count": int(stats.get("viewCount", 0)),
                    "like_count": int(stats.get("likeCount", 0)),
                    "comment_count": int(stats.get("commentCount", 0)),
                    "is_live_vod": is_live_vod,
                })

            return videos
        except Exception as e:
            print(f"[YOUTUBE SERVICE WARN] get_past_videos failed: {e}")
            return []

    async def fetch_live_chat_messages(
        self,
        live_chat_id: str,
        page_token: Optional[str] = None,
    ) -> dict:
        params = {
            "part": "id,snippet,authorDetails",
            "liveChatId": live_chat_id,
            "maxResults": 200,
        }
        if page_token:
            params["pageToken"] = page_token

        data = await self._api_get("liveChat/messages", params)

        messages = []
        for item in data.get("items", []):
            snippet = item.get("snippet", {})
            author = item.get("authorDetails", {})

            messages.append({
                "message_id": item["id"],
                "text": snippet.get("displayMessage", ""),
                "published_at": snippet.get("publishedAt"),
                "author_id": author.get("channelId"),
                "author_name": author.get("displayName"),
                "is_moderator": author.get("isChatModerator", False),
                "is_owner": author.get("isChatOwner", False),
            })

        return {
            "messages": messages,
            "next_page_token": data.get("nextPageToken"),
            "polling_interval_ms": data.get("pollingIntervalMillis", 2000),
        }

    async def fetch_video_comments(
        self,
        video_id: str,
        max_pages: int = 5,
    ) -> list[dict]:
        all_comments = []
        page_token = None
        pages_fetched = 0

        while pages_fetched < max_pages:
            params = {
                "part": "snippet",
                "videoId": video_id,
                "maxResults": 100,
                "order": "time",
            }
            if page_token:
                params["pageToken"] = page_token

            try:
                data = await self._api_get("commentThreads", params)
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 403:
                    break
                raise

            for item in data.get("items", []):
                snippet = item["snippet"]["topLevelComment"]["snippet"]

                all_comments.append({
                    "comment_id": item["id"],
                    "text": snippet.get("textOriginal", ""),
                    "author_id": snippet.get("authorChannelId", {}).get("value"),
                    "author_name": snippet.get("authorDisplayName"),
                    "published_at": snippet.get("publishedAt"),
                    "like_count": snippet.get("likeCount", 0),
                })

            page_token = data.get("nextPageToken")
            pages_fetched += 1

            if not page_token:
                break

        return all_comments