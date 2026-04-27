from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.table import Table
from app.schemas.table import TableCreate, TableUpdate, TableStatusUpdate, TableOut
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/tables", tags=["Tables"])


@router.get("", response_model=list[TableOut])
async def list_tables(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Table).where(Table.is_active == True).order_by(Table.number))
    return result.scalars().all()


@router.post("", response_model=TableOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_role("admin"))])
async def create_table(data: TableCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Table).where(Table.number == data.number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe una mesa con ese número")
    table = Table(**data.model_dump())
    db.add(table)
    await db.commit()
    await db.refresh(table)
    return table


@router.put("/{table_id}", response_model=TableOut, dependencies=[Depends(require_role("admin"))])
async def update_table(table_id: int, data: TableUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(table, field, value)
    await db.commit()
    await db.refresh(table)
    return table


@router.patch("/{table_id}/status", response_model=TableOut)
async def update_table_status(
    table_id: int,
    data: TableStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "waiter", "cashier")),
):
    result = await db.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    table.status = data.status
    await db.commit()
    await db.refresh(table)
    return table


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_role("admin"))])
async def delete_table(table_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Table).where(Table.id == table_id))
    table = result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    table.is_active = False
    await db.commit()
