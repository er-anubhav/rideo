"""
Wallet Models
=============

Digital wallet system for riders to store money and pay for rides.

Models:
    Wallet - User wallet with balance
    WalletTransaction - Transaction history
    
Usage:
    # Create wallet
    wallet = Wallet(user_id=user.id, balance=0.0)
    
    # Add transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        transaction_type="credit",
        amount=500.0,
        description="Wallet top-up"
    )
"""

from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from enum import Enum
import uuid

from .database import Base


class TransactionType(str, Enum):
    """Wallet transaction types"""
    CREDIT = "credit"        # Money added to wallet
    DEBIT = "debit"          # Money deducted from wallet
    REFUND = "refund"        # Money refunded
    RIDE_PAYMENT = "ride_payment"  # Payment for ride


class TransactionStatus(str, Enum):
    """Transaction status"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Wallet(Base):
    """User wallet model"""
    
    __tablename__ = "wallets"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Balance
    balance = Column(Float, default=0.0, nullable=False)
    
    # Status
    is_active = Column(String(20), default="active")  # active, frozen, suspended
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship("User", backref="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan", order_by="WalletTransaction.created_at.desc()")
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "userId": str(self.user_id),
            "balance": round(self.balance, 2),
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None
        }


class WalletTransaction(Base):
    """Wallet transaction model"""
    
    __tablename__ = "wallet_transactions"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign keys
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    ride_id = Column(UUID(as_uuid=True), ForeignKey("rides.id", ondelete="SET NULL"), nullable=True)
    
    # Transaction details
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    amount = Column(Float, nullable=False)
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    
    # Status
    status = Column(SQLEnum(TransactionStatus), default=TransactionStatus.COMPLETED, nullable=False)
    
    # Description
    description = Column(Text, nullable=False)
    reference_id = Column(String(100), nullable=True)  # Payment gateway reference
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    wallet = relationship("Wallet", back_populates="transactions")
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "walletId": str(self.wallet_id),
            "rideId": str(self.ride_id) if self.ride_id else None,
            "transactionType": self.transaction_type.value,
            "amount": round(self.amount, 2),
            "balanceBefore": round(self.balance_before, 2),
            "balanceAfter": round(self.balance_after, 2),
            "status": self.status.value,
            "description": self.description,
            "referenceId": self.reference_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
