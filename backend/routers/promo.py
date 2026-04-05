from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.database import get_db
from models.user import User
from models.promo import PromoCode, PromoUsage
from routers.users import get_current_user

router = APIRouter(prefix="/api/promo", tags=["Promo Codes"])


@router.get("/validate/{code}")
async def validate_promo_code(
    code: str,
    ride_amount: float = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate a promo code"""
    result = await db.execute(
        select(PromoCode).where(PromoCode.code == code.upper())
    )
    promo = result.scalar_one_or_none()
    
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    if not promo.is_valid():
        raise HTTPException(status_code=400, detail="Promo code is expired or inactive")
    
    # Check user's usage
    result = await db.execute(
        select(PromoUsage).where(
            and_(
                PromoUsage.promo_id == promo.id,
                PromoUsage.user_id == current_user.id
            )
        )
    )
    usages = result.scalars().all()
    
    if len(usages) >= promo.max_uses_per_user:
        raise HTTPException(status_code=400, detail="You have already used this promo code")
    
    # Calculate discount
    discount = promo.calculate_discount(ride_amount) if ride_amount > 0 else 0
    
    return {
        "success": True,
        "promo": promo.to_dict(),
        "discount": round(discount, 2),
        "message": f"Promo code valid! You'll save ₹{round(discount, 2)}" if discount else "Promo code valid!"
    }


@router.post("/apply/{code}")
async def apply_promo_code(
    code: str,
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply promo code to a ride"""
    # Get promo
    result = await db.execute(
        select(PromoCode).where(PromoCode.code == code.upper())
    )
    promo = result.scalar_one_or_none()
    
    if not promo or not promo.is_valid():
        raise HTTPException(status_code=400, detail="Invalid or expired promo code")
    
    # Get ride
    from models.ride import Ride, RideStatus
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride or ride.rider_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.SEARCHING:
        raise HTTPException(status_code=400, detail="Promo can only be applied to pending rides")
    
    # Check if promo already applied
    if ride.promo_discount > 0:
        raise HTTPException(status_code=400, detail="A promo code is already applied to this ride")
    
    # Check user's usage
    result = await db.execute(
        select(PromoUsage).where(
            and_(
                PromoUsage.promo_id == promo.id,
                PromoUsage.user_id == current_user.id
            )
        )
    )
    usages = result.scalars().all()
    
    if len(usages) >= promo.max_uses_per_user:
        raise HTTPException(status_code=400, detail="You have already used this promo code")
    
    # Calculate and apply discount
    discount = promo.calculate_discount(ride.estimated_fare)
    
    ride.promo_discount = discount
    ride.estimated_fare = max(ride.estimated_fare - discount, 0)
    
    # Record usage
    usage = PromoUsage(
        promo_id=promo.id,
        user_id=current_user.id,
        ride_id=ride.id,
        discount_applied=discount
    )
    db.add(usage)
    
    # Update promo usage count
    promo.current_uses += 1
    
    await db.commit()
    
    return {
        "success": True,
        "discount": round(discount, 2),
        "new_fare": round(ride.estimated_fare, 2),
        "message": f"Promo applied! You saved ₹{round(discount, 2)}"
    }
