import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Integer, Text, ForeignKey, Enum as SAEnum, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_type: Mapped[str] = mapped_column(
        SAEnum("dine_in", "takeaway", "delivery", name="order_type"),
        default="dine_in", server_default="dine_in"
    )
    # Solo los pedidos en salón (dine_in) tienen mesa
    table_id: Mapped[int | None] = mapped_column(ForeignKey("tables.id"), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    delivery_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0"), server_default="0")
    waiter_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(
            "open", "sent_to_kitchen", "partially_ready", "ready",
            "delivered", "closed", "cancelled",
            name="order_status"
        ),
        default="open"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    table: Mapped["Table"] = relationship(back_populates="orders")
    waiter: Mapped["User"] = relationship(foreign_keys=[waiter_id])
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payment: Mapped["Payment"] = relationship(back_populates="order", uselist=False)

    @property
    def table_number(self) -> int | None:
        return self.table.number if self.table else None


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False)
    menu_item_id: Mapped[int] = mapped_column(ForeignKey("menu_items.id"), nullable=False)
    # Segunda mitad de una pizza "mitad y mitad"
    half_menu_item_id: Mapped[int | None] = mapped_column(ForeignKey("menu_items.id"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "preparing", "ready", "delivered", "cancelled", name="order_item_status"),
        default="pending"
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    order: Mapped["Order"] = relationship(back_populates="items")
    menu_item: Mapped["MenuItem"] = relationship(foreign_keys=[menu_item_id])
    half_menu_item: Mapped["MenuItem | None"] = relationship(foreign_keys=[half_menu_item_id])

    @property
    def menu_item_name(self) -> str | None:
        if not self.menu_item:
            return None
        if self.half_menu_item:
            return f"½ {self.menu_item.name} / ½ {self.half_menu_item.name}"
        return self.menu_item.name
