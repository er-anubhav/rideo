"""
Rideshare Backend - Main Application Entry Point
================================================

This is the main FastAPI application that serves as the entry point for the 
entire ride-sharing backend. It initializes all components, configures middleware,
and registers all API routers.

Application Architecture:
------------------------
1. FastAPI app with lifespan management
2. CORS middleware for cross-origin requests
3. 9 API routers for different features
4. 2 WebSocket endpoints for real-time communication
5. PostgreSQL database with async SQLAlchemy

Startup Process:
---------------
1. Load environment variables from .env
2. Initialize database tables (create if not exist)
3. Seed default fare configurations
4. Create admin user if not exists
5. Start accepting connections

Environment Variables Required:
------------------------------
- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: Secret key for JWT tokens
- ADMIN_PHONE: Phone number for admin user
- MAPPLS_REST_KEY: Mappls API key
- MAPPLS_CLIENT_ID: Mappls OAuth client ID
- MAPPLS_CLIENT_SECRET: Mappls OAuth client secret
- FAST2SMS_API_KEY: Fast2sms API key
- OTP_FALLBACK: Fallback OTP for testing

Usage:
------
    # Development
    uvicorn server:app --host 0.0.0.0 --port 8001 --reload
    
    # Production
    uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4

API Documentation:
-----------------
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
"""

import os
import logging
from contextlib import asynccontextmanager

# Load environment variables FIRST before any other imports
# This ensures all modules have access to configuration
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Internal imports
from models.database import init_db, get_db
from models.user import User, UserRole
from models.driver import DriverProfile
from services.fare_service import fare_service
from services.auth_service import auth_service
from websocket_manager import connection_manager

# Import all routers
from routers import (
    auth_router,      # /api/auth - Authentication (OTP, tokens)
    users_router,     # /api/users - User profile management
    drivers_router,   # /api/drivers - Driver registration and management
    maps_router,      # /api/maps - Mappls geocoding and routing
    rides_router,     # /api/rides - Ride booking and lifecycle
    ratings_router,   # /api/ratings - User ratings
    admin_router,     # /api/admin - Admin dashboard and management
    promo_router,     # /api/promo - Promo code management
    earnings_router,  # /api/earnings - Driver earnings reports
    notifications_router,  # /api/notifications - Notification history
    support_router,   # /api/support - Support tickets and chat
    wallet_router     # /api/wallet - Digital wallet
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager - handles startup and shutdown events.
    
    Startup:
        1. Initialize database tables
        2. Seed fare configurations
        3. Create admin user
    
    Shutdown:
        1. Clean up connections
        2. Log shutdown message
    """
    # ==================== STARTUP ====================
    logger.info("Starting Rideshare Backend...")
    
    # Initialize database tables (creates if not exist)
    await init_db()
    logger.info("Database tables created")
    
    # Seed default fare configurations for all vehicle types
    async for db in get_db():
        await fare_service.seed_fare_configs(db)
        logger.info("Fare configurations seeded")
        
        # Create admin user if not exists
        admin_phone = os.environ.get("ADMIN_PHONE", "9999999999")
        result = await db.execute(select(User).where(User.phone == admin_phone))
        admin = result.scalar_one_or_none()
        
        if not admin:
            admin = User(
                phone=admin_phone,
                name="Admin",
                role=UserRole.ADMIN,
                is_verified=True
            )
            db.add(admin)
            await db.commit()
            logger.info(f"Admin user created with phone: {admin_phone}")
        
        break  # Only need one iteration
    
    yield  # Application runs here
    
    # ==================== SHUTDOWN ====================
    logger.info("Shutting down Rideshare Backend...")


# Create FastAPI application instance
app = FastAPI(
    title="Rideshare API",
    description="""
    Complete ride-sharing backend API with:
    - Phone + OTP authentication
    - Mappls maps integration
    - Real-time WebSocket tracking
    - Fare calculation with surge pricing
    - Driver earnings reports
    - Admin dashboard
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",      # Swagger UI
    redoc_url="/redoc"     # ReDoc
)

# Configure CORS middleware
# Allows requests from any origin (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # Allow all origins (restrict in production)
    allow_credentials=True,         # Allow cookies
    allow_methods=["*"],            # Allow all HTTP methods
    allow_headers=["*"],            # Allow all headers
)

# ==================== REGISTER API ROUTERS ====================
# Each router handles a specific domain of the application

app.include_router(auth_router)      # Authentication endpoints
app.include_router(users_router)     # User profile endpoints
app.include_router(drivers_router)   # Driver management endpoints
app.include_router(maps_router)      # Maps and geocoding endpoints
app.include_router(rides_router)     # Ride booking endpoints
app.include_router(ratings_router)   # Rating endpoints
app.include_router(admin_router)     # Admin dashboard endpoints
app.include_router(promo_router)     # Promo code endpoints
app.include_router(earnings_router)  # Driver earnings endpoints
app.include_router(notifications_router)  # Notification endpoints
app.include_router(support_router)   # Support ticket endpoints
app.include_router(wallet_router)    # Wallet endpoints


# ==================== ROOT ENDPOINTS ====================

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - returns API information.
    
    Returns:
        dict: API name, version, status, and docs URL
    """
    return {
        "name": "Rideshare API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring.
    
    Used by load balancers and monitoring systems to verify
    the application is running and responsive.
    
    Returns:
        dict: Health status
    """
    return {"status": "healthy"}


# ==================== WEBSOCKET ENDPOINTS ====================

@app.websocket("/ws/driver/{driver_id}")
async def driver_websocket(
    websocket: WebSocket,
    driver_id: str,
    token: str = Query(None)
):
    """
    WebSocket endpoint for driver connections.
    
    Handles:
        - Real-time location updates
        - Ride request notifications
        - Ride status updates
    
    Args:
        websocket: WebSocket connection
        driver_id: Driver's user ID
        token: Optional JWT token for authentication
    
    Events from Client:
        - location_update: {"event": "location_update", "lat": float, "lng": float}
        - ride_accepted: {"event": "ride_accepted", "ride_id": str}
        - ride_status_update: {"event": "ride_status_update", "ride_id": str, "status": str}
    
    Events to Client:
        - new_ride_request: New ride available
        - ride_cancelled: Ride was cancelled by rider
    """
    # Verify token if provided
    if token:
        payload = auth_service.verify_token(token)
        if not payload or payload.get("sub") != driver_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    
    # Accept connection and register driver
    await connection_manager.connect_driver(driver_id, websocket)
    
    try:
        while True:
            # Wait for message from driver
            data = await websocket.receive_json()
            event = data.get("event")
            
            if event == "location_update":
                # Driver sending their current location
                lat = data.get("lat")
                lng = data.get("lng")
                if lat and lng:
                    # Update in-memory location cache
                    connection_manager.update_driver_location(driver_id, lat, lng)
                    
                    # P0 FIX #4: Persist location to database every update
                    async for db in get_db():
                        try:
                            result = await db.execute(
                                select(DriverProfile).where(DriverProfile.user_id == driver_id)
                            )
                            profile = result.scalar_one_or_none()
                            if profile:
                                profile.current_lat = lat
                                profile.current_lng = lng
                                await db.commit()
                        except Exception as e:
                            logger.error(f"Failed to persist driver location: {e}")
                            await db.rollback()
                        break
                    
                    # If driver has an active ride, notify the rider
                    for ride_id, ride_info in connection_manager.active_rides.items():
                        if ride_info.get("driver_id") == driver_id:
                            await connection_manager.send_to_rider(
                                ride_info["rider_id"],
                                {
                                    "event": "driver_location",
                                    "ride_id": ride_id,
                                    "lat": lat,
                                    "lng": lng
                                }
                            )
                            break
            
            elif event == "ride_accepted":
                # Driver accepted a ride - notify the rider
                ride_id = data.get("ride_id")
                if ride_id and ride_id in connection_manager.active_rides:
                    rider_id = connection_manager.active_rides[ride_id]["rider_id"]
                    connection_manager.update_ride_driver(ride_id, driver_id)
                    await connection_manager.send_to_rider(
                        rider_id,
                        {
                            "event": "ride_accepted",
                            "ride_id": ride_id,
                            "driver_id": driver_id,
                            "driver_location": connection_manager.get_driver_location(driver_id)
                        }
                    )
            
            elif event == "ride_status_update":
                # Driver updating ride status (arriving, arrived, started, completed)
                ride_id = data.get("ride_id")
                status = data.get("status")
                if ride_id and ride_id in connection_manager.active_rides:
                    rider_id = connection_manager.active_rides[ride_id]["rider_id"]
                    await connection_manager.send_to_rider(
                        rider_id,
                        {
                            "event": "ride_status_changed",
                            "ride_id": ride_id,
                            "status": status
                        }
                    )
                    
                    # Clean up completed/cancelled rides
                    if status in ["completed", "cancelled"]:
                        connection_manager.complete_ride(ride_id)
    
    except WebSocketDisconnect:
        # Driver disconnected - clean up
        connection_manager.disconnect_driver(driver_id)
    except Exception as e:
        logger.error(f"Driver WebSocket error: {e}")
        connection_manager.disconnect_driver(driver_id)


@app.websocket("/ws/rider/{rider_id}")
async def rider_websocket(
    websocket: WebSocket,
    rider_id: str,
    token: str = Query(None)
):
    """
    WebSocket endpoint for rider connections.
    
    Handles:
        - Ride request broadcasts to drivers
        - Ride status updates from driver
        - Real-time driver location tracking
    
    Args:
        websocket: WebSocket connection
        rider_id: Rider's user ID
        token: Optional JWT token for authentication
    
    Events from Client:
        - request_ride: {"event": "request_ride", "ride_id": str, "pickup": dict, "drop": dict, ...}
        - cancel_ride: {"event": "cancel_ride", "ride_id": str, "reason": str}
    
    Events to Client:
        - ride_accepted: Driver accepted the ride
        - driver_location: Real-time driver position
        - ride_status_changed: Status update (arriving, arrived, started, completed)
        - notification: Push notification with title and message
    """
    # Verify token if provided
    if token:
        payload = auth_service.verify_token(token)
        if not payload or payload.get("sub") != rider_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    
    # Accept connection and register rider
    await connection_manager.connect_rider(rider_id, websocket)
    
    try:
        while True:
            # Wait for message from rider
            data = await websocket.receive_json()
            event = data.get("event")
            
            if event == "request_ride":
                # Rider requesting a new ride
                ride_id = data.get("ride_id")
                if ride_id:
                    # Register ride for tracking
                    connection_manager.register_ride(ride_id, rider_id)
                    
                    # Broadcast to all online drivers
                    await connection_manager.broadcast_to_drivers({
                        "event": "new_ride_request",
                        "ride_id": ride_id,
                        "pickup": data.get("pickup"),
                        "drop": data.get("drop"),
                        "vehicle_type": data.get("vehicle_type"),
                        "fare": data.get("fare")
                    })
            
            elif event == "cancel_ride":
                # Rider cancelling a ride
                ride_id = data.get("ride_id")
                if ride_id and ride_id in connection_manager.active_rides:
                    driver_id = connection_manager.active_rides[ride_id].get("driver_id")
                    if driver_id:
                        # Notify driver of cancellation
                        await connection_manager.send_to_driver(
                            driver_id,
                            {
                                "event": "ride_cancelled",
                                "ride_id": ride_id,
                                "reason": data.get("reason", "Rider cancelled")
                            }
                        )
                    # Clean up ride
                    connection_manager.complete_ride(ride_id)
    
    except WebSocketDisconnect:
        # Rider disconnected - clean up
        connection_manager.disconnect_rider(rider_id)
    except Exception as e:
        logger.error(f"Rider WebSocket error: {e}")
        connection_manager.disconnect_rider(rider_id)


# ==================== MAIN ENTRY POINT ====================

if __name__ == "__main__":
    """
    Run the application directly (for development).
    For production, use: uvicorn server:app --host 0.0.0.0 --port 8001
    """
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
