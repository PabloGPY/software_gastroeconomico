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

# Menú de Fooders. sort_order define el orden de las solapas en la pantalla de pedidos.
MENU = [
    {
        "category": "Pizzas",
        "sort_order": 1,
        "allows_halves": True,
        "items": [
            {"name": "Muzzarella", "price": 3200, "cost": 1100, "description": "Grande, 8 porciones"},
            {"name": "Napolitana", "price": 3600, "cost": 1300, "description": "Muzza, tomate en rodajas, ajo y perejil"},
            {"name": "Fugazzeta", "price": 3700, "cost": 1300, "description": "Muzza y cebolla"},
            {"name": "Jamón y morrones", "price": 3900, "cost": 1500, "description": "Muzza, jamón cocido y morrones asados"},
            {"name": "Calabresa", "price": 3900, "cost": 1500, "description": "Muzza y longaniza calabresa"},
            {"name": "Especial", "price": 4100, "cost": 1600, "description": "Jamón, morrones, huevo y aceitunas"},
        ]
    },
    {
        "category": "Pizzas gourmet",
        "sort_order": 2,
        "allows_halves": True,
        "items": [
            {"name": "Cuatro quesos", "price": 4500, "cost": 1900, "description": "Muzza, roquefort, provolone y parmesano"},
            {"name": "Rúcula y crudo", "price": 4800, "cost": 2100, "description": "Jamón crudo, rúcula y parmesano"},
            {"name": "Fooders", "price": 4900, "cost": 2000, "description": "La de la casa: panceta, cheddar, cebolla caramelizada"},
        ]
    },
    {
        "category": "Empanadas",
        "sort_order": 3,
        "items": [
            {"name": "Empanada de carne", "price": 500, "cost": 200, "description": "Carne cortada a cuchillo"},
            {"name": "Empanada de jamón y queso", "price": 500, "cost": 200, "description": None},
            {"name": "Empanada de humita", "price": 500, "cost": 180, "description": None},
            {"name": "Docena de empanadas", "price": 5400, "cost": 2200, "description": "12 a elección, aclarar gustos en la nota"},
        ]
    },
    {
        "category": "Fainá y extras",
        "sort_order": 4,
        "items": [
            {"name": "Fainá", "price": 900, "cost": 250, "description": "Porción para acompañar"},
            {"name": "Papas fritas", "price": 1500, "cost": 500, "description": None},
        ]
    },
    {
        "category": "Bebidas",
        "sort_order": 5,
        "items": [
            {"name": "Agua mineral", "price": 600, "cost": 150, "description": "500ml"},
            {"name": "Gaseosa", "price": 800, "cost": 200, "description": "Lata 350ml"},
            {"name": "Gaseosa 1.5L", "price": 1600, "cost": 600, "description": "Ideal para llevar"},
            {"name": "Cerveza artesanal", "price": 1400, "cost": 400, "description": "Pinta 500ml"},
            {"name": "Cerveza 1L", "price": 2000, "cost": 900, "description": "Porrón litro"},
        ]
    },
    {
        "category": "Postres",
        "sort_order": 6,
        "items": [
            {"name": "Flan con dulce", "price": 1200, "cost": 350, "description": "Flan con dulce de leche"},
            {"name": "Helado (3 bochas)", "price": 1400, "cost": 400, "description": "Varios gustos"},
        ]
    },
]

# Categorías del menú de demostración original que no aplican a una pizzería.
# Se desactivan (no se borran) para conservar el historial de pedidos.
LEGACY_CATEGORIES = ["Entradas", "Platos principales"]


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
                print(f"  OK Categoría: {section['category']}")
            category.sort_order = section["sort_order"]
            category.allows_halves = section.get("allows_halves", False)
            category.is_active = True
            await db.flush()

            for item_data in section["items"]:
                item_result = await db.execute(
                    select(MenuItem).where(MenuItem.name == item_data["name"], MenuItem.category_id == category.id)
                )
                if not item_result.scalar_one_or_none():
                    db.add(MenuItem(category_id=category.id, **item_data))
                    print(f"    OK Item: {item_data['name']}")

        for name in LEGACY_CATEGORIES:
            cat_result = await db.execute(select(MenuCategory).where(MenuCategory.name == name))
            legacy = cat_result.scalar_one_or_none()
            if legacy and legacy.is_active:
                legacy.is_active = False
                print(f"  - Categoría desactivada: {name}")

        await db.commit()
        print("\n[OK] Seed completado exitosamente.")
        print("\nUsuarios creados:")
        print("  admin / admin123  -> Admin")
        print("  mozo1 / mozo123   -> Mozo")
        print("  cajero1 / caja123 -> Cajero")
        print("  cocina1 / cocina123 -> Cocina")


if __name__ == "__main__":
    asyncio.run(seed())
