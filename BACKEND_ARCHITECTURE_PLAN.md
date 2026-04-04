# Ride-Sharing Backend Architecture Plan (Monolithic - Python/FastAPI)

## Overview
A complete backend for ride-sharing application with Rider, Driver, and Admin modules using:
- **Database**: PostgreSQL
- **Maps/Routing**: Mappls (MapmyIndia)
- **SMS/OTP**: Fast2sms (with fallback to 123456)
- **Payments**: IDFC Bank (abstracted layer - ready for integration)
- **Real-time**: WebSocket for live tracking

---

## Phase 1: Core Foundation (Database + Auth + User Management)

### 1.1 Database Schema (PostgreSQL)
```
Tables:
├── users (id, phone, name, email, role[rider/driver/admin], is_verified, created_at)
├── otp_verifications (id, phone, otp_code, expires_at, is_used)
├── driver_profiles (user_id, vehicle_type, vehicle_number, license_number, is_online, rating, total_rides)
├── rider_profiles (user_id, rating, total_rides, saved_addresses)
├── vehicles (id, driver_id, type[bike/auto/mini/sedan/suv], model, color, number_plate)
```

### 1.2 Authentication APIs
- `POST /api/auth/send-otp` - Send OTP via Fast2sms (fallback: 123456)
- `POST /api/auth/verify-otp` - Verify OTP and return JWT token
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user profile

### 1.3 User Management APIs
- `PUT /api/users/profile` - Update user profile
- `POST /api/drivers/register` - Register as driver (add vehicle details)
- `PUT /api/drivers/toggle-online` - Toggle driver online/offline status
- `GET /api/users/saved-addresses` - Get rider's saved addresses
- `POST /api/users/saved-addresses` - Add saved address

---

## Phase 2: Maps & Location Services (Mappls Integration)

### 2.1 Mappls APIs to Integrate
- **Geocoding**: Address to coordinates
- **Reverse Geocoding**: Coordinates to address
- **Distance Matrix**: Calculate distance/time between points
- **Routing API**: Get route polyline for navigation
- **Autocomplete**: Address search suggestions

### 2.2 Location APIs
- `GET /api/maps/geocode` - Convert address to lat/lng
- `GET /api/maps/reverse-geocode` - Convert lat/lng to address
- `GET /api/maps/autocomplete` - Search address suggestions
- `GET /api/maps/distance` - Get distance & ETA between two points
- `GET /api/maps/route` - Get detailed route with polyline

---

## Phase 3: Ride Management

### 3.1 Database Tables
```
├── rides (id, rider_id, driver_id, status, pickup_lat, pickup_lng, pickup_address,
│          drop_lat, drop_lng, drop_address, vehicle_type, estimated_fare, actual_fare,
│          distance_km, duration_mins, created_at, started_at, completed_at, cancelled_at)
├── ride_requests (id, ride_id, driver_id, status[pending/accepted/rejected], created_at)
├── ride_tracking (id, ride_id, driver_lat, driver_lng, timestamp)
```

### 3.2 Ride APIs
- `POST /api/rides/estimate` - Get fare estimate for pickup/drop
- `POST /api/rides/request` - Request a new ride
- `GET /api/rides/nearby-drivers` - Get available drivers near pickup
- `POST /api/rides/{id}/accept` - Driver accepts ride
- `POST /api/rides/{id}/reject` - Driver rejects ride
- `POST /api/rides/{id}/start` - Driver starts ride
- `POST /api/rides/{id}/complete` - Driver completes ride
- `POST /api/rides/{id}/cancel` - Cancel ride (rider or driver)
- `GET /api/rides/current` - Get current active ride
- `GET /api/rides/history` - Get ride history

### 3.3 Fare Calculation
- Base fare per vehicle type
- Per km rate
- Per minute rate
- Surge pricing multiplier (based on demand)
- Promo code discounts

---

## Phase 4: Real-time Features (WebSocket)

### 4.1 WebSocket Events
```
Driver -> Server:
├── location_update (lat, lng) - Every 5 seconds when online
├── ride_response (accept/reject)

Server -> Rider:
├── driver_assigned (driver details, ETA)
├── driver_location (lat, lng) - Real-time tracking
├── ride_status_changed (accepted, started, completed)

Server -> Driver:
├── new_ride_request (pickup, drop, fare)
├── ride_cancelled
```

### 4.2 WebSocket APIs
- `WS /ws/driver/{driver_id}` - Driver connection
- `WS /ws/rider/{rider_id}` - Rider connection

---

## Phase 5: Payments (IDFC Bank Integration)

### 5.1 Database Tables
```
├── wallets (user_id, balance, currency)
├── transactions (id, wallet_id, type[credit/debit], amount, reference_id, status, created_at)
├── payments (id, ride_id, amount, method[wallet/card/upi], status, gateway_txn_id)
├── promo_codes (id, code, discount_type[flat/percent], discount_value, max_uses, valid_until)
├── promo_usages (id, promo_id, user_id, ride_id, discount_applied)
```

### 5.2 Payment APIs
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/add-money` - Add money to wallet (IDFC gateway)
- `POST /api/payments/initiate` - Initiate payment for ride
- `POST /api/payments/webhook` - Payment gateway callback
- `GET /api/transactions/history` - Get transaction history
- `POST /api/promo/apply` - Apply promo code
- `POST /api/promo/validate` - Validate promo code

**Note**: IDFC Bank integration will be abstracted. Since you have vendor account/QR but no API docs, I'll create a mock payment service that:
1. Simulates successful payments for testing
2. Has proper interfaces ready for real IDFC API integration
3. Supports UPI intent/QR generation

---

## Phase 6: Ratings & Reviews

### 6.1 Database Tables
```
├── ratings (id, ride_id, from_user_id, to_user_id, rating, review, created_at)
```

### 6.2 Rating APIs
- `POST /api/rides/{id}/rate` - Rate ride (1-5 stars + review)
- `GET /api/users/{id}/ratings` - Get user ratings

---

## Phase 7: Admin Panel APIs

### 7.1 Admin APIs
- `GET /api/admin/dashboard` - Stats (total rides, revenue, active drivers)
- `GET /api/admin/users` - List all users with filters
- `GET /api/admin/drivers` - List all drivers with status
- `PUT /api/admin/drivers/{id}/verify` - Verify/approve driver
- `PUT /api/admin/drivers/{id}/suspend` - Suspend driver
- `GET /api/admin/rides` - List all rides with filters
- `POST /api/admin/promo-codes` - Create promo code
- `GET /api/admin/promo-codes` - List promo codes
- `PUT /api/admin/promo-codes/{id}` - Update promo code
- `GET /api/admin/transactions` - List all transactions
- `PUT /api/admin/fare-config` - Update fare configuration

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Framework | FastAPI (Python 3.11+) |
| Database | PostgreSQL |
| ORM | SQLAlchemy + Alembic (migrations) |
| Auth | JWT (PyJWT) |
| WebSocket | FastAPI WebSockets |
| Maps | Mappls REST API |
| SMS/OTP | Fast2sms API |
| Payments | IDFC Bank (abstracted/mocked) |
| Caching | Redis (for OTP, driver locations) |
| Task Queue | (Optional) Celery for async tasks |

---

## API Credentials Summary

```
MAPPLS_REST_KEY=365604b92d239a28d858feb5022fb356
MAPPLS_CLIENT_ID=96dHZVzsAuvbcvWO8GwRHLfHmm14n6v
MAPPLS_CLIENT_SECRET=<need full secret>
FAST2SMS_API_KEY=ZgVTyfZ2xpvzpSh1AeQERI1eU07WjNgOb3HHypaLjMVjhSzpBEck8E7iVzUM
IDFC_VENDOR_ID=mr_rideo
```

---

## Implementation Phases

| Phase | Description | Priority |
|-------|-------------|----------|
| Phase 1 | Database + Auth + Users | P0 (Core) |
| Phase 2 | Mappls Integration | P0 (Core) |
| Phase 3 | Ride Management | P0 (Core) |
| Phase 4 | WebSocket Real-time | P1 (Important) |
| Phase 5 | Payments (Mocked) | P1 (Important) |
| Phase 6 | Ratings & Reviews | P2 (Enhancement) |
| Phase 7 | Admin APIs | P2 (Enhancement) |

---

## Questions Before Proceeding

1. **Mappls Client Secret**: Can you share the full client secret from the image? (It's cut off)
2. **Vehicle Types**: Confirm the vehicle categories you want:
   - Bike, Auto, Mini (Hatchback), Sedan, SUV ?
3. **IDFC Payment**: Since no API docs are available, should I:
   - Create a fully mocked payment system (recommended for now)
   - Generate UPI QR codes using standard UPI deep links with your vendor ID

**Awaiting your approval to proceed with Phase 1 implementation.**
