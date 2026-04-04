import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .database import Base


class DiscountType(enum.Enum):
    FLAT = "flat"
    PERCENT = "percent"


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    discount_type = Column(SQLEnum(DiscountType), nullable=False)
    discount_value = Column(Float, nullable=False)  # Amount or percentage
    max_discount = Column(Float, nullable=True)  # Max discount for percentage type
    min_ride_amount = Column(Float, default=0.0)  # Minimum ride amount to apply
    max_uses = Column(Integer, nullable=True)  # Total uses allowed
    max_uses_per_user = Column(Integer, default=1)  # Uses per user
    current_uses = Column(Integer, default=0)
    valid_from = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    valid_until = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": str(self.id),
            "code": self.code,
            "description": self.description,
            "discount_type": self.discount_type.value,
            "discount_value": self.discount_value,
            "max_discount": self.max_discount,
            "min_ride_amount": self.min_ride_amount,
            "max_uses": self.max_uses,
            "max_uses_per_user": self.max_uses_per_user,
            "current_uses": self.current_uses,
            "valid_until": self.valid_until.isoformat() if self.valid_until else None,
            "is_active": self.is_active,
        }

    def is_valid(self) -> bool:
        now = datetime.now(timezone.utc)
        if not self.is_active:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        if self.max_uses and self.current_uses >= self.max_uses:
            return False
        return True

    def calculate_discount(self, ride_amount: float) -> float:
        if ride_amount < self.min_ride_amount:
            return 0.0
        
        if self.discount_type == DiscountType.FLAT:
            return min(self.discount_value, ride_amount)
        else:  # PERCENT
            discount = (self.discount_value / 100) * ride_amount
            if self.max_discount:
                discount = min(discount, self.max_discount)
            return discount


class PromoUsage(Base):
    __tablename__ = "promo_usages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    promo_id = Column(UUID(as_uuid=True), ForeignKey("promo_codes.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ride_id = Column(UUID(as_uuid=True), ForeignKey("rides.id"), nullable=True)
    discount_applied = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": str(self.id),
            "promo_id": str(self.promo_id),
            "user_id": str(self.user_id),
            "ride_id": str(self.ride_id) if self.ride_id else None,
            "discount_applied": self.discount_applied,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
