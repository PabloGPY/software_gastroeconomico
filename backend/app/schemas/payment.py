import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from typing import Literal


class PaymentSplitCreate(BaseModel):
    method: Literal["cash", "card", "transfer"]
    amount: Decimal


class PaymentCreate(BaseModel):
    order_id: uuid.UUID
    payment_method: Literal["cash", "card", "transfer", "mixed"]
    discount_pct: Decimal = Decimal("0")
    tip_amount: Decimal = Decimal("0")
    cash_received: Decimal | None = None
    notes: str | None = None
    splits: list[PaymentSplitCreate] = []


class PaymentSplitOut(BaseModel):
    id: uuid.UUID
    method: str
    amount: Decimal

    model_config = {"from_attributes": True}


class PaymentOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    cashier_id: uuid.UUID | None
    subtotal: Decimal
    discount_pct: Decimal
    discount_amount: Decimal
    tip_amount: Decimal
    delivery_fee: Decimal
    total: Decimal
    payment_method: str
    cash_received: Decimal | None
    change_given: Decimal | None
    receipt_number: str
    paid_at: datetime
    notes: str | None
    splits: list[PaymentSplitOut] = []

    model_config = {"from_attributes": True}
