import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, ForeignKey, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    table_id: Mapped[int] = mapped_column(ForeignKey("tables.id"), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    party_size: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=90)
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "confirmed", "seated", "cancelled", "no_show", name="reservation_status"),
        default="pending"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    table: Mapped["Table"] = relationship(back_populates="reservations")
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])
