"""
Services Package
================

This package contains business logic services that handle core functionality
independent of the API layer. Services encapsulate complex operations and
external API integrations.

Service Architecture:
--------------------
Services are designed as singletons - one instance per application.
They are imported and used directly without dependency injection.

Package Structure:
-----------------
    otp_service.py     - OTP generation and delivery via Fast2sms
    mappls_service.py  - Mappls (MapmyIndia) maps integration
    auth_service.py    - JWT token creation and validation
    fare_service.py    - Fare calculation and configuration

Service Pattern:
---------------
    # Define service class
    class MyService:
        def __init__(self):
            self.config = os.environ.get("MY_CONFIG")
        
        async def do_something(self, param):
            # Business logic here
            return result
    
    # Create singleton instance
    my_service = MyService()

Usage in Routers:
----------------
    from services.otp_service import otp_service
    from services.mappls_service import mappls_service
    
    @router.post("/send-otp")
    async def send_otp(phone: str):
        result = await otp_service.send_otp(phone, otp_service.generate_otp())
        return result

Why Services?
------------
1. Separation of Concerns: Business logic separate from API handlers
2. Reusability: Same service used across multiple endpoints
3. Testability: Easy to mock services in unit tests
4. Single Responsibility: Each service handles one domain
5. External API Management: Centralized handling of third-party APIs
"""

# OTP Service - handles SMS OTP via Fast2sms
from .otp_service import OTPService, otp_service

# Mappls Service - handles maps, geocoding, routing
from .mappls_service import MapplsService, mappls_service

# Auth Service - handles JWT tokens
from .auth_service import AuthService, auth_service

# Fare Service - handles fare calculation
from .fare_service import FareService, fare_service

# Export all for convenience
__all__ = [
    'OTPService', 'otp_service',
    'MapplsService', 'mappls_service',
    'AuthService', 'auth_service',
    'FareService', 'fare_service',
]
