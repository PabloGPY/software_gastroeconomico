from pydantic import BaseModel
from typing import Literal


class TableCreate(BaseModel):
    number: int
    capacity: int
    shape: Literal["square", "round", "rectangle"] = "square"
    pos_x: float = 10.0
    pos_y: float = 10.0


class TableUpdate(BaseModel):
    number: int | None = None
    capacity: int | None = None
    shape: Literal["square", "round", "rectangle"] | None = None
    pos_x: float | None = None
    pos_y: float | None = None
    is_active: bool | None = None


class TableStatusUpdate(BaseModel):
    status: Literal["available", "occupied", "reserved", "cleaning"]


class TableOut(BaseModel):
    id: int
    number: int
    capacity: int
    shape: str
    pos_x: float
    pos_y: float
    status: str
    is_active: bool

    model_config = {"from_attributes": True}
