from typing import Dict, List
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("ws_manager")


class WebSocketConnectionManager:
    def __init__(self):
        # Maps conversation_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Maps user_id -> List[WebSocket]
        self.user_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected: User {user_id} in Conversation {conversation_id}")

    def disconnect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        if conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        logger.info(f"WebSocket disconnected: User {user_id} from Conversation {conversation_id}")

    async def broadcast_to_conversation(self, conversation_id: int, message_data: dict):
        if conversation_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_json(message_data)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                if dead in self.active_connections[conversation_id]:
                    self.active_connections[conversation_id].remove(dead)

    async def send_personal_message(self, user_id: int, message_data: dict):
        if user_id in self.user_connections:
            dead_connections = []
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_json(message_data)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                if dead in self.user_connections[user_id]:
                    self.user_connections[user_id].remove(dead)


ws_manager = WebSocketConnectionManager()
