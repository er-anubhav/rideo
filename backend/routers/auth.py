from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

from models.database import get_db
from models.user import User, UserRole
from models.otp import OTPVerification
from models.rider import RiderProfile
from services.otp_service import otp_service
from services.auth_service import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class SendOTPRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15, description="Phone number with or without +91")


class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=4, max_length=6)
    name: Optional[str] = None  # Optional for new user registration


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class SendOTPResponse(BaseModel):
    success: bool
    message: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[dict] = None
    is_new_user: bool = False


def normalize_phone(phone: str) -> str:
    """Normalize phone number to 10 digits"""
    phone = phone.replace("+91", "").replace(" ", "").replace("-", "")
    if len(phone) > 10:
        phone = phone[-10:]
    return phone


@router.post("/send-otp", response_model=SendOTPResponse)
async def send_otp(request: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    """Send OTP to phone number"""
    phone = normalize_phone(request.phone)
    
    if len(phone) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number. Please enter a 10-digit Indian mobile number."
        )
    
    # Generate OTP
    otp = otp_service.generate_otp()
    
    # Send OTP via Fast2SMS
    result = await otp_service.send_otp(phone, otp)
    
    if result["success"]:
        # Store OTP in database
        actual_otp = result["otp"]  # Could be fallback OTP
        otp_record = OTPVerification.create_otp(phone, actual_otp)
        db.add(otp_record)
        await db.commit()
        
        return SendOTPResponse(success=True, message="OTP sent successfully")
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"]
        )


@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(request: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """Verify OTP and authenticate user"""
    phone = normalize_phone(request.phone)
    
    # Find latest valid OTP
    result = await db.execute(
        select(OTPVerification)
        .where(OTPVerification.phone == phone)
        .where(OTPVerification.is_used == False)
        .order_by(OTPVerification.created_at.desc())
        .limit(1)
    )
    otp_record = result.scalar_one_or_none()
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No OTP found. Please request a new OTP."
        )
    
    # Check if OTP is valid
    if not otp_record.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP."
        )
    
    # Verify OTP
    if otp_record.otp_code != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Please try again."
        )
    
    # Mark OTP as used
    otp_record.is_used = True
    
    # Find or create user
    user_result = await db.execute(
        select(User).where(User.phone == phone)
    )
    user = user_result.scalar_one_or_none()
    is_new_user = False
    
    if not user:
        # Create new user
        user = User(
            phone=phone,
            name=request.name,
            role=UserRole.RIDER,
            is_verified=True
        )
        db.add(user)
        await db.flush()
        
        # Create rider profile
        rider_profile = RiderProfile(user_id=user.id)
        db.add(rider_profile)
        is_new_user = True
    else:
        # Update user verification status
        user.is_verified = True
        if request.name and not user.name:
            user.name = request.name
    
    await db.commit()
    await db.refresh(user)
    
    # Generate tokens
    access_token = auth_service.create_access_token(
        str(user.id), user.phone, user.role.value
    )
    refresh_token = auth_service.create_refresh_token(str(user.id))
    
    return AuthResponse(
        success=True,
        message="Authentication successful",
        access_token=access_token,
        refresh_token=refresh_token,
        user=user.to_dict(),
        is_new_user=is_new_user
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token"""
    payload = auth_service.verify_token(request.refresh_token, token_type="refresh")
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = payload.get("sub")
    
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Generate new access token
    access_token = auth_service.create_access_token(
        str(user.id), user.phone, user.role.value
    )
    
    return AuthResponse(
        success=True,
        message="Token refreshed",
        access_token=access_token,
        user=user.to_dict()
    )


@router.get("/me")
async def get_current_user(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(lambda: None)  # Will be replaced by actual dependency
):
    """Get current authenticated user"""
    # This will be implemented with proper auth dependency
    pass
