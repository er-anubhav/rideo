# Backend Architecture Plan

This document is the backend-side planning and contract summary for the two mobile clients in this repo:

- `driver-app` = **Driver Partner App**
- `rider-app` = **Rider App**

For day-to-day setup and integration notes, use the root [README.md](README.md), [driver-app/README.md](driver-app/README.md), and [rider-app/README.md](rider-app/README.md). This file focuses on architecture and the backend contract both apps are expected to follow.

---

## Current Naming

- **FastAPI Backend**: monolithic Python backend under `backend/`
- **Driver Partner App**: Expo app under `driver-app/`
- **Rider App**: Expo app under `rider-app/`

The older terms "driver application" and "rider application" should be treated as legacy naming. Some compatibility config keys still use older MQTT wording, but the current runtime contract is:

- REST over `http(s)://<host>:8001/api`
- FastAPI WebSockets over `ws(s)://<host>:8001/ws`

---

## System Overview

The backend supports three client categories:

- Rider App
- Driver Partner App
- Admin / internal tooling

Core platform components:

- **Auth**: OTP + JWT
- **Data**: PostgreSQL via async SQLAlchemy
- **Maps**: Mappls geocoding, ETA, and routing
- **Realtime**: FastAPI WebSockets for rider and driver sessions
- **Business Domains**: users, drivers, rides, earnings, ratings, promo, admin

---

## Integration Model

### REST Responsibilities

REST is authoritative for:

- authentication
- user profile reads and writes
- driver onboarding
- ride creation
- ride lifecycle mutations
- ride history and invoices
- route snapshots
- earnings

### WebSocket Responsibilities

WebSockets are used for session-oriented realtime updates:

- driver availability feed
- ride request fan-out to drivers
- rider ride-status updates
- live driver location during a trip
- reconnect delivery of pending notifications

### Socket Endpoints

- `WS /ws/driver/{driver_id}?token=<jwt>`
- `WS /ws/rider/{rider_id}?token=<jwt>`

---

## Backend Domains

### Auth And Users

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh`
- `GET /api/users/me`
- `PUT /api/users/profile`

### Drivers

- `POST /api/drivers/register`
- `GET /api/drivers/profile`
- `POST /api/drivers/toggle-online`
- `POST /api/drivers/location`
- `GET /api/drivers/nearby`

### Maps

- `GET /api/maps/geocode`
- `GET /api/maps/reverse-geocode`
- `GET /api/maps/autocomplete`
- `GET /api/maps/distance`
- `POST /api/maps/route`

### Rides

- `POST /api/rides/estimate`
- `POST /api/rides/request`
- `GET /api/rides/current`
- `GET /api/rides/requests`
- `POST /api/rides/{ride_id}/accept`
- `POST /api/rides/{ride_id}/arriving`
- `POST /api/rides/{ride_id}/arrived`
- `POST /api/rides/{ride_id}/start`
- `POST /api/rides/{ride_id}/complete`
- `POST /api/rides/{ride_id}/cancel`
- `GET /api/rides/{ride_id}/route`
- `GET /api/rides/{ride_id}/invoice`
- `POST /api/rides/{ride_id}/sos`
- `GET /api/rides/history`

### Driver Earnings

- `GET /api/earnings/stats`
- `GET /api/earnings/summary`
- `GET /api/earnings/daily`
- `GET /api/earnings/rides`
- `GET /api/earnings/weekly-comparison`

---

## Client Contract By App

### Driver Partner App

The driver app relies on:

- OTP auth
- driver profile registration and lookup
- online/offline toggle
- ride request polling via `GET /api/rides/requests`
- ride lifecycle mutations through REST
- driver WebSocket connection for ride request and cancellation notifications
- periodic driver location pushes over the driver WebSocket

### Rider App

The rider app relies on:

- OTP auth
- user profile reads and writes
- Mappls-backed search and routing
- ride creation through REST
- rider WebSocket registration after ride creation
- realtime ride notifications from the rider WebSocket
- invoice and ride-history reads

---

## Known Gaps

These areas are either partially implemented or intentionally deferred:

- wallet APIs are not yet backed by FastAPI
- notifications REST APIs are not yet backed by FastAPI
- support chat APIs are not yet backed by FastAPI
- admin-issued driver control events are not yet part of the mobile WebSocket contract
- payments remain mocked / deferred

The app docs call these out explicitly so frontend behavior stays understandable even when a backend feature is still pending.

---

## Recommended Local Development Ports

- Backend: `8001`
- Rider App: `8081`
- Driver Partner App: `8082`

Suggested local base URLs:

- REST: `http://localhost:8001/api`
- WebSocket: `ws://localhost:8001/ws`

---

## Next Documentation Sources

- Root integration overview: [README.md](README.md)
- Backend implementation details: [backend/README.md](backend/README.md)
- Driver Partner App contract: [driver-app/README.md](driver-app/README.md)
- Rider App contract: [rider-app/README.md](rider-app/README.md)
