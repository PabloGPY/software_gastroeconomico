import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Literal


class ReservationCreate(BaseModel):
    table_id: int
    customer_name: str
    customer_phone: str | None = None
    party_size: int
    reserved_at: datetime
    duration_minutes: int = 90
    notes: str | None = None


class ReservationUpdate(BaseModel):
    customer_name: str | None = None
    customer_phone: str | None = None
    party_size: int | None = None
    reserved_at: datetime | None = None
    duration_minutes: int | None = None
    notes: str | None = None


class ReservationStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "seated", "cancelled", "no_show"]


class ReservationOut(BaseModel):
    id: uuid.UUID
    table_id: int
    customer_name: str
    customer_phone: str | None
    party_size: int
    reserved_at: datetime
    duration_minutes: int
    status: str
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
