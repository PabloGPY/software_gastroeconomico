"""
Script para poblar la base de datos con datos iniciales.
Ejecutar UNA VEZ después de alembic upgrade head.
Uso: cd backend && venv/Scripts/python seed.py
"""
import asyncio
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.table import Table
from app.models.menu import MenuCategory, MenuItem
from app.utils.security import get_password_hash


USERS = [
    {"username": "admin", "full_name": "Administrador", "password": "admin123", "role": "admin"},
    {"username": "mozo1", "full_name": "Carlos Mozo", "password": "mozo123", "role": "waiter"},
    {"username": "cajero1", "full_name": "Laura Cajera", "password": "caja123", "role": "cashier"},
    {"username": "cocina1", "full_name": "Cocina Principal", "password": "cocina123", "role": "kitchen"},
]

TABLES = [
    {"number": 1, "capacity": 2, "pos_x": 15, "pos_y": 20},
    {"number": 2, "capacity": 2, "pos_x": 35, "pos_y": 20},
    {"number": 3, "capacity": 4, "pos_x": 55, "pos_y": 20},
    {"number": 4, "capacity": 4, "pos_x": 75, "pos_y": 20},
    {"number": 5, "capacity": 6, "pos_x": 15, "pos_y": 55},
    {"number": 6, "capacity": 6, "pos_x": 40, "pos_y": 55},
    {"number": 7, "capacity": 8, "pos_x": 65, "pos_y": 55},
    {"number": 8, "capacity": 4, "pos_x": 85, "pos_y": 55},
]

MENU = [
    {
        "category": "Entradas",
        "items": [
            {"name": "Tabla de quesos", "price": 1800, "cost": 900, "description": "Quesos variados con dulce de membrillo"},
            {"name": "Empanadas (x3)", "price": 1200, "cost": 500, "description": "Carne, humita o verdura"},
            {"name": "Provoleta", "price": 1500, "cost": 600, "description": "Con chimichurri"},
        ]
    },
    {
        "category": "Platos principales",
        "items": [
            {"name": "Bife de chorizo", "price": 4500, "cost": 2000, "description": "400g con guarnición"},
            {"name": "Milanesa napolitana", "price": 3800, "cost": 1600, "description": "Con papas fritas"},
            {"name": "Pasta del día", "price": 2800, "cost": 900, "description": "Consultar"},
            {"name": "Pollo grillado", "price": 3200, "cost": 1200, "description": "Con ensalada"},
        ]
    },
    {
        "category": "Bebidas",
        "items": [
            {"name": "Agua mineral", "price": 600, "cost": 150, "description": "500ml"},
            {"name": "Gaseosa", "price": 800, "cost": 200, "description": "Lata 350ml"},
            {"name": "Vino por copa", "price": 1200, "cost": 350, "description": "Malbec o Chardonnay"},
            {"name": "Cerveza artesanal", "price": 1400, "cost": 400, "description": "Pinta 500ml"},
        ]
    },
    {
        "category": "Postres",
        "items": [
            {"name": "Tiramisú", "price": 1800, "cost": 600, "description": "Casero"},
            {"name": "Flan con dulce", "price": 1200, "cost": 350, "description": "Flan con dulce de leche"},
            {"name": "Helado (3 bochas)", "price": 1400, "cost": 400, "description": "Varios gustos"},
        ]
    },
]


async def seed():
    async with AsyncSessionLocal() as db:
        # Users
        for u in USERS:
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.username == u["username"]))
            if not result.scalar_one_or_none():
                db.add(User(
                    username=u["username"],
                    full_name=u["full_name"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                ))
                print(f"  OK Usuario: {u['username']} / {u['password']}")
            else:
                print(f"  - Usuario ya existe: {u['username']}")

        # Tables
        from sqlalchemy import select
        for t in TABLES:
            result = await db.execute(select(Table).where(Table.number == t["number"]))
            if not result.scalar_one_or_none():
                db.add(Table(**t))
                print(f"  OK Mesa {t['number']}")

        await db.flush()

        # Menu
        for section in MENU:
            cat_result = await db.execute(select(MenuCategory).where(MenuCategory.name == section["category"]))
            category = cat_result.scalar_one_or_none()
            if not category:
                category = MenuCategory(name=section["category"])
                db.add(category)
                await db.flush()
                print(f"  OK Categoría: {section['category']}")

            for item_data in section["items"]:
                item_result = await db.execute(
                    select(MenuItem).where(MenuItem.name == item_data["name"], MenuItem.category_id == category.id)
                )
                if not item_result.scalar_one_or_none():
                    db.add(MenuItem(category_id=category.id, **item_data))
                    print(f"    OK Item: {item_data['name']}")

        await db.commit()
        print("\n[OK] Seed completado exitosamente.")
        print("\nUsuarios creados:")
        print("  admin / admin123  -> Admin")
        print("  mozo1 / mozo123   -> Mozo")
        print("  cajero1 / caja123 -> Cajero")
        print("  cocina1 / cocina123 -> Cocina")


if __name__ == "__main__":
    asyncio.run(seed())
