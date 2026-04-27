from fastapi import WebSocket
import json


class ConnectionManager:
    def __init__(self):
        self.kitchen: list[WebSocket] = []
        self.waiters: list[WebSocket] = []

    async def connect_kitchen(self, ws: WebSocket):
        await ws.accept()
        self.kitchen.append(ws)

    async def connect_waiter(self, ws: WebSocket):
        await ws.accept()
        self.waiters.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.kitchen:
            self.kitchen.remove(ws)
        if ws in self.waiters:
            self.waiters.remove(ws)

    async def broadcast_to_kitchen(self, data: dict):
        dead = []
        for ws in self.kitchen:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def broadcast_to_waiters(self, data: dict):
        dead = []
        for ws in self.waiters:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def broadcast_all(self, data: dict):
        await self.broadcast_to_kitchen(data)
        await self.broadcast_to_waiters(data)


manager = ConnectionManager()
