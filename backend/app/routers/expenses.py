import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseOut
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter(prefix="/expenses", tags=["Expenses"])
admin_only = Depends(require_role("admin"))


@router.get("", response_model=list[ExpenseOut], dependencies=[admin_only])
async def list_expenses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Expense).order_by(Expense.expense_date.desc()))
    return result.scalars().all()


@router.get("/categories", dependencies=[admin_only])
async def list_categories(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import distinct
    result = await db.execute(select(distinct(Expense.category)).order_by(Expense.category))
    return [row[0] for row in result.all()]


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    expense = Expense(**data.model_dump(), registered_by=current_user.id)
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.put("/{expense_id}", response_model=ExpenseOut, dependencies=[admin_only])
async def update_expense(expense_id: uuid.UUID, data: ExpenseUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Egreso no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(expense, field, value)
    await db.commit()
    await db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[admin_only])
async def delete_expense(expense_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Expense).where(Expense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Egreso no encontrado")
    await db.delete(expense)
    await db.commit()
