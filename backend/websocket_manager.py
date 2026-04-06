import json
import logging
from typing import Dict, Set, List, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    """Notification types for push notifications"""
    # Ride notifications
    RIDE_REQUESTED = "ride_requested"
    RIDE_ACCEPTED = "ride_accepted"
    DRIVER_ARRIVING = "driver_arriving"
    DRIVER_ARRIVED = "driver_arrived"
    RIDE_STARTED = "ride_started"
    RIDE_COMPLETED = "ride_completed"
    RIDE_CANCELLED = "ride_cancelled"
    
    # Driver notifications
    NEW_RIDE_REQUEST = "new_ride_request"
    RIDE_CANCELLED_BY_RIDER = "ride_cancelled_by_rider"
    
    # Location updates
    DRIVER_LOCATION = "driver_location"
    
    # Payment notifications
    PAYMENT_RECEIVED = "payment_received"
    
    # General
    PROMO_APPLIED = "promo_applied"
    RATING_RECEIVED = "rating_received"


class ConnectionManager:
    """Manages WebSocket connections for real-time features and push notifications"""
    
    def __init__(self):
        # Active connections: {user_id: WebSocket}
        self.driver_connections: Dict[str, WebSocket] = {}
        self.rider_connections: Dict[str, WebSocket] = {}
        
        # Driver locations: {driver_id: {"lat": float, "lng": float, "updated_at": str}}
        self.driver_locations: Dict[str, dict] = {}
        
        # Active rides: {ride_id: {"rider_id": str, "driver_id": str}}
        self.active_rides: Dict[str, dict] = {}
        
        # Notification queue for offline users: {user_id: [notifications]}
        self.pending_notifications: Dict[str, List[dict]] = {}
    
    async def connect_driver(self, driver_id: str, websocket: WebSocket):
        await websocket.accept()
        self.driver_connections[driver_id] = websocket
        logger.info(f"Driver {driver_id} connected")
        
        # Send pending notifications
        await self._send_pending_notifications(driver_id, "driver")
    
    async def connect_rider(self, rider_id: str, websocket: WebSocket):
        await websocket.accept()
        self.rider_connections[rider_id] = websocket
        logger.info(f"Rider {rider_id} connected")
        
        # Send pending notifications
        await self._send_pending_notifications(rider_id, "rider")
    
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
    
    # ==================== PUSH NOTIFICATION METHODS ====================
    
    async def _send_pending_notifications(self, user_id: str, user_type: str):
        """Send pending notifications when user reconnects"""
        if user_id in self.pending_notifications:
            notifications = self.pending_notifications.pop(user_id)
            for notification in notifications:
                try:
                    if user_type == "driver" and user_id in self.driver_connections:
                        await self.driver_connections[user_id].send_json(notification)
                    elif user_type == "rider" and user_id in self.rider_connections:
                        await self.rider_connections[user_id].send_json(notification)
                except Exception as e:
                    logger.error(f"Error sending pending notification: {e}")
    
    def _queue_notification(self, user_id: str, notification: dict):
        """Queue notification for offline user"""
        if user_id not in self.pending_notifications:
            self.pending_notifications[user_id] = []
        # Keep only last 50 notifications per user
        if len(self.pending_notifications[user_id]) >= 50:
            self.pending_notifications[user_id].pop(0)
        self.pending_notifications[user_id].append(notification)
    
    def _create_notification(
        self, 
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[dict] = None
    ) -> dict:
        """Create a standardized notification object"""
        return {
            "event": "notification",
            "type": notification_type.value,
            "title": title,
            "message": message,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def notify_rider(
        self, 
        rider_id: str, 
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[dict] = None,
        db: Optional[AsyncSession] = None
    ):
        """Send push notification to rider and save to database"""
        notification = self._create_notification(notification_type, title, message, data)
        
        # Save to database if session provided
        if db:
            from models.notification import Notification
            db_notification = Notification(
                user_id=rider_id,
                title=title,
                body=message,
                type=notification_type.value,
                data=data
            )
            db.add(db_notification)
            try:
                await db.commit()
            except Exception as e:
                logger.error(f"Failed to save notification to database: {e}")
                await db.rollback()
        
        if rider_id in self.rider_connections:
            try:
                await self.rider_connections[rider_id].send_json(notification)
                logger.info(f"Notification sent to rider {rider_id}: {notification_type.value}")
            except Exception as e:
                logger.error(f"Error sending notification to rider {rider_id}: {e}")
                self._queue_notification(rider_id, notification)
        else:
            # Queue for later delivery
            self._queue_notification(rider_id, notification)
            logger.info(f"Notification queued for rider {rider_id}: {notification_type.value}")
    
    async def notify_driver(
        self, 
        driver_id: str, 
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[dict] = None,
        db: Optional[AsyncSession] = None
    ):
        """Send push notification to driver and save to database"""
        notification = self._create_notification(notification_type, title, message, data)
        
        # Save to database if session provided
        if db:
            from models.notification import Notification
            db_notification = Notification(
                user_id=driver_id,
                title=title,
                body=message,
                type=notification_type.value,
                data=data
            )
            db.add(db_notification)
            try:
                await db.commit()
            except Exception as e:
                logger.error(f"Failed to save notification to database: {e}")
                await db.rollback()
        
        if driver_id in self.driver_connections:
            try:
                await self.driver_connections[driver_id].send_json(notification)
                logger.info(f"Notification sent to driver {driver_id}: {notification_type.value}")
            except Exception as e:
                logger.error(f"Error sending notification to driver {driver_id}: {e}")
                self._queue_notification(driver_id, notification)
        else:
            # Queue for later delivery
            self._queue_notification(driver_id, notification)
            logger.info(f"Notification queued for driver {driver_id}: {notification_type.value}")
    
    async def notify_ride_accepted(self, rider_id: str, driver_name: str, vehicle_info: str, eta_mins: int, ride_data: dict, db: Optional[AsyncSession] = None):
        """Notify rider that driver accepted the ride"""
        await self.notify_rider(
            rider_id,
            NotificationType.RIDE_ACCEPTED,
            "Ride Accepted!",
            f"{driver_name} is on the way in a {vehicle_info}. ETA: {eta_mins} mins",
            ride_data,
            db=db
        )
    
    async def notify_driver_arriving(self, rider_id: str, driver_name: str, eta_mins: int, ride_data: dict, db: Optional[AsyncSession] = None):
        """Notify rider that driver is arriving"""
        await self.notify_rider(
            rider_id,
            NotificationType.DRIVER_ARRIVING,
            "Driver Arriving",
            f"{driver_name} is arriving in {eta_mins} mins",
            ride_data,
            db=db
        )
    
    async def notify_driver_arrived(self, rider_id: str, driver_name: str, ride_data: dict, db: Optional[AsyncSession] = None):
        """Notify rider that driver has arrived"""
        await self.notify_rider(
            rider_id,
            NotificationType.DRIVER_ARRIVED,
            "Driver Arrived!",
            f"{driver_name} has arrived at pickup location",
            ride_data,
            db=db
        )
    
    async def notify_ride_started(self, rider_id: str, ride_data: dict, db: Optional[AsyncSession] = None):
        """Notify rider that ride has started"""
        await self.notify_rider(
            rider_id,
            NotificationType.RIDE_STARTED,
            "Ride Started",
            "Your ride has started. Enjoy your trip!",
            ride_data,
            db=db
        )
    
    async def notify_ride_completed(self, rider_id: str, fare: float, ride_data: dict, db: Optional[AsyncSession] = None):
        """Notify rider that ride is completed"""
        await self.notify_rider(
            rider_id,
            NotificationType.RIDE_COMPLETED,
            "Ride Completed!",
            f"Your ride is complete. Fare: ₹{fare}. Please pay in cash.",
            ride_data,
            db=db
        )
    
    async def notify_ride_cancelled(self, user_id: str, user_type: str, cancelled_by: str, reason: str, ride_data: dict, db: Optional[AsyncSession] = None):
        """Notify user that ride was cancelled"""
        notification_type = NotificationType.RIDE_CANCELLED if user_type == "rider" else NotificationType.RIDE_CANCELLED_BY_RIDER
        
        if user_type == "rider":
            await self.notify_rider(
                user_id,
                notification_type,
                "Ride Cancelled",
                f"Your ride was cancelled by {cancelled_by}. {reason}",
                ride_data,
                db=db
            )
        else:
            await self.notify_driver(
                user_id,
                notification_type,
                "Ride Cancelled",
                f"Ride cancelled by rider. {reason}",
                ride_data,
                db=db
            )
    
    async def notify_new_ride_request(self, driver_id: str, pickup_address: str, fare: float, ride_data: dict):
        """Notify driver of new ride request"""
        await self.notify_driver(
            driver_id,
            NotificationType.NEW_RIDE_REQUEST,
            "New Ride Request!",
            f"Pickup: {pickup_address}. Fare: ₹{fare}",
            ride_data
        )
    
    async def notify_rating_received(self, user_id: str, user_type: str, rating: int, ride_data: dict):
        """Notify user of new rating received"""
        stars = "⭐" * rating
        if user_type == "driver":
            await self.notify_driver(
                user_id,
                NotificationType.RATING_RECEIVED,
                "New Rating Received",
                f"You received {rating} stars {stars}",
                ride_data
            )
        else:
            await self.notify_rider(
                user_id,
                NotificationType.RATING_RECEIVED,
                "New Rating Received",
                f"You received {rating} stars {stars}",
                ride_data
            )
    
    async def notify_payment_received(self, driver_id: str, amount: float, ride_data: dict, db: Optional[AsyncSession] = None):
        """Notify driver of payment received"""
        await self.notify_driver(
            driver_id,
            NotificationType.PAYMENT_RECEIVED,
            "Payment Received",
            f"Cash payment of ₹{amount} collected for ride",
            ride_data,
            db=db
        )


# Singleton instance
connection_manager = ConnectionManager()
