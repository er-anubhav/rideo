from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID

from models.database import get_db
from models.user import User, UserRole
from models.rider import RiderProfile, SavedAddress
from models.driver import DriverProfile
from services.auth_service import auth_service

router = APIRouter(prefix="/api/users", tags=["Users"])


# Auth dependency
async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ")[1]
    payload = auth_service.verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    return user


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class SavedAddressRequest(BaseModel):
    label: str = Field(..., max_length=50)
    address: str
    lat: float
    lng: float


class SavedAddressResponse(BaseModel):
    id: str
    label: str
    address: str
    lat: float
    lng: float


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return {"success": True, "user": current_user.to_dict()}


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile"""
    if request.name:
        current_user.name = request.name
    if request.email:
        current_user.email = request.email
    
    await db.commit()
    await db.refresh(current_user)
    
    return {"success": True, "message": "Profile updated", "user": current_user.to_dict()}


@router.get("/saved-addresses", response_model=List[SavedAddressResponse])
async def get_saved_addresses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get rider's saved addresses"""
    # Get rider profile
    result = await db.execute(
        select(RiderProfile).where(RiderProfile.user_id == current_user.id)
    )
    rider_profile = result.scalar_one_or_none()
    
    if not rider_profile:
        return []
    
    # Get saved addresses
    result = await db.execute(
        select(SavedAddress).where(SavedAddress.rider_id == rider_profile.id)
    )
    addresses = result.scalars().all()
    
    return [
        SavedAddressResponse(
            id=str(addr.id),
            label=addr.label,
            address=addr.address,
            lat=addr.lat,
            lng=addr.lng
        )
        for addr in addresses
    ]


@router.post("/saved-addresses", response_model=SavedAddressResponse)
async def add_saved_address(
    request: SavedAddressRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a saved address"""
    # Get or create rider profile
    result = await db.execute(
        select(RiderProfile).where(RiderProfile.user_id == current_user.id)
    )
    rider_profile = result.scalar_one_or_none()
    
    if not rider_profile:
        rider_profile = RiderProfile(user_id=current_user.id)
        db.add(rider_profile)
        await db.flush()
    
    # Check if label already exists
    result = await db.execute(
        select(SavedAddress)
        .where(SavedAddress.rider_id == rider_profile.id)
        .where(SavedAddress.label == request.label)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update existing
        existing.address = request.address
        existing.lat = request.lat
        existing.lng = request.lng
        await db.commit()
        await db.refresh(existing)
        return SavedAddressResponse(
            id=str(existing.id),
            label=existing.label,
            address=existing.address,
            lat=existing.lat,
            lng=existing.lng
        )
    
    # Create new
    address = SavedAddress(
        rider_id=rider_profile.id,
        label=request.label,
        address=request.address,
        lat=request.lat,
        lng=request.lng
    )
    db.add(address)
    await db.commit()
    await db.refresh(address)
    
    return SavedAddressResponse(
        id=str(address.id),
        label=address.label,
        address=address.address,
        lat=address.lat,
        lng=address.lng
    )


@router.delete("/saved-addresses/{address_id}")
async def delete_saved_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a saved address"""
    # Get rider profile
    result = await db.execute(
        select(RiderProfile).where(RiderProfile.user_id == current_user.id)
    )
    rider_profile = result.scalar_one_or_none()
    
    if not rider_profile:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Get address
    result = await db.execute(
        select(SavedAddress)
        .where(SavedAddress.id == address_id)
        .where(SavedAddress.rider_id == rider_profile.id)
    )
    address = result.scalar_one_or_none()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    await db.delete(address)
    await db.commit()
    
    return {"success": True, "message": "Address deleted"}
