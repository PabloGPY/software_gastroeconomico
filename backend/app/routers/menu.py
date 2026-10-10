from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.menu import MenuCategory, MenuItem
from app.schemas.menu import (
    CategoryCreate, CategoryUpdate, CategoryOut,
    MenuItemCreate, MenuItemUpdate, MenuItemAvailability, MenuItemOut,
)
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/menu", tags=["Menu"])


async def _get_category_with_items(db: AsyncSession, category_id: int) -> MenuCategory:
    # Carga explícita de items: con sesión async no se puede hacer lazy-load al serializar
    result = await db.execute(
        select(MenuCategory).where(MenuCategory.id == category_id).options(selectinload(MenuCategory.items))
    )
    return result.scalar_one()


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MenuCategory)
        .where(MenuCategory.is_active == True)
        .options(selectinload(MenuCategory.items))
        .order_by(MenuCategory.sort_order)
    )
    return result.scalars().all()


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_role("admin"))])
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    category = MenuCategory(**data.model_dump())
    db.add(category)
    await db.commit()
    return await _get_category_with_items(db, category.id)


@router.put("/categories/{category_id}", response_model=CategoryOut,
            dependencies=[Depends(require_role("admin"))])
async def update_category(category_id: int, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuCategory).where(MenuCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(category, field, value)
    await db.commit()
    return await _get_category_with_items(db, category_id)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_role("admin"))])
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuCategory).where(MenuCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    category.is_active = False
    await db.commit()


@router.get("/items", response_model=list[MenuItemOut])
async def list_items(
    category_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(MenuItem).where(MenuItem.is_active == True).order_by(MenuItem.sort_order)
    if category_id:
        query = query.where(MenuItem.category_id == category_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/items", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_role("admin"))])
async def create_item(data: MenuItemCreate, db: AsyncSession = Depends(get_db)):
    item = MenuItem(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=MenuItemOut,
            dependencies=[Depends(require_role("admin"))])
async def update_item(item_id: int, data: MenuItemUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/items/{item_id}/availability", response_model=MenuItemOut)
async def toggle_availability(
    item_id: int,
    data: MenuItemAvailability,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "kitchen")),
):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    item.is_available = data.is_available
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_role("admin"))])
async def delete_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    item.is_active = False
    await db.commit()
