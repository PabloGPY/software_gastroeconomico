from datetime import date, datetime, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, case, or_, Date as SADate, and_, Numeric

from app.database import get_db
from app.models.payment import Payment
from app.models.order import Order, OrderItem
from app.models.menu import MenuItem
from app.models.expense import Expense
from app.dependencies.auth import require_role
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])
admin_only = Depends(require_role("admin"))


# Una pizza mitad y mitad cuenta como media unidad para cada uno de sus dos gustos
_portion = case((OrderItem.half_menu_item_id.isnot(None), 0.5), else_=1.0)
_qty = OrderItem.quantity * _portion
_item_revenue = OrderItem.quantity * OrderItem.unit_price * cast(_portion, Numeric)
_joins_item = or_(OrderItem.menu_item_id == MenuItem.id, OrderItem.half_menu_item_id == MenuItem.id)


def _date_range(from_date: date | None, to_date: date | None):
    if not from_date:
        from_date = date.today().replace(day=1)
    if not to_date:
        to_date = date.today()
    return from_date, to_date


@router.get("/summary", dependencies=[admin_only])
async def summary(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
):
    f, t = _date_range(from_date, to_date)

    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.total), 0))
        .where(cast(Payment.paid_at, SADate).between(f, t))
    )
    revenue = revenue_result.scalar_one()

    orders_result = await db.execute(
        select(func.count(Payment.id))
        .where(cast(Payment.paid_at, SADate).between(f, t))
    )
    total_orders = orders_result.scalar_one()

    avg_ticket = (Decimal(str(revenue)) / total_orders) if total_orders > 0 else Decimal("0")

    expenses_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.expense_date.between(f, t))
    )
    total_expenses = expenses_result.scalar_one()

    net_profit = Decimal(str(revenue)) - Decimal(str(total_expenses))

    return {
        "from": str(f),
        "to": str(t),
        "total_revenue": float(revenue),
        "total_orders": total_orders,
        "avg_ticket": float(avg_ticket),
        "total_expenses": float(total_expenses),
        "net_profit": float(net_profit),
    }


@router.get("/sales", dependencies=[admin_only])
async def sales_by_period(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    period: str = Query("day", regex="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
):
    f, t = _date_range(from_date, to_date)

    trunc_map = {"day": "day", "week": "week", "month": "month"}
    trunc = func.date_trunc(trunc_map[period], Payment.paid_at)

    result = await db.execute(
        select(trunc.label("period"), func.sum(Payment.total).label("revenue"), func.count(Payment.id).label("orders"))
        .where(cast(Payment.paid_at, SADate).between(f, t))
        .group_by(trunc)
        .order_by(trunc)
    )
    rows = result.all()
    return [{"period": str(r.period), "revenue": float(r.revenue), "orders": r.orders} for r in rows]


@router.get("/best-sellers", dependencies=[admin_only])
async def best_sellers(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
):
    f, t = _date_range(from_date, to_date)

    result = await db.execute(
        select(
            MenuItem.name,
            func.sum(_qty).label("qty_sold"),
            func.sum(_item_revenue).label("revenue"),
        )
        .join(OrderItem, _joins_item)
        .join(Order, Order.id == OrderItem.order_id)
        .join(Payment, Payment.order_id == Order.id)
        .where(cast(Payment.paid_at, SADate).between(f, t))
        .group_by(MenuItem.name)
        .order_by(func.sum(_qty).desc())
        .limit(10)
    )
    return [{"name": r.name, "qty_sold": float(r.qty_sold), "revenue": float(r.revenue)} for r in result.all()]


@router.get("/profitability", dependencies=[admin_only])
async def profitability(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
):
    f, t = _date_range(from_date, to_date)

    result = await db.execute(
        select(
            MenuItem.name,
            func.sum(_item_revenue).label("revenue"),
            func.sum(OrderItem.quantity * MenuItem.cost * cast(_portion, Numeric)).label("cost"),
        )
        .join(OrderItem, _joins_item)
        .join(Order, Order.id == OrderItem.order_id)
        .join(Payment, Payment.order_id == Order.id)
        .where(cast(Payment.paid_at, SADate).between(f, t))
        .where(MenuItem.cost.isnot(None))
        .group_by(MenuItem.name)
        .order_by(func.sum(_item_revenue).desc())
    )
    rows = result.all()
    return [
        {
            "name": r.name,
            "revenue": float(r.revenue),
            "cost": float(r.cost) if r.cost else 0,
            "gross_margin": float(r.revenue) - (float(r.cost) if r.cost else 0),
        }
        for r in rows
    ]


@router.get("/payment-methods", dependencies=[admin_only])
async def payment_methods(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
):
    f, t = _date_range(from_date, to_date)
    result = await db.execute(
        select(Payment.payment_method, func.count(Payment.id).label("count"), func.sum(Payment.total).label("total"))
        .where(cast(Payment.paid_at, SADate).between(f, t))
        .group_by(Payment.payment_method)
    )
    return [{"method": r.payment_method, "count": r.count, "total": float(r.total)} for r in result.all()]


@router.get("/by-waiter", dependencies=[admin_only])
async def by_waiter(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User as UserModel
    f, t = _date_range(from_date, to_date)
    result = await db.execute(
        select(
            UserModel.full_name,
            func.count(Order.id).label("orders"),
            func.sum(Payment.total).label("revenue"),
        )
        .join(Order, Order.waiter_id == UserModel.id)
        .join(Payment, Payment.order_id == Order.id)
        .where(cast(Payment.paid_at, SADate).between(f, t))
        .group_by(UserModel.full_name)
        .order_by(func.sum(Payment.total).desc())
    )
    return [{"waiter": r.full_name, "orders": r.orders, "revenue": float(r.revenue)} for r in result.all()]


@router.get("/order-types", dependencies=[admin_only])
async def order_types(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    db: AsyncSession = Depends(get_db),
):
    f, t = _date_range(from_date, to_date)
    result = await db.execute(
        select(Order.order_type, func.count(Payment.id).label("count"), func.sum(Payment.total).label("total"))
        .join(Payment, Payment.order_id == Order.id)
        .where(cast(Payment.paid_at, SADate).between(f, t))
        .group_by(Order.order_type)
    )
    return [{"order_type": r.order_type, "count": r.count, "total": float(r.total)} for r in result.all()]
