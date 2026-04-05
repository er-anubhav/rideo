# Test Credentials - Rideshare Backend

## Admin User
- **Phone**: 9999999999
- **OTP**: 123456 (fallback)
- **Role**: admin

## Test Rider
- **Phone**: 9876543210
- **OTP**: 123456 (fallback)
- **Role**: rider

## Test Driver
- **Phone**: 8888888888
- **OTP**: 123456 (fallback)
- **Role**: driver
- **License**: DL123456789
- **Vehicle**: Maruti Dzire (Sedan) - DL 01 AB 1234

## API Endpoints
- Auth: `/api/auth/send-otp`, `/api/auth/verify-otp`
- Users: `/api/users/me`
- Drivers: `/api/drivers/register`, `/api/drivers/toggle-online`
- Rides: `/api/rides/estimate`, `/api/rides/request`
- Admin: `/api/admin/dashboard`

## Database
- PostgreSQL: `rideshare_db`
- Host: localhost:5432
- User: postgres
- Password: postgres
