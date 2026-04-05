# FastAPI Backend For Rider App And Driver Partner App

## Table of Contents
1. [Overview](#overview)
2. [Client Apps](#client-apps)
3. [Architecture](#architecture)
4. [Getting Started](#getting-started)
5. [Project Structure](#project-structure)
6. [Database Models](#database-models)
7. [API Reference](#api-reference)
8. [Services](#services)
9. [WebSocket System](#websocket-system)
10. [Configuration](#configuration)
11. [Testing](#testing)

---

## Overview

A complete monolithic backend for the **Rider App**, **Driver Partner App**, and admin/internal tooling. Built with **Python/FastAPI** and supports realtime ride coordination, fare calculation, and push-style notification delivery over WebSockets.

## Client Apps

The backend is consumed by two mobile clients in this repo:

- root overview: `../README.md`
- Rider App guide: `../rider-app/README.md`
- Driver Partner App guide: `../driver-app/README.md`
- backend planning summary: `../BACKEND_ARCHITECTURE_PLAN.md`

Current integration contract:

- REST base: `/api`
- rider socket: `/ws/rider/{rider_id}`
- driver socket: `/ws/driver/{driver_id}`

### Key Features
- **Phone + OTP Authentication** via Fast2sms (with fallback)
- **Maps & Routing** via Mappls (MapmyIndia) API
- **Real-time Tracking** via WebSocket
- **Push Notifications** via WebSocket with offline queue
- **Fare Calculation** with surge pricing support
- **Promo Codes** with flat/percentage discounts
- **Driver Earnings Reports** with daily/weekly/monthly breakdowns
- **Admin Dashboard** for user/driver/ride management

### Tech Stack
| Component | Technology |
|-----------|------------|
| Framework | FastAPI (Python 3.11+) |
| Database | PostgreSQL |
| ORM | SQLAlchemy (async) |
| Authentication | JWT (PyJWT) |
| Real-time | WebSocket |
| Maps | Mappls REST API |
| SMS/OTP | Fast2sms |
| Payment | Cash only (gateway deferred) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT APPS                               │
│        (Rider App, Driver Partner App, Admin / Internal)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FASTAPI SERVER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     API ROUTERS                           │   │
│  │  /api/auth  /api/users  /api/drivers  /api/rides  etc.   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   WEBSOCKET HANDLERS                      │   │
│  │        /ws/driver/{id}         /ws/rider/{id}            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      SERVICES                             │   │
│  │  OTPService  MapplsService  AuthService  FareService     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   DATABASE MODELS                         │   │
│  │  User  Ride  Driver  Vehicle  Rating  PromoCode  etc.    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │PostgreSQL│   │ Mappls   │   │ Fast2sms │
        │ Database │   │   API    │   │   API    │
        └──────────┘   └──────────┘   └──────────┘
```

### Request Flow
1. Client sends HTTP request or connects via WebSocket
2. FastAPI routes request to appropriate router
3. Router validates request using Pydantic models
4. Service layer handles business logic
5. Database operations via SQLAlchemy async
6. Response returned to client

---

## Getting Started

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- pip/virtualenv

### Installation

```bash
# Clone repository
cd /app/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE rideshare_db;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Environment Variables
See [Configuration](#configuration) section for all required variables.

---

## Project Structure

```
/app/backend/
├── server.py              # Main FastAPI application entry point
├── websocket_manager.py   # WebSocket connection & notification manager
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (not in git)
│
├── models/                # SQLAlchemy database models
│   ├── __init__.py       # Exports all models
│   ├── database.py       # Database connection & session
│   ├── user.py           # User model (riders, drivers, admins)
│   ├── driver.py         # DriverProfile & Vehicle models
│   ├── rider.py          # RiderProfile & SavedAddress models
│   ├── otp.py            # OTP verification model
│   ├── ride.py           # Ride, RideRequest, RideTracking models
│   ├── rating.py         # Rating model
│   ├── fare.py           # FareConfig model
│   └── promo.py          # PromoCode & PromoUsage models
│
├── routers/               # API route handlers
│   ├── __init__.py       # Exports all routers
│   ├── auth.py           # Authentication endpoints
│   ├── users.py          # User profile endpoints
│   ├── drivers.py        # Driver registration & management
│   ├── maps.py           # Mappls geocoding & routing
│   ├── rides.py          # Ride booking & management
│   ├── ratings.py        # Rating endpoints
│   ├── admin.py          # Admin dashboard & management
│   ├── promo.py          # Promo code endpoints
│   └── earnings.py       # Driver earnings reports
│
└── services/              # Business logic services
    ├── __init__.py       # Exports all services
    ├── otp_service.py    # Fast2sms OTP handling
    ├── mappls_service.py # Mappls maps integration
    ├── auth_service.py   # JWT token management
    └── fare_service.py   # Fare calculation logic
```

---

## Database Models

### Entity Relationship Diagram

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│    User      │───────│  DriverProfile  │───────│   Vehicle    │
│──────────────│  1:1  │─────────────────│  1:N  │──────────────│
│ id (UUID)    │       │ id (UUID)       │       │ id (UUID)    │
│ phone        │       │ user_id (FK)    │       │ driver_id    │
│ name         │       │ license_number  │       │ vehicle_type │
│ email        │       │ is_verified     │       │ number_plate │
│ role (enum)  │       │ is_online       │       │ make/model   │
│ is_verified  │       │ current_lat/lng │       │ color        │
│ is_active    │       │ rating          │       └──────────────┘
│ created_at   │       │ total_rides     │
└──────────────┘       │ total_earnings  │
        │              └─────────────────┘
        │ 1:1
        ▼
┌──────────────┐       ┌─────────────────┐
│ RiderProfile │───────│  SavedAddress   │
│──────────────│  1:N  │─────────────────│
│ id (UUID)    │       │ id (UUID)       │
│ user_id (FK) │       │ rider_id (FK)   │
│ rating       │       │ label           │
│ total_rides  │       │ address         │
└──────────────┘       │ lat/lng         │
                       └─────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                            Ride                                   │
│──────────────────────────────────────────────────────────────────│
│ id (UUID)           │ rider_id (FK)      │ driver_id (FK)        │
│ status (enum)       │ vehicle_type       │ vehicle_id (FK)       │
│ pickup_lat/lng      │ pickup_address     │                       │
│ drop_lat/lng        │ drop_address       │                       │
│ estimated_fare      │ actual_fare        │ surge_multiplier      │
│ estimated_distance  │ actual_distance    │ promo_discount        │
│ route_polyline      │ payment_method     │ payment_status        │
│ created_at          │ started_at         │ completed_at          │
└──────────────────────────────────────────────────────────────────┘
        │
        │ 1:N
        ▼
┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   RideRequest    │    │  RideTracking   │    │     Rating       │
│──────────────────│    │─────────────────│    │──────────────────│
│ ride_id (FK)     │    │ ride_id (FK)    │    │ ride_id (FK)     │
│ driver_id (FK)   │    │ lat/lng         │    │ from_user_id     │
│ status           │    │ timestamp       │    │ to_user_id       │
│ created_at       │    └─────────────────┘    │ rating (1-5)     │
└──────────────────┘                           │ review           │
                                               └──────────────────┘

┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   FareConfig     │    │   PromoCode     │    │   PromoUsage     │
│──────────────────│    │─────────────────│    │──────────────────│
│ vehicle_type     │    │ code            │    │ promo_id (FK)    │
│ base_fare        │    │ discount_type   │    │ user_id (FK)     │
│ per_km_rate      │    │ discount_value  │    │ ride_id (FK)     │
│ per_minute_rate  │    │ max_uses        │    │ discount_applied │
│ minimum_fare     │    │ valid_until     │    └──────────────────┘
│ cancellation_fee │    │ is_active       │
└──────────────────┘    └─────────────────┘
```

### Model Details

#### User (`models/user.py`)
Central user entity for all user types.

```python
class UserRole(enum.Enum):
    RIDER = "rider"
    DRIVER = "driver"
    ADMIN = "admin"

class User(Base):
    id: UUID              # Primary key
    phone: str            # Unique, indexed (10-digit Indian mobile)
    name: str             # Optional display name
    email: str            # Optional email
    role: UserRole        # User type
    is_verified: bool     # Phone verified via OTP
    is_active: bool       # Account status
    created_at: datetime  # Registration timestamp
    updated_at: datetime  # Last update timestamp
```

#### DriverProfile (`models/driver.py`)
Extended profile for users with driver role.

```python
class DriverProfile(Base):
    id: UUID                  # Primary key
    user_id: UUID             # FK to User (unique, 1:1)
    license_number: str       # Driving license
    license_expiry: datetime  # License validity
    is_verified: bool         # Admin verified
    is_online: bool           # Available for rides
    current_lat: float        # Real-time latitude
    current_lng: float        # Real-time longitude
    rating: float             # Average rating (1-5)
    total_rides: int          # Completed rides count
    total_earnings: float     # Lifetime earnings
    documents_verified: bool  # Documents approved
```

#### Vehicle (`models/driver.py`)
Vehicles registered by drivers.

```python
class VehicleType(enum.Enum):
    BIKE = "bike"
    AUTO = "auto"
    MINI = "mini"      # Hatchback
    SEDAN = "sedan"
    SUV = "suv"

class Vehicle(Base):
    id: UUID              # Primary key
    driver_id: UUID       # FK to DriverProfile
    vehicle_type: VehicleType
    make: str             # e.g., "Maruti"
    model: str            # e.g., "Swift"
    color: str            # e.g., "White"
    number_plate: str     # Unique registration number
    year: int             # Manufacturing year
    is_active: bool       # Currently in use
```

#### Ride (`models/ride.py`)
Core ride entity tracking entire ride lifecycle.

```python
class RideStatus(enum.Enum):
    SEARCHING = "searching"      # Looking for driver
    ACCEPTED = "accepted"        # Driver accepted
    ARRIVING = "arriving"        # Driver en route to pickup
    ARRIVED = "arrived"          # Driver at pickup location
    IN_PROGRESS = "in_progress"  # Ride ongoing
    COMPLETED = "completed"      # Ride finished
    CANCELLED = "cancelled"      # Ride cancelled

class Ride(Base):
    id: UUID                     # Primary key
    rider_id: UUID               # FK to User (rider)
    driver_id: UUID              # FK to User (driver), nullable
    vehicle_id: UUID             # FK to Vehicle, nullable
    status: RideStatus           # Current ride state
    vehicle_type: VehicleType    # Requested vehicle
    
    # Location details
    pickup_lat, pickup_lng: float
    pickup_address: str
    drop_lat, drop_lng: float
    drop_address: str
    
    # Fare details
    estimated_fare: float        # Calculated before ride
    actual_fare: float           # Final fare after ride
    surge_multiplier: float      # Dynamic pricing (1.0 = no surge)
    promo_discount: float        # Discount applied
    
    # Distance/Duration
    estimated_distance_km: float
    actual_distance_km: float
    estimated_duration_mins: int
    actual_duration_mins: int
    
    # Navigation
    route_polyline: str          # Encoded route for map display
    
    # Payment
    payment_method: str          # "cash" (only option currently)
    payment_status: str          # "pending" | "completed"
    
    # Cancellation
    cancelled_by: str            # "rider" | "driver"
    cancellation_reason: str
    
    # Timestamps
    created_at: datetime
    accepted_at: datetime
    started_at: datetime
    completed_at: datetime
    cancelled_at: datetime
```

---

## API Reference

### Base URL
```
http://localhost:8001/api
```

### Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <access_token>
```

---

### Auth Endpoints (`/api/auth`)

#### POST `/api/auth/send-otp`
Send OTP to phone number for authentication.

**Request:**
```json
{
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Notes:**
- Accepts 10-digit Indian mobile numbers
- Fallback OTP: `123456` when Fast2sms fails
- OTP valid for 5 minutes

---

#### POST `/api/auth/verify-otp`
Verify OTP and get authentication tokens.

**Request:**
```json
{
  "phone": "9876543210",
  "otp": "123456",
  "name": "John Doe"  // Optional, for new users
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "phone": "9876543210",
    "name": "John Doe",
    "role": "rider",
    "is_verified": true
  },
  "is_new_user": true
}
```

**Notes:**
- Creates new user if phone not registered
- New users get `rider` role by default
- Access token expires in 24 hours
- Refresh token expires in 7 days

---

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

---

### User Endpoints (`/api/users`)

#### GET `/api/users/me`
Get current authenticated user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "phone": "9876543210",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "rider",
    "is_verified": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

#### PUT `/api/users/profile`
Update user profile.

**Request:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated",
  "user": { ... }
}
```

---

#### GET `/api/users/saved-addresses`
Get rider's saved addresses.

**Response:**
```json
[
  {
    "id": "uuid",
    "label": "Home",
    "address": "123 Main St, Delhi",
    "lat": 28.6139,
    "lng": 77.2090
  }
]
```

---

#### POST `/api/users/saved-addresses`
Add or update saved address.

**Request:**
```json
{
  "label": "Work",
  "address": "456 Office Park, Gurgaon",
  "lat": 28.4595,
  "lng": 77.0266
}
```

**Notes:**
- If label exists, updates the address
- Maximum recommended: 10 addresses per user

---

### Driver Endpoints (`/api/drivers`)

#### POST `/api/drivers/register`
Register as a driver with vehicle details.

**Request:**
```json
{
  "license_number": "DL1234567890",
  "license_expiry": "2025-12-31",
  "vehicle": {
    "vehicle_type": "sedan",
    "make": "Maruti",
    "model": "Dzire",
    "color": "White",
    "number_plate": "DL 01 AB 1234",
    "year": 2022
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Driver registration successful. Pending verification.",
  "driver_profile": {
    "id": "uuid",
    "license_number": "DL1234567890",
    "is_verified": false,
    "rating": 5.0
  },
  "vehicle": {
    "id": "uuid",
    "vehicle_type": "sedan",
    "number_plate": "DL 01 AB 1234"
  }
}
```

**Notes:**
- User role changes from `rider` to `driver`
- Driver must be verified by admin before accepting rides
- Vehicle types: `bike`, `auto`, `mini`, `sedan`, `suv`

---

#### GET `/api/drivers/profile`
Get driver profile with vehicles.

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "license_number": "DL1234567890",
    "is_verified": true,
    "is_online": false,
    "rating": 4.8,
    "total_rides": 150,
    "total_earnings": 45000.00
  },
  "vehicles": [ ... ],
  "user": { ... }
}
```

---

#### POST `/api/drivers/toggle-online`
Toggle driver online/offline status.

**Request:**
```json
{
  "is_online": true,
  "lat": 28.6139,
  "lng": 77.2090
}
```

**Response:**
```json
{
  "success": true,
  "is_online": true,
  "message": "You are now online"
}
```

**Notes:**
- Driver must be verified to go online
- Location required when going online
- Going offline removes driver from available pool

---

#### POST `/api/drivers/location`
Update driver's current location.

**Request:**
```json
{
  "lat": 28.6139,
  "lng": 77.2090
}
```

**Notes:**
- Should be called every 5-10 seconds when online
- Updates real-time position in database
- Triggers WebSocket update to rider if in active ride

---

#### GET `/api/drivers/nearby`
Get nearby online drivers (for ride matching).

**Query Parameters:**
- `lat` (required): Pickup latitude
- `lng` (required): Pickup longitude
- `vehicle_type` (optional): Filter by vehicle type
- `radius_km` (default: 5.0): Search radius

**Response:**
```json
{
  "success": true,
  "drivers": [
    {
      "driver_id": "uuid",
      "name": "Driver Name",
      "phone": "9876543210",
      "rating": 4.8,
      "distance_km": 1.5,
      "vehicles": [ ... ]
    }
  ]
}
```

---

### Maps Endpoints (`/api/maps`)

#### GET `/api/maps/geocode`
Convert address to coordinates.

**Query:** `?address=Connaught Place, Delhi`

**Response:**
```json
{
  "success": true,
  "data": {
    "lat": 28.6315,
    "lng": 77.2167,
    "formatted_address": "Connaught Place, New Delhi, Delhi"
  }
}
```

---

#### GET `/api/maps/reverse-geocode`
Convert coordinates to address.

**Query:** `?lat=28.6315&lng=77.2167`

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "Connaught Place, New Delhi",
    "locality": "Connaught Place",
    "city": "New Delhi",
    "state": "Delhi",
    "pincode": "110001"
  }
}
```

---

#### GET `/api/maps/autocomplete`
Get address suggestions for search.

**Query:** `?query=connaught&lat=28.6&lng=77.2`

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "place_id": "abc123",
      "description": "Connaught Place",
      "address": "Connaught Place, New Delhi",
      "lat": 28.6315,
      "lng": 77.2167
    }
  ]
}
```

---

#### GET `/api/maps/distance`
Get distance and ETA between two points.

**Query:** `?origin_lat=28.61&origin_lng=77.20&dest_lat=28.70&dest_lng=77.10`

**Response:**
```json
{
  "success": true,
  "data": {
    "distance_km": 15.5,
    "duration_mins": 25
  }
}
```

---

#### POST `/api/maps/route`
Get detailed route with turn-by-turn directions.

**Request:**
```json
{
  "origin_lat": 28.6139,
  "origin_lng": 77.2090,
  "dest_lat": 28.7041,
  "dest_lng": 77.1025,
  "waypoints": [
    {"lat": 28.65, "lng": 77.15}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "route": {
    "distance_km": 18.5,
    "duration_mins": 35,
    "polyline": "encoded_polyline_string",
    "steps": [
      {
        "instruction": "Turn right onto Ring Road",
        "distance_m": 500,
        "duration_s": 60
      }
    ]
  }
}
```

---

### Ride Endpoints (`/api/rides`)

#### POST `/api/rides/estimate`
Get fare estimates for a ride.

**Request:**
```json
{
  "pickup_lat": 28.6139,
  "pickup_lng": 77.2090,
  "drop_lat": 28.7041,
  "drop_lng": 77.1025,
  "vehicle_type": "sedan"  // Optional, omit for all types
}
```

**Response:**
```json
{
  "success": true,
  "distance_km": 15.5,
  "duration_mins": 25,
  "surge_multiplier": 1.0,
  "estimates": [
    {
      "vehicle_type": "sedan",
      "base_fare": 80.00,
      "distance_fare": 279.00,
      "time_fare": 62.50,
      "subtotal": 421.50,
      "surge_multiplier": 1.0,
      "surged_fare": 421.50,
      "promo_discount": 0.00,
      "total_fare": 421.50,
      "minimum_fare": 100.00
    }
  ]
}
```

---

#### POST `/api/rides/request`
Create a new ride request.

**Request:**
```json
{
  "pickup_lat": 28.6139,
  "pickup_lng": 77.2090,
  "pickup_address": "Connaught Place, Delhi",
  "drop_lat": 28.7041,
  "drop_lng": 77.1025,
  "drop_address": "Rohini, Delhi",
  "vehicle_type": "sedan",
  "promo_code": "FIRST50"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ride request created. Looking for drivers...",
  "ride": {
    "id": "uuid",
    "status": "searching",
    "vehicle_type": "sedan",
    "pickup": { "lat": 28.6139, "lng": 77.2090, "address": "..." },
    "drop": { "lat": 28.7041, "lng": 77.1025, "address": "..." },
    "fare": { "estimated": 421.50, "surge_multiplier": 1.0 },
    "distance_km": 15.5,
    "duration_mins": 25
  }
}
```

**Notes:**
- User can have only one active ride at a time
- Ride starts in `searching` status
- Push notification sent to nearby drivers via WebSocket

---

#### GET `/api/rides/current`
Get current active ride for user (rider or driver).

**Response (Rider view):**
```json
{
  "success": true,
  "ride": { ... },
  "driver": {
    "id": "uuid",
    "name": "Driver Name",
    "phone": "9876543210",
    "rating": 4.8,
    "location": { "lat": 28.62, "lng": 77.21 }
  },
  "vehicle": {
    "vehicle_type": "sedan",
    "make": "Maruti",
    "model": "Dzire",
    "color": "White",
    "number_plate": "DL 01 AB 1234"
  }
}
```

---

#### GET `/api/rides/requests`
Get pending ride requests for driver.

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "ride": { ... },
      "rider": { "name": "John Doe" },
      "pickup_eta_mins": 8
    }
  ]
}
```

**Notes:**
- Only returns rides matching driver's vehicle types
- Driver must be online and verified
- Shows up to 10 nearest rides

---

#### POST `/api/rides/{ride_id}/accept`
Driver accepts a ride request.

**Request:**
```json
{
  "vehicle_id": "uuid"  // Optional, uses first matching vehicle if omitted
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ride accepted!",
  "ride": { ... }
}
```

**Side Effects:**
- Ride status → `accepted`
- Driver goes offline (busy with ride)
- Push notification sent to rider
- Ride registered in WebSocket manager

---

#### POST `/api/rides/{ride_id}/arriving`
Driver indicates they are on the way to pickup.

**Response:**
```json
{
  "success": true,
  "message": "Status updated to arriving"
}
```

**Side Effects:**
- Ride status → `arriving`
- Push notification: "Driver arriving in X mins"

---

#### POST `/api/rides/{ride_id}/arrived`
Driver has arrived at pickup location.

**Response:**
```json
{
  "success": true,
  "message": "Status updated to arrived"
}
```

**Side Effects:**
- Ride status → `arrived`
- Push notification: "Driver arrived!"

---

#### POST `/api/rides/{ride_id}/start`
Start the ride (rider picked up).

**Response:**
```json
{
  "success": true,
  "message": "Ride started"
}
```

**Side Effects:**
- Ride status → `in_progress`
- `started_at` timestamp set
- Push notification: "Ride started"

---

#### POST `/api/rides/{ride_id}/complete`
Complete the ride.

**Response:**
```json
{
  "success": true,
  "message": "Ride completed!",
  "fare": 421.50,
  "payment_method": "cash"
}
```

**Side Effects:**
- Ride status → `completed`
- `completed_at` timestamp set
- Driver's `total_rides` and `total_earnings` updated
- Rider's `total_rides` updated
- Driver goes back online
- Push notifications: "Ride completed" and "Payment received"

---

#### POST `/api/rides/{ride_id}/cancel`
Cancel the ride.

**Request:**
```json
{
  "reason": "Changed plans"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ride cancelled"
}
```

**Notes:**
- Can be cancelled by rider or driver
- If driver cancels, they go back online
- Push notification sent to other party

---

#### GET `/api/rides/history`
Get ride history with pagination.

**Query:** `?page=1&limit=10`

**Response:**
```json
{
  "success": true,
  "rides": [ ... ],
  "total": 50,
  "page": 1,
  "pages": 5
}
```

---

### Rating Endpoints (`/api/ratings`)

#### POST `/api/ratings/`
Rate a completed ride.

**Request:**
```json
{
  "ride_id": "uuid",
  "rating": 5,
  "review": "Great ride, very professional driver!"
}
```

**Notes:**
- Rating: 1-5 stars
- Can only rate completed rides
- Each party can rate once per ride
- Updates receiver's average rating

---

#### GET `/api/ratings/user/{user_id}`
Get ratings for a user.

**Response:**
```json
{
  "success": true,
  "average_rating": 4.8,
  "total_ratings": 150,
  "ratings": [ ... ]
}
```

---

### Promo Endpoints (`/api/promo`)

#### GET `/api/promo/validate/{code}`
Validate a promo code.

**Query:** `?ride_amount=500`

**Response:**
```json
{
  "success": true,
  "promo": {
    "code": "FIRST50",
    "discount_type": "percent",
    "discount_value": 50,
    "max_discount": 100
  },
  "discount": 100.00,
  "message": "Promo code valid! You'll save ₹100"
}
```

---

#### POST `/api/promo/apply/{code}`
Apply promo code to a ride.

**Query:** `?ride_id=uuid`

**Response:**
```json
{
  "success": true,
  "discount": 100.00,
  "new_fare": 321.50,
  "message": "Promo applied! You saved ₹100"
}
```

**Notes:**
- Can only apply to rides in `searching` status
- One promo per ride
- Respects per-user usage limits

---

### Earnings Endpoints (`/api/earnings`)

#### GET `/api/earnings/stats`
Get driver's earnings statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "today": { "earnings": 1500.00, "rides": 8 },
    "this_week": { "earnings": 8500.00, "rides": 42 },
    "this_month": { "earnings": 35000.00, "rides": 180 },
    "all_time": { "earnings": 450000.00, "rides": 2500 },
    "rating": 4.8
  }
}
```

---

#### GET `/api/earnings/daily`
Get daily earnings breakdown.

**Query:** `?days=7`

**Response:**
```json
[
  { "date": "2024-01-07", "earnings": 2100.00, "rides": 12, "distance_km": 85.5 },
  { "date": "2024-01-06", "earnings": 1800.00, "rides": 10, "distance_km": 72.3 },
  ...
]
```

---

#### GET `/api/earnings/summary`
Get earnings summary for a period.

**Query:** `?period=this_week`

**Periods:** `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`, `custom`

For custom: `?period=custom&start_date=2024-01-01&end_date=2024-01-31`

**Response:**
```json
{
  "total_earnings": 8500.00,
  "total_rides": 42,
  "total_distance_km": 320.5,
  "total_duration_mins": 1250,
  "average_fare": 202.38,
  "average_rating": 4.8,
  "period_start": "2024-01-01T00:00:00Z",
  "period_end": "2024-01-07T23:59:59Z"
}
```

---

#### GET `/api/earnings/weekly-comparison`
Compare this week vs last week.

**Response:**
```json
{
  "success": true,
  "comparison": {
    "this_week": {
      "earnings": 8500.00,
      "rides": 42,
      "distance_km": 320.5,
      "period": "2024-01-01 to 2024-01-07"
    },
    "last_week": {
      "earnings": 7200.00,
      "rides": 38,
      "distance_km": 285.2,
      "period": "2023-12-25 to 2023-12-31"
    },
    "change_percent": 18.1,
    "trend": "up"
  }
}
```

---

#### GET `/api/earnings/rides`
Get individual ride earnings.

**Query:** `?period=today&page=1&limit=20`

**Response:**
```json
[
  {
    "ride_id": "uuid",
    "pickup_address": "Connaught Place",
    "drop_address": "Rohini",
    "fare": 421.50,
    "distance_km": 15.5,
    "duration_mins": 35,
    "completed_at": "2024-01-07T10:30:00Z",
    "payment_method": "cash"
  }
]
```

---

### Admin Endpoints (`/api/admin`)

All admin endpoints require `role: admin` in JWT.

#### GET `/api/admin/dashboard`
Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_users": 5000,
    "total_drivers": 500,
    "online_drivers": 120,
    "total_rides": 25000,
    "completed_rides": 23000,
    "active_rides": 45,
    "total_revenue": 1250000.00
  }
}
```

---

#### GET `/api/admin/users`
Get all users with filters.

**Query:** `?role=rider&page=1&limit=20`

---

#### GET `/api/admin/drivers`
Get all drivers with filters.

**Query:** `?verified=false&online=true&page=1&limit=20`

---

#### PUT `/api/admin/drivers/{driver_id}/verify`
Verify or unverify a driver.

**Request:**
```json
{
  "is_verified": true,
  "is_documents_verified": true
}
```

---

#### PUT `/api/admin/drivers/{driver_id}/suspend`
Suspend a driver account.

**Side Effects:**
- User `is_active` → false
- Driver `is_online` → false
- Driver `is_verified` → false

---

#### GET `/api/admin/rides`
Get all rides with filters.

**Query:** `?status=completed&page=1&limit=20`

---

#### GET `/api/admin/fare-configs`
Get all fare configurations.

---

#### PUT `/api/admin/fare-configs`
Update fare configuration.

**Request:**
```json
{
  "vehicle_type": "sedan",
  "base_fare": 80,
  "per_km_rate": 18,
  "per_minute_rate": 2.5,
  "minimum_fare": 100,
  "cancellation_fee": 40
}
```

---

#### POST `/api/admin/promo-codes`
Create a promo code.

**Request:**
```json
{
  "code": "SUMMER50",
  "description": "Summer sale - 50% off",
  "discount_type": "percent",
  "discount_value": 50,
  "max_discount": 200,
  "min_ride_amount": 100,
  "max_uses": 1000,
  "max_uses_per_user": 2,
  "valid_until": "2024-08-31T23:59:59Z"
}
```

---

#### GET `/api/admin/promo-codes`
Get all promo codes.

---

#### PUT `/api/admin/promo-codes/{promo_id}`
Activate/deactivate promo code.

**Query:** `?is_active=false`

---

## Services

### OTPService (`services/otp_service.py`)

Handles OTP generation and delivery via Fast2sms.

```python
class OTPService:
    """
    Fast2sms OTP Service with fallback
    
    Methods:
        generate_otp() -> str
            Generate random 6-digit OTP
            
        send_otp(phone: str, otp: str) -> dict
            Send OTP via Fast2sms API
            Returns: {"success": bool, "message": str, "otp": str}
            
        get_fallback_otp() -> str
            Returns fallback OTP for testing (default: "123456")
    
    Fallback Behavior:
        - If FAST2SMS_API_KEY not configured → use fallback OTP
        - If Fast2sms API fails → use fallback OTP
        - Fallback OTP configurable via OTP_FALLBACK env var
    """
```

### MapplsService (`services/mappls_service.py`)

Handles all map-related operations using Mappls (MapmyIndia) API.

```python
class MapplsService:
    """
    Mappls Maps API integration with Haversine fallback
    
    Authentication:
        Uses OAuth2 client credentials flow
        Tokens cached and auto-refreshed
    
    Methods:
        geocode(address: str) -> dict | None
            Forward geocoding: address to coordinates
            Returns: {"lat": float, "lng": float, "formatted_address": str}
            
        reverse_geocode(lat: float, lng: float) -> dict | None
            Reverse geocoding: coordinates to address
            Returns: {"address": str, "locality": str, "city": str, ...}
            
        autocomplete(query: str, location: tuple = None) -> list
            Address search suggestions
            Returns: [{"place_id": str, "description": str, "lat": float, "lng": float}]
            
        get_distance_matrix(origin: tuple, destinations: list) -> list
            Calculate distances from origin to multiple destinations
            Returns: [{"distance_km": float, "duration_mins": int}]
            
        get_route(origin: tuple, destination: tuple, waypoints: list = None) -> dict | None
            Get detailed route with polyline
            Returns: {"distance_km": float, "duration_mins": int, "polyline": str, "steps": list}
            
        get_eta(origin: tuple, destination: tuple) -> dict | None
            Simple distance/time between two points
            Returns: {"distance_km": float, "duration_mins": int}
    
    Fallback Behavior:
        If Mappls API fails, uses Haversine formula:
        - Straight-line distance × 1.3 (road factor)
        - Duration estimated at 30 km/h average speed
    """
```

### AuthService (`services/auth_service.py`)

Handles JWT token creation and validation.

```python
class AuthService:
    """
    JWT Authentication Service
    
    Token Configuration:
        - Algorithm: HS256
        - Access token expiry: 24 hours
        - Refresh token expiry: 7 days
    
    Methods:
        create_access_token(user_id: str, phone: str, role: str) -> str
            Create JWT access token
            Payload: {"sub": user_id, "phone": phone, "role": role, "exp": ..., "type": "access"}
            
        create_refresh_token(user_id: str) -> str
            Create JWT refresh token
            Payload: {"sub": user_id, "exp": ..., "type": "refresh"}
            
        verify_token(token: str, token_type: str = "access") -> dict | None
            Verify and decode JWT token
            Returns payload dict or None if invalid/expired
            
        get_user_id_from_token(token: str) -> str | None
            Extract user ID from token
    """
```

### FareService (`services/fare_service.py`)

Handles fare calculation logic.

```python
class FareService:
    """
    Fare calculation service with dynamic pricing
    
    Default Fare Configurations:
        | Type  | Base | Per KM | Per Min | Minimum | Cancel Fee |
        |-------|------|--------|---------|---------|------------|
        | bike  | ₹20  | ₹8     | ₹1      | ₹25     | ₹10        |
        | auto  | ₹30  | ₹12    | ₹1.5    | ₹35     | ₹15        |
        | mini  | ₹50  | ₹14    | ₹2      | ₹60     | ₹25        |
        | sedan | ₹80  | ₹18    | ₹2.5    | ₹100    | ₹40        |
        | suv   | ₹120 | ₹22    | ₹3      | ₹150    | ₹50        |
    
    Fare Formula:
        fare = base_fare + (per_km_rate × distance) + (per_minute_rate × duration)
        fare = fare × surge_multiplier
        fare = max(fare, minimum_fare)
        final_fare = fare - promo_discount
    
    Methods:
        get_fare_config(db, vehicle_type: str) -> FareConfig | None
            Get fare configuration from database
            
        seed_fare_configs(db)
            Seed default configurations on startup
            
        calculate_fare(db, vehicle_type, distance_km, duration_mins, 
                      surge_multiplier=1.0, promo_discount=0.0) -> dict
            Calculate ride fare with breakdown
            Returns: {
                "base_fare": float,
                "distance_fare": float,
                "time_fare": float,
                "subtotal": float,
                "surge_multiplier": float,
                "surged_fare": float,
                "promo_discount": float,
                "total_fare": float,
                "minimum_fare": float
            }
            
        calculate_surge(demand_ratio: float) -> float
            Calculate surge multiplier based on demand/supply ratio
            | Ratio | Surge |
            |-------|-------|
            | ≤1.0  | 1.0x  |
            | ≤1.5  | 1.2x  |
            | ≤2.0  | 1.5x  |
            | ≤3.0  | 1.8x  |
            | >3.0  | 2.0x  |
    """
```

---

## WebSocket System

### Overview

The WebSocket system provides real-time communication between server and clients for:
- Driver location updates
- Ride status changes
- Push notifications

### Connection Manager (`websocket_manager.py`)

```python
class ConnectionManager:
    """
    Manages WebSocket connections and push notifications
    
    Attributes:
        driver_connections: Dict[str, WebSocket]  # Connected drivers
        rider_connections: Dict[str, WebSocket]   # Connected riders
        driver_locations: Dict[str, dict]         # Real-time driver positions
        active_rides: Dict[str, dict]             # Rides being tracked
        pending_notifications: Dict[str, list]    # Queued for offline users
    
    Connection Methods:
        connect_driver(driver_id, websocket)
        connect_rider(rider_id, websocket)
        disconnect_driver(driver_id)
        disconnect_rider(rider_id)
    
    Messaging Methods:
        send_to_driver(driver_id, message)
        send_to_rider(rider_id, message)
        broadcast_to_drivers(message, exclude=set())
    
    Notification Methods:
        notify_rider(rider_id, type, title, message, data)
        notify_driver(driver_id, type, title, message, data)
        notify_ride_accepted(rider_id, driver_name, vehicle_info, eta, data)
        notify_driver_arriving(rider_id, driver_name, eta, data)
        notify_driver_arrived(rider_id, driver_name, data)
        notify_ride_started(rider_id, data)
        notify_ride_completed(rider_id, fare, data)
        notify_ride_cancelled(user_id, user_type, cancelled_by, reason, data)
        notify_new_ride_request(driver_id, pickup_address, fare, data)
        notify_rating_received(user_id, user_type, rating, data)
        notify_payment_received(driver_id, amount, data)
    """
```

### Notification Types

```python
class NotificationType(enum.Enum):
    # Ride lifecycle
    RIDE_REQUESTED = "ride_requested"
    RIDE_ACCEPTED = "ride_accepted"
    DRIVER_ARRIVING = "driver_arriving"
    DRIVER_ARRIVED = "driver_arrived"
    RIDE_STARTED = "ride_started"
    RIDE_COMPLETED = "ride_completed"
    RIDE_CANCELLED = "ride_cancelled"
    
    # Driver-specific
    NEW_RIDE_REQUEST = "new_ride_request"
    RIDE_CANCELLED_BY_RIDER = "ride_cancelled_by_rider"
    
    # Location
    DRIVER_LOCATION = "driver_location"
    
    # Payment & Rating
    PAYMENT_RECEIVED = "payment_received"
    PROMO_APPLIED = "promo_applied"
    RATING_RECEIVED = "rating_received"
```

### WebSocket Endpoints

#### Driver WebSocket: `/ws/driver/{driver_id}`

**Connection:**
```javascript
const ws = new WebSocket(`ws://localhost:8001/ws/driver/${driverId}?token=${accessToken}`);
```

**Events from Client:**
```json
// Location update (every 5-10 seconds)
{
  "event": "location_update",
  "lat": 28.6139,
  "lng": 77.2090
}

// Accept ride
{
  "event": "ride_accepted",
  "ride_id": "uuid"
}

// Status update
{
  "event": "ride_status_update",
  "ride_id": "uuid",
  "status": "arriving"  // arriving, arrived, in_progress, completed
}
```

**Events from Server:**
```json
// New ride request
{
  "event": "notification",
  "type": "new_ride_request",
  "title": "New Ride Request!",
  "message": "Pickup: Connaught Place. Fare: ₹421",
  "data": { "ride_id": "uuid", "pickup": {...}, "fare": 421 },
  "timestamp": "2024-01-07T10:30:00Z"
}

// Ride cancelled by rider
{
  "event": "notification",
  "type": "ride_cancelled_by_rider",
  "title": "Ride Cancelled",
  "message": "Ride cancelled by rider. Changed plans",
  "data": { "ride_id": "uuid" }
}
```

#### Rider WebSocket: `/ws/rider/{rider_id}`

**Connection:**
```javascript
const ws = new WebSocket(`ws://localhost:8001/ws/rider/${riderId}?token=${accessToken}`);
```

**Events from Client:**
```json
// Request ride (registers for notifications)
{
  "event": "request_ride",
  "ride_id": "uuid",
  "pickup": { "lat": 28.61, "lng": 77.20, "address": "..." },
  "drop": { "lat": 28.70, "lng": 77.10, "address": "..." },
  "vehicle_type": "sedan",
  "fare": 421
}

// Cancel ride
{
  "event": "cancel_ride",
  "ride_id": "uuid",
  "reason": "Changed plans"
}
```

**Events from Server:**
```json
// Driver accepted
{
  "event": "notification",
  "type": "ride_accepted",
  "title": "Ride Accepted!",
  "message": "John is on the way in a White Maruti Dzire. ETA: 8 mins",
  "data": { "ride_id": "uuid", "driver_id": "uuid", "vehicle": {...} }
}

// Driver location update
{
  "event": "driver_location",
  "ride_id": "uuid",
  "lat": 28.62,
  "lng": 77.21
}

// Driver arriving
{
  "event": "notification",
  "type": "driver_arriving",
  "title": "Driver Arriving",
  "message": "John is arriving in 3 mins"
}

// Driver arrived
{
  "event": "notification",
  "type": "driver_arrived",
  "title": "Driver Arrived!",
  "message": "John has arrived at pickup location"
}

// Ride completed
{
  "event": "notification",
  "type": "ride_completed",
  "title": "Ride Completed!",
  "message": "Your ride is complete. Fare: ₹421. Please pay in cash."
}
```

### Offline Notification Queue

When a user is not connected via WebSocket, notifications are queued:
- Maximum 50 notifications per user
- Delivered immediately upon reconnection
- Older notifications removed (FIFO)

---

## Configuration

### Environment Variables (`.env`)

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rideshare_db"

# JWT Authentication
JWT_SECRET="your-64-char-random-hex-string"

# Admin User (seeded on startup)
ADMIN_PHONE="9999999999"

# Mappls (MapmyIndia) API
MAPPLS_REST_KEY="your-rest-api-key"
MAPPLS_CLIENT_ID="your-client-id"
MAPPLS_CLIENT_SECRET="your-client-secret"

# Fast2sms OTP
FAST2SMS_API_KEY="your-fast2sms-api-key"
OTP_FALLBACK="123456"  # Fallback OTP when API fails

# Redis (optional, for caching)
REDIS_URL="redis://localhost:6379"
```

### Getting API Keys

#### Mappls (MapmyIndia)
1. Go to https://apis.mappls.com/console/
2. Create a new project
3. Get REST API Key, Client ID, and Client Secret

#### Fast2sms
1. Go to https://www.fast2sms.com/
2. Sign up and complete KYC
3. Get API Key from Dev API section
4. Register DLT templates for OTP messages

---

## Testing

### Run Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

### Test Credentials

| User Type | Phone | OTP |
|-----------|-------|-----|
| Admin | 9999999999 | 123456 |
| Test Rider | 9876543210 | 123456 |
| Test Driver | 8888888888 | 123456 |

### Manual API Testing

```bash
# Health check
curl http://localhost:8001/api/health

# Send OTP
curl -X POST http://localhost:8001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'

# Verify OTP
curl -X POST http://localhost:8001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456", "name": "Test User"}'

# Use token for authenticated requests
TOKEN="eyJhbGciOiJIUzI1NiIs..."
curl http://localhost:8001/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### WebSocket Testing

```python
import asyncio
import websockets
import json

async def test_driver_ws():
    uri = "ws://localhost:8001/ws/driver/driver-uuid?token=jwt-token"
    async with websockets.connect(uri) as ws:
        # Send location update
        await ws.send(json.dumps({
            "event": "location_update",
            "lat": 28.6139,
            "lng": 77.2090
        }))
        
        # Listen for notifications
        while True:
            message = await ws.recv()
            print(f"Received: {message}")

asyncio.run(test_driver_ws())
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Validation Errors (422)

```json
{
  "detail": [
    {
      "loc": ["body", "phone"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Security Considerations

1. **JWT Tokens**: Use strong secret, short expiry for access tokens
2. **Phone Verification**: OTP required for all authentications
3. **Role-Based Access**: Admin endpoints protected by role check
4. **Input Validation**: Pydantic models validate all inputs
5. **SQL Injection**: SQLAlchemy ORM prevents injection
6. **Rate Limiting**: Consider adding for production (not implemented)

---

## Deployment Notes

1. **Database**: Use managed PostgreSQL (RDS, Cloud SQL)
2. **Environment**: Never commit `.env` file
3. **HTTPS**: Use reverse proxy (nginx) with SSL
4. **Scaling**: Single instance sufficient for moderate load
5. **Monitoring**: Add logging, metrics, alerts
6. **Backups**: Regular database backups

---

## Support

For issues or questions:
- Check API docs at `/docs` (Swagger UI)
- Review logs: `tail -f /var/log/supervisor/backend.err.log`
- Database: `psql -d rideshare_db`

---

*Documentation generated: April 2026*
*Version: 1.0.0*
