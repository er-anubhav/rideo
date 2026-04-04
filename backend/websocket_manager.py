import json
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time features"""
    
    def __init__(self):
        # Active connections: {user_id: WebSocket}
        self.driver_connections: Dict[str, WebSocket] = {}
        self.rider_connections: Dict[str, WebSocket] = {}
        
        # Driver locations: {driver_id: {"lat": float, "lng": float, "updated_at": str}}
        self.driver_locations: Dict[str, dict] = {}
        
        # Active rides: {ride_id: {"rider_id": str, "driver_id": str}}
        self.active_rides: Dict[str, dict] = {}
    
    async def connect_driver(self, driver_id: str, websocket: WebSocket):
        await websocket.accept()
        self.driver_connections[driver_id] = websocket
        logger.info(f"Driver {driver_id} connected")
    
    async def connect_rider(self, rider_id: str, websocket: WebSocket):
        await websocket.accept()
        self.rider_connections[rider_id] = websocket
        logger.info(f"Rider {rider_id} connected")
    
    def disconnect_driver(self, driver_id: str):
        if driver_id in self.driver_connections:
            del self.driver_connections[driver_id]
        if driver_id in self.driver_locations:
            del self.driver_locations[driver_id]
        logger.info(f"Driver {driver_id} disconnected")
    
    def disconnect_rider(self, rider_id: str):
        if rider_id in self.rider_connections:
            del self.rider_connections[rider_id]
        logger.info(f"Rider {rider_id} disconnected")
    
    async def send_to_driver(self, driver_id: str, message: dict):
        """Send message to a specific driver"""
        if driver_id in self.driver_connections:
            try:
                await self.driver_connections[driver_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to driver {driver_id}: {e}")
                self.disconnect_driver(driver_id)
    
    async def send_to_rider(self, rider_id: str, message: dict):
        """Send message to a specific rider"""
        if rider_id in self.rider_connections:
            try:
                await self.rider_connections[rider_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to rider {rider_id}: {e}")
                self.disconnect_rider(rider_id)
    
    def update_driver_location(self, driver_id: str, lat: float, lng: float):
        """Update driver's location in memory"""
        self.driver_locations[driver_id] = {
            "lat": lat,
            "lng": lng,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    def get_driver_location(self, driver_id: str) -> dict:
        """Get driver's current location"""
        return self.driver_locations.get(driver_id)
    
    def get_online_drivers(self) -> list:
        """Get list of all connected drivers"""
        return list(self.driver_connections.keys())
    
    async def broadcast_to_drivers(self, message: dict, exclude: Set[str] = None):
        """Broadcast message to all connected drivers"""
        exclude = exclude or set()
        for driver_id, ws in list(self.driver_connections.items()):
            if driver_id not in exclude:
                try:
                    await ws.send_json(message)
                except Exception:
                    self.disconnect_driver(driver_id)
    
    def register_ride(self, ride_id: str, rider_id: str, driver_id: str = None):
        """Register an active ride"""
        self.active_rides[ride_id] = {
            "rider_id": rider_id,
            "driver_id": driver_id
        }
    
    def update_ride_driver(self, ride_id: str, driver_id: str):
        """Update driver for a ride"""
        if ride_id in self.active_rides:
            self.active_rides[ride_id]["driver_id"] = driver_id
    
    def complete_ride(self, ride_id: str):
        """Remove completed ride from active rides"""
        if ride_id in self.active_rides:
            del self.active_rides[ride_id]


# Singleton instance
connection_manager = ConnectionManager()
