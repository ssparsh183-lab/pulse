"""PULSE — Signal Model (Persisted)"""

from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import String, DateTime, ForeignKey, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    stream_id: Mapped[str] = mapped_column(String, ForeignKey("streams.id"), nullable=False, index=True)

    label: Mapped[str] = mapped_column(String(500), nullable=False)
    representative_messages: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    category_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    state: Mapped[str] = mapped_column(String(50), default="noise", nullable=False, index=True)

    unique_participant_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    momentum: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    support_current_window: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    support_previous_window: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    priority: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    urgency: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    centroid: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    first_seen_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    stream: Mapped["Stream"] = relationship("Stream", back_populates="signals")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="signal")
    memberships: Mapped[list["SignalMembership"]] = relationship(
        "SignalMembership", back_populates="signal", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Signal '{self.label}' users={self.unique_participant_count} state={self.state}>"