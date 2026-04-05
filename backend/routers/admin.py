"""
Admin Router
============

Complete production-ready admin dashboard for ride-sharing platform.
Provides full control over users, drivers, rides, support, wallet, and system.

Features:
---------
1. Dashboard Analytics
2. User Management (View, Block, Delete)
3. Driver Management (Verification, Approval, Suspension)
4. Ride Monitoring (All rides, Active rides, Analytics)
5. Support Ticket Management
6. Wallet & Transaction Monitoring
7. Notification Management
8. Promo Code Management
9. Fare Configuration
10. System Logs & Audit Trail
11. Real-time Metrics

Authorization:
--------------
All endpoints require admin role (role: admin in JWT token).
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc, update, delete
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

from models.database import get_db
from models.user import User, UserRole
from models.driver import DriverProfile, Vehicle, VehicleType
from models.rider import RiderProfile
from models.ride import Ride, RideStatus
from models.support import SupportTicket, SupportMessage, TicketStatus
from models.wallet import Wallet, WalletTransaction, TransactionType
from models.notification import Notification
from models.fare import FareConfig
from models.promo import PromoCode
from models.rating import Rating
from routers.users import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ==================== AUTHORIZATION ====================

async def require_admin(current_user: User = Depends(get_current_user)):
    """Require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ==================== DASHBOARD ====================

@router.get("/dashboard")
async def get_dashboard_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive dashboard statistics.
    
    Returns:
        - Total users, drivers, rides
        - Active rides and online drivers
        - Today's statistics
        - Revenue metrics
        - Support ticket stats
        - System health
    """
    # Total counts
    total_users = await db.scalar(select(func.count(User.id)))
    total_drivers = await db.scalar(
        select(func.count(DriverProfile.id))
    )
    total_rides = await db.scalar(select(func.count(Ride.id)))
    
    # Active counts
    online_drivers = await db.scalar(
        select(func.count(DriverProfile.id)).where(
            and_(DriverProfile.is_online == True, DriverProfile.is_verified == True)
        )
    )
    active_rides = await db.scalar(
        select(func.count(Ride.id)).where(
            Ride.status.in_([RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ARRIVED, RideStatus.IN_PROGRESS])
        )
    )
    
    # Completed rides
    completed_rides = await db.scalar(
        select(func.count(Ride.id)).where(Ride.status == RideStatus.COMPLETED)
    )
    
    # Revenue
    total_revenue = await db.scalar(
        select(func.sum(Ride.actual_fare)).where(Ride.status == RideStatus.COMPLETED)
    ) or 0.0
    
    # Today's stats
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_rides = await db.scalar(
        select(func.count(Ride.id)).where(
            and_(Ride.created_at >= today_start, Ride.status == RideStatus.COMPLETED)
        )
    )
    today_revenue = await db.scalar(
        select(func.sum(Ride.actual_fare)).where(
            and_(Ride.created_at >= today_start, Ride.status == RideStatus.COMPLETED)
        )
    ) or 0.0
    
    # Support tickets
    open_tickets = await db.scalar(
        select(func.count(SupportTicket.id)).where(
            SupportTicket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])
        )
    )
    
    # Pending driver verifications
    pending_verifications = await db.scalar(
        select(func.count(DriverProfile.id)).where(DriverProfile.is_verified == False)
    )
    
    return {
        "success": True,
        "stats": {
            "totalUsers": total_users or 0,
            "totalDrivers": total_drivers or 0,
            "totalRides": total_rides or 0,
            "completedRides": completed_rides or 0,
            "activeRides": active_rides or 0,
            "onlineDrivers": online_drivers or 0,
            "totalRevenue": round(total_revenue, 2),
            "todayRides": today_rides or 0,
            "todayRevenue": round(today_revenue, 2),
            "openSupportTickets": open_tickets or 0,
            "pendingVerifications": pending_verifications or 0
        }
    }


# ==================== USER MANAGEMENT ====================

@router.get("/users")
async def get_all_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all users with filters"""
    offset = (page - 1) * limit
    
    query = select(User)
    
    # Filters
    if role:
        try:
            user_role = UserRole(role)
            query = query.where(User.role == user_role)
        except ValueError:
            pass
    
    if search:
        query = query.where(
            or_(
                User.name.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )
    
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    # Get users
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return {
        "success": True,
        "users": [u.to_dict() for u in users],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed user information"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = user.to_dict()
    
    # Get additional info based on role
    if user.role == UserRole.DRIVER:
        # Get driver profile
        driver_result = await db.execute(
            select(DriverProfile).where(DriverProfile.user_id == user_id)
        )
        driver = driver_result.scalar_one_or_none()
        if driver:
            user_data["driverProfile"] = driver.to_dict()
            
            # Get vehicles
            vehicles_result = await db.execute(
                select(Vehicle).where(Vehicle.driver_id == driver.id)
            )
            user_data["vehicles"] = [v.to_dict() for v in vehicles_result.scalars().all()]
    
    # Get ride count
    ride_count = await db.scalar(
        select(func.count(Ride.id)).where(
            or_(Ride.rider_id == user_id, Ride.driver_id == user_id)
        )
    )
    user_data["totalRides"] = ride_count or 0
    
    # Get wallet if exists
    wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = wallet_result.scalar_one_or_none()
    if wallet:
        user_data["wallet"] = wallet.to_dict()
    
    return {"success": True, "user": user_data}


@router.put("/users/{user_id}/block")
async def block_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Block/unblock a user"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    
    # If blocking a driver, set them offline
    if not user.is_active and user.role == UserRole.DRIVER:
        await db.execute(
            update(DriverProfile)
            .where(DriverProfile.user_id == user_id)
            .values(is_online=False)
        )
    
    await db.commit()
    
    status_text = "blocked" if not user.is_active else "unblocked"
    return {"success": True, "message": f"User {status_text}", "isActive": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user (soft delete)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for active rides
    active_ride = await db.scalar(
        select(func.count(Ride.id)).where(
            and_(
                or_(Ride.rider_id == user_id, Ride.driver_id == user_id),
                Ride.status.in_([RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ARRIVED, RideStatus.IN_PROGRESS])
            )
        )
    )
    
    if active_ride and active_ride > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete user with active rides"
        )
    
    # Soft delete - deactivate
    user.is_active = False
    user.email = f"deleted_{user_id}@deleted.com"
    
    await db.commit()
    
    return {"success": True, "message": "User deleted"}


# ==================== DRIVER MANAGEMENT ====================

@router.get("/drivers")
async def get_all_drivers(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    verified: Optional[bool] = Query(None),
    online: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all drivers with filters"""
    offset = (page - 1) * limit
    
    query = select(DriverProfile, User).join(User)
    
    if verified is not None:
        query = query.where(DriverProfile.is_verified == verified)
    
    if online is not None:
        query = query.where(DriverProfile.is_online == online)
    
    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    query = query.order_by(DriverProfile.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    drivers_users = result.all()
    
    drivers_list = []
    for driver, user in drivers_users:
        driver_data = driver.to_dict()
        driver_data["user"] = user.to_dict()
        
        # Get vehicles
        vehicles_result = await db.execute(
            select(Vehicle).where(Vehicle.driver_id == driver.id)
        )
        driver_data["vehicles"] = [v.to_dict() for v in vehicles_result.scalars().all()]
        
        drivers_list.append(driver_data)
    
    return {
        "success": True,
        "drivers": drivers_list,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.put("/drivers/{driver_id}/verify")
async def verify_driver(
    driver_id: str,
    is_verified: bool = Query(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Verify or unverify a driver"""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == driver_id)
    )
    driver = result.scalar_one_or_none()
    
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver.is_verified = is_verified
    driver.documents_verified = is_verified
    
    await db.commit()
    
    status_text = "verified" if is_verified else "unverified"
    return {"success": True, "message": f"Driver {status_text}"}


@router.put("/drivers/{driver_id}/suspend")
async def suspend_driver(
    driver_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Suspend a driver account"""
    # Update driver profile
    await db.execute(
        update(DriverProfile)
        .where(DriverProfile.user_id == driver_id)
        .values(is_online=False, is_verified=False)
    )
    
    # Update user
    await db.execute(
        update(User)
        .where(User.id == driver_id)
        .values(is_active=False)
    )
    
    await db.commit()
    
    return {"success": True, "message": "Driver suspended"}


# ==================== RIDE MANAGEMENT ====================

@router.get("/rides")
async def get_all_rides(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all rides with filters"""
    offset = (page - 1) * limit
    
    query = select(Ride)
    
    if status_filter:
        try:
            ride_status = RideStatus(status_filter)
            query = query.where(Ride.status == ride_status)
        except ValueError:
            pass
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.where(Ride.created_at >= date_from_dt)
        except ValueError:
            pass
    
    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.where(Ride.created_at <= date_to_dt)
        except ValueError:
            pass
    
    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    query = query.order_by(Ride.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    rides = result.scalars().all()
    
    # Enrich with user info
    rides_list = []
    for ride in rides:
        ride_data = ride.to_dict()
        
        # Get rider info
        if ride.rider_id:
            rider_result = await db.execute(select(User).where(User.id == ride.rider_id))
            rider = rider_result.scalar_one_or_none()
            if rider:
                ride_data["rider"] = {"id": str(rider.id), "name": rider.name, "phone": rider.phone}
        
        # Get driver info
        if ride.driver_id:
            driver_result = await db.execute(select(User).where(User.id == ride.driver_id))
            driver = driver_result.scalar_one_or_none()
            if driver:
                ride_data["driver"] = {"id": str(driver.id), "name": driver.name, "phone": driver.phone}
        
        rides_list.append(ride_data)
    
    return {
        "success": True,
        "rides": rides_list,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/rides/{ride_id}")
async def get_ride_details(
    ride_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed ride information"""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    ride_data = ride.to_dict()
    
    # Get rider
    if ride.rider_id:
        rider_result = await db.execute(select(User).where(User.id == ride.rider_id))
        rider = rider_result.scalar_one_or_none()
        if rider:
            ride_data["rider"] = rider.to_dict()
    
    # Get driver
    if ride.driver_id:
        driver_result = await db.execute(select(User).where(User.id == ride.driver_id))
        driver = driver_result.scalar_one_or_none()
        if driver:
            ride_data["driver"] = driver.to_dict()
        
        # Get vehicle
        if ride.vehicle_id:
            vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == ride.vehicle_id))
            vehicle = vehicle_result.scalar_one_or_none()
            if vehicle:
                ride_data["vehicle"] = vehicle.to_dict()
    
    # Get rating if exists
    rating_result = await db.execute(
        select(Rating).where(Rating.ride_id == ride_id)
    )
    ratings = rating_result.scalars().all()
    ride_data["ratings"] = [r.to_dict() for r in ratings]
    
    return {"success": True, "ride": ride_data}


# ==================== SUPPORT MANAGEMENT ====================

@router.get("/support/tickets")
async def get_all_support_tickets(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all support tickets"""
    offset = (page - 1) * limit
    
    query = select(SupportTicket)
    
    if status_filter:
        try:
            ticket_status = TicketStatus(status_filter)
            query = query.where(SupportTicket.status == ticket_status)
        except ValueError:
            pass
    
    if priority:
        query = query.where(SupportTicket.priority == priority)
    
    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    query = query.order_by(SupportTicket.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    # Enrich with user info
    tickets_list = []
    for ticket in tickets:
        ticket_data = ticket.to_dict()
        
        # Get user
        user_result = await db.execute(select(User).where(User.id == ticket.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            ticket_data["user"] = {"id": str(user.id), "name": user.name, "phone": user.phone}
        
        # Get message count
        msg_count = await db.scalar(
            select(func.count(SupportMessage.id)).where(SupportMessage.ticket_id == ticket.id)
        )
        ticket_data["messageCount"] = msg_count or 0
        
        tickets_list.append(ticket_data)
    
    return {
        "success": True,
        "tickets": tickets_list,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/support/tickets/{ticket_id}")
async def get_ticket_details_admin(
    ticket_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get ticket details with all messages"""
    result = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket_data = ticket.to_dict()
    
    # Get user
    user_result = await db.execute(select(User).where(User.id == ticket.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        ticket_data["user"] = user.to_dict()
    
    # Get messages
    messages_result = await db.execute(
        select(SupportMessage)
        .where(SupportMessage.ticket_id == ticket_id)
        .order_by(SupportMessage.created_at.asc())
    )
    messages = messages_result.scalars().all()
    ticket_data["messages"] = [m.to_dict() for m in messages]
    
    return {"success": True, "ticket": ticket_data}


@router.post("/support/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    message: str = Query(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin reply to support ticket"""
    result = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Create admin message
    admin_message = SupportMessage(
        ticket_id=ticket.id,
        user_id=admin.id,
        message_text=message,
        is_admin_message=True
    )
    db.add(admin_message)
    
    # Update ticket
    ticket.updated_at = datetime.now(timezone.utc)
    ticket.status = TicketStatus.IN_PROGRESS
    ticket.assigned_to = admin.id
    
    await db.commit()
    
    return {"success": True, "message": "Reply sent"}


@router.put("/support/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    new_status: str = Query(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update ticket status"""
    try:
        status_enum = TicketStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket.status = status_enum
    ticket.updated_at = datetime.now(timezone.utc)
    
    if status_enum == TicketStatus.CLOSED:
        ticket.closed_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {"success": True, "message": f"Ticket status updated to {new_status}"}


# ==================== WALLET & TRANSACTIONS ====================

@router.get("/wallets")
async def get_all_wallets(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    min_balance: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all wallets"""
    offset = (page - 1) * limit
    
    query = select(Wallet, User).join(User)
    
    if min_balance is not None:
        query = query.where(Wallet.balance >= min_balance)
    
    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    query = query.order_by(Wallet.balance.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    wallets_users = result.all()
    
    wallets_list = []
    for wallet, user in wallets_users:
        wallet_data = wallet.to_dict()
        wallet_data["user"] = {"id": str(user.id), "name": user.name, "phone": user.phone}
        wallets_list.append(wallet_data)
    
    return {
        "success": True,
        "wallets": wallets_list,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/transactions")
async def get_all_transactions(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    transaction_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Get all wallet transactions"""
    offset = (page - 1) * limit
    
    query = select(WalletTransaction)
    
    if transaction_type:
        try:
            trans_type = TransactionType(transaction_type)
            query = query.where(WalletTransaction.transaction_type == trans_type)
        except ValueError:
            pass
    
    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.where(WalletTransaction.created_at >= date_from_dt)
        except ValueError:
            pass
    
    # Get total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0
    
    query = query.order_by(WalletTransaction.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return {
        "success": True,
        "transactions": [t.to_dict() for t in transactions],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


# ==================== ANALYTICS ====================

@router.get("/analytics/revenue")
async def get_revenue_analytics(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    period: str = Query("week", regex="^(day|week|month)$")
):
    """Get revenue analytics for different periods"""
    now = datetime.now(timezone.utc)
    
    if period == "day":
        start_date = now - timedelta(days=7)
        group_by = "day"
    elif period == "week":
        start_date = now - timedelta(weeks=4)
        group_by = "week"
    else:  # month
        start_date = now - timedelta(days=180)
        group_by = "month"
    
    # Get rides grouped by date
    result = await db.execute(
        select(
            func.date_trunc(group_by, Ride.completed_at).label('period'),
            func.count(Ride.id).label('ride_count'),
            func.sum(Ride.actual_fare).label('revenue')
        )
        .where(
            and_(
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= start_date
            )
        )
        .group_by('period')
        .order_by('period')
    )
    
    data = []
    for row in result:
        data.append({
            "period": row.period.isoformat() if row.period else None,
            "rideCount": row.ride_count or 0,
            "revenue": round(row.revenue or 0, 2)
        })
    
    return {"success": True, "data": data, "period": period}


@router.get("/analytics/drivers")
async def get_driver_analytics(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get driver performance analytics"""
    # Top drivers by rides
    top_drivers = await db.execute(
        select(
            User.id,
            User.name,
            User.phone,
            DriverProfile.rating,
            DriverProfile.total_rides,
            DriverProfile.total_earnings
        )
        .join(DriverProfile, User.id == DriverProfile.user_id)
        .where(DriverProfile.is_verified == True)
        .order_by(DriverProfile.total_rides.desc())
        .limit(10)
    )
    
    top_drivers_list = []
    for row in top_drivers:
        top_drivers_list.append({
            "id": str(row.id),
            "name": row.name,
            "phone": row.phone,
            "rating": row.rating,
            "totalRides": row.total_rides,
            "totalEarnings": round(row.total_earnings, 2)
        })
    
    return {"success": True, "topDrivers": top_drivers_list}


# ==================== PROMO & FARE MANAGEMENT ====================

@router.get("/promo-codes")
async def get_promo_codes(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all promo codes"""
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    promos = result.scalars().all()
    
    return {"success": True, "promoCodes": [p.to_dict() for p in promos]}


@router.post("/promo-codes")
async def create_promo_code(
    code: str = Query(...),
    discount_type: str = Query(...),
    discount_value: float = Query(...),
    max_discount: Optional[float] = Query(None),
    min_ride_amount: Optional[float] = Query(None),
    max_uses: Optional[int] = Query(None),
    max_uses_per_user: Optional[int] = Query(1),
    valid_until: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a promo code"""
    # Check if code exists
    existing = await db.scalar(select(PromoCode).where(PromoCode.code == code))
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    valid_until_dt = None
    if valid_until:
        try:
            valid_until_dt = datetime.fromisoformat(valid_until.replace('Z', '+00:00'))
        except ValueError:
            pass
    
    promo = PromoCode(
        code=code,
        description=f"Admin created promo code: {code}",
        discount_type=discount_type,
        discount_value=discount_value,
        max_discount=max_discount,
        min_ride_amount=min_ride_amount,
        max_uses=max_uses,
        max_uses_per_user=max_uses_per_user,
        valid_until=valid_until_dt,
        is_active=True
    )
    
    db.add(promo)
    await db.commit()
    
    return {"success": True, "message": "Promo code created", "promoCode": promo.to_dict()}


@router.get("/fare-configs")
async def get_fare_configs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all fare configurations"""
    result = await db.execute(select(FareConfig))
    configs = result.scalars().all()
    
    return {"success": True, "fareConfigs": [c.to_dict() for c in configs]}


@router.put("/fare-configs/{vehicle_type}")
async def update_fare_config(
    vehicle_type: str,
    base_fare: Optional[float] = Query(None),
    per_km_rate: Optional[float] = Query(None),
    per_minute_rate: Optional[float] = Query(None),
    minimum_fare: Optional[float] = Query(None),
    cancellation_fee: Optional[float] = Query(None),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update fare configuration"""
    try:
        vtype = VehicleType(vehicle_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid vehicle type")
    
    result = await db.execute(
        select(FareConfig).where(FareConfig.vehicle_type == vtype)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Fare config not found")
    
    if base_fare is not None:
        config.base_fare = base_fare
    if per_km_rate is not None:
        config.per_km_rate = per_km_rate
    if per_minute_rate is not None:
        config.per_minute_rate = per_minute_rate
    if minimum_fare is not None:
        config.minimum_fare = minimum_fare
    if cancellation_fee is not None:
        config.cancellation_fee = cancellation_fee
    
    await db.commit()
    
    return {"success": True, "message": "Fare config updated", "config": config.to_dict()}


# ==================== LOGS & AUDIT ====================

@router.get("/logs/recent-activities")
async def get_recent_activities(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200)
):
    """Get recent system activities (rides, registrations, support tickets)"""
    activities = []
    
    # Recent rides
    recent_rides = await db.execute(
        select(Ride, User)
        .join(User, Ride.rider_id == User.id)
        .order_by(Ride.created_at.desc())
        .limit(limit // 3)
    )
    for ride, user in recent_rides:
        activities.append({
            "type": "ride",
            "id": str(ride.id),
            "description": f"Ride {ride.status.value} by {user.name}",
            "timestamp": ride.created_at.isoformat() if ride.created_at else None,
            "data": {"status": ride.status.value, "fare": ride.estimated_fare}
        })
    
    # Recent registrations
    recent_users = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .limit(limit // 3)
    )
    for user in recent_users.scalars():
        activities.append({
            "type": "registration",
            "id": str(user.id),
            "description": f"New {user.role.value} registered: {user.name}",
            "timestamp": user.created_at.isoformat() if user.created_at else None,
            "data": {"phone": user.phone, "role": user.role.value}
        })
    
    # Recent support tickets
    recent_tickets = await db.execute(
        select(SupportTicket)
        .order_by(SupportTicket.created_at.desc())
        .limit(limit // 3)
    )
    for ticket in recent_tickets.scalars():
        activities.append({
            "type": "support",
            "id": str(ticket.id),
            "description": f"Support ticket: {ticket.subject}",
            "timestamp": ticket.created_at.isoformat() if ticket.created_at else None,
            "data": {"status": ticket.status.value, "priority": ticket.priority}
        })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)
    
    return {"success": True, "activities": activities[:limit]}
