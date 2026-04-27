import uuid
from pydantic import BaseModel, EmailStr
from typing import Literal


class UserCreate(BaseModel):
    username: str
    full_name: str
    email: str | None = None
    password: str
    role: Literal["admin", "waiter", "cashier", "kitchen"]


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: Literal["admin", "waiter", "cashier", "kitchen"] | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    email: str | None
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
