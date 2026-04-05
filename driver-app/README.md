# Driver Partner App

This is the driver-facing Expo client for the FastAPI backend in `../backend`.

## What This App Is Called

Use this naming consistently:

- **Driver Partner App** = mobile app in this folder
- **FastAPI Backend** = server in `../backend`

Avoid reintroducing the older generic name "Driver Application" in docs unless you are talking about legacy materials.

## Backend Relationship

The Driver Partner App talks to the backend in two ways:

- REST at `http(s)://<host>:8001/api`
- WebSocket at `ws(s)://<host>:8001/ws`

The realtime bridge lives in `src/api/realtime.service.ts` and connects to the backend WebSocket endpoint:

- `WS /ws/driver/{driver_id}?token=<jwt>`

## Backend Flows Used By This App

### Auth

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/users/me`

### Driver Onboarding

- `PUT /api/users/profile`
- `POST /api/drivers/register`
- `GET /api/drivers/profile`

### Driver Availability And Trips

- `POST /api/drivers/toggle-online`
- `GET /api/rides/current`
- `GET /api/rides/requests`
- `POST /api/rides/{ride_id}/accept`
- `POST /api/rides/{ride_id}/arriving`
- `POST /api/rides/{ride_id}/arrived`
- `POST /api/rides/{ride_id}/start`
- `POST /api/rides/{ride_id}/complete`
- `POST /api/rides/{ride_id}/cancel`
- `GET /api/rides/{ride_id}/route`
- `GET /api/rides/history`

### Earnings

- `GET /api/earnings/stats`

## Current Backend Limitations

These driver-facing screens are still ahead of the backend:

- notifications inbox REST APIs are not implemented server-side
- document upload is UI-only right now
- admin control realtime events are not part of the current backend contract

The app currently degrades gracefully in those areas rather than failing hard.

## Environment Variables

Create `.env` from `.env.example` and adjust values for your environment.

- `EXPO_PUBLIC_API_BASE_URL`
  REST API base URL, for example `http://localhost:8001/api`
- `EXPO_PUBLIC_WS_BASE_URL`
  backend WebSocket base URL, for example `ws://localhost:8001/ws`
- `EXPO_PUBLIC_REQUEST_TIMEOUT_MS`
  REST request timeout in milliseconds
- `EXPO_PUBLIC_ENABLE_REMOTE_LOGGING`
  optional logging toggle
- `EXPO_PUBLIC_ENABLE_DEBUG_LOGS`
  optional verbose logging toggle
- `EXPO_PUBLIC_ENABLE_REALTIME`
  preferred realtime toggle
- `EXPO_PUBLIC_ENABLE_MQTT`
  legacy alias for `EXPO_PUBLIC_ENABLE_REALTIME`

## Setup

```bash
npm install
cp .env.example .env
```

## Run

```bash
npm run start
npm run android
npm run ios
```

## Verification

```bash
npm run lint
npm run typecheck
npm run check
node --import tsx --test tests/api-endpoints.test.ts
```

## Production Notes

- do not commit `.env`
- use `https://` for REST and `wss://` for WebSockets
- keep backend and app hostnames aligned so token-authenticated WebSocket sessions can connect cleanly
