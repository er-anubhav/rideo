from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .database import Base


class FareConfig(Base):
    """Fare configuration per vehicle type"""
    __tablename__ = "fare_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_type = Column(String(20), nullable=False, unique=True)  # bike, auto, mini, sedan, suv
    base_fare = Column(Float, nullable=False)  # Fixed starting fare
    per_km_rate = Column(Float, nullable=False)  # Rate per kilometer
    per_minute_rate = Column(Float, nullable=False)  # Rate per minute
    minimum_fare = Column(Float, nullable=False)  # Minimum fare charged
    cancellation_fee = Column(Float, default=0.0)  # Fee for cancellation after acceptance
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": str(self.id),
            "vehicle_type": self.vehicle_type,
            "base_fare": self.base_fare,
            "per_km_rate": self.per_km_rate,
            "per_minute_rate": self.per_minute_rate,
            "minimum_fare": self.minimum_fare,
            "cancellation_fee": self.cancellation_fee,
        }

    @staticmethod
    def calculate_fare(base_fare: float, per_km_rate: float, per_minute_rate: float, 
                       minimum_fare: float, distance_km: float, duration_mins: int, 
                       surge_multiplier: float = 1.0) -> float:
        """Calculate ride fare"""
        fare = base_fare + (per_km_rate * distance_km) + (per_minute_rate * duration_mins)
        fare = fare * surge_multiplier
        return max(fare, minimum_fare)
