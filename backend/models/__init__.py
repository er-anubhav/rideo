"""
Models Package
==============

This package contains all SQLAlchemy models for the ride-sharing application.
Models are organized by domain and represent the database schema.

Package Structure:
-----------------
    database.py  - Database connection and session management
    user.py      - User model (riders, drivers, admins)
    driver.py    - DriverProfile and Vehicle models
    rider.py     - RiderProfile and SavedAddress models
    otp.py       - OTPVerification model for authentication
    ride.py      - Ride, RideRequest, RideTracking models
    rating.py    - Rating model for user reviews
    fare.py      - FareConfig model for pricing
    promo.py     - PromoCode and PromoUsage models

Model Relationships:
-------------------
    User
    ├── 1:1 DriverProfile
    │       └── 1:N Vehicle
    └── 1:1 RiderProfile
            └── 1:N SavedAddress
    
    Ride
    ├── N:1 User (rider)
    ├── N:1 User (driver)
    ├── 1:N RideRequest
    ├── 1:N RideTracking
    └── 1:N Rating

    PromoCode
    └── 1:N PromoUsage

Usage:
------
    from models import User, UserRole, Ride, RideStatus
    from models.database import get_db, init_db
    
    # In FastAPI endpoint
    async def create_user(db: AsyncSession = Depends(get_db)):
        user = User(phone="9876543210", role=UserRole.RIDER)
        db.add(user)
        await db.commit()
        return user.to_dict()

All models inherit from Base (defined in database.py) which provides:
- Table creation via create_all()
- Common SQLAlchemy functionality
"""

# Database utilities
from .database import Base, engine, get_db, async_session

# User models
from .user import User, UserRole

# Driver models
from .driver import DriverProfile, Vehicle, VehicleType

# Rider models
from .rider import RiderProfile, SavedAddress

# Authentication models
from .otp import OTPVerification

# Ride models
from .ride import Ride, RideStatus, RideRequest, RideTracking

# Rating models
from .rating import Rating

# Pricing models
from .fare import FareConfig

# Promo models
from .promo import PromoCode, PromoUsage, DiscountType

# Export all for convenience
__all__ = [
    # Database
    'Base', 'engine', 'get_db', 'async_session',
    
    # User
    'User', 'UserRole',
    
    # Driver
    'DriverProfile', 'Vehicle', 'VehicleType',
    
    # Rider
    'RiderProfile', 'SavedAddress',
    
    # OTP
    'OTPVerification',
    
    # Ride
    'Ride', 'RideStatus', 'RideRequest', 'RideTracking',
    
    # Rating
    'Rating',
    
    # Fare
    'FareConfig',
    
    # Promo
    'PromoCode', 'PromoUsage', 'DiscountType',
]
