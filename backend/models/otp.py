from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .database import Base


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(15), nullable=False, index=True)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @classmethod
    def create_otp(cls, phone: str, otp_code: str, expiry_minutes: int = 5):
        return cls(
            phone=phone,
            otp_code=otp_code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
        )

    def is_valid(self) -> bool:
        return not self.is_used and datetime.now(timezone.utc) < self.expires_at
