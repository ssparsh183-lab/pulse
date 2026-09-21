# backend/app/models/stream.py

from datetime import datetime
from typing import Optional , TYPE_CHECKING
from enum import Enum as PyEnum
import uuid

from sqlalchemy import String, DateTime, ForeignKey, Enum, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.message import Message  # <--- Added Message for type safety!
    from app.models.signal import Signal    # <--- Added Signal for type safety!


def generate_uuid() -> str:
    return str(uuid.uuid4())


class StreamStatus(str, PyEnum):
    PENDING = "pending"
    LIVE = "live"
    ENDED = "ended"
    ARCHIVED = "archived"
    FAILED = "failed"


class StreamSource(str, PyEnum):
    YOUTUBE_LIVE = "youtube_live"
    YOUTUBE_VIDEO = "youtube_video"
    DEMO = "demo"


class Stream(Base):
    __tablename__ = "streams"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)

    source: Mapped[StreamSource] = mapped_column(Enum(StreamSource), nullable=False)
    external_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    status: Mapped[StreamStatus] = mapped_column(
        Enum(StreamStatus), default=StreamStatus.PENDING, nullable=False, index=True
    )

    total_messages: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_signals: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_participants: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # 🔥 upgraded for SIH Context-Aware engine
    genre: Mapped[Optional[str]] = mapped_column(String(100), default="general")

    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="streams")
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="stream", cascade="all, delete-orphan"
    )
    signals: Mapped[list["Signal"]] = relationship(
        "Signal", back_populates="stream", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Stream {self.title or self.external_id} ({self.status.value})>"