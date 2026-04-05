from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List

from services.mappls_service import mappls_service

router = APIRouter(prefix="/api/maps", tags=["Maps"])


def decode_polyline(polyline: str) -> List[dict]:
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
        lat += ~(result >> 1) if result & 1 else result >> 1

        shift = 0
        result = 0
        while True:
            b = ord(polyline[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lng += ~(result >> 1) if result & 1 else result >> 1

        coordinates.append({
            "latitude": lat / 1e5,
            "longitude": lng / 1e5,
        })

    return coordinates


class GeocodeRequest(BaseModel):
    address: str


class ReverseGeocodeRequest(BaseModel):
    lat: float
    lng: float


class DistanceRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float


class RouteRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    waypoints: Optional[List[dict]] = None  # [{"lat": float, "lng": float}, ...]


@router.get("/geocode")
async def geocode(address: str = Query(..., description="Address to geocode")):
    """Convert address to coordinates"""
    result = await mappls_service.geocode(address)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find coordinates for this address"
        )
    
    return {"success": True, "data": result}


@router.get("/reverse-geocode")
async def reverse_geocode(
    lat: float = Query(...),
    lng: float = Query(...)
):
    """Convert coordinates to address"""
    result = await mappls_service.reverse_geocode(lat, lng)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find address for these coordinates"
        )
    
    return {"success": True, "data": result}


@router.get("/autocomplete")
async def autocomplete(
    query: str = Query(..., min_length=2),
    lat: Optional[float] = None,
    lng: Optional[float] = None
):
    """Get address autocomplete suggestions"""
    location = (lat, lng) if lat and lng else None
    results = await mappls_service.autocomplete(query, location)
    
    return {"success": True, "suggestions": results}


@router.get("/distance")
async def get_distance(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...)
):
    """Get distance and ETA between two points"""
    result = await mappls_service.get_eta(
        (origin_lat, origin_lng),
        (dest_lat, dest_lng)
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not calculate distance"
        )
    
    return {"success": True, "data": result}


@router.post("/route")
async def get_route(request: RouteRequest):
    """Get detailed route between two points"""
    waypoints = None
    if request.waypoints:
        waypoints = [(wp["lat"], wp["lng"]) for wp in request.waypoints]
    
    result = await mappls_service.get_route(
        (request.origin_lat, request.origin_lng),
        (request.dest_lat, request.dest_lng),
        waypoints
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not calculate route"
        )
    
    coordinates = decode_polyline(result.get("polyline", ""))
    if not coordinates:
        coordinates = [
            {"latitude": request.origin_lat, "longitude": request.origin_lng},
            {"latitude": request.dest_lat, "longitude": request.dest_lng},
        ]

    return {
        "success": True,
        "route": {
            **result,
            "coordinates": coordinates,
        },
    }


@router.post("/distance-matrix")
async def get_distance_matrix(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    destinations: List[dict] = None  # [{"lat": float, "lng": float}, ...]
):
    """Get distance matrix from origin to multiple destinations"""
    if not destinations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one destination required"
        )
    
    dest_coords = [(d["lat"], d["lng"]) for d in destinations]
    results = await mappls_service.get_distance_matrix(
        (origin_lat, origin_lng),
        dest_coords
    )
    
    return {"success": True, "matrix": results}
