# Rider App

This is the rider-facing Expo client for the FastAPI backend in `../backend`.

## What This App Is Called

Use this naming consistently:

- **Rider App** = mobile app in this folder
- **FastAPI Backend** = server in `../backend`

The realtime bridge lives in `src/features/ride/realtime.service.js` and uses the backend WebSocket API.

## Backend Relationship

The Rider App talks to the backend in two ways:

- REST at `http(s)://<host>:8001/api`
- WebSocket at `ws(s)://<host>:8001/ws`

The rider socket connects to:

- `WS /ws/rider/{rider_id}?token=<jwt>`

## Backend Flows Used By This App

### Auth And Profile

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/users/me`
- `PUT /api/users/profile`

### Maps And Search

- `GET /api/maps/autocomplete`
- `GET /api/maps/geocode`
- `GET /api/maps/reverse-geocode`
- `POST /api/maps/route`

### Ride Booking And Trip State

- `POST /api/rides/request`
- `GET /api/rides/current`
- `GET /api/rides/{ride_id}/route`
- `GET /api/rides/{ride_id}/invoice`
- `POST /api/rides/{ride_id}/cancel`
- `GET /api/rides/history`

### Realtime Behavior

The Rider App uses the rider WebSocket for:

- ride-request fan-out registration after REST ride creation
- ride accepted / arriving / arrived / started / completed notifications
- live driver location updates

## Current Backend Limitations

These rider-facing areas are not fully backed by FastAPI yet:

- wallet APIs
- support chat APIs
- notifications inbox REST APIs

The current app keeps those flows non-blocking where possible and falls back to empty or local states instead of treating them as fatal backend failures.

## Environment Variables

Create `.env` from `.env.example` and adjust values for your environment.

- `EXPO_PUBLIC_APP_ENV`
  usually `development` or `production`
- `EXPO_PUBLIC_API_BASE_URL`
  REST API base URL, for example `http://localhost:8001/api`
- `EXPO_PUBLIC_WS_BASE_URL`
  preferred backend WebSocket base URL, for example `ws://localhost:8001/ws`
- `EXPO_PUBLIC_MQTT_BROKER_URL`
  legacy alias still supported by the compatibility layer; point it at the same backend WebSocket base if present
- `EXPO_PUBLIC_CONFIG_URL`
  optional remote config endpoint
- `EXPO_PUBLIC_MAP_TILE_URL_TEMPLATE`
  optional map tile template override

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
```

## Production Notes

- use `https://` for REST and `wss://` for WebSockets
- keep `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_BASE_URL` on the same backend host
- if you keep `EXPO_PUBLIC_MQTT_BROKER_URL` for compatibility, point it to the same WebSocket base as `EXPO_PUBLIC_WS_BASE_URL`
