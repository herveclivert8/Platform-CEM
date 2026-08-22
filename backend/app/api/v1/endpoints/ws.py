"""WebSocket real-time endpoints."""
import json
import logging
from datetime import datetime
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/ws", tags=["websocket"])

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections and broadcasting."""

    def __init__(self):
        # rooms: {room_name: set of WebSocket connections}
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # track subscriptions: {user_id: set of room names}
        self.user_subscriptions: Dict[int, Set[str]] = {}

    async def connect(self, room: str, websocket: WebSocket, user_id: int | None = None):
        """Accept connection and add to room."""
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = set()
        self.active_connections[room].add(websocket)

        if user_id:
            if user_id not in self.user_subscriptions:
                self.user_subscriptions[user_id] = set()
            self.user_subscriptions[user_id].add(room)

        logger.info(f"✅ Client connected to room: {room} (total: {len(self.active_connections[room])})")

    async def disconnect(self, room: str, websocket: WebSocket, user_id: int | None = None):
        """Remove connection from room."""
        if room in self.active_connections:
            self.active_connections[room].discard(websocket)
            if not self.active_connections[room]:
                del self.active_connections[room]

        if user_id and user_id in self.user_subscriptions:
            self.user_subscriptions[user_id].discard(room)
            if not self.user_subscriptions[user_id]:
                del self.user_subscriptions[user_id]

        logger.info(f"⛔ Client disconnected from room: {room}")

    async def broadcast(self, room: str, message: dict):
        """Broadcast message to all clients in room."""
        if room not in self.active_connections:
            return

        # Add timestamp
        message["timestamp"] = datetime.utcnow().isoformat()

        disconnected = []
        for connection in self.active_connections[room]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.active_connections[room].discard(conn)

    async def broadcast_to_user(self, user_id: int, message: dict):
        """Broadcast message to all user's subscriptions."""
        if user_id not in self.user_subscriptions:
            return

        message["timestamp"] = datetime.utcnow().isoformat()

        for room in self.user_subscriptions[user_id]:
            await self.broadcast(room, message)

    def get_room_size(self, room: str) -> int:
        """Get number of clients in room."""
        return len(self.active_connections.get(room, set()))


# Global connection manager
manager = ConnectionManager()


# WebSocket endpoints
@router.websocket("/cities/{city_slug}")
async def websocket_city_updates(websocket: WebSocket, city_slug: str):
    """
    WebSocket endpoint for real-time city updates.

    Events received:
    - {type: "project_update", data: {...}}
    - {type: "news_update", data: {...}}
    - {type: "team_update", data: {...}}

    Events sent to client:
    - {type: "update", data: {...}, timestamp: "..."}
    - {type: "connection", clients: N, timestamp: "..."}
    """
    room = f"city_{city_slug}"
    await manager.connect(room, websocket)

    # Send connection confirmation
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "clients": manager.get_room_size(room),
        "timestamp": datetime.utcnow().isoformat(),
    })

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            logger.debug(f"Received from {room}: {data}")

            # Broadcast to all clients in room
            await manager.broadcast(room, {
                "type": data.get("type", "update"),
                "data": data.get("data"),
                "source": "client",
            })

    except WebSocketDisconnect:
        await manager.disconnect(room, websocket)
        # Notify remaining clients
        await manager.broadcast(room, {
            "type": "client_disconnected",
            "clients": manager.get_room_size(room),
        })


@router.websocket("/users/{user_id}")
async def websocket_user_notifications(websocket: WebSocket, user_id: int):
    """
    WebSocket endpoint for user notifications.

    Sends:
    - {type: "notification", data: {...}}
    - {type: "message", data: {...}}
    - {type: "presence", data: {...}}
    """
    room = f"user_{user_id}"
    await manager.connect(room, websocket, user_id)

    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
    })

    try:
        while True:
            # Keep connection alive - expect heartbeat or close
            data = await websocket.receive_json()

            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        await manager.disconnect(room, websocket, user_id)


@router.websocket("/admin/stats")
async def websocket_admin_stats(websocket: WebSocket):
    """
    WebSocket endpoint for real-time admin statistics.

    Streams:
    - {type: "stats", data: {users_online, requests_per_sec, error_rate, ...}}
    """
    room = "admin_stats"
    await manager.connect(room, websocket)

    try:
        while True:
            # In production, get real metrics from Prometheus
            data = await websocket.receive_json()

            if data.get("type") == "subscribe":
                # Send stats update
                await websocket.send_json({
                    "type": "stats",
                    "data": {
                        "users_online": manager.get_room_size("admin_stats"),
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                })

    except WebSocketDisconnect:
        await manager.disconnect(room, websocket)


# Public API for backend to broadcast messages
async def notify_city_update(city_slug: str, update_type: str, data: dict):
    """Called by backend to notify city updates to connected clients."""
    room = f"city_{city_slug}"
    await manager.broadcast(room, {
        "type": update_type,
        "data": data,
        "source": "server",
    })


async def notify_user(user_id: int, notification_type: str, data: dict):
    """Called by backend to notify user."""
    room = f"user_{user_id}"
    await manager.broadcast(room, {
        "type": notification_type,
        "data": data,
        "source": "server",
    })


async def get_connection_stats() -> dict:
    """Get connection statistics."""
    return {
        "total_rooms": len(manager.active_connections),
        "total_connections": sum(len(conns) for conns in manager.active_connections.values()),
        "rooms": {room: len(conns) for room, conns in manager.active_connections.items()},
    }
