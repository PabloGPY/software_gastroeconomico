from sqlalchemy import String, Integer, Float, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Table(Base):
    __tablename__ = "tables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    shape: Mapped[str] = mapped_column(
        SAEnum("square", "round", "rectangle", name="table_shape"),
        default="square"
    )
    pos_x: Mapped[float] = mapped_column(Float, default=10.0)
    pos_y: Mapped[float] = mapped_column(Float, default=10.0)
    status: Mapped[str] = mapped_column(
        SAEnum("available", "occupied", "reserved", "cleaning", name="table_status"),
        default="available"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    reservations: Mapped[list["Reservation"]] = relationship(back_populates="table")
    orders: Mapped[list["Order"]] = relationship(back_populates="table")
