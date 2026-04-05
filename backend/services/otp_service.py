import os
import random
import httpx
import logging

logger = logging.getLogger(__name__)


class OTPService:
    """Fast2SMS OTP Service with fallback"""
    
    FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"
    
    def __init__(self):
        self.api_key = os.environ.get("FAST2SMS_API_KEY")
        self.fallback_otp = os.environ.get("OTP_FALLBACK", "123456")
    
    def generate_otp(self) -> str:
        """Generate a 6-digit OTP"""
        return str(random.randint(100000, 999999))
    
    async def send_otp(self, phone: str, otp: str) -> dict:
        """
        Send OTP via Fast2SMS
        Returns: {"success": bool, "message": str, "otp": str}
        """
        # Clean phone number (remove +91, spaces, etc.)
        phone = phone.replace("+91", "").replace(" ", "").replace("-", "")
        if len(phone) != 10:
            return {"success": False, "message": "Invalid phone number", "otp": None}
        
        if not self.api_key:
            logger.warning("Fast2SMS API key not configured, using fallback OTP")
            return {"success": True, "message": "OTP sent (fallback mode)", "otp": self.fallback_otp}
        
        try:
            headers = {
                "authorization": self.api_key,
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            payload = {
                "route": "otp",
                "variables_values": otp,
                "flash": "0",
                "numbers": phone
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.FAST2SMS_URL,
                    headers=headers,
                    data=payload,
                    timeout=10.0
                )
                
                result = response.json()
                
                if response.status_code == 200 and result.get("return"):
                    logger.info(f"OTP sent successfully to {phone[:4]}****")
                    return {"success": True, "message": "OTP sent successfully", "otp": otp}
                else:
                    logger.warning(f"Fast2SMS failed: {result.get('message', 'Unknown error')}")
                    # Fallback to static OTP
                    return {"success": True, "message": "OTP sent (fallback mode)", "otp": self.fallback_otp}
                    
        except Exception as e:
            logger.error(f"Fast2SMS error: {str(e)}")
            # Fallback to static OTP on any error
            return {"success": True, "message": "OTP sent (fallback mode)", "otp": self.fallback_otp}
    
    def get_fallback_otp(self) -> str:
        """Get the fallback OTP for testing"""
        return self.fallback_otp


# Singleton instance
otp_service = OTPService()
