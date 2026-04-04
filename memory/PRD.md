# Rideshare Backend - Product Requirements Document

## Project Overview
A monolithic backend architecture for a complete ride-sharing application supporting riders, drivers, and administrators.

## Tech Stack
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Maps & Routing**: Mappls (MapmyIndia) API
- **SMS/OTP**: Fast2sms (with fallback to 123456)
- **Real-time**: WebSocket for live tracking
- **Auth**: JWT tokens (phone + OTP based)
- **Payment**: Cash only (payment gateway integration deferred)

## User Personas

### 1. Rider
- Request rides with pickup/drop locations
- View fare estimates for all vehicle types
- Track driver in real-time
- Rate completed rides
- Save favorite addresses

### 2. Driver
- Register with license and vehicle details
- Toggle online/offline status
- Accept/reject ride requests
- Navigate to pickup and drop locations
- Complete rides and collect cash payment

### 3. Admin
- View dashboard with stats (users, rides, revenue)
- Verify/suspend drivers
- Manage fare configurations
- Create and manage promo codes

## Core Requirements (Static)

### Phase 1: Foundation ✅
- [x] PostgreSQL database with complete schema
- [x] JWT authentication with phone + OTP
- [x] User management (Rider, Driver, Admin roles)
- [x] Fast2sms integration with fallback OTP

### Phase 2: Maps Integration ✅
- [x] Mappls geocoding (address ↔ coordinates)
- [x] Mappls autocomplete for address search
- [x] Distance matrix calculation
- [x] Route planning with polyline
- [x] Haversine fallback for API failures

### Phase 3: Ride Management ✅
- [x] Fare estimation for all vehicle types
- [x] Ride request creation
- [x] Ride lifecycle (searching → accepted → arriving → arrived → in_progress → completed)
- [x] Ride cancellation
- [x] Ride history

### Phase 4: Real-time Features ✅
- [x] WebSocket for driver connections
- [x] WebSocket for rider connections
- [x] Real-time location updates
- [x] Ride status broadcasts

### Phase 5: Ratings & Admin ✅
- [x] Rating system (1-5 stars + review)
- [x] Admin dashboard with stats
- [x] Driver verification workflow
- [x] Promo code management

## What's Been Implemented
**Date: April 4, 2026**

### Database Models
- Users, DriverProfiles, Vehicles
- RiderProfiles, SavedAddresses
- OTPVerifications
- Rides, RideRequests, RideTracking
- Ratings
- FareConfigs
- PromoCodes, PromoUsages

### API Endpoints (45+ endpoints)
- `/api/auth/*` - Authentication (send-otp, verify-otp, refresh)
- `/api/users/*` - User profile, saved addresses
- `/api/drivers/*` - Driver registration, vehicles, location
- `/api/maps/*` - Geocoding, distance, routes
- `/api/rides/*` - Fare estimate, request, accept, complete
- `/api/ratings/*` - Create and view ratings
- `/api/admin/*` - Dashboard, users, drivers, fare configs
- `/api/promo/*` - Validate and apply promo codes
- `/ws/driver/{id}` - Driver WebSocket
- `/ws/rider/{id}` - Rider WebSocket

### Vehicle Types & Fares
| Type | Base Fare | Per KM | Per Min | Min Fare |
|------|-----------|--------|---------|----------|
| Bike | ₹20 | ₹8 | ₹1 | ₹25 |
| Auto | ₹30 | ₹12 | ₹1.5 | ₹35 |
| Mini | ₹50 | ₹14 | ₹2 | ₹60 |
| Sedan | ₹80 | ₹18 | ₹2.5 | ₹100 |
| SUV | ₹120 | ₹22 | ₹3 | ₹150 |

## Prioritized Backlog

### P0 (Critical) - Done
- ✅ All core ride-sharing functionality implemented

### P1 (Important) - Deferred
- [ ] IDFC Bank payment gateway integration
- [ ] Push notifications
- [ ] Driver document verification (upload/review)

### P2 (Nice to have)
- [ ] Ride scheduling (future bookings)
- [ ] Driver earnings reports
- [ ] Rider referral program
- [ ] Multi-language support

## Next Tasks
1. Test complete ride flow end-to-end with real Mappls API
2. Deploy to production environment
3. Integrate IDFC Bank payment gateway when API docs available
4. Add push notifications for ride updates

## API Keys & Configuration
```
MAPPLS_REST_KEY=365604b92d239a28d858feb5022fb356
MAPPLS_CLIENT_ID=96dHZVzsAuvbcvWO8GwRHLfHmm14n6vvC6CNgrxwJ9_GhMiDLrHv00rIvkxaaljxr20CtmaCvMh8cKtJErSi_8Tg38J_ciA5
MAPPLS_CLIENT_SECRET=lrFxI-iSEg_PE1iIElYjeTVYyOwe7d4CTjmPcx-wXUxIc7MAtXOFnkEutd3bPom86Kq2af--cQZX_Ns8GpSOHYhq5Y0LZ9IQe1ZVtQZGpPg=
FAST2SMS_API_KEY=ZgVTyfZ2xpvzpSh1AeQERI1eU07WjNgOb3HHypaLjMVjhSzpBEck8E7iVzUM
```
