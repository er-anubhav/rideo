"""
Wallet Router
=============

Digital wallet endpoints for riders.

Endpoints:
----------
GET    /api/wallet/balance              - Get wallet balance
POST   /api/wallet/topup                - Top up wallet (placeholder - payment gateway needed)
GET    /api/wallet/transactions         - Get transaction history
POST   /api/wallet/transfer             - Transfer money (internal, for ride payments)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

from models.database import get_db
from models.user import User
from models.wallet import Wallet, WalletTransaction, TransactionType, TransactionStatus
from routers.users import get_current_user

router = APIRouter(prefix="/api/wallet", tags=["Wallet"])


class TopUpRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Amount to add to wallet")
    payment_method: Optional[str] = "placeholder"  # upi, card, netbanking, etc.


class TransferRequest(BaseModel):
    amount: float = Field(..., gt=0)
    to_user_id: str
    description: str
    ride_id: Optional[str] = None


class WalletResponse(BaseModel):
    balance: float
    isActive: str


class TransactionResponse(BaseModel):
    id: str
    transactionType: str
    amount: float
    balanceBefore: float
    balanceAfter: float
    status: str
    description: str
    createdAt: str


async def get_or_create_wallet(user_id: str, db: AsyncSession) -> Wallet:
    """Get user's wallet or create if not exists"""
    result = await db.execute(
        select(Wallet).where(Wallet.user_id == user_id)
    )
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=0.0)
        db.add(wallet)
        await db.flush()
    
    return wallet


@router.get("/balance", response_model=WalletResponse)
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get wallet balance.
    """
    wallet = await get_or_create_wallet(current_user.id, db)
    await db.commit()
    
    return WalletResponse(
        balance=round(wallet.balance, 2),
        isActive=wallet.is_active
    )


@router.post("/topup")
async def topup_wallet(
    request: TopUpRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Top up wallet.
    
    Note: This is a placeholder. In production, integrate with:
    - Razorpay
    - Stripe
    - PayU
    - Paytm
    - Other payment gateways
    
    Current implementation: Returns error asking for payment gateway integration.
    """
    # Payment gateway integration needed
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Payment gateway integration required. Please integrate Razorpay, Stripe, or other payment provider."
    )
    
    # Placeholder code for when payment gateway is integrated:
    # wallet = await get_or_create_wallet(current_user.id, db)
    # 
    # # Create pending transaction
    # transaction = WalletTransaction(
    #     wallet_id=wallet.id,
    #     transaction_type=TransactionType.CREDIT,
    #     amount=request.amount,
    #     balance_before=wallet.balance,
    #     balance_after=wallet.balance + request.amount,
    #     status=TransactionStatus.PENDING,
    #     description=f"Wallet top-up via {request.payment_method}",
    #     reference_id=payment_gateway_transaction_id  # From payment gateway
    # )
    # db.add(transaction)
    # 
    # # Update wallet balance
    # wallet.balance += request.amount
    # wallet.updated_at = datetime.now(timezone.utc)
    # 
    # # Update transaction status
    # transaction.status = TransactionStatus.COMPLETED
    # 
    # await db.commit()
    # 
    # return {
    #     "success": True,
    #     "message": f"₹{request.amount} added to wallet",
    #     "balance": wallet.balance,
    #     "transaction": transaction.to_dict()
    # }


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    transaction_type: Optional[str] = None
):
    """
    Get transaction history with pagination.
    
    Args:
        page: Page number
        limit: Items per page
        transaction_type: Filter by type (credit, debit, refund, ride_payment)
    """
    wallet = await get_or_create_wallet(current_user.id, db)
    await db.commit()
    
    offset = (page - 1) * limit
    
    # Build query
    query = select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
    
    if transaction_type:
        try:
            trans_type = TransactionType(transaction_type)
            query = query.where(WalletTransaction.transaction_type == trans_type)
        except ValueError:
            pass  # Invalid type, ignore filter
    
    query = query.order_by(WalletTransaction.created_at.desc()).offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return [TransactionResponse(**t.to_dict()) for t in transactions]


@router.post("/transfer")
async def transfer_money(
    request: TransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Transfer money from wallet (internal use - for ride payments, etc.).
    """
    # Get sender wallet
    sender_wallet = await get_or_create_wallet(current_user.id, db)
    
    # Check balance
    if sender_wallet.balance < request.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient wallet balance"
        )
    
    # Get receiver wallet
    receiver_wallet = await get_or_create_wallet(request.to_user_id, db)
    
    # Create debit transaction for sender
    debit_transaction = WalletTransaction(
        wallet_id=sender_wallet.id,
        ride_id=request.ride_id,
        transaction_type=TransactionType.DEBIT,
        amount=request.amount,
        balance_before=sender_wallet.balance,
        balance_after=sender_wallet.balance - request.amount,
        status=TransactionStatus.COMPLETED,
        description=request.description
    )
    db.add(debit_transaction)
    
    # Create credit transaction for receiver
    credit_transaction = WalletTransaction(
        wallet_id=receiver_wallet.id,
        ride_id=request.ride_id,
        transaction_type=TransactionType.CREDIT,
        amount=request.amount,
        balance_before=receiver_wallet.balance,
        balance_after=receiver_wallet.balance + request.amount,
        status=TransactionStatus.COMPLETED,
        description=request.description
    )
    db.add(credit_transaction)
    
    # Update balances
    sender_wallet.balance -= request.amount
    receiver_wallet.balance += request.amount
    sender_wallet.updated_at = datetime.now(timezone.utc)
    receiver_wallet.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    return {
        "success": True,
        "message": "Transfer successful",
        "senderBalance": round(sender_wallet.balance, 2),
        "receiverBalance": round(receiver_wallet.balance, 2),
        "transaction": debit_transaction.to_dict()
    }
