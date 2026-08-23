"""PULSE — Message Model"""

from datetime import datetime
from typing import Optional, TYPE_CHECKING
import uuid

from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.stream import Stream
    from app.models.signal import Signal


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    stream_id: Mapped[str] = mapped_column(String, ForeignKey("streams.id"), nullable=False, index=True)

    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    platform_message_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    participant_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    participant_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    text_original: Mapped[str] = mapped_column(Text, nullable=False)
    text_cleaned: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    invalid_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    signal_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("signals.id"), nullable=True, index=True
    )
    similarity_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    stream: Mapped["Stream"] = relationship("Stream", back_populates="messages")
    signal: Mapped[Optional["Signal"]] = relationship("Signal", back_populates="messages")

    def __repr__(self) -> str:
        preview = self.text_original[:40] if self.text_original else ""
        return f"<Message {self.participant_id}: {preview}>"