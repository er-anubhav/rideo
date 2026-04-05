# Mr. Rideo Apps And Backend

This repo contains the FastAPI backend plus the two mobile clients that talk to it:

- `backend/` = **FastAPI Backend**
- `driver-app/` = **Driver Partner App**
- `rider-app/` = **Rider App**

The backend contract is now documented consistently as:

- REST base URL: `http(s)://<host>:8001/api`
- WebSocket base URL: `ws(s)://<host>:8001/ws`

Older naming such as `Readme.md`, "Driver Application", and "Rider Application" should be treated as legacy naming. Some legacy config keys like `EXPO_PUBLIC_ENABLE_MQTT` and `EXPO_PUBLIC_MQTT_BROKER_URL` are still accepted for compatibility.

## Documentation Map

- Architecture plan: [BACKEND_ARCHITECTURE_PLAN.md](BACKEND_ARCHITECTURE_PLAN.md)
- Backend implementation guide: [backend/README.md](backend/README.md)
- Driver Partner App guide: [driver-app/README.md](driver-app/README.md)
- Rider App guide: [rider-app/README.md](rider-app/README.md)

## Local Development Defaults

- Backend: `http://localhost:8001`
- Rider App: Expo on port `8081`
- Driver Partner App: Expo on port `8082`

Suggested local env values:

- `EXPO_PUBLIC_API_BASE_URL=http://localhost:8001/api`
- `EXPO_PUBLIC_WS_BASE_URL=ws://localhost:8001/ws`

## Backend Contract At A Glance

### Shared Auth

Both mobile apps use:

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/users/me`
- `PUT /api/users/profile`

### Driver Partner App

Primary backend areas:

- `/api/drivers/*`
- `/api/rides/*`
- `/api/earnings/*`
- `/ws/driver/{driver_id}`

### Rider App

Primary backend areas:

- `/api/maps/*`
- `/api/rides/*`
- `/api/users/*`
- `/ws/rider/{rider_id}`

## Current Feature Coverage

Backed by FastAPI today:

- OTP auth
- user profiles
- driver onboarding
- ride request / accept / start / complete / cancel
- route previews and ride route snapshots
- earnings
- realtime ride and location updates over WebSockets

Not yet fully backed by FastAPI:

- wallet
- notifications REST inbox
- support chat
- full payments flow

The mobile apps now document these gaps directly so the expected behavior is clear during development.
