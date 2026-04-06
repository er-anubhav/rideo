# 🌐 Access URLs & Service Information

**Last Updated:** 2026-04-06 23:16 UTC  
**Environment:** Emergent Cloud Preview

---

## 🔗 Public Access URLs

### Backend API (FastAPI)
```
Base URL: https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com
```

**Key Endpoints:**
- **Health Check**: https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/health
- **API Documentation (Swagger)**: https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/docs
- **API Documentation (ReDoc)**: https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/redoc
- **Root Info**: https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/

**WebSocket URL:**
```
wss://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/ws
```

**Test Backend:**
```bash
curl https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/health
# Response: {"status":"healthy"}
```

---

### Admin Dashboard (Vite + React)

**Note:** Admin dashboard is running on internal port 3002. To access it, you'll need to:

**Option 1: Port Forward (if you have SSH access)**
```bash
ssh -L 3002:localhost:3002 your-server
# Then access: http://localhost:3002
```

**Option 2: Use VS Code Port Forwarding**
- VS Code will automatically forward port 3002
- Access via the forwarded URL provided by VS Code

**Internal URL:** http://localhost:3002

---

## 📱 Mobile Applications

### Rider App (React Native + Expo)

**Location:** `/app/rider-app`  
**Configuration:** ✅ Configured with correct backend URL

**Environment Variables (.env):**
```
EXPO_PUBLIC_API_BASE_URL=https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api
EXPO_PUBLIC_WS_BASE_URL=wss://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/ws
```

**To Run Locally:**
```bash
cd /app/rider-app
yarn start

# Then scan QR code with Expo Go app on your phone
# Or press 'a' for Android emulator, 'i' for iOS simulator
```

**Features:**
- OTP-based login
- Request rides
- Real-time driver tracking
- Ride history
- Wallet management
- Rating system

---

### Driver App (React Native + Expo)

**Location:** `/app/driver-app`  
**Configuration:** ✅ Configured with correct backend URL

**Environment Variables (.env):**
```
EXPO_PUBLIC_API_BASE_URL=https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api
EXPO_PUBLIC_WS_BASE_URL=wss://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/ws
```

**To Run Locally:**
```bash
cd /app/driver-app
yarn start

# Then scan QR code with Expo Go app on your phone
# Or press 'a' for Android emulator, 'i' for iOS simulator
```

**Features:**
- Driver registration & verification
- Accept/reject ride requests
- Real-time navigation
- Earnings tracking
- Ride history
- Online/offline status

---

## 🗄️ Database Access

### PostgreSQL (Primary Database)

**Connection String:**
```
postgresql://postgres:postgres123@localhost:5432/rideshare_db
```

**Access from Container:**
```bash
sudo -u postgres psql rideshare_db

# List tables
\dt

# View users
SELECT id, phone, name, role FROM users LIMIT 5;

# View drivers
SELECT user_id, license_number, is_online, rating FROM driver_profiles LIMIT 5;
```

**Tables:**
- users
- driver_profiles
- vehicles
- rides
- fare_configs
- notifications
- ratings
- promo_codes
- support_tickets
- wallet_transactions
- otps

---

### MongoDB (Secondary/Optional)

**Connection String:**
```
mongodb://localhost:27017
```

**Access:**
```bash
mongosh
# Then: use rideshare_logs
```

---

## 🎯 API Testing Guide

### Authentication Flow

**1. Request OTP:**
```bash
curl -X POST https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9999999999"}'
```

**2. Verify OTP:**
```bash
curl -X POST https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9999999999", "otp": "123456"}'
```

**3. Use the returned `access_token` for authenticated requests:**
```bash
curl https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Default Admin Account

**Phone:** `9999999999`  
**OTP:** Check `/app/backend/.env` for `OTP_FALLBACK` value (default: `123456`)  
**Role:** Admin

---

## 🔧 Service Management

### Check Status
```bash
supervisorctl status
```

**Current Services:**
- ✅ backend (port 8001)
- ✅ admin-dashboard (port 3002)
- ✅ mongodb (port 27017)
- ✅ postgresql (port 5432 - via system service)

---

### View Logs

**Backend:**
```bash
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/backend.out.log
```

**Admin Dashboard:**
```bash
tail -f /var/log/supervisor/admin-dashboard.out.log
```

**PostgreSQL:**
```bash
tail -f /var/log/postgresql/postgresql-15-main.log
```

---

### Restart Services

```bash
# Restart individual service
supervisorctl restart backend
supervisorctl restart admin-dashboard

# Restart all
supervisorctl restart all
```

---

## 📊 Service Health Checks

### Backend API
```bash
curl https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/health
# Expected: {"status":"healthy"}
```

### PostgreSQL
```bash
sudo -u postgres psql -c "SELECT version();"
```

### MongoDB
```bash
mongosh --eval "db.version()"
```

---

## 🚀 Quick Start Testing

### Test Complete Ride Flow

**1. Create Rider Account:**
```bash
# Request OTP
curl -X POST https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890"}'

# Verify OTP (use fallback OTP from .env)
curl -X POST https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "1234567890", "otp": "123456"}'
```

**2. Create Driver Account:**
```bash
# Use different phone number
curl -X POST https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'
```

**3. Use Mobile Apps:**
- Download Expo Go on your phone
- Run `cd /app/rider-app && yarn start` for rider
- Run `cd /app/driver-app && yarn start` for driver
- Scan QR codes to load apps
- Test complete ride flow

---

## 🔐 Security & Configuration

### Environment Files

**Backend:** `/app/backend/.env`
```
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/rideshare_db
JWT_SECRET=[32+ byte secret recommended]
ADMIN_PHONE=9999999999
MAPPLS_REST_KEY=365604b92d239a28d858feb5022fb356
OTP_FALLBACK=123456
```

**Rider App:** `/app/rider-app/.env`
```
EXPO_PUBLIC_API_BASE_URL=https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api
EXPO_PUBLIC_WS_BASE_URL=wss://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/ws
```

**Driver App:** `/app/driver-app/.env`
```
EXPO_PUBLIC_API_BASE_URL=https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/api
EXPO_PUBLIC_WS_BASE_URL=wss://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/ws
```

---

## ⚠️ Important Notes

### Mobile Apps in Cloud Environment
- Mobile apps (Expo) cannot run in this headless cloud environment
- They need to be run locally on your development machine
- Dependencies are installed and apps are configured
- Just run `yarn start` locally and scan QR code

### Admin Dashboard Access
- Dashboard runs on internal port 3002
- Use port forwarding or VS Code's automatic port forward feature
- Not exposed externally by default

### WebSocket Connections
- WebSocket URL: `wss://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/ws`
- Endpoints:
  - `/ws/rider/{rider_id}?token=JWT_TOKEN`
  - `/ws/driver/{driver_id}?token=JWT_TOKEN`

---

## 📚 Additional Documentation

- **Complete System Status**: `/app/SYSTEM_STATUS.md`
- **Bug Fixes Applied**: `/app/BUGFIX_SUMMARY.md`
- **Setup Guide**: `/app/docs/HOW_TO_RUN.md`
- **API Testing**: `/app/docs/API_TESTING_GUIDE.md`
- **Features List**: `/app/docs/FEATURES.md`

---

## ✅ Status Summary

| Component | Status | URL/Port |
|-----------|--------|----------|
| **Backend API** | ✅ RUNNING | https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com |
| **Admin Dashboard** | ✅ RUNNING | http://localhost:3002 (port forward needed) |
| **PostgreSQL** | ✅ RUNNING | localhost:5432 |
| **MongoDB** | ✅ RUNNING | localhost:27017 |
| **Rider App** | ✅ CONFIGURED | Run locally with `yarn start` |
| **Driver App** | ✅ CONFIGURED | Run locally with `yarn start` |

---

**All backend services are running and accessible via HTTPS!**  
**Mobile apps are configured and ready to run locally.**

---

**Need Help?**
- Check logs: `supervisorctl tail -f backend`
- Test API: https://c8446806-4412-4e96-b48c-85d30906ff0f.preview.emergentagent.com/docs
- Restart services: `supervisorctl restart all`
