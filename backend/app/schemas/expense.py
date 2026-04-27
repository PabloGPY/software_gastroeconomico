import uuid
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    category: str
    description: str
    amount: Decimal
    expense_date: date


class ExpenseUpdate(BaseModel):
    category: str | None = None
    description: str | None = None
    amount: Decimal | None = None
    expense_date: date | None = None


class ExpenseOut(BaseModel):
    id: uuid.UUID
    category: str
    description: str
    amount: Decimal
    expense_date: date
    created_at: datetime

    model_config = {"from_attributes": True}
