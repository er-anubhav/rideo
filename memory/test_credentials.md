# Test Credentials for Ride Sharing Platform

## Admin Account
- **Phone:** 9999999999
- **OTP:** 123456 (fallback OTP for development)
- **Role:** Admin
- **Access:** Full admin dashboard access

## Test Users Created
1. **Phone:** 5555555555
   - **Name:** Test User 5
   - **Role:** Rider

2. **Phone:** 8888888888
   - **Role:** Rider

3. **Phone:** 9876543210
   - **Role:** Rider

## Authentication Flow
1. Send OTP: `POST /api/auth/send-otp` with `{"phone": "9999999999"}`
2. Verify OTP: `POST /api/auth/verify-otp` with `{"phone": "9999999999", "otp": "123456"}`
3. Use the returned `access_token` in Authorization header: `Bearer <token>`

## Database Connection
- **Host:** localhost
- **Port:** 5432
- **Database:** rideshare_db
- **Username:** postgres
- **Password:** postgres123

## API Endpoints
- **Backend API:** http://localhost:8001
- **API Documentation:** http://localhost:8001/docs
- **Admin Dashboard:** http://localhost:3001

## Environment Configuration
All environment variables are configured in:
- Backend: `/app/backend/.env`
- Admin Dashboard: `/app/admin-dashboard/.env`
- Rider App: `/app/rider-app/.env`
- Driver App: `/app/driver-app/.env`

## Mappls API Credentials (Configured)
- REST Key: 365604b92d239a28d858feb5022fb356
- Client ID: Configured in .env files
- Client Secret: Configured in .env files

Last Updated: April 6, 2026
