"""
Routers Package
===============

This package contains all FastAPI routers that define API endpoints.
Each router handles a specific domain of the application.

Router Architecture:
-------------------
Routers are organized by feature/domain and prefixed with /api/.
Each router handles related endpoints and uses appropriate tags
for Swagger documentation grouping.

Package Structure:
-----------------
    auth.py      - Authentication (OTP, tokens)    → /api/auth/*
    users.py     - User profile management         → /api/users/*
    drivers.py   - Driver registration/management  → /api/drivers/*
    maps.py      - Mappls geocoding/routing        → /api/maps/*
    rides.py     - Ride booking/management         → /api/rides/*
    ratings.py   - User ratings                    → /api/ratings/*
    admin.py     - Admin dashboard/management      → /api/admin/*
    promo.py     - Promo code management           → /api/promo/*
    earnings.py  - Driver earnings reports         → /api/earnings/*

Router Pattern:
--------------
    from fastapi import APIRouter, Depends
    from models.database import get_db
    
    router = APIRouter(
        prefix="/api/feature",
        tags=["Feature Name"]
    )
    
    @router.get("/endpoint")
    async def my_endpoint(db: AsyncSession = Depends(get_db)):
        # Handle request
        return {"success": True}

Authentication:
--------------
Most routers use the get_current_user dependency from users.py:

    from routers.users import get_current_user
    
    @router.get("/protected")
    async def protected_endpoint(user: User = Depends(get_current_user)):
        return {"user_id": str(user.id)}

Error Handling:
--------------
Routers raise HTTPException for errors:

    from fastapi import HTTPException, status
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

Registration:
------------
Routers are registered in server.py:

    from routers import auth_router, users_router, ...
    
    app.include_router(auth_router)
    app.include_router(users_router)
    ...
"""

# Authentication router - /api/auth
from .auth import router as auth_router

# User profile router - /api/users
from .users import router as users_router

# Driver management router - /api/drivers
from .drivers import router as drivers_router

# Maps and geocoding router - /api/maps
from .maps import router as maps_router

# Ride booking router - /api/rides
from .rides import router as rides_router

# Rating router - /api/ratings
from .ratings import router as ratings_router

# Admin dashboard router - /api/admin
from .admin import router as admin_router

# Promo code router - /api/promo
from .promo import router as promo_router

# Driver earnings router - /api/earnings
from .earnings import router as earnings_router

# Export all routers
__all__ = [
    'auth_router',
    'users_router',
    'drivers_router',
    'maps_router',
    'rides_router',
    'ratings_router',
    'admin_router',
    'promo_router',
    'earnings_router',
]
