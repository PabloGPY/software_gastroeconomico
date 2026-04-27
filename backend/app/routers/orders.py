import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.menu import MenuItem
from app.models.table import Table
from app.schemas.order import OrderCreate, OrderItemCreate, OrderItemStatusUpdate, OrderOut
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.services.notification_service import manager

router = APIRouter(prefix="/orders", tags=["Orders"])


async def _get_order_with_items(order_id: uuid.UUID, db: AsyncSession) -> Order:
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.menu_item),
            selectinload(Order.table),
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order


@router.get("/active", response_model=list[OrderOut])
async def get_active_orders(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order)
        .where(Order.status.not_in(["closed", "cancelled"]))
        .options(
            selectinload(Order.items).selectinload(OrderItem.menu_item),
            selectinload(Order.table),
        )
        .order_by(Order.created_at)
    )
    return result.scalars().all()


@router.get("", response_model=list[OrderOut])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "cashier")),
):
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.menu_item),
            selectinload(Order.table),
        )
        .order_by(Order.created_at.desc())
        .limit(100)
    )
    return result.scalars().all()


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "waiter")),
):
    table_result = await db.execute(select(Table).where(Table.id == data.table_id))
    table = table_result.scalar_one_or_none()
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")

    order = Order(table_id=data.table_id, waiter_id=current_user.id, notes=data.notes)
    db.add(order)
    await db.flush()

    for item_data in data.items:
        item_result = await db.execute(select(MenuItem).where(MenuItem.id == item_data.menu_item_id))
        menu_item = item_result.scalar_one_or_none()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Item {item_data.menu_item_id} no encontrado")
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item_data.menu_item_id,
            quantity=item_data.quantity,
            unit_price=menu_item.price,
            notes=item_data.notes,
        )
        db.add(order_item)

    table.status = "occupied"
    await db.commit()
    return await _get_order_with_items(order.id, db)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await _get_order_with_items(order_id, db)


@router.post("/{order_id}/items", response_model=OrderOut)
async def add_items(
    order_id: uuid.UUID,
    items: list[OrderItemCreate],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "waiter")),
):
    order = await _get_order_with_items(order_id, db)
    if order.status in ("closed", "cancelled"):
        raise HTTPException(status_code=400, detail="No se puede modificar un pedido cerrado")

    for item_data in items:
        item_result = await db.execute(select(MenuItem).where(MenuItem.id == item_data.menu_item_id))
        menu_item = item_result.scalar_one_or_none()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Item {item_data.menu_item_id} no encontrado")
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item_data.menu_item_id,
            quantity=item_data.quantity,
            unit_price=menu_item.price,
            notes=item_data.notes,
        )
        db.add(order_item)

    await db.commit()
    return await _get_order_with_items(order_id, db)


@router.post("/{order_id}/send", response_model=OrderOut)
async def send_to_kitchen(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "waiter")),
):
    order = await _get_order_with_items(order_id, db)
    now = datetime.utcnow()
    pending_items = []

    for item in order.items:
        if item.status == "pending":
            item.status = "preparing"
            item.sent_at = now
            pending_items.append({
                "id": str(item.id),
                "menu_item_name": item.menu_item.name,
                "quantity": item.quantity,
                "notes": item.notes,
            })

    if not pending_items:
        raise HTTPException(status_code=400, detail="No hay items pendientes para enviar")

    order.status = "sent_to_kitchen"
    await db.commit()

    result = await db.execute(select(Table).where(Table.id == order.table_id))
    table = result.scalar_one_or_none()

    await manager.broadcast_to_kitchen({
        "event": "new_order",
        "order_id": str(order.id),
        "table_number": table.number if table else order.table_id,
        "items": pending_items,
    })

    return await _get_order_with_items(order_id, db)


@router.patch("/{order_id}/items/{item_id}/status", response_model=OrderOut)
async def update_item_status(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    data: OrderItemStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "kitchen")),
):
    order = await _get_order_with_items(order_id, db)
    target = next((i for i in order.items if i.id == item_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Item no encontrado en el pedido")

    target.status = data.status
    if data.status == "ready":
        target.ready_at = datetime.utcnow()

    all_ready = all(i.status in ("ready", "delivered", "cancelled") for i in order.items)
    if all_ready:
        order.status = "ready"

    await db.commit()

    await manager.broadcast_to_waiters({
        "event": "item_status",
        "order_id": str(order.id),
        "item_id": str(item_id),
        "status": data.status,
    })

    return await _get_order_with_items(order_id, db)


@router.post("/{order_id}/deliver", response_model=OrderOut)
async def deliver_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "waiter")),
):
    order = await _get_order_with_items(order_id, db)
    for item in order.items:
        if item.status == "ready":
            item.status = "delivered"
    order.status = "delivered"
    await db.commit()
    return await _get_order_with_items(order_id, db)


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "waiter")),
):
    order = await _get_order_with_items(order_id, db)
    if order.status == "closed":
        raise HTTPException(status_code=400, detail="No se puede cancelar un pedido cerrado")
    order.status = "cancelled"
    result = await db.execute(select(Table).where(Table.id == order.table_id))
    table = result.scalar_one_or_none()
    if table:
        table.status = "available"
    await db.commit()
    return await _get_order_with_items(order_id, db)
