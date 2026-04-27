import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.reservation import Reservation
from app.schemas.reservation import ReservationCreate, ReservationUpdate, ReservationStatusUpdate, ReservationOut
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.get("", response_model=list[ReservationOut])
async def list_reservations(
    date_filter: date | None = Query(None, alias="date"),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "cashier", "waiter")),
):
    query = select(Reservation).order_by(Reservation.reserved_at)
    if date_filter:
        from sqlalchemy import func, cast
        from sqlalchemy import Date
        query = query.where(cast(Reservation.reserved_at, Date) == date_filter)
    if status_filter:
        query = query.where(Reservation.status == status_filter)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    data: ReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "cashier", "waiter")),
):
    reservation = Reservation(**data.model_dump(), created_by=current_user.id)
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.get("/{reservation_id}", response_model=ReservationOut)
async def get_reservation(
    reservation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "cashier")),
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reservation


@router.put("/{reservation_id}", response_model=ReservationOut)
async def update_reservation(
    reservation_id: uuid.UUID,
    data: ReservationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "cashier")),
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(reservation, field, value)
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.patch("/{reservation_id}/status", response_model=ReservationOut)
async def update_reservation_status(
    reservation_id: uuid.UUID,
    data: ReservationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role("admin", "cashier", "waiter")),
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    reservation.status = data.status
    await db.commit()
    await db.refresh(reservation)
    return reservation
