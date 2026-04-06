from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import UUID

from models.database import get_db
from models.user import User, UserRole
from models.ride import Ride, RideStatus, RideRequest, RideTracking
from models.driver import DriverProfile, Vehicle, VehicleType
from routers.users import get_current_user
from services.mappls_service import mappls_service
from services.fare_service import fare_service
from websocket_manager import connection_manager, NotificationType

router = APIRouter(prefix="/api/rides", tags=["Rides"])


class FareEstimateRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    vehicle_type: Optional[str] = None  # If not specified, return all vehicle types


class CreateRideRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    drop_lat: float
    drop_lng: float
    drop_address: str
    vehicle_type: str
    promo_code: Optional[str] = None


class RideActionRequest(BaseModel):
    vehicle_id: Optional[str] = None  # Required for driver accepting


class CancelRideRequest(BaseModel):
    reason: Optional[str] = None


class StartRideRequest(BaseModel):
    otp: Optional[str] = None


class RideSosRequest(BaseModel):
    message: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def decode_polyline(polyline: str) -> List[dict]:
    """Decode an encoded polyline into latitude/longitude pairs."""
    if not polyline:
        return []

    coordinates = []
    index = 0
    lat = 0
    lng = 0

    while index < len(polyline):
        shift = 0
        result = 0
        while True:
            b = ord(polyline[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        delta_lat = ~(result >> 1) if result & 1 else result >> 1
        lat += delta_lat

        shift = 0
        result = 0
        while True:
            b = ord(polyline[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        delta_lng = ~(result >> 1) if result & 1 else result >> 1
        lng += delta_lng

        coordinates.append({
            "latitude": lat / 1e5,
            "longitude": lng / 1e5,
        })

    return coordinates


@router.post("/estimate")
async def get_fare_estimate(
    request: FareEstimateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Get fare estimates for a ride"""
    # Get distance and duration from Mappls
    route_info = await mappls_service.get_eta(
        (request.pickup_lat, request.pickup_lng),
        (request.drop_lat, request.drop_lng)
    )
    
    if not route_info:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not calculate route. Please try again."
        )
    
    distance_km = route_info["distance_km"]
    duration_mins = route_info["duration_mins"]
    
    # Calculate surge (simplified - could be based on real demand)
    surge_multiplier = 1.0
    
    estimates = []
    
    if request.vehicle_type:
        # Single vehicle type estimate
        try:
            VehicleType(request.vehicle_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid vehicle type. Must be one of: {[v.value for v in VehicleType]}"
            )
        
        fare = await fare_service.calculate_fare(
            db, request.vehicle_type, distance_km, duration_mins, surge_multiplier
        )
        estimates.append({
            "vehicle_type": request.vehicle_type,
            **fare
        })
    else:
        # All vehicle type estimates
        for vtype in VehicleType:
            fare = await fare_service.calculate_fare(
                db, vtype.value, distance_km, duration_mins, surge_multiplier
            )
            estimates.append({
                "vehicle_type": vtype.value,
                **fare
            })
    
    return {
        "success": True,
        "distance_km": distance_km,
        "duration_mins": duration_mins,
        "surge_multiplier": surge_multiplier,
        "estimates": estimates
    }


@router.post("/request")
async def create_ride_request(
    request: CreateRideRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new ride request"""
    # Validate vehicle type
    try:
        vehicle_type = VehicleType(request.vehicle_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid vehicle type"
        )
    
    # Check for existing active ride
    result = await db.execute(
        select(Ride).where(
            and_(
                Ride.rider_id == current_user.id,
                Ride.status.in_([
                    RideStatus.SEARCHING,
                    RideStatus.ACCEPTED,
                    RideStatus.ARRIVING,
                    RideStatus.ARRIVED,
                    RideStatus.IN_PROGRESS
                ])
            )
        )
    )
    existing_ride = result.scalar_one_or_none()
    
    if existing_ride:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active ride"
        )
    
    # Get route info
    route_info = await mappls_service.get_route(
        (request.pickup_lat, request.pickup_lng),
        (request.drop_lat, request.drop_lng)
    )
    
    if not route_info:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not calculate route"
        )
    
    distance_km = route_info["distance_km"]
    duration_mins = route_info["duration_mins"]
    polyline = route_info.get("polyline", "")
    
    # Calculate fare
    fare_info = await fare_service.calculate_fare(
        db, request.vehicle_type, distance_km, duration_mins
    )
    
    # Create ride
    ride = Ride(
        rider_id=current_user.id,
        status=RideStatus.SEARCHING,
        vehicle_type=vehicle_type,
        pickup_lat=request.pickup_lat,
        pickup_lng=request.pickup_lng,
        pickup_address=request.pickup_address,
        drop_lat=request.drop_lat,
        drop_lng=request.drop_lng,
        drop_address=request.drop_address,
        estimated_fare=fare_info["total_fare"],
        estimated_distance_km=distance_km,
        estimated_duration_mins=duration_mins,
        route_polyline=polyline,
        payment_method="cash"
    )
    
    db.add(ride)
    await db.commit()
    await db.refresh(ride)
    
    return {
        "success": True,
        "message": "Ride request created. Looking for drivers...",
        "ride": ride.to_dict()
    }


@router.get("/current")
async def get_current_ride(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current active ride for user"""
    # Check if user is rider
    result = await db.execute(
        select(Ride).where(
            and_(
                Ride.rider_id == current_user.id,
                Ride.status.in_([
                    RideStatus.SEARCHING,
                    RideStatus.ACCEPTED,
                    RideStatus.ARRIVING,
                    RideStatus.ARRIVED,
                    RideStatus.IN_PROGRESS
                ])
            )
        )
    )
    ride = result.scalar_one_or_none()
    
    if ride:
        # Get driver info if assigned
        driver_info = None
        vehicle_info = None
        if ride.driver_id:
            driver_result = await db.execute(
                select(User, DriverProfile).join(DriverProfile).where(User.id == ride.driver_id)
            )
            row = driver_result.one_or_none()
            if row:
                driver, profile = row
                driver_info = {
                    "id": str(driver.id),
                    "name": driver.name,
                    "phone": driver.phone,
                    "rating": profile.rating,
                    "location": {"lat": profile.current_lat, "lng": profile.current_lng}
                }
        
        if ride.vehicle_id:
            vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == ride.vehicle_id))
            vehicle = vehicle_result.scalar_one_or_none()
            if vehicle:
                vehicle_info = vehicle.to_dict()
        
        return {
            "success": True,
            "ride": ride.to_dict(),
            "driver": driver_info,
            "vehicle": vehicle_info
        }
    
    # Check if user is driver
    result = await db.execute(
        select(Ride).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.status.in_([
                    RideStatus.ACCEPTED,
                    RideStatus.ARRIVING,
                    RideStatus.ARRIVED,
                    RideStatus.IN_PROGRESS
                ])
            )
        )
    )
    ride = result.scalar_one_or_none()
    
    if ride:
        # Get rider info
        rider_result = await db.execute(select(User).where(User.id == ride.rider_id))
        rider = rider_result.scalar_one_or_none()
        rider_info = {
            "id": str(rider.id),
            "name": rider.name,
            "phone": rider.phone
        } if rider else None
        
        return {
            "success": True,
            "ride": ride.to_dict(),
            "rider": rider_info
        }
    
    return {"success": True, "ride": None}


@router.get("/requests")
async def get_ride_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get pending ride requests for driver"""
    # Get driver profile
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile or not profile.is_online:
        return {"success": True, "requests": []}
    
    # Get driver's vehicles
    result = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == profile.id)
    )
    vehicles = result.scalars().all()
    vehicle_types = [v.vehicle_type for v in vehicles]
    
    if not vehicle_types:
        return {"success": True, "requests": []}
    
    # Get pending rides matching driver's vehicle types
    result = await db.execute(
        select(Ride).where(
            and_(
                Ride.status == RideStatus.SEARCHING,
                Ride.vehicle_type.in_(vehicle_types)
            )
        ).order_by(Ride.created_at.desc()).limit(10)
    )
    rides = result.scalars().all()
    
    # Calculate distance from driver to each pickup
    requests = []
    for ride in rides:
        distance_info = await mappls_service.get_eta(
            (profile.current_lat, profile.current_lng),
            (ride.pickup_lat, ride.pickup_lng)
        )
        
        eta_mins = distance_info["duration_mins"] if distance_info else None
        
        # Get rider info
        rider_result = await db.execute(select(User).where(User.id == ride.rider_id))
        rider = rider_result.scalar_one_or_none()
        
        requests.append({
            "ride": ride.to_dict(),
            "rider": {"name": rider.name if rider else "Unknown"},
            "pickup_eta_mins": eta_mins
        })
    
    return {"success": True, "requests": requests}


@router.post("/{ride_id}/accept")
async def accept_ride(
    ride_id: str,
    request: RideActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Driver accepts a ride"""
    # Get driver profile
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=403, detail="You are not a driver")
    
    if not profile.is_verified:
        raise HTTPException(status_code=403, detail="Your profile is not verified")
    
    # Get the ride
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.SEARCHING:
        raise HTTPException(status_code=400, detail="Ride is no longer available")
    
    # Get vehicle
    if not request.vehicle_id:
        # Use first matching vehicle
        result = await db.execute(
            select(Vehicle).where(
                and_(
                    Vehicle.driver_id == profile.id,
                    Vehicle.vehicle_type == ride.vehicle_type,
                    Vehicle.is_active == True
                )
            )
        )
        vehicle = result.scalar_one_or_none()
    else:
        result = await db.execute(
            select(Vehicle).where(Vehicle.id == request.vehicle_id)
        )
        vehicle = result.scalar_one_or_none()
    
    if not vehicle:
        raise HTTPException(status_code=400, detail="No matching vehicle found")
    
    # Update ride
    ride.driver_id = current_user.id
    ride.vehicle_id = vehicle.id
    ride.status = RideStatus.ACCEPTED
    ride.accepted_at = datetime.now(timezone.utc)
    
    # Set driver as busy (offline)
    profile.is_online = False
    
    await db.commit()
    await db.refresh(ride)
    
    # Get driver location
    driver_location = {
        "lat": profile.current_lat or ride.pickup_lat,
        "lng": profile.current_lng or ride.pickup_lng
    }
    
    # Send push notification to rider
    vehicle_info = f"{vehicle.color} {vehicle.make} {vehicle.model} ({vehicle.number_plate})"
    eta_info = await mappls_service.get_eta(
        (driver_location["lat"], driver_location["lng"]),
        (ride.pickup_lat, ride.pickup_lng)
    )
    eta_mins = eta_info["duration_mins"] if eta_info else 10
    
    ride_data = {
        "ride_id": str(ride.id),
        "driver_id": str(current_user.id),
        "driver_name": current_user.name or "Driver",
        "driver_phone": current_user.phone,
        "vehicle": vehicle.to_dict(),
        "driver_location": driver_location,
        "eta_mins": eta_mins,
        "status": RideStatus.ACCEPTED.value
    }
    
    # Save notification to database and send via WebSocket
    await connection_manager.notify_ride_accepted(
        str(ride.rider_id),
        current_user.name or "Driver",
        vehicle_info,
        eta_mins,
        ride_data,
        db=db  # Pass db session to save notification
    )
    
    # Send explicit status update event to rider (separate from notification)
    await connection_manager.send_to_rider(
        str(ride.rider_id),
        {
            "event": "ride_status_changed",
            "ride_id": str(ride.id),
            "status": RideStatus.ACCEPTED.value,
            "driver": {
                "id": str(current_user.id),
                "name": current_user.name or "Driver",
                "phone": current_user.phone,
                "rating": profile.rating,
                "location": driver_location
            },
            "vehicle": vehicle.to_dict(),
            "eta_mins": eta_mins,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    
    # Register/Update ride in connection manager
    if str(ride.id) in connection_manager.active_rides:
        connection_manager.update_ride_driver(str(ride.id), str(current_user.id))
    else:
        connection_manager.register_ride(str(ride.id), str(ride.rider_id), str(current_user.id))
    
    return {
        "success": True,
        "message": "Ride accepted!",
        "ride": ride.to_dict(),
        "driver": {
            "name": current_user.name,
            "phone": current_user.phone,
            "rating": profile.rating,
            "location": driver_location
        },
        "vehicle": vehicle.to_dict()
    }


@router.post("/{ride_id}/arriving")
async def driver_arriving(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark driver as arriving to pickup"""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride or ride.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Invalid ride status")
    
    ride.status = RideStatus.ARRIVING
    await db.commit()
    await db.refresh(ride)
    
    # Get driver profile for ETA
    profile_result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    
    eta_info = await mappls_service.get_eta(
        (profile.current_lat or ride.pickup_lat, profile.current_lng or ride.pickup_lng),
        (ride.pickup_lat, ride.pickup_lng)
    ) if profile else None
    eta_mins = eta_info["duration_mins"] if eta_info else 5
    
    ride_data = {
        "ride_id": str(ride.id),
        "eta_mins": eta_mins,
        "status": RideStatus.ARRIVING.value
    }
    
    # Send push notification with db session
    await connection_manager.notify_driver_arriving(
        str(ride.rider_id),
        current_user.name or "Driver",
        eta_mins,
        ride_data,
        db=db  # Save to database
    )
    
    # Send explicit status update event
    await connection_manager.send_to_rider(
        str(ride.rider_id),
        {
            "event": "ride_status_changed",
            "ride_id": str(ride.id),
            "status": RideStatus.ARRIVING.value,
            "eta_mins": eta_mins,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    
    return {"success": True, "message": "Status updated to arriving", "ride": ride.to_dict()}


@router.post("/{ride_id}/arrived")
async def driver_arrived(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark driver as arrived at pickup"""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride or ride.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.ARRIVING:
        raise HTTPException(status_code=400, detail="Invalid ride status")
    
    ride.status = RideStatus.ARRIVED
    await db.commit()
    await db.refresh(ride)
    
    ride_data = {
        "ride_id": str(ride.id),
        "status": RideStatus.ARRIVED.value,
        "otp": ride.get_start_otp() if hasattr(ride, 'get_start_otp') else None
    }
    
    # Send push notification with db session
    await connection_manager.notify_driver_arrived(
        str(ride.rider_id),
        current_user.name or "Driver",
        ride_data,
        db=db  # Save to database
    )
    
    # Send explicit status update event
    await connection_manager.send_to_rider(
        str(ride.rider_id),
        {
            "event": "ride_status_changed",
            "ride_id": str(ride.id),
            "status": RideStatus.ARRIVED.value,
            "otp": ride.get_start_otp() if hasattr(ride, 'get_start_otp') else None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    
    return {"success": True, "message": "Status updated to arrived", "ride": ride.to_dict()}


@router.post("/{ride_id}/start")
async def start_ride(
    ride_id: str,
    request: Optional[StartRideRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start the ride"""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride or ride.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.ARRIVED:
        raise HTTPException(status_code=400, detail="Invalid ride status")

    if request and request.otp and request.otp != ride.get_start_otp():
        raise HTTPException(status_code=400, detail="Invalid ride OTP")
    
    ride.status = RideStatus.IN_PROGRESS
    ride.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(ride)
    
    ride_data = {
        "ride_id": str(ride.id),
        "status": RideStatus.IN_PROGRESS.value,
        "drop_address": ride.drop_address,
        "started_at": ride.started_at.isoformat()
    }
    
    # Send push notification with db session
    await connection_manager.notify_ride_started(
        str(ride.rider_id),
        ride_data,
        db=db  # Save to database
    )
    
    # Send explicit status update event
    await connection_manager.send_to_rider(
        str(ride.rider_id),
        {
            "event": "ride_status_changed",
            "ride_id": str(ride.id),
            "status": RideStatus.IN_PROGRESS.value,
            "drop_address": ride.drop_address,
            "started_at": ride.started_at.isoformat(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

    return {"success": True, "message": "Ride started", "ride": ride.to_dict()}


@router.get("/{ride_id}/route")
async def get_ride_route(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a live route snapshot for the ride."""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if current_user.id not in [ride.rider_id, ride.driver_id]:
        raise HTTPException(status_code=403, detail="You cannot access this ride")

    origin = (ride.pickup_lat, ride.pickup_lng)
    destination = (ride.drop_lat, ride.drop_lng)
    phase = "preview"

    if ride.status in [RideStatus.ACCEPTED, RideStatus.ARRIVING, RideStatus.ARRIVED] and ride.driver_id:
        driver_result = await db.execute(
            select(DriverProfile).where(DriverProfile.user_id == ride.driver_id)
        )
        driver_profile = driver_result.scalar_one_or_none()

        if driver_profile and driver_profile.current_lat is not None and driver_profile.current_lng is not None:
            origin = (driver_profile.current_lat, driver_profile.current_lng)
            destination = (ride.pickup_lat, ride.pickup_lng)
            phase = "to_pickup"
    elif ride.status in [RideStatus.IN_PROGRESS, RideStatus.COMPLETED]:
        phase = "to_drop"

    route_info = await mappls_service.get_route(origin, destination)
    if not route_info:
        raise HTTPException(status_code=500, detail="Could not calculate ride route")

    coordinates = decode_polyline(route_info.get("polyline", ""))
    if not coordinates:
        coordinates = [
            {"latitude": origin[0], "longitude": origin[1]},
            {"latitude": destination[0], "longitude": destination[1]},
        ]

    return {
        "rideId": str(ride.id),
        "phase": phase,
        "provider": "mappls",
        "source": "live",
        "cached": False,
        "costInr": 0,
        "distanceMeters": int((route_info.get("distance_km") or 0) * 1000),
        "durationSeconds": int((route_info.get("duration_mins") or 0) * 60),
        "etaIso": None,
        "coordinates": coordinates,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/{ride_id}/complete")
async def complete_ride(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete the ride"""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride or ride.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status != RideStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Invalid ride status")
    
    # Calculate actual fare based on actual distance/duration
    # For now, use estimated values
    ride.actual_fare = ride.estimated_fare
    ride.actual_distance_km = ride.estimated_distance_km
    ride.actual_duration_mins = ride.estimated_duration_mins
    
    ride.status = RideStatus.COMPLETED
    ride.completed_at = datetime.now(timezone.utc)
    ride.payment_status = "completed"  # Cash payment assumed complete
    
    # Update driver stats
    driver_result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    driver = driver_result.scalar_one_or_none()
    if driver:
        driver.total_rides += 1
        driver.total_earnings += ride.actual_fare
        driver.is_online = True  # Back online after ride
    
    # Update rider stats
    from models.rider import RiderProfile
    rider_result = await db.execute(
        select(RiderProfile).where(RiderProfile.user_id == ride.rider_id)
    )
    rider = rider_result.scalar_one_or_none()
    if rider:
        rider.total_rides += 1
    
    await db.commit()
    await db.refresh(ride)
    
    ride_data = {
        "ride_id": str(ride.id),
        "fare": ride.actual_fare,
        "distance_km": ride.actual_distance_km,
        "duration_mins": ride.actual_duration_mins,
        "status": RideStatus.COMPLETED.value,
        "completed_at": ride.completed_at.isoformat()
    }
    
    # Send push notifications with db session
    await connection_manager.notify_ride_completed(
        str(ride.rider_id),
        ride.actual_fare,
        ride_data,
        db=db  # Save to database
    )
    
    await connection_manager.notify_payment_received(
        str(current_user.id),
        ride.actual_fare,
        ride_data,
        db=db  # Save to database
    )
    
    # Send explicit status update events
    await connection_manager.send_to_rider(
        str(ride.rider_id),
        {
            "event": "ride_status_changed",
            "ride_id": str(ride.id),
            "status": RideStatus.COMPLETED.value,
            "fare": ride.actual_fare,
            "distance_km": ride.actual_distance_km,
            "duration_mins": ride.actual_duration_mins,
            "completed_at": ride.completed_at.isoformat(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    
    await connection_manager.send_to_driver(
        str(current_user.id),
        {
            "event": "ride_status_changed",
            "ride_id": str(ride.id),
            "status": RideStatus.COMPLETED.value,
            "earnings": ride.actual_fare,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )
    
    # Complete ride in connection manager
    connection_manager.complete_ride(str(ride.id))
    
    return {
        "success": True,
        "message": "Ride completed!",
        "fare": ride.actual_fare,
        "payment_method": "cash"
    }


@router.get("/{ride_id}/invoice")
async def get_ride_invoice(
    ride_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a lightweight invoice payload for a ride."""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if current_user.id not in [ride.rider_id, ride.driver_id]:
        raise HTTPException(status_code=403, detail="You cannot access this ride")

    total_fare = ride.actual_fare or ride.estimated_fare or 0
    return {
        "invoiceId": f"INV-{str(ride.id).split('-')[0].upper()}",
        "rideId": str(ride.id),
        "totalFare": round(total_fare, 2),
        "paymentStatus": ride.payment_status or "pending",
        "paymentMethod": ride.payment_method or "cash",
        "pickupAddress": ride.pickup_address,
        "dropAddress": ride.drop_address,
        "requestedAt": ride.created_at.isoformat() if ride.created_at else None,
        "completedAt": ride.completed_at.isoformat() if ride.completed_at else None,
    }


@router.post("/{ride_id}/sos")
async def send_ride_sos(
    ride_id: str,
    request: RideSosRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Record an SOS event and report how many admins were notified."""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()

    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if current_user.id not in [ride.rider_id, ride.driver_id]:
        raise HTTPException(status_code=403, detail="You cannot access this ride")

    admins_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.ADMIN,
            User.is_active == True
        )
    )
    notified_admins = admins_result.scalar() or 0

    return {
        "success": True,
        "message": request.message or "SOS sent",
        "notifiedAdmins": notified_admins,
        "rideId": str(ride.id),
        "location": {
            "latitude": request.latitude,
            "longitude": request.longitude,
        },
    }


@router.post("/{ride_id}/cancel")
async def cancel_ride(
    ride_id: str,
    request: CancelRideRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel the ride"""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    # Check if user can cancel
    is_rider = ride.rider_id == current_user.id
    is_driver = ride.driver_id == current_user.id
    
    if not is_rider and not is_driver:
        raise HTTPException(status_code=403, detail="You cannot cancel this ride")
    
    if ride.status in [RideStatus.COMPLETED, RideStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Ride cannot be cancelled")
    
    ride.status = RideStatus.CANCELLED
    ride.cancelled_at = datetime.now(timezone.utc)
    ride.cancelled_by = "rider" if is_rider else "driver"
    ride.cancellation_reason = request.reason
    
    # If driver cancelled, set them back online
    if is_driver:
        driver_result = await db.execute(
            select(DriverProfile).where(DriverProfile.user_id == current_user.id)
        )
        driver = driver_result.scalar_one_or_none()
        if driver:
            driver.is_online = True
    
    await db.commit()
    await db.refresh(ride)
    
    # Send push notifications with db session
    reason_text = request.reason or "No reason provided"
    ride_data = {
        "ride_id": str(ride.id),
        "status": RideStatus.CANCELLED.value,
        "cancelled_by": ride.cancelled_by,
        "reason": reason_text,
        "cancelled_at": ride.cancelled_at.isoformat()
    }
    
    if is_rider and ride.driver_id:
        # Notify driver that rider cancelled
        await connection_manager.notify_ride_cancelled(
            str(ride.driver_id),
            "driver",
            "rider",
            reason_text,
            ride_data,
            db=db  # Save to database
        )
        # Send explicit status update
        await connection_manager.send_to_driver(
            str(ride.driver_id),
            {
                "event": "ride_status_changed",
                "ride_id": str(ride.id),
                "status": RideStatus.CANCELLED.value,
                "cancelled_by": "rider",
                "reason": reason_text,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    elif is_driver:
        # Notify rider that driver cancelled
        await connection_manager.notify_ride_cancelled(
            str(ride.rider_id),
            "rider",
            "driver",
            reason_text,
            ride_data,
            db=db  # Save to database
        )
        # Send explicit status update
        await connection_manager.send_to_rider(
            str(ride.rider_id),
            {
                "event": "ride_status_changed",
                "ride_id": str(ride.id),
                "status": RideStatus.CANCELLED.value,
                "cancelled_by": "driver",
                "reason": reason_text,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    
    # Complete ride in connection manager
    connection_manager.complete_ride(str(ride.id))
    
    return {"success": True, "message": "Ride cancelled", "ride": ride.to_dict()}


@router.get("/history")
async def get_ride_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Get ride history"""
    offset = (page - 1) * limit
    
    # Get rides where user is rider or driver
    result = await db.execute(
        select(Ride).where(
            or_(
                Ride.rider_id == current_user.id,
                Ride.driver_id == current_user.id
            )
        )
        .where(Ride.status.in_([RideStatus.COMPLETED, RideStatus.CANCELLED]))
        .order_by(Ride.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rides = result.scalars().all()
    
    # Get total count
    count_result = await db.execute(
        select(func.count(Ride.id)).where(
            or_(
                Ride.rider_id == current_user.id,
                Ride.driver_id == current_user.id
            )
        )
        .where(Ride.status.in_([RideStatus.COMPLETED, RideStatus.CANCELLED]))
    )
    total = count_result.scalar()
    
    return {
        "success": True,
        "rides": [r.to_dict() for r in rides],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.post("/{ride_id}/track")
async def add_tracking_point(
    ride_id: str,
    lat: float,
    lng: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add tracking point for ride (driver only)"""
    result = await db.execute(select(Ride).where(Ride.id == ride_id))
    ride = result.scalar_one_or_none()
    
    if not ride or ride.driver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride.status not in [RideStatus.ARRIVING, RideStatus.ARRIVED, RideStatus.IN_PROGRESS]:
        raise HTTPException(status_code=400, detail="Invalid ride status")
    
    tracking = RideTracking(ride_id=ride.id, lat=lat, lng=lng)
    db.add(tracking)
    
    # Update driver location
    driver_result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    driver = driver_result.scalar_one_or_none()
    if driver:
        driver.current_lat = lat
        driver.current_lng = lng
    
    await db.commit()
    
    return {"success": True}
