import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.database import init_db, get_db
from models.user import User, UserRole
from services.fare_service import fare_service
from services.auth_service import auth_service
from websocket_manager import connection_manager

from routers import (
    auth_router,
    users_router,
    drivers_router,
    maps_router,
    rides_router,
    ratings_router,
    admin_router,
    promo_router
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Rideshare Backend...")
    
    # Initialize database tables
    await init_db()
    logger.info("Database tables created")
    
    # Seed fare configurations
    async for db in get_db():
        await fare_service.seed_fare_configs(db)
        logger.info("Fare configurations seeded")
        
        # Seed admin user
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
        
        break
    
    yield
    
    # Shutdown
    logger.info("Shutting down Rideshare Backend...")


# Create FastAPI app
app = FastAPI(
    title="Rideshare API",
    description="Complete ride-sharing backend with Mappls maps, Fast2sms OTP, and real-time tracking",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(drivers_router)
app.include_router(maps_router)
app.include_router(rides_router)
app.include_router(ratings_router)
app.include_router(admin_router)
app.include_router(promo_router)


# Root endpoint
@app.get("/")
async def root():
    return {
        "name": "Rideshare API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# WebSocket endpoints
@app.websocket("/ws/driver/{driver_id}")
async def driver_websocket(
    websocket: WebSocket,
    driver_id: str,
    token: str = Query(None)
):
    """WebSocket endpoint for drivers"""
    # Verify token
    if token:
        payload = auth_service.verify_token(token)
        if not payload or payload.get("sub") != driver_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    
    await connection_manager.connect_driver(driver_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")
            
            if event == "location_update":
                # Update driver location
                lat = data.get("lat")
                lng = data.get("lng")
                if lat and lng:
                    connection_manager.update_driver_location(driver_id, lat, lng)
                    
                    # If driver has an active ride, notify rider
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
                # Notify rider that ride was accepted
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
                # Notify rider of status change
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
                    
                    if status in ["completed", "cancelled"]:
                        connection_manager.complete_ride(ride_id)
    
    except WebSocketDisconnect:
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
    """WebSocket endpoint for riders"""
    # Verify token
    if token:
        payload = auth_service.verify_token(token)
        if not payload or payload.get("sub") != rider_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    
    await connection_manager.connect_rider(rider_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")
            
            if event == "request_ride":
                # Register ride and broadcast to nearby drivers
                ride_id = data.get("ride_id")
                if ride_id:
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
                ride_id = data.get("ride_id")
                if ride_id and ride_id in connection_manager.active_rides:
                    driver_id = connection_manager.active_rides[ride_id].get("driver_id")
                    if driver_id:
                        await connection_manager.send_to_driver(
                            driver_id,
                            {
                                "event": "ride_cancelled",
                                "ride_id": ride_id,
                                "reason": data.get("reason", "Rider cancelled")
                            }
                        )
                    connection_manager.complete_ride(ride_id)
    
    except WebSocketDisconnect:
        connection_manager.disconnect_rider(rider_id)
    except Exception as e:
        logger.error(f"Rider WebSocket error: {e}")
        connection_manager.disconnect_rider(rider_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
