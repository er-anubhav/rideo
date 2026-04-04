from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel, Field
from typing import Optional

from models.database import get_db
from models.user import User
from models.ride import Ride, RideStatus
from models.rating import Rating
from models.driver import DriverProfile
from models.rider import RiderProfile
from routers.users import get_current_user

router = APIRouter(prefix="/api/ratings", tags=["Ratings"])


class CreateRatingRequest(BaseModel):
    ride_id: str
    rating: int = Field(..., ge=1, le=5)
    review: Optional[str] = None


@router.post("/")
async def create_rating(
    request: CreateRatingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Rate a completed ride"""
    # Get the ride
    result = await db.execute(select(Ride).where(Ride.id == request.ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only rate completed rides")
    
    # Determine who is rating whom
    if ride.rider_id == current_user.id:
        # Rider rating driver
        to_user_id = ride.driver_id
    elif ride.driver_id == current_user.id:
        # Driver rating rider
        to_user_id = ride.rider_id
    else:
        raise HTTPException(status_code=403, detail="You are not part of this ride")
    
    if not to_user_id:
        raise HTTPException(status_code=400, detail="Cannot rate - no other party")
    
    # Check if already rated
    result = await db.execute(
        select(Rating).where(
            and_(
                Rating.ride_id == ride.id,
                Rating.from_user_id == current_user.id
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="You have already rated this ride")
    
    # Create rating
    rating = Rating(
        ride_id=ride.id,
        from_user_id=current_user.id,
        to_user_id=to_user_id,
        rating=request.rating,
        review=request.review
    )
    db.add(rating)
    
    # Update average rating for the rated user
    # Get all ratings for this user
    result = await db.execute(
        select(func.avg(Rating.rating)).where(Rating.to_user_id == to_user_id)
    )
    avg_rating = result.scalar() or 5.0
    
    # Update appropriate profile
    if ride.rider_id == current_user.id:
        # Update driver's rating
        result = await db.execute(
            select(DriverProfile).where(DriverProfile.user_id == to_user_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            profile.rating = round(float(avg_rating), 2)
    else:
        # Update rider's rating
        result = await db.execute(
            select(RiderProfile).where(RiderProfile.user_id == to_user_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            profile.rating = round(float(avg_rating), 2)
    
    await db.commit()
    
    return {"success": True, "message": "Rating submitted successfully"}


@router.get("/user/{user_id}")
async def get_user_ratings(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get ratings for a user"""
    result = await db.execute(
        select(Rating).where(Rating.to_user_id == user_id)
        .order_by(Rating.created_at.desc())
        .limit(20)
    )
    ratings = result.scalars().all()
    
    # Get average
    result = await db.execute(
        select(func.avg(Rating.rating), func.count(Rating.id))
        .where(Rating.to_user_id == user_id)
    )
    row = result.one()
    avg_rating = float(row[0]) if row[0] else 5.0
    total_ratings = row[1] or 0
    
    return {
        "success": True,
        "average_rating": round(avg_rating, 2),
        "total_ratings": total_ratings,
        "ratings": [r.to_dict() for r in ratings]
    }
