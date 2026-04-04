import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Float, Integer, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from .database import Base


class VehicleType(enum.Enum):
    BIKE = "bike"
    AUTO = "auto"
    MINI = "mini"
    SEDAN = "sedan"
    SUV = "suv"


class DriverProfile(Base):
    __tablename__ = "driver_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    license_number = Column(String(50), nullable=False)
    license_expiry = Column(DateTime(timezone=True), nullable=True)
    is_verified = Column(Boolean, default=False)
    is_online = Column(Boolean, default=False)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    rating = Column(Float, default=5.0)
    total_rides = Column(Integer, default=0)
    total_earnings = Column(Float, default=0.0)
    documents_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="driver_profile")
    vehicles = relationship("Vehicle", back_populates="driver", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "license_number": self.license_number,
            "is_verified": self.is_verified,
            "is_online": self.is_online,
            "current_lat": self.current_lat,
            "current_lng": self.current_lng,
            "rating": self.rating,
            "total_rides": self.total_rides,
            "total_earnings": self.total_earnings,
            "documents_verified": self.documents_verified,
        }


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("driver_profiles.id"), nullable=False)
    vehicle_type = Column(SQLEnum(VehicleType), nullable=False)
    make = Column(String(50), nullable=True)
    model = Column(String(50), nullable=True)
    color = Column(String(30), nullable=True)
    number_plate = Column(String(20), nullable=False, unique=True)
    year = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    driver = relationship("DriverProfile", back_populates="vehicles")

    def to_dict(self):
        return {
            "id": str(self.id),
            "driver_id": str(self.driver_id),
            "vehicle_type": self.vehicle_type.value,
            "make": self.make,
            "model": self.model,
            "color": self.color,
            "number_plate": self.number_plate,
            "year": self.year,
            "is_active": self.is_active,
        }
