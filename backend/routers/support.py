"""
Support Router
==============

Ticket-based support system endpoints.
Allows users to create support tickets and chat with support staff.

Endpoints:
----------
GET    /api/support/tickets             - Get user's support tickets
POST   /api/support/tickets             - Create new support ticket
GET    /api/support/tickets/{ticket_id} - Get ticket details with messages
POST   /api/support/tickets/{ticket_id}/messages - Send message in ticket
PUT    /api/support/tickets/{ticket_id}/close    - Close support ticket

# Legacy endpoints for backward compatibility
GET    /api/support/chat                - Get active conversation (creates if not exists)
POST   /api/support/chat/message        - Send message to support
POST   /api/support/chat/close          - Close active support ticket
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

from models.database import get_db
from models.user import User
from models.support import SupportTicket, SupportMessage, TicketStatus, TicketType
from routers.users import get_current_user

router = APIRouter(prefix="/api/support", tags=["Support"])


class CreateTicketRequest(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=1)
    ticket_type: Optional[str] = "general"
    ride_id: Optional[str] = None


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, alias="message")


class TicketResponse(BaseModel):
    id: str
    userId: str
    subject: str
    ticketType: str
    status: str
    priority: str
    createdAt: str
    updatedAt: Optional[str]
    closedAt: Optional[str]
    messageCount: int


class MessageResponse(BaseModel):
    id: str
    ticketId: str
    userId: str
    messageText: str
    isAdminMessage: bool
    createdAt: str


@router.get("/tickets", response_model=List[TicketResponse])
async def get_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get user's support tickets with pagination.
    
    Args:
        status_filter: Filter by status (open, in_progress, resolved, closed)
        page: Page number
        limit: Items per page
    """
    offset = (page - 1) * limit
    
    # Build query
    query = select(SupportTicket).where(SupportTicket.user_id == current_user.id)
    
    if status_filter:
        try:
            status_enum = TicketStatus(status_filter)
            query = query.where(SupportTicket.status == status_enum)
        except ValueError:
            pass  # Invalid status, ignore filter
    
    query = query.order_by(SupportTicket.created_at.desc()).offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    return [TicketResponse(**ticket.to_dict()) for ticket in tickets]


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    request: CreateTicketRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new support ticket.
    """
    # Validate ticket type
    try:
        ticket_type = TicketType(request.ticket_type)
    except ValueError:
        ticket_type = TicketType.GENERAL
    
    # Create ticket
    ticket = SupportTicket(
        user_id=current_user.id,
        subject=request.subject,
        ticket_type=ticket_type,
        ride_id=request.ride_id if request.ride_id else None,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    await db.flush()
    
    # Add first message
    message = SupportMessage(
        ticket_id=ticket.id,
        user_id=current_user.id,
        message_text=request.message,
        is_admin_message=False
    )
    db.add(message)
    
    await db.commit()
    await db.refresh(ticket)
    
    # Load messages for count
    result = await db.execute(
        select(SupportMessage).where(SupportMessage.ticket_id == ticket.id)
    )
    ticket.messages = result.scalars().all()
    
    return TicketResponse(**ticket.to_dict())


@router.get("/tickets/{ticket_id}")
async def get_ticket_details(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get ticket details including all messages.
    """
    # Get ticket
    result = await db.execute(
        select(SupportTicket).where(
            and_(
                SupportTicket.id == ticket_id,
                SupportTicket.user_id == current_user.id
            )
        )
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Get messages
    result = await db.execute(
        select(SupportMessage)
        .where(SupportMessage.ticket_id == ticket_id)
        .order_by(SupportMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    return {
        "success": True,
        "ticket": ticket.to_dict(),
        "messages": [MessageResponse(**msg.to_dict()) for msg in messages]
    }


@router.post("/tickets/{ticket_id}/messages", response_model=MessageResponse)
async def send_message(
    ticket_id: str,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message in a support ticket.
    """
    # Get ticket
    result = await db.execute(
        select(SupportTicket).where(
            and_(
                SupportTicket.id == ticket_id,
                SupportTicket.user_id == current_user.id
            )
        )
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to closed ticket"
        )
    
    # Create message
    message = SupportMessage(
        ticket_id=ticket.id,
        user_id=current_user.id,
        message_text=request.message,
        is_admin_message=False
    )
    db.add(message)
    
    # Update ticket
    ticket.updated_at = datetime.now(timezone.utc)
    if ticket.status == TicketStatus.RESOLVED:
        ticket.status = TicketStatus.OPEN  # Reopen if user sends message
    
    await db.commit()
    await db.refresh(message)
    
    return MessageResponse(**message.to_dict())


@router.post("/tickets/{ticket_id}/close")
async def close_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Close a support ticket.
    """
    # Get ticket
    result = await db.execute(
        select(SupportTicket).where(
            and_(
                SupportTicket.id == ticket_id,
                SupportTicket.user_id == current_user.id
            )
        )
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {"success": True, "message": "Ticket closed"}


# ==================== LEGACY ENDPOINTS (for backward compatibility) ====================

@router.get("/chat")
async def get_chat_conversation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get active support conversation (creates if not exists).
    Legacy endpoint for backward compatibility.
    """
    # Find active ticket
    result = await db.execute(
        select(SupportTicket).where(
            and_(
                SupportTicket.user_id == current_user.id,
                SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
            )
        ).order_by(SupportTicket.created_at.desc())
    )
    ticket = result.scalar_one_or_none()
    
    # Create ticket if none exists
    if not ticket:
        ticket = SupportTicket(
            user_id=current_user.id,
            subject="Support Chat",
            ticket_type=TicketType.GENERAL,
            status=TicketStatus.OPEN
        )
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
    
    # Get messages
    result = await db.execute(
        select(SupportMessage)
        .where(SupportMessage.ticket_id == ticket.id)
        .order_by(SupportMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    return {
        "success": True,
        "ticketId": str(ticket.id),
        "status": ticket.status.value,
        "messages": [msg.to_dict() for msg in messages]
    }


@router.post("/chat/message")
async def send_chat_message(
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send message to support chat.
    Legacy endpoint for backward compatibility.
    """
    # Find or create active ticket
    result = await db.execute(
        select(SupportTicket).where(
            and_(
                SupportTicket.user_id == current_user.id,
                SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
            )
        ).order_by(SupportTicket.created_at.desc())
    )
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        ticket = SupportTicket(
            user_id=current_user.id,
            subject="Support Chat",
            ticket_type=TicketType.GENERAL,
            status=TicketStatus.OPEN
        )
        db.add(ticket)
        await db.flush()
    
    # Create message
    message = SupportMessage(
        ticket_id=ticket.id,
        user_id=current_user.id,
        message_text=request.message,
        is_admin_message=False
    )
    db.add(message)
    
    ticket.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(message)
    
    return {
        "success": True,
        "message": message.to_dict()
    }


@router.post("/chat/close")
async def close_chat(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Close active support chat.
    Legacy endpoint for backward compatibility.
    """
    # Find active ticket
    result = await db.execute(
        select(SupportTicket).where(
            and_(
                SupportTicket.user_id == current_user.id,
                SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
            )
        ).order_by(SupportTicket.created_at.desc())
    )
    ticket = result.scalar_one_or_none()
    
    if ticket:
        ticket.status = TicketStatus.CLOSED
        ticket.closed_at = datetime.now(timezone.utc)
        await db.commit()
    
    return {"success": True, "message": "Support chat closed"}
