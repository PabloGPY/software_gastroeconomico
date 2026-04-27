from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, tables, reservations, menu, orders, payments, expenses, reports, websocket

app = FastAPI(title="GastroPOS API", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(tables.router, prefix=PREFIX)
app.include_router(reservations.router, prefix=PREFIX)
app.include_router(menu.router, prefix=PREFIX)
app.include_router(orders.router, prefix=PREFIX)
app.include_router(payments.router, prefix=PREFIX)
app.include_router(expenses.router, prefix=PREFIX)
app.include_router(reports.router, prefix=PREFIX)
app.include_router(websocket.router)


@app.get("/")
async def root():
    return {"message": "GastroPOS API v1.0", "docs": "/docs"}
