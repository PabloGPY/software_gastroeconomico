import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Text, ForeignKey, Enum as SAEnum, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False, unique=True)
    cashier_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"))
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    tip_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"))
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(
        SAEnum("cash", "card", "transfer", "mixed", name="payment_method"),
        nullable=False
    )
    cash_received: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    change_given: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    receipt_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    order: Mapped["Order"] = relationship(back_populates="payment")
    cashier: Mapped["User"] = relationship(foreign_keys=[cashier_id])
    splits: Mapped[list["PaymentSplit"]] = relationship(back_populates="payment", cascade="all, delete-orphan")


class PaymentSplit(Base):
    __tablename__ = "payment_splits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id"), nullable=False)
    method: Mapped[str] = mapped_column(
        SAEnum("cash", "card", "transfer", name="split_method"),
        nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    payment: Mapped["Payment"] = relationship(back_populates="splits")
