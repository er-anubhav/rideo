# API Testing Guide

This document contains all the API endpoints and test commands for the ride-sharing platform.

## Authentication

### Admin Login
```bash
# Send OTP to admin (9999999999)
curl -X POST http://localhost:8001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9999999999"}'

# Verify and get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9999999999", "otp": "123456", "name": "Admin"}' | jq -r '.access_token')
```

### User Login
```bash
# Send OTP
curl -X POST http://localhost:8001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'

# Verify and get user token
USER_TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456", "name": "Test User"}' | jq -r '.access_token')
```

## Admin Dashboard API

### Dashboard Stats
```bash
curl -X GET "http://localhost:8001/api/admin/dashboard" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.stats'
```

### User Management
```bash
# Get all users
curl -X GET "http://localhost:8001/api/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Search users
curl -X GET "http://localhost:8001/api/admin/users?search=test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter by role
curl -X GET "http://localhost:8001/api/admin/users?role=driver" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Get user details
curl -X GET "http://localhost:8001/api/admin/users/{user_id}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Block user
curl -X PUT "http://localhost:8001/api/admin/users/{user_id}/block" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Delete user
curl -X DELETE "http://localhost:8001/api/admin/users/{user_id}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### Driver Management
```bash
# Get all drivers
curl -X GET "http://localhost:8001/api/admin/drivers?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter verified drivers
curl -X GET "http://localhost:8001/api/admin/drivers?verified=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter online drivers
curl -X GET "http://localhost:8001/api/admin/drivers?online=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Verify driver
curl -X PUT "http://localhost:8001/api/admin/drivers/{driver_id}/verify?is_verified=true" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Suspend driver
curl -X PUT "http://localhost:8001/api/admin/drivers/{driver_id}/suspend" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### Ride Management
```bash
# Get all rides
curl -X GET "http://localhost:8001/api/admin/rides?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter by status
curl -X GET "http://localhost:8001/api/admin/rides?status_filter=completed" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter by date
curl -X GET "http://localhost:8001/api/admin/rides?date_from=2026-04-01" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Get ride details
curl -X GET "http://localhost:8001/api/admin/rides/{ride_id}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### Support Ticket Management
```bash
# Get all tickets
curl -X GET "http://localhost:8001/api/admin/support/tickets?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter by status
curl -X GET "http://localhost:8001/api/admin/support/tickets?status_filter=open" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter by priority
curl -X GET "http://localhost:8001/api/admin/support/tickets?priority=high" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Get ticket details
curl -X GET "http://localhost:8001/api/admin/support/tickets/{ticket_id}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Reply to ticket
curl -X POST "http://localhost:8001/api/admin/support/tickets/{ticket_id}/reply?message=We%20are%20looking%20into%20this" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Update ticket status
curl -X PUT "http://localhost:8001/api/admin/support/tickets/{ticket_id}/status?new_status=resolved" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### Wallet Management
```bash
# Get all wallets
curl -X GET "http://localhost:8001/api/admin/wallets?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter by minimum balance
curl -X GET "http://localhost:8001/api/admin/wallets?min_balance=100" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Get all transactions
curl -X GET "http://localhost:8001/api/admin/transactions?page=1&limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Filter by type
curl -X GET "http://localhost:8001/api/admin/transactions?transaction_type=credit" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### Analytics
```bash
# Revenue analytics (daily)
curl -X GET "http://localhost:8001/api/admin/analytics/revenue?period=day" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Revenue analytics (weekly)
curl -X GET "http://localhost:8001/api/admin/analytics/revenue?period=week" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Revenue analytics (monthly)
curl -X GET "http://localhost:8001/api/admin/analytics/revenue?period=month" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Driver analytics
curl -X GET "http://localhost:8001/api/admin/analytics/drivers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### Promo Code Management
```bash
# Get all promo codes
curl -X GET "http://localhost:8001/api/admin/promo-codes" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Create promo code
curl -X POST "http://localhost:8001/api/admin/promo-codes?code=SUMMER50&discount_type=percent&discount_value=50&max_discount=100&max_uses=1000&max_uses_per_user=2" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### Fare Configuration
```bash
# Get all fare configs
curl -X GET "http://localhost:8001/api/admin/fare-configs" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Update fare config
curl -X PUT "http://localhost:8001/api/admin/fare-configs/sedan?base_fare=100&per_km_rate=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

### System Logs
```bash
# Get recent activities
curl -X GET "http://localhost:8001/api/admin/logs/recent-activities?limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

## User APIs

### Notifications
```bash
# Get notifications
curl -X GET "http://localhost:8001/api/notifications?page=1&limit=20" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Get unread only
curl -X GET "http://localhost:8001/api/notifications?unread_only=true" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Mark as read
curl -X PATCH "http://localhost:8001/api/notifications/{notification_id}/read" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Mark all as read
curl -X POST "http://localhost:8001/api/notifications/read-all" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Get unread count
curl -X GET "http://localhost:8001/api/notifications/unread-count" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
```

### Support / Chat
```bash
# Create ticket
curl -X POST "http://localhost:8001/api/support/tickets" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject": "Need help", "message": "I have an issue", "ticket_type": "general"}' | jq '.'

# Get tickets
curl -X GET "http://localhost:8001/api/support/tickets?page=1&limit=10" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Get ticket details
curl -X GET "http://localhost:8001/api/support/tickets/{ticket_id}" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Send message
curl -X POST "http://localhost:8001/api/support/tickets/{ticket_id}/messages" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Additional info"}' | jq '.'

# Close ticket
curl -X POST "http://localhost:8001/api/support/tickets/{ticket_id}/close" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Legacy chat API
curl -X GET "http://localhost:8001/api/support/chat" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

curl -X POST "http://localhost:8001/api/support/chat/message" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Need help"}' | jq '.'
```

### Wallet
```bash
# Get balance
curl -X GET "http://localhost:8001/api/wallet/balance" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Get transactions
curl -X GET "http://localhost:8001/api/wallet/transactions?page=1&limit=20" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'

# Filter by type
curl -X GET "http://localhost:8001/api/wallet/transactions?transaction_type=credit" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
```

## Test Credentials

| User Type | Phone | OTP | Role |
|-----------|-------|-----|------|
| Admin | 9999999999 | 123456 | admin |
| Test User | 9876543210 | 123456 | rider |

## API Documentation

Interactive API documentation is available at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc
