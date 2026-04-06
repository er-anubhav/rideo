from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone

from models.database import get_db
from models.user import User, UserRole
from models.driver import DriverProfile, Vehicle, VehicleType
from routers.users import get_current_user

router = APIRouter(prefix="/api/drivers", tags=["Drivers"])


class VehicleRequest(BaseModel):
    vehicle_type: str = Field(..., description="bike, auto, mini, sedan, suv")
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    number_plate: str
    year: Optional[int] = None


class RegisterDriverRequest(BaseModel):
    license_number: str
    license_expiry: Optional[str] = None  # ISO date string
    vehicle: VehicleRequest


class UpdateLocationRequest(BaseModel):
    lat: float
    lng: float


class ToggleOnlineRequest(BaseModel):
    is_online: bool
    lat: Optional[float] = None
    lng: Optional[float] = None


class NearbyDriversRequest(BaseModel):
    lat: float
    lng: float
    radius_km: Optional[float] = 5.0  # Default 5km radius
    vehicle_type: Optional[str] = None  # Filter by vehicle type


@router.post("/register")
async def register_driver(
    request: RegisterDriverRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register as a driver"""
    # Check if already a driver
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already registered as a driver"
        )
    
    # Validate vehicle type
    try:
        vehicle_type = VehicleType(request.vehicle.vehicle_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vehicle type. Must be one of: {[v.value for v in VehicleType]}"
        )
    
    # Check number plate uniqueness
    result = await db.execute(
        select(Vehicle).where(Vehicle.number_plate == request.vehicle.number_plate)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle with this number plate already registered"
        )
    
    # Parse license expiry
    license_expiry = None
    if request.license_expiry:
        try:
            license_expiry = datetime.fromisoformat(request.license_expiry.replace('Z', '+00:00'))
        except ValueError:
            pass
    
    # Create driver profile
    driver_profile = DriverProfile(
        user_id=current_user.id,
        license_number=request.license_number,
        license_expiry=license_expiry
    )
    db.add(driver_profile)
    await db.flush()
    
    # Create vehicle
    vehicle = Vehicle(
        driver_id=driver_profile.id,
        vehicle_type=vehicle_type,
        make=request.vehicle.make,
        model=request.vehicle.model,
        color=request.vehicle.color,
        number_plate=request.vehicle.number_plate,
        year=request.vehicle.year
    )
    db.add(vehicle)
    
    # Update user role to driver
    current_user.role = UserRole.DRIVER
    
    await db.commit()
    await db.refresh(driver_profile)
    await db.refresh(vehicle)
    
    return {
        "success": True,
        "message": "Driver registration successful. Pending verification.",
        "driver_profile": driver_profile.to_dict(),
        "vehicle": vehicle.to_dict()
    }


@router.get("/profile")
async def get_driver_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get driver profile"""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found"
        )
    
    # Get vehicles
    result = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == profile.id)
    )
    vehicles = result.scalars().all()
    
    return {
        "success": True,
        "profile": profile.to_dict(),
        "vehicles": [v.to_dict() for v in vehicles],
        "user": current_user.to_dict()
    }


@router.post("/toggle-online")
async def toggle_online_status(
    request: ToggleOnlineRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle driver online/offline status"""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found"
        )
    
    if not profile.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your driver profile is not verified yet"
        )
    
    profile.is_online = request.is_online
    if request.lat and request.lng:
        profile.current_lat = request.lat
        profile.current_lng = request.lng
    
    await db.commit()
    
    return {
        "success": True,
        "is_online": profile.is_online,
        "message": f"You are now {'online' if profile.is_online else 'offline'}"
    }


@router.post("/location")
async def update_location(
    request: UpdateLocationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update driver's current location"""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found"
        )
    
    profile.current_lat = request.lat
    profile.current_lng = request.lng
    
    await db.commit()
    
    return {"success": True, "message": "Location updated"}


@router.get("/nearby")
async def get_nearby_drivers(
    lat: float,
    lng: float,
    vehicle_type: Optional[str] = None,
    radius_km: float = 5.0,
    db: AsyncSession = Depends(get_db)
):
    """Get nearby online drivers (for ride matching)"""
    # Simple query for online, verified drivers
    query = select(DriverProfile, User).join(User).where(
        and_(
            DriverProfile.is_online == True,
            DriverProfile.is_verified == True,
            DriverProfile.current_lat.isnot(None),
            DriverProfile.current_lng.isnot(None)
        )
    )
    
    result = await db.execute(query)
    drivers_users = result.all()
    
    nearby_drivers = []
    for driver, user in drivers_users:
        # Calculate approximate distance using Haversine formula
        import math
        
        lat1, lon1 = math.radians(lat), math.radians(lng)
        lat2, lon2 = math.radians(driver.current_lat), math.radians(driver.current_lng)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Earth radius in km
        distance = c * r
        
        if distance <= radius_km:
            # Get vehicle info
            vehicle_result = await db.execute(
                select(Vehicle).where(
                    and_(
                        Vehicle.driver_id == driver.id,
                        Vehicle.is_active == True
                    )
                )
            )
            vehicles = vehicle_result.scalars().all()
            
            # Filter by vehicle type if specified
            if vehicle_type:
                vehicles = [v for v in vehicles if v.vehicle_type.value == vehicle_type]
                if not vehicles:
                    continue
            
            nearby_drivers.append({
                "driver_id": str(user.id),
                "name": user.name,
                "phone": user.phone,
                "rating": driver.rating,
                "total_rides": driver.total_rides,
                "location": {"lat": driver.current_lat, "lng": driver.current_lng},
                "distance_km": round(distance, 2),
                "vehicles": [v.to_dict() for v in vehicles]
            })
    
    # Sort by distance
    nearby_drivers.sort(key=lambda x: x["distance_km"])
    
    return {"success": True, "drivers": nearby_drivers}


@router.post("/vehicles")
async def add_vehicle(
    request: VehicleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a new vehicle to driver profile"""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found. Register as driver first."
        )
    
    # Validate vehicle type
    try:
        vehicle_type = VehicleType(request.vehicle_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vehicle type. Must be one of: {[v.value for v in VehicleType]}"
        )
    
    # Check number plate uniqueness
    result = await db.execute(
        select(Vehicle).where(Vehicle.number_plate == request.number_plate)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle with this number plate already registered"
        )
    
    vehicle = Vehicle(
        driver_id=profile.id,
        vehicle_type=vehicle_type,
        make=request.make,
        model=request.model,
        color=request.color,
        number_plate=request.number_plate,
        year=request.year
    )
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    
    return {"success": True, "vehicle": vehicle.to_dict()}


@router.get("/vehicles")
async def get_vehicles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get driver's vehicles"""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver profile not found"
        )
    
    result = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == profile.id)
    )
    vehicles = result.scalars().all()
    
    return {"success": True, "vehicles": [v.to_dict() for v in vehicles]}
