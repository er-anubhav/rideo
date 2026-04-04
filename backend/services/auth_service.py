import os
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7


class AuthService:
    """JWT Authentication Service"""
    
    def __init__(self):
        self.jwt_secret = os.environ.get("JWT_SECRET")
    
    def create_access_token(self, user_id: str, phone: str, role: str) -> str:
        """Create JWT access token"""
        payload = {
            "sub": user_id,
            "phone": phone,
            "role": role,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            "type": "access"
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=JWT_ALGORITHM)
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        payload = {
            "sub": user_id,
            "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            "type": "refresh"
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=JWT_ALGORITHM)
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[dict]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[JWT_ALGORITHM])
            if payload.get("type") != token_type:
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def get_user_id_from_token(self, token: str) -> Optional[str]:
        """Extract user ID from token"""
        payload = self.verify_token(token)
        if payload:
            return payload.get("sub")
        return None


# Singleton instance
auth_service = AuthService()
