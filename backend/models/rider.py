from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from .database import Base


class RiderProfile(Base):
    __tablename__ = "rider_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    rating = Column(Float, default=5.0)
    total_rides = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="rider_profile")
    saved_addresses = relationship("SavedAddress", back_populates="rider", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "rating": self.rating,
            "total_rides": self.total_rides,
        }


class SavedAddress(Base):
    __tablename__ = "saved_addresses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rider_id = Column(UUID(as_uuid=True), ForeignKey("rider_profiles.id"), nullable=False)
    label = Column(String(50), nullable=False)  # e.g., "Home", "Work", "Gym"
    address = Column(Text, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    rider = relationship("RiderProfile", back_populates="saved_addresses")

    def to_dict(self):
        return {
            "id": str(self.id),
            "rider_id": str(self.rider_id),
            "label": self.label,
            "address": self.address,
            "lat": self.lat,
            "lng": self.lng,
        }
