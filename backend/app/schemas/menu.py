from decimal import Decimal
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    sort_order: int = 0
    allows_halves: bool = False


class CategoryUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    allows_halves: bool | None = None


class MenuItemCreate(BaseModel):
    category_id: int
    name: str
    description: str | None = None
    price: Decimal
    cost: Decimal | None = None
    image_url: str | None = None
    sort_order: int = 0


class MenuItemUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = None
    description: str | None = None
    price: Decimal | None = None
    cost: Decimal | None = None
    image_url: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class MenuItemAvailability(BaseModel):
    is_available: bool


class MenuItemOut(BaseModel):
    id: int
    category_id: int
    name: str
    description: str | None
    price: Decimal
    cost: Decimal | None
    image_url: str | None
    is_available: bool
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}


class CategoryOut(BaseModel):
    id: int
    name: str
    sort_order: int
    is_active: bool
    allows_halves: bool
    items: list[MenuItemOut] = []

    model_config = {"from_attributes": True}
