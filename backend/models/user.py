import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from .database import Base


class UserRole(enum.Enum):
    RIDER = "rider"
    DRIVER = "driver"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.RIDER, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    driver_profile = relationship("DriverProfile", back_populates="user", uselist=False)
    rider_profile = relationship("RiderProfile", back_populates="user", uselist=False)

    def to_dict(self):
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
