import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from .database import Base
from .driver import VehicleType


class RideStatus(enum.Enum):
    SEARCHING = "searching"  # Looking for driver
    ACCEPTED = "accepted"    # Driver accepted
    ARRIVING = "arriving"    # Driver is arriving to pickup
    ARRIVED = "arrived"      # Driver arrived at pickup
    IN_PROGRESS = "in_progress"  # Ride in progress
    COMPLETED = "completed"  # Ride completed
    CANCELLED = "cancelled"  # Ride cancelled


class Ride(Base):
    __tablename__ = "rides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rider_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)
    
    status = Column(SQLEnum(RideStatus), default=RideStatus.SEARCHING, nullable=False)
    vehicle_type = Column(SQLEnum(VehicleType), nullable=False)
    
    # Pickup details
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    pickup_address = Column(Text, nullable=False)
    
    # Drop details
    drop_lat = Column(Float, nullable=False)
    drop_lng = Column(Float, nullable=False)
    drop_address = Column(Text, nullable=False)
    
    # Fare details
    estimated_fare = Column(Float, nullable=False)
    actual_fare = Column(Float, nullable=True)
    surge_multiplier = Column(Float, default=1.0)
    promo_discount = Column(Float, default=0.0)
    
    # Distance and duration
    estimated_distance_km = Column(Float, nullable=False)
    actual_distance_km = Column(Float, nullable=True)
    estimated_duration_mins = Column(Integer, nullable=False)
    actual_duration_mins = Column(Integer, nullable=True)
    
    # Route polyline (for navigation)
    route_polyline = Column(Text, nullable=True)
    
    # Payment
    payment_method = Column(String(20), default="cash")  # cash only for now
    payment_status = Column(String(20), default="pending")  # pending, completed
    
    # Cancellation
    cancelled_by = Column(String(10), nullable=True)  # rider, driver
    cancellation_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    tracking_points = relationship("RideTracking", back_populates="ride", cascade="all, delete-orphan")
    requests = relationship("RideRequest", back_populates="ride", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "rider_id": str(self.rider_id),
            "driver_id": str(self.driver_id) if self.driver_id else None,
            "vehicle_id": str(self.vehicle_id) if self.vehicle_id else None,
            "status": self.status.value,
            "vehicle_type": self.vehicle_type.value,
            "pickup": {
                "lat": self.pickup_lat,
                "lng": self.pickup_lng,
                "address": self.pickup_address,
            },
            "drop": {
                "lat": self.drop_lat,
                "lng": self.drop_lng,
                "address": self.drop_address,
            },
            "fare": {
                "estimated": self.estimated_fare,
                "actual": self.actual_fare,
                "surge_multiplier": self.surge_multiplier,
                "promo_discount": self.promo_discount,
            },
            "distance_km": self.estimated_distance_km,
            "duration_mins": self.estimated_duration_mins,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class RideRequest(Base):
    """Tracks ride requests sent to drivers"""
    __tablename__ = "ride_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_id = Column(UUID(as_uuid=True), ForeignKey("rides.id"), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, accepted, rejected, expired
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    responded_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    ride = relationship("Ride", back_populates="requests")

    def to_dict(self):
        return {
            "id": str(self.id),
            "ride_id": str(self.ride_id),
            "driver_id": str(self.driver_id),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RideTracking(Base):
    """Real-time location tracking during ride"""
    __tablename__ = "ride_tracking"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_id = Column(UUID(as_uuid=True), ForeignKey("rides.id"), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    ride = relationship("Ride", back_populates="tracking_points")
