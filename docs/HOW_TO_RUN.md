# 🏃 How to Run - Complete Guide

This guide provides step-by-step instructions for running the entire ride-sharing platform.

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [First Time Setup](#first-time-setup)
3. [Running Backend](#running-backend)
4. [Running Admin Dashboard](#running-admin-dashboard)
5. [Running Mobile Apps](#running-mobile-apps)
6. [Running Everything Together](#running-everything-together)
7. [Stopping Services](#stopping-services)
8. [Common Issues](#common-issues)

---

## 💻 System Requirements

### Minimum Requirements

- **OS:** Ubuntu 22.04 LTS (or similar Linux)
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 10 GB free space

### Software Requirements

- **Python:** 3.11 or higher
- **Node.js:** 18.x or higher
- **PostgreSQL:** 15 or higher
- **Yarn:** 1.22 or higher
- **Supervisor:** 4.x or higher

### Check Installed Versions

```bash
# Python
python3 --version

# Node.js
node --version

# PostgreSQL
psql --version

# Yarn
yarn --version

# Supervisor
supervisorctl version
```

---

## 🎬 First Time Setup

### Step 1: Verify Installation

```bash
# Check if all services are installed
cd /app

# Backend dependencies
cd backend && pip list | grep -E "(fastapi|uvicorn|sqlalchemy)" && cd ..

# Admin dashboard dependencies
cd admin-dashboard && ls node_modules | head -5 && cd ..

# Database
sudo -u postgres psql -c "\l" | grep rideshare
```

### Step 2: Start PostgreSQL

```bash
# Start PostgreSQL service
sudo service postgresql start

# Verify it's running
sudo service postgresql status

# Check database exists
sudo -u postgres psql -c "\l" | grep rideshare_db
```

If database doesn't exist:
```bash
sudo -u postgres createdb rideshare_db
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Step 3: Verify Environment Files

```bash
# Check backend .env
cat /app/backend/.env

# Check admin .env
cat /app/admin-dashboard/.env
```

### Step 4: Update Supervisor Configuration

```bash
# Reload supervisor configurations
sudo supervisorctl reread
sudo supervisorctl update
```

---

## 🔧 Running Backend

### Method 1: Using Supervisor (Recommended)

```bash
# Start backend service
sudo supervisorctl start backend

# Check status
sudo supervisorctl status backend

# View logs (real-time)
tail -f /var/log/supervisor/backend.out.log

# View error logs
tail -f /var/log/supervisor/backend.err.log
```

**Expected Output:**
```
backend                          RUNNING   pid 12345, uptime 0:00:30
```

### Method 2: Manual Start (Development)

```bash
# Navigate to backend
cd /app/backend

# Activate virtual environment (if using)
source venv/bin/activate

# Start server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8001
# INFO:     Application startup complete
```

### Verify Backend is Running

```bash
# Health check
curl http://localhost:8001/api/health

# Expected response:
# {"status":"healthy"}

# Check API docs
curl -I http://localhost:8001/docs
# Should return: HTTP/1.1 200 OK
```

### Backend Endpoints

Once running, access:
- **Health Check:** http://localhost:8001/api/health
- **API Documentation:** http://localhost:8001/docs
- **ReDoc:** http://localhost:8001/redoc
- **Base URL:** http://localhost:8001

---

## 🎨 Running Admin Dashboard

### Method 1: Using Supervisor (Recommended)

```bash
# Start admin dashboard
sudo supervisorctl start admin-dashboard

# Check status
sudo supervisorctl status admin-dashboard

# View logs
tail -f /var/log/supervisor/admin-dashboard.out.log
```

**Expected Output:**
```
admin-dashboard                  RUNNING   pid 23456, uptime 0:00:15
```

### Method 2: Manual Start (Development)

```bash
# Navigate to admin dashboard
cd /app/admin-dashboard

# Install dependencies (first time only)
yarn install

# Start development server
yarn dev

# You should see:
# VITE v8.0.3  ready in 268 ms
# ➜  Local:   http://localhost:3001/
# ➜  Network: http://10.x.x.x:3001/
```

### Verify Dashboard is Running

```bash
# Check if accessible
curl -I http://localhost:3001

# Expected: HTTP/1.1 200 OK

# Check title
curl -s http://localhost:3001 | grep -o "<title>.*</title>"
# Expected: <title>Admin Dashboard - Ride Sharing Platform</title>
```

### Access Dashboard

Open browser and navigate to:
- **URL:** http://localhost:3001
- **Login Phone:** 9999999999
- **OTP:** 123456

---

## 📱 Running Mobile Apps

### Prerequisites

```bash
# Install Expo CLI globally (if not installed)
npm install -g expo-cli

# Or use npx (no installation needed)
npx expo --version
```

### Running Driver App

```bash
# Navigate to driver app
cd /app/driver-app

# Install dependencies (first time only)
yarn install

# Start Expo
yarn start
# or
expo start

# You should see:
# › Metro waiting on exp://192.168.x.x:8081
# › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**Options to Run:**
1. **Scan QR code** with Expo Go app (Android/iOS)
2. **Press 'a'** - Open in Android emulator
3. **Press 'i'** - Open in iOS simulator
4. **Press 'w'** - Open in web browser

### Running Rider App

```bash
# Navigate to rider app
cd /app/rider-app

# Install dependencies (first time only)
yarn install

# Start Expo
yarn start
# or
expo start
```

### Mobile App Configuration

**Backend URL:**
Check that apps are configured to use correct backend URL:

```javascript
// In both apps, check:
// driver-app/src/constants/api.ts or config
// rider-app/src/services/api.js or config

const API_URL = 'http://your-ip-address:8001';
// or
const API_URL = process.env.REACT_APP_BACKEND_URL;
```

**Finding Your IP:**
```bash
# Linux/Mac
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or
hostname -I | awk '{print $1}'
```

---

## 🚀 Running Everything Together

### Quick Start (All Services)

```bash
# 1. Start PostgreSQL
sudo service postgresql start

# 2. Start all supervised services
sudo supervisorctl start all

# 3. Check status
sudo supervisorctl status

# Expected output:
# admin-dashboard    RUNNING   pid 23456, uptime 0:00:30
# backend            RUNNING   pid 12345, uptime 0:00:30
```

### Verification Script

Create a quick verification script:

```bash
# Save as check-services.sh
#!/bin/bash

echo "🔍 Checking Services..."
echo ""

# PostgreSQL
echo "1. PostgreSQL:"
sudo service postgresql status | grep "Active" || echo "❌ Not running"
echo ""

# Backend
echo "2. Backend API:"
curl -s http://localhost:8001/api/health && echo " ✅" || echo "❌ Not accessible"
echo ""

# Admin Dashboard
echo "3. Admin Dashboard:"
curl -s -I http://localhost:3001 | grep "200 OK" && echo "✅" || echo "❌ Not accessible"
echo ""

# Supervisor services
echo "4. Supervisor Services:"
sudo supervisorctl status
```

Run it:
```bash
chmod +x check-services.sh
./check-services.sh
```

### Access URLs

Once everything is running:

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:8001 | - |
| API Docs | http://localhost:8001/docs | - |
| Admin Dashboard | http://localhost:3001 | Phone: 9999999999, OTP: 123456 |
| Driver App | Expo QR Code | - |
| Rider App | Expo QR Code | - |

---

## 🛑 Stopping Services

### Stop Individual Services

```bash
# Stop backend
sudo supervisorctl stop backend

# Stop admin dashboard
sudo supervisorctl stop admin-dashboard

# Stop specific mobile app
# Just close the terminal where expo is running (Ctrl+C)
```

### Stop All Services

```bash
# Stop all supervised services
sudo supervisorctl stop all

# Stop PostgreSQL (optional)
sudo service postgresql stop
```

### Restart Services

```bash
# Restart individual service
sudo supervisorctl restart backend

# Restart all services
sudo supervisorctl restart all
```

---

## 🔧 Common Issues

### Issue 1: Backend Won't Start

**Symptom:** Backend shows as FATAL or STOPPED

**Check Logs:**
```bash
tail -n 50 /var/log/supervisor/backend.err.log
```

**Common Causes:**

1. **PostgreSQL not running:**
```bash
sudo service postgresql start
```

2. **Database doesn't exist:**
```bash
sudo -u postgres createdb rideshare_db
```

3. **Port 8001 already in use:**
```bash
# Find process using port
lsof -ti:8001

# Kill it
kill -9 $(lsof -ti:8001)

# Restart backend
sudo supervisorctl restart backend
```

4. **Missing Python packages:**
```bash
cd /app/backend
pip install -r requirements.txt
sudo supervisorctl restart backend
```

---

### Issue 2: Admin Dashboard Won't Start

**Symptom:** Dashboard not accessible at port 3001

**Check Logs:**
```bash
tail -n 50 /var/log/supervisor/admin-dashboard.out.log
```

**Common Causes:**

1. **Port 3001 in use:**
```bash
lsof -ti:3001 | xargs kill -9
sudo supervisorctl restart admin-dashboard
```

2. **Node modules missing:**
```bash
cd /app/admin-dashboard
yarn install
sudo supervisorctl restart admin-dashboard
```

3. **Build errors:**
```bash
cd /app/admin-dashboard
yarn build
# Check for errors
```

---

### Issue 3: Cannot Login to Admin

**Symptom:** OTP not working or login fails

**Solutions:**

1. **Backend not running:**
```bash
sudo supervisorctl status backend
curl http://localhost:8001/api/health
```

2. **Database not accessible:**
```bash
sudo service postgresql status
```

3. **Check if admin user exists:**
```bash
sudo -u postgres psql rideshare_db -c "SELECT * FROM users WHERE phone='9999999999';"
```

---

### Issue 4: Mobile App Can't Connect

**Symptom:** Apps can't reach backend API

**Solutions:**

1. **Check backend is accessible from your network:**
```bash
# Get your IP
hostname -I | awk '{print $1}'

# Test from mobile device browser
# http://YOUR_IP:8001/api/health
```

2. **Update API URL in mobile apps:**
```javascript
// Update in app config
const API_URL = 'http://YOUR_IP_ADDRESS:8001';
```

3. **Check firewall:**
```bash
# Ubuntu/Debian
sudo ufw status

# If port blocked, allow it
sudo ufw allow 8001
```

---

### Issue 5: "Module Not Found" Errors

**Backend:**
```bash
cd /app/backend
pip install -r requirements.txt
sudo supervisorctl restart backend
```

**Frontend:**
```bash
cd /app/admin-dashboard
rm -rf node_modules
yarn install
sudo supervisorctl restart admin-dashboard
```

---

## 📊 Service Status Dashboard

### Quick Status Check

```bash
# One-liner to check all services
echo "PostgreSQL:" && sudo service postgresql status | grep "Active" && \
echo "Backend:" && curl -s http://localhost:8001/api/health && \
echo "Admin:" && curl -s -I http://localhost:3001 | grep "HTTP" && \
sudo supervisorctl status
```

### Continuous Monitoring

```bash
# Watch supervisor status
watch -n 2 'sudo supervisorctl status'

# Watch logs
tail -f /var/log/supervisor/*.log
```

---

## 🎯 Development Workflow

### Typical Development Session

```bash
# 1. Start PostgreSQL
sudo service postgresql start

# 2. Start backend (development mode with auto-reload)
cd /app/backend
uvicorn server:app --reload &

# 3. Start admin dashboard (development mode with HMR)
cd /app/admin-dashboard
yarn dev &

# 4. Start mobile app
cd /app/driver-app
expo start

# When done, kill background processes
jobs -p | xargs kill
```

### Production Mode

```bash
# Use supervisor for all services
sudo supervisorctl start all

# Monitor
sudo supervisorctl status
```

---

## 📚 Additional Resources

- **Main README:** `/app/README.md`
- **API Testing Guide:** `/app/API_TESTING_GUIDE.md`
- **Production Guide:** `/app/PRODUCTION_READINESS.md`
- **API Docs:** http://localhost:8001/docs

---

## ✅ Pre-Flight Checklist

Before starting development/demo:

- [ ] PostgreSQL is running
- [ ] Backend .env file exists
- [ ] Admin .env file exists
- [ ] All Python dependencies installed
- [ ] All Node dependencies installed
- [ ] Supervisor configured
- [ ] Ports 8001 and 3001 are free
- [ ] Database rideshare_db exists

---

**Ready to Go!** 🚀

Run `sudo supervisorctl start all` and access:
- Admin: http://localhost:3001 (Phone: 9999999999, OTP: 123456)
- API Docs: http://localhost:8001/docs

---

*Last Updated: April 5, 2026*  
*Need Help? Check logs in `/var/log/supervisor/`*
