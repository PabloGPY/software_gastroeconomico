import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from typing import Literal


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int
    notes: str | None = None


class OrderCreate(BaseModel):
    table_id: int
    notes: str | None = None
    items: list[OrderItemCreate]


class OrderItemStatusUpdate(BaseModel):
    status: Literal["pending", "preparing", "ready", "delivered", "cancelled"]


class OrderItemOut(BaseModel):
    id: uuid.UUID
    menu_item_id: int
    menu_item_name: str | None = None
    quantity: int
    unit_price: Decimal
    notes: str | None
    status: str
    sent_at: datetime | None
    ready_at: datetime | None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_name(cls, item) -> "OrderItemOut":
        name = item.menu_item.name if item.menu_item else None
        return cls(
            id=item.id,
            menu_item_id=item.menu_item_id,
            menu_item_name=name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            notes=item.notes,
            status=item.status,
            sent_at=item.sent_at,
            ready_at=item.ready_at,
        )


class OrderOut(BaseModel):
    id: uuid.UUID
    table_id: int
    table_number: int | None = None
    waiter_id: uuid.UUID | None
    status: str
    notes: str | None
    created_at: datetime
    closed_at: datetime | None
    items: list[OrderItemOut] = []

    model_config = {"from_attributes": True}
