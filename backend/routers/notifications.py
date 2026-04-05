"""
Notifications Router
====================

REST API endpoints for managing user notifications.
Complements the WebSocket push notification system by providing
persistent storage and retrieval of notification history.

Endpoints:
----------
GET    /api/notifications              - Get user's notifications
PATCH  /api/notifications/{id}/read    - Mark notification as read
POST   /api/notifications/read-all     - Mark all notifications as read
DELETE /api/notifications/{id}         - Delete notification

Usage:
------
The notification system works in two parts:
1. Real-time delivery via WebSocket (websocket_manager.py)
2. Persistent storage via this API (for notification history)

When a notification is sent via WebSocket, it should also be saved
to the database for later retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

from models.database import get_db
from models.user import User
from models.notification import Notification
from routers.users import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    title: str
    body: str
    type: str
    data: Optional[dict] = None
    isRead: bool
    readAt: Optional[str] = None
    createdAt: str


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False)
):
    """
    Get user's notifications with pagination.
    
    Args:
        page: Page number (default: 1)
        limit: Items per page (default: 20, max: 100)
        unread_only: Only return unread notifications (default: False)
    
    Returns:
        List of notifications ordered by creation date (newest first)
    """
    offset = (page - 1) * limit
    
    # Build query
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return [
        NotificationResponse(
            id=str(n.id),
            title=n.title,
            body=n.body,
            type=n.type,
            data=n.data,
            isRead=n.is_read,
            readAt=n.read_at.isoformat() if n.read_at else None,
            createdAt=n.created_at.isoformat() if n.created_at else None
        )
        for n in notifications
    ]


@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a specific notification as read.
    
    Args:
        notification_id: UUID of the notification
    
    Returns:
        Success message
    
    Raises:
        404: Notification not found or doesn't belong to user
    """
    # Get notification
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Mark as read
    notification.mark_as_read()
    await db.commit()
    
    return {"success": True, "message": "Notification marked as read"}


@router.post("/read-all")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark all user's notifications as read.
    
    Returns:
        Success message with count of updated notifications
    """
    # Update all unread notifications
    result = await db.execute(
        update(Notification)
        .where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        )
        .values(
            is_read=True,
            read_at=datetime.now(timezone.utc)
        )
    )
    
    await db.commit()
    
    updated_count = result.rowcount
    
    return {
        "success": True,
        "message": f"Marked {updated_count} notifications as read",
        "count": updated_count
    }


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a notification.
    
    Args:
        notification_id: UUID of the notification
    
    Returns:
        Success message
    
    Raises:
        404: Notification not found or doesn't belong to user
    """
    # Get notification
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Delete
    await db.delete(notification)
    await db.commit()
    
    return {"success": True, "message": "Notification deleted"}


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get count of unread notifications.
    
    Returns:
        Count of unread notifications
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        )
    )
    
    unread_notifications = result.scalars().all()
    
    return {
        "success": True,
        "count": len(unread_notifications)
    }
