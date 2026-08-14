"""
PaperGuard AI - WebSocket Connection Manager
Manages active WebSocket connections and broadcasts real-time agent updates.
"""

import json
import logging
from datetime import datetime
from typing import Any

from fastapi import WebSocket

from models.schemas import AgentUpdate

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for real-time agent updates."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict[str, Any]):
        """Send a JSON message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                disconnected.append(connection)

        # Clean up broken connections
        for conn in disconnected:
            self.disconnect(conn)

    async def send_agent_update(
        self,
        agent_name: str,
        status: str,
        message: str,
        data: dict[str, Any] | None = None,
    ):
        """Convenience method to broadcast a standardized agent update."""
        update = AgentUpdate(
            type="agent_update",
            agent_name=agent_name,
            status=status,
            message=message,
            timestamp=datetime.now().strftime("%H:%M:%S"),
            data=data,
        )
        await self.broadcast(update.model_dump())

    async def send_analysis_complete(self, result: dict[str, Any]):
        """Broadcast that the full analysis is complete with results."""
        await self.broadcast({
            "type": "analysis_complete",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "data": result,
        })

    async def send_error(self, error_message: str):
        """Broadcast an error message."""
        await self.broadcast({
            "type": "error",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": error_message,
        })


# Singleton instance
ws_manager = WebSocketManager()
