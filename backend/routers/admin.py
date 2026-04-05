from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from models.database import get_db
from models.user import User, UserRole
from models.ride import Ride, RideStatus
from models.driver import DriverProfile
from models.fare import FareConfig
from models.promo import PromoCode, DiscountType
from routers.users import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# Admin auth dependency
async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


class VerifyDriverRequest(BaseModel):
    is_verified: bool
    is_documents_verified: bool = False


class UpdateFareConfigRequest(BaseModel):
    vehicle_type: str
    base_fare: float
    per_km_rate: float
    per_minute_rate: float
    minimum_fare: float
    cancellation_fee: float = 0.0


class CreatePromoCodeRequest(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "flat"  # flat or percent
    discount_value: float
    max_discount: Optional[float] = None
    min_ride_amount: float = 0.0
    max_uses: Optional[int] = None
    max_uses_per_user: int = 1
    valid_until: Optional[str] = None


@router.get("/dashboard")
async def get_dashboard(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard stats"""
    # Total users
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar()
    
    # Total drivers
    result = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.DRIVER)
    )
    total_drivers = result.scalar()
    
    # Online drivers
    result = await db.execute(
        select(func.count(DriverProfile.id)).where(DriverProfile.is_online == True)
    )
    online_drivers = result.scalar()
    
    # Total rides
    result = await db.execute(select(func.count(Ride.id)))
    total_rides = result.scalar()
    
    # Completed rides
    result = await db.execute(
        select(func.count(Ride.id)).where(Ride.status == RideStatus.COMPLETED)
    )
    completed_rides = result.scalar()
    
    # Total revenue
    result = await db.execute(
        select(func.sum(Ride.actual_fare)).where(Ride.status == RideStatus.COMPLETED)
    )
    total_revenue = result.scalar() or 0
    
    # Active rides
    result = await db.execute(
        select(func.count(Ride.id)).where(
            Ride.status.in_([
                RideStatus.SEARCHING,
                RideStatus.ACCEPTED,
                RideStatus.ARRIVING,
                RideStatus.ARRIVED,
                RideStatus.IN_PROGRESS
            ])
        )
    )
    active_rides = result.scalar()
    
    return {
        "success": True,
        "stats": {
            "total_users": total_users,
            "total_drivers": total_drivers,
            "online_drivers": online_drivers,
            "total_rides": total_rides,
            "completed_rides": completed_rides,
            "active_rides": active_rides,
            "total_revenue": round(total_revenue, 2)
        }
    }


@router.get("/users")
async def get_users(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    role: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all users"""
    offset = (page - 1) * limit
    
    query = select(User)
    if role:
        try:
            user_role = UserRole(role)
            query = query.where(User.role == user_role)
        except ValueError:
            pass
    
    result = await db.execute(query.order_by(User.created_at.desc()).offset(offset).limit(limit))
    users = result.scalars().all()
    
    return {"success": True, "users": [u.to_dict() for u in users]}


@router.get("/drivers")
async def get_drivers(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    verified: Optional[bool] = None,
    online: Optional[bool] = None,
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
    
    result = await db.execute(query.order_by(DriverProfile.created_at.desc()).offset(offset).limit(limit))
    rows = result.all()
    
    drivers = []
    for profile, user in rows:
        data = profile.to_dict()
        data["user"] = user.to_dict()
        drivers.append(data)
    
    return {"success": True, "drivers": drivers}


@router.put("/drivers/{driver_id}/verify")
async def verify_driver(
    driver_id: str,
    request: VerifyDriverRequest,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify/unverify a driver"""
    result = await db.execute(select(DriverProfile).where(DriverProfile.id == driver_id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    profile.is_verified = request.is_verified
    profile.documents_verified = request.is_documents_verified
    
    await db.commit()
    
    return {"success": True, "message": f"Driver {'verified' if request.is_verified else 'unverified'}"}


@router.put("/drivers/{driver_id}/suspend")
async def suspend_driver(
    driver_id: str,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Suspend a driver"""
    result = await db.execute(select(DriverProfile).where(DriverProfile.id == driver_id))
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Get user and deactivate
    result = await db.execute(select(User).where(User.id == profile.user_id))
    user = result.scalar_one_or_none()
    
    if user:
        user.is_active = False
        profile.is_online = False
        profile.is_verified = False
    
    await db.commit()
    
    return {"success": True, "message": "Driver suspended"}


@router.get("/rides")
async def get_rides(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all rides"""
    offset = (page - 1) * limit
    
    query = select(Ride)
    if status_filter:
        try:
            ride_status = RideStatus(status_filter)
            query = query.where(Ride.status == ride_status)
        except ValueError:
            pass
    
    result = await db.execute(query.order_by(Ride.created_at.desc()).offset(offset).limit(limit))
    rides = result.scalars().all()
    
    return {"success": True, "rides": [r.to_dict() for r in rides]}


@router.get("/fare-configs")
async def get_fare_configs(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all fare configurations"""
    result = await db.execute(select(FareConfig))
    configs = result.scalars().all()
    
    return {"success": True, "configs": [c.to_dict() for c in configs]}


@router.put("/fare-configs")
async def update_fare_config(
    request: UpdateFareConfigRequest,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update fare configuration"""
    result = await db.execute(
        select(FareConfig).where(FareConfig.vehicle_type == request.vehicle_type)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        # Create new
        config = FareConfig(
            vehicle_type=request.vehicle_type,
            base_fare=request.base_fare,
            per_km_rate=request.per_km_rate,
            per_minute_rate=request.per_minute_rate,
            minimum_fare=request.minimum_fare,
            cancellation_fee=request.cancellation_fee
        )
        db.add(config)
    else:
        # Update existing
        config.base_fare = request.base_fare
        config.per_km_rate = request.per_km_rate
        config.per_minute_rate = request.per_minute_rate
        config.minimum_fare = request.minimum_fare
        config.cancellation_fee = request.cancellation_fee
    
    await db.commit()
    
    return {"success": True, "message": "Fare configuration updated"}


@router.post("/promo-codes")
async def create_promo_code(
    request: CreatePromoCodeRequest,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a promo code"""
    # Check if code exists
    result = await db.execute(
        select(PromoCode).where(PromoCode.code == request.code.upper())
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    # Parse valid_until
    valid_until = None
    if request.valid_until:
        try:
            valid_until = datetime.fromisoformat(request.valid_until.replace('Z', '+00:00'))
        except ValueError:
            pass
    
    # Parse discount type
    try:
        discount_type = DiscountType(request.discount_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid discount type")
    
    promo = PromoCode(
        code=request.code.upper(),
        description=request.description,
        discount_type=discount_type,
        discount_value=request.discount_value,
        max_discount=request.max_discount,
        min_ride_amount=request.min_ride_amount,
        max_uses=request.max_uses,
        max_uses_per_user=request.max_uses_per_user,
        valid_until=valid_until
    )
    db.add(promo)
    await db.commit()
    await db.refresh(promo)
    
    return {"success": True, "promo": promo.to_dict()}


@router.get("/promo-codes")
async def get_promo_codes(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all promo codes"""
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    promos = result.scalars().all()
    
    return {"success": True, "promos": [p.to_dict() for p in promos]}


@router.put("/promo-codes/{promo_id}")
async def update_promo_code(
    promo_id: str,
    is_active: bool,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Activate/deactivate promo code"""
    result = await db.execute(select(PromoCode).where(PromoCode.id == promo_id))
    promo = result.scalar_one_or_none()
    
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    promo.is_active = is_active
    await db.commit()
    
    return {"success": True, "message": f"Promo code {'activated' if is_active else 'deactivated'}"}
