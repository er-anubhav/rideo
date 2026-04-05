"""
Notification Model
==================

Stores persistent notification records for users.
WebSocket notifications are ephemeral, but this model stores
notification history for later retrieval.

Usage:
    # Create notification
    notification = Notification(
        user_id=user.id,
        title="Ride Accepted",
        body="Driver is on the way",
        type="ride_accepted",
        data={"ride_id": "123"}
    )
    db.add(notification)
    await db.commit()
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from .database import Base


class Notification(Base):
    """Notification model for storing notification history"""
    
    __tablename__ = "notifications"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Notification content
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    type = Column(String(50), nullable=False, index=True)  # ride_accepted, driver_arriving, etc.
    data = Column(JSON, nullable=True)  # Additional data (ride_id, etc.)
    
    # Read status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.read_at = datetime.now(timezone.utc)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "title": self.title,
            "body": self.body,
            "type": self.type,
            "data": self.data or {},
            "isRead": self.is_read,
            "readAt": self.read_at.isoformat() if self.read_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
