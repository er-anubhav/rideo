from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from enum import Enum

from models.database import get_db
from models.user import User
from models.ride import Ride, RideStatus
from models.driver import DriverProfile
from routers.users import get_current_user

router = APIRouter(prefix="/api/earnings", tags=["Driver Earnings"])


class EarningsPeriod(str, Enum):
    TODAY = "today"
    YESTERDAY = "yesterday"
    THIS_WEEK = "this_week"
    LAST_WEEK = "last_week"
    THIS_MONTH = "this_month"
    LAST_MONTH = "last_month"
    CUSTOM = "custom"


class EarningsSummary(BaseModel):
    total_earnings: float
    total_rides: int
    total_distance_km: float
    total_duration_mins: int
    average_fare: float
    average_rating: Optional[float]
    period_start: str
    period_end: str


class DailyEarning(BaseModel):
    date: str
    earnings: float
    rides: int
    distance_km: float


class RideEarning(BaseModel):
    ride_id: str
    pickup_address: str
    drop_address: str
    fare: float
    distance_km: float
    duration_mins: int
    completed_at: str
    payment_method: str


def get_period_dates(period: EarningsPeriod, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get start and end datetime for a period"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if period == EarningsPeriod.TODAY:
        return today_start, now
    
    elif period == EarningsPeriod.YESTERDAY:
        yesterday_start = today_start - timedelta(days=1)
        return yesterday_start, today_start
    
    elif period == EarningsPeriod.THIS_WEEK:
        # Start from Monday
        days_since_monday = now.weekday()
        week_start = today_start - timedelta(days=days_since_monday)
        return week_start, now
    
    elif period == EarningsPeriod.LAST_WEEK:
        days_since_monday = now.weekday()
        this_week_start = today_start - timedelta(days=days_since_monday)
        last_week_start = this_week_start - timedelta(days=7)
        return last_week_start, this_week_start
    
    elif period == EarningsPeriod.THIS_MONTH:
        month_start = today_start.replace(day=1)
        return month_start, now
    
    elif period == EarningsPeriod.LAST_MONTH:
        this_month_start = today_start.replace(day=1)
        last_month_end = this_month_start - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        return last_month_start, this_month_start
    
    elif period == EarningsPeriod.CUSTOM:
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Start and end date required for custom period")
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            return start, end
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")
    
    return today_start, now


@router.get("/summary", response_model=EarningsSummary)
async def get_earnings_summary(
    period: EarningsPeriod = Query(EarningsPeriod.TODAY),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get earnings summary for a driver"""
    # Verify user is a driver
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    
    if not driver:
        raise HTTPException(status_code=403, detail="Only drivers can view earnings")
    
    period_start, period_end = get_period_dates(period, start_date, end_date)
    
    # Get completed rides in period
    result = await db.execute(
        select(Ride).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= period_start,
                Ride.completed_at <= period_end
            )
        )
    )
    rides = result.scalars().all()
    
    total_earnings = sum(r.actual_fare or 0 for r in rides)
    total_rides = len(rides)
    total_distance = sum(r.actual_distance_km or r.estimated_distance_km or 0 for r in rides)
    total_duration = sum(r.actual_duration_mins or r.estimated_duration_mins or 0 for r in rides)
    average_fare = total_earnings / total_rides if total_rides > 0 else 0
    
    return EarningsSummary(
        total_earnings=round(total_earnings, 2),
        total_rides=total_rides,
        total_distance_km=round(total_distance, 2),
        total_duration_mins=total_duration,
        average_fare=round(average_fare, 2),
        average_rating=driver.rating,
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat()
    )


@router.get("/daily", response_model=List[DailyEarning])
async def get_daily_earnings(
    days: int = Query(7, ge=1, le=30, description="Number of days to fetch"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get daily earnings breakdown for last N days"""
    # Verify user is a driver
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    
    if not driver:
        raise HTTPException(status_code=403, detail="Only drivers can view earnings")
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Get completed rides
    result = await db.execute(
        select(Ride).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= start_date
            )
        ).order_by(Ride.completed_at.desc())
    )
    rides = result.scalars().all()
    
    # Group by date
    daily_data = {}
    for ride in rides:
        date_str = ride.completed_at.date().isoformat()
        if date_str not in daily_data:
            daily_data[date_str] = {"earnings": 0, "rides": 0, "distance_km": 0}
        
        daily_data[date_str]["earnings"] += ride.actual_fare or 0
        daily_data[date_str]["rides"] += 1
        daily_data[date_str]["distance_km"] += ride.actual_distance_km or ride.estimated_distance_km or 0
    
    # Fill in missing dates with zeros
    result = []
    for i in range(days):
        date = (now - timedelta(days=i)).date().isoformat()
        if date in daily_data:
            result.append(DailyEarning(
                date=date,
                earnings=round(daily_data[date]["earnings"], 2),
                rides=daily_data[date]["rides"],
                distance_km=round(daily_data[date]["distance_km"], 2)
            ))
        else:
            result.append(DailyEarning(
                date=date,
                earnings=0,
                rides=0,
                distance_km=0
            ))
    
    return result


@router.get("/rides", response_model=List[RideEarning])
async def get_ride_earnings(
    period: EarningsPeriod = Query(EarningsPeriod.TODAY),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get individual ride earnings"""
    # Verify user is a driver
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    
    if not driver:
        raise HTTPException(status_code=403, detail="Only drivers can view earnings")
    
    period_start, period_end = get_period_dates(period, start_date, end_date)
    offset = (page - 1) * limit
    
    # Get completed rides
    result = await db.execute(
        select(Ride).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= period_start,
                Ride.completed_at <= period_end
            )
        )
        .order_by(Ride.completed_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rides = result.scalars().all()
    
    return [
        RideEarning(
            ride_id=str(r.id),
            pickup_address=r.pickup_address,
            drop_address=r.drop_address,
            fare=r.actual_fare or r.estimated_fare,
            distance_km=r.actual_distance_km or r.estimated_distance_km,
            duration_mins=r.actual_duration_mins or r.estimated_duration_mins,
            completed_at=r.completed_at.isoformat() if r.completed_at else "",
            payment_method=r.payment_method
        )
        for r in rides
    ]


@router.get("/stats")
async def get_earnings_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get overall earnings statistics"""
    # Verify user is a driver
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    
    if not driver:
        raise HTTPException(status_code=403, detail="Only drivers can view earnings")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = today_start.replace(day=1)
    
    # Today's earnings
    result = await db.execute(
        select(func.sum(Ride.actual_fare), func.count(Ride.id)).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= today_start
            )
        )
    )
    today_row = result.one()
    today_earnings = float(today_row[0] or 0)
    today_rides = today_row[1] or 0
    
    # This week's earnings
    result = await db.execute(
        select(func.sum(Ride.actual_fare), func.count(Ride.id)).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= week_start
            )
        )
    )
    week_row = result.one()
    week_earnings = float(week_row[0] or 0)
    week_rides = week_row[1] or 0
    
    # This month's earnings
    result = await db.execute(
        select(func.sum(Ride.actual_fare), func.count(Ride.id)).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= month_start
            )
        )
    )
    month_row = result.one()
    month_earnings = float(month_row[0] or 0)
    month_rides = month_row[1] or 0
    
    # All time stats
    all_time_earnings = driver.total_earnings
    all_time_rides = driver.total_rides
    
    return {
        "success": True,
        "stats": {
            "today": {
                "earnings": round(today_earnings, 2),
                "rides": today_rides
            },
            "this_week": {
                "earnings": round(week_earnings, 2),
                "rides": week_rides
            },
            "this_month": {
                "earnings": round(month_earnings, 2),
                "rides": month_rides
            },
            "all_time": {
                "earnings": round(all_time_earnings, 2),
                "rides": all_time_rides
            },
            "rating": driver.rating
        }
    }


@router.get("/weekly-comparison")
async def get_weekly_comparison(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Compare this week vs last week earnings"""
    # Verify user is a driver
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    
    if not driver:
        raise HTTPException(status_code=403, detail="Only drivers can view earnings")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # This week
    this_week_start = today_start - timedelta(days=now.weekday())
    
    # Last week
    last_week_start = this_week_start - timedelta(days=7)
    last_week_end = this_week_start
    
    # This week's data
    result = await db.execute(
        select(func.sum(Ride.actual_fare), func.count(Ride.id), func.sum(Ride.actual_distance_km)).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= this_week_start
            )
        )
    )
    this_week = result.one()
    
    # Last week's data
    result = await db.execute(
        select(func.sum(Ride.actual_fare), func.count(Ride.id), func.sum(Ride.actual_distance_km)).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status == RideStatus.COMPLETED,
                Ride.completed_at >= last_week_start,
                Ride.completed_at < last_week_end
            )
        )
    )
    last_week = result.one()
    
    this_week_earnings = float(this_week[0] or 0)
    last_week_earnings = float(last_week[0] or 0)
    
    # Calculate percentage change
    if last_week_earnings > 0:
        change_percent = ((this_week_earnings - last_week_earnings) / last_week_earnings) * 100
    else:
        change_percent = 100 if this_week_earnings > 0 else 0
    
    return {
        "success": True,
        "comparison": {
            "this_week": {
                "earnings": round(this_week_earnings, 2),
                "rides": this_week[1] or 0,
                "distance_km": round(float(this_week[2] or 0), 2),
                "period": f"{this_week_start.date().isoformat()} to {now.date().isoformat()}"
            },
            "last_week": {
                "earnings": round(last_week_earnings, 2),
                "rides": last_week[1] or 0,
                "distance_km": round(float(last_week[2] or 0), 2),
                "period": f"{last_week_start.date().isoformat()} to {last_week_end.date().isoformat()}"
            },
            "change_percent": round(change_percent, 1),
            "trend": "up" if change_percent > 0 else ("down" if change_percent < 0 else "same")
        }
    }
