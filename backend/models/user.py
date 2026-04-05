"""
User Model
==========

Central user entity for all user types in the ride-sharing system.
Users can be riders (default), drivers, or admins.

Role Hierarchy:
--------------
    RIDER  - Default role, can book rides
    DRIVER - Can accept and complete rides (requires DriverProfile)
    ADMIN  - Full system access, manages users and rides

User Lifecycle:
--------------
    1. User sends OTP to phone number
    2. User verifies OTP → account created with RIDER role
    3. (Optional) User registers as driver → role changes to DRIVER
    4. Admin can promote user to ADMIN role

Relationships:
-------------
    User 1:1 DriverProfile (if role is DRIVER)
    User 1:1 RiderProfile (always created for riders)

Example:
--------
    # Create new user
    user = User(
        phone="9876543210",
        name="John Doe",
        role=UserRole.RIDER,
        is_verified=True
    )
    
    # Check user role
    if user.role == UserRole.DRIVER:
        # Access driver-specific features
        pass
"""

import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from .database import Base


class UserRole(enum.Enum):
    """
    User role enumeration.
    
    Attributes:
        RIDER: Default role, can book rides
        DRIVER: Can accept rides, requires verified DriverProfile
        ADMIN: System administrator with full access
    """
    RIDER = "rider"
    DRIVER = "driver"
    ADMIN = "admin"


class User(Base):
    """
    User model - represents all users in the system.
    
    Attributes:
        id (UUID): Primary key, auto-generated UUID
        phone (str): Phone number (10 digits), unique, indexed for fast lookup
        name (str): Display name, optional
        email (str): Email address, optional
        role (UserRole): User type (rider/driver/admin)
        is_verified (bool): Whether phone is verified via OTP
        is_active (bool): Account status, False means suspended
        created_at (datetime): Account creation timestamp
        updated_at (datetime): Last update timestamp
    
    Relationships:
        driver_profile: One-to-one with DriverProfile
        rider_profile: One-to-one with RiderProfile
    
    Methods:
        to_dict(): Convert to dictionary for JSON serialization
    """
    __tablename__ = "users"

    # Primary key - UUID for security (no sequential IDs)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Phone number - unique identifier for authentication
    # Indexed for fast lookups during OTP verification
    phone = Column(String(15), unique=True, nullable=False, index=True)
    
    # Profile information
    name = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    
    # User role determines access level
    role = Column(SQLEnum(UserRole), default=UserRole.RIDER, nullable=False)
    
    # Status flags
    is_verified = Column(Boolean, default=False)  # Phone verified via OTP
    is_active = Column(Boolean, default=True)     # Account active (not suspended)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships (lazy loaded)
    driver_profile = relationship("DriverProfile", back_populates="user", uselist=False)
    rider_profile = relationship("RiderProfile", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        """
        Convert user to dictionary for JSON serialization.
        
        Returns:
            dict: User data without sensitive information
        
        Note: Does not include relationships to avoid circular references.
              Load those separately if needed.
        """
        return {
            "id": str(self.id),
            "phone": self.phone,
            "name": self.name,
            "email": self.email,
            "role": self.role.value,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
