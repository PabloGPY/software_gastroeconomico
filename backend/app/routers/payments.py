import uuid
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.payment import Payment, PaymentSplit
from app.models.order import Order, OrderItem
from app.models.table import Table
from app.schemas.payment import PaymentCreate, PaymentOut
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter(prefix="/payments", tags=["Payments"])


async def _next_receipt_number(db: AsyncSession) -> str:
    result = await db.execute(select(func.count(Payment.id)))
    count = result.scalar_one() + 1
    return f"REC-{count:05d}"


@router.get("", response_model=list[PaymentOut])
async def list_payments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "cashier")),
):
    result = await db.execute(
        select(Payment)
        .options(selectinload(Payment.splits))
        .order_by(Payment.paid_at.desc())
        .limit(200)
    )
    return result.scalars().all()


@router.get("/{payment_id}", response_model=PaymentOut)
async def get_payment(
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "cashier")),
):
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id).options(selectinload(Payment.splits))
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return payment


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
async def process_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "cashier")),
):
    order_result = await db.execute(
        select(Order).where(Order.id == data.order_id).options(selectinload(Order.items))
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    if order.status == "closed":
        raise HTTPException(status_code=400, detail="El pedido ya fue cobrado")

    subtotal = sum(Decimal(str(i.unit_price)) * i.quantity for i in order.items if i.status != "cancelled")
    discount_amount = subtotal * (data.discount_pct / Decimal("100"))
    total = subtotal - discount_amount + data.tip_amount
    change_given = None
    if data.cash_received is not None:
        change_given = data.cash_received - total

    receipt_number = await _next_receipt_number(db)

    payment = Payment(
        order_id=order.id,
        cashier_id=current_user.id,
        subtotal=subtotal,
        discount_pct=data.discount_pct,
        discount_amount=discount_amount,
        tip_amount=data.tip_amount,
        total=total,
        payment_method=data.payment_method,
        cash_received=data.cash_received,
        change_given=change_given,
        receipt_number=receipt_number,
        notes=data.notes,
    )
    db.add(payment)
    await db.flush()

    for split in data.splits:
        db.add(PaymentSplit(payment_id=payment.id, method=split.method, amount=split.amount))

    order.status = "closed"
    from datetime import datetime
    order.closed_at = datetime.utcnow()

    table_result = await db.execute(select(Table).where(Table.id == order.table_id))
    table = table_result.scalar_one_or_none()
    if table:
        table.status = "available"

    await db.commit()
    result = await db.execute(
        select(Payment).where(Payment.id == payment.id).options(selectinload(Payment.splits))
    )
    return result.scalar_one()
