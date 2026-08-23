"""PULSE — Signal Membership (unique user tracking)"""

from datetime import datetime
import uuid

from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class SignalMembership(Base):
    __tablename__ = "signal_memberships"
    __table_args__ = (
        UniqueConstraint("signal_id", "participant_id", name="uq_signal_participant"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=generate_uuid)
    signal_id: Mapped[str] = mapped_column(String, ForeignKey("signals.id"), nullable=False, index=True)
    participant_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    joined_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    signal: Mapped["Signal"] = relationship("Signal", back_populates="memberships")

    def __repr__(self) -> str:
        return f"<Membership {self.participant_id} → signal={self.signal_id}>"