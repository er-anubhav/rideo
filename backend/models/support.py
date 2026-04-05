"""
Support Models
==============

Ticket-based support system for rider-driver and user-admin communication.

Models:
    SupportTicket - Support ticket/conversation
    SupportMessage - Individual messages within a ticket
    
Usage:
    # Create a ticket
    ticket = SupportTicket(
        user_id=user.id,
        subject="Issue with ride",
        status="open"
    )
    
    # Add message
    message = SupportMessage(
        ticket_id=ticket.id,
        user_id=user.id,
        message_text="I had a problem with my last ride"
    )
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from enum import Enum
import uuid

from .database import Base


class TicketStatus(str, Enum):
    """Support ticket status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketType(str, Enum):
    """Type of support ticket"""
    GENERAL = "general"
    RIDE_ISSUE = "ride_issue"
    PAYMENT = "payment"
    ACCOUNT = "account"
    DRIVER_SUPPORT = "driver_support"
    RIDER_SUPPORT = "rider_support"


class SupportTicket(Base):
    """Support ticket model"""
    
    __tablename__ = "support_tickets"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ride_id = Column(UUID(as_uuid=True), ForeignKey("rides.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # Admin
    
    # Ticket info
    subject = Column(String(200), nullable=False)
    ticket_type = Column(SQLEnum(TicketType), default=TicketType.GENERAL, nullable=False)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN, nullable=False, index=True)
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="support_tickets")
    messages = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="SupportMessage.created_at")
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "userId": str(self.user_id),
            "rideId": str(self.ride_id) if self.ride_id else None,
            "subject": self.subject,
            "ticketType": self.ticket_type.value,
            "status": self.status.value,
            "priority": self.priority,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "closedAt": self.closed_at.isoformat() if self.closed_at else None,
            "messageCount": len(self.messages) if hasattr(self, 'messages') and self.messages else 0
        }


class SupportMessage(Base):
    """Support message model"""
    
    __tablename__ = "support_messages"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Message content
    message_text = Column(Text, nullable=False)
    is_admin_message = Column(Boolean, default=False, nullable=False)
    
    # Attachments (optional)
    attachment_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")
    user = relationship("User", backref="support_messages")
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "ticketId": str(self.ticket_id),
            "userId": str(self.user_id),
            "messageText": self.message_text,
            "isAdminMessage": self.is_admin_message,
            "attachmentUrl": self.attachment_url,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
