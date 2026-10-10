import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator
from typing import Literal


class OrderItemCreate(BaseModel):
    menu_item_id: int
    # Segunda mitad para pizzas "mitad y mitad"
    half_menu_item_id: int | None = None
    quantity: int = Field(gt=0)
    notes: str | None = None


class OrderCreate(BaseModel):
    order_type: Literal["dine_in", "takeaway", "delivery"] = "dine_in"
    table_id: int | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    delivery_address: str | None = None
    delivery_fee: Decimal = Field(default=Decimal("0"), ge=0)
    notes: str | None = None
    items: list[OrderItemCreate]

    @model_validator(mode="after")
    def check_type_fields(self):
        if self.order_type == "dine_in":
            if self.table_id is None:
                raise ValueError("Los pedidos en salón requieren una mesa")
            self.delivery_fee = Decimal("0")
        else:
            self.table_id = None
            if not (self.customer_name or "").strip():
                raise ValueError("Ingresá el nombre del cliente")
        if self.order_type == "delivery" and not (self.delivery_address or "").strip():
            raise ValueError("Los pedidos de delivery requieren una dirección")
        if self.order_type == "takeaway":
            self.delivery_fee = Decimal("0")
        return self


class OrderItemStatusUpdate(BaseModel):
    status: Literal["pending", "preparing", "ready", "delivered", "cancelled"]


class OrderItemOut(BaseModel):
    id: uuid.UUID
    menu_item_id: int
    half_menu_item_id: int | None = None
    menu_item_name: str | None = None
    quantity: int
    unit_price: Decimal
    notes: str | None
    status: str
    sent_at: datetime | None
    ready_at: datetime | None

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: uuid.UUID
    order_type: str
    table_id: int | None
    table_number: int | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    delivery_address: str | None = None
    delivery_fee: Decimal
    waiter_id: uuid.UUID | None
    status: str
    notes: str | None
    created_at: datetime
    closed_at: datetime | None
    items: list[OrderItemOut] = []

    model_config = {"from_attributes": True}
