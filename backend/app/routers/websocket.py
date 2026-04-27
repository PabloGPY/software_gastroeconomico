from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.utils.security import decode_token
from app.services.notification_service import manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/kitchen")
async def kitchen_ws(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
        role = payload.get("role")
    except JWTError:
        await websocket.close(code=4001)
        return

    if role == "kitchen":
        await manager.connect_kitchen(websocket)
    elif role in ("waiter", "admin", "cashier"):
        await manager.connect_waiter(websocket)
    else:
        await websocket.close(code=4003)
        return

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("event") == "item_status" and role == "kitchen":
                await manager.broadcast_to_waiters({
                    "event": "item_status",
                    "order_id": data.get("order_id"),
                    "item_id": data.get("order_item_id"),
                    "status": data.get("status"),
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
