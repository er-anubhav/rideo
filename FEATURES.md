# 🎯 Complete Feature Documentation

This document provides comprehensive details about every feature in the platform.

---

## 📋 Table of Contents

1. [User Features](#user-features)
2. [Driver Features](#driver-features)
3. [Rider Features](#rider-features)
4. [Admin Features](#admin-features)
5. [Real-Time Features](#real-time-features)
6. [Payment Features](#payment-features)
7. [Communication Features](#communication-features)

---

## 👤 User Features

### 1. Authentication & Registration

#### OTP-Based Login ✅
- **How it works:**
  1. User enters phone number
  2. System sends OTP (currently mocked to 123456)
  3. User verifies OTP
  4. System generates JWT token
  5. Token stored for authenticated requests

- **API Endpoints:**
  - `POST /api/auth/send-otp` - Send OTP
  - `POST /api/auth/verify-otp` - Verify and login

- **Features:**
  - No password required
  - Automatic user creation on first login
  - Role assignment (rider/driver/admin)
  - Token expiration (24 hours)

#### User Roles ✅
- **Rider:** Book rides, view history, manage wallet
- **Driver:** Accept rides, track earnings, go online/offline
- **Admin:** Full platform management

---

### 2. Profile Management

#### User Profile ✅
- **Fields:**
  - Name (required)
  - Phone (unique, required)
  - Email (optional)
  - Profile picture (optional)
  - Account status (active/inactive)

- **API Endpoints:**
  - `GET /api/users/me` - Get current user
  - `PUT /api/users/me` - Update profile
  - `GET /api/users/{id}` - Get user by ID

---

## 🚗 Driver Features

### 1. Driver Registration & Verification

#### Driver Profile ✅
- **Information Collected:**
  - Personal details (from user profile)
  - Driver's license number
  - Vehicle information
  - Service areas
  - Working hours preferences

- **Verification Status:**
  - `unverified` - Just registered
  - `pending` - Documents submitted
  - `verified` - Admin approved
  - `rejected` - Not approved

- **API Endpoints:**
  - `POST /api/drivers/register` - Register as driver
  - `GET /api/drivers/me` - Get driver profile
  - `PUT /api/drivers/me` - Update profile

#### Document Upload ⚠️ (Missing - Critical)
**Required Documents:**
- Driver's license
- Aadhaar/PAN card
- Vehicle RC (Registration Certificate)
- Insurance papers
- Vehicle photos
- Driver photo

**Status:** Backend ready, file upload integration pending

---

### 2. Vehicle Management

#### Add Vehicle ✅
- **Vehicle Types:**
  - Sedan
  - SUV
  - Auto (Rickshaw)
  - Bike

- **Vehicle Information:**
  - Make and model
  - Year
  - License plate
  - Color
  - Capacity (seats)
  - Vehicle type

- **API Endpoints:**
  - `POST /api/drivers/vehicles` - Add vehicle
  - `GET /api/drivers/vehicles` - List vehicles
  - `PUT /api/drivers/vehicles/{id}` - Update vehicle
  - `DELETE /api/drivers/vehicles/{id}` - Remove vehicle

---

### 3. Going Online/Offline

#### Driver Status ✅
- **States:**
  - **Online:** Available for rides
  - **Offline:** Not accepting rides
  - **On Trip:** Currently driving

- **How it works:**
  1. Driver opens app
  2. Clicks "Go Online"
  3. System updates driver status
  4. Driver appears in available pool
  5. Starts receiving ride requests

- **API Endpoints:**
  - `POST /api/drivers/online` - Go online
  - `POST /api/drivers/offline` - Go offline
  - `GET /api/drivers/status` - Get current status

---

### 4. Ride Management (Driver Side)

#### Accept/Reject Rides ✅
- **Flow:**
  1. Driver receives ride request (WebSocket)
  2. View pickup location, estimated fare
  3. Accept or Reject
  4. If accept, navigate to pickup

- **API Endpoints:**
  - `POST /api/rides/{id}/accept` - Accept ride
  - `POST /api/rides/{id}/reject` - Reject ride

#### Start/Complete Ride ✅
- **Flow:**
  1. Arrive at pickup → `POST /api/rides/{id}/arrive`
  2. Rider boards → `POST /api/rides/{id}/start`
  3. Drive to destination
  4. Complete ride → `POST /api/rides/{id}/complete`

- **Features:**
  - Real-time location updates
  - Distance tracking
  - Duration tracking
  - Automatic fare calculation

---

### 5. Earnings & Reports

#### View Earnings ✅
- **Metrics:**
  - Today's earnings
  - Weekly earnings
  - Monthly earnings
  - Total rides completed
  - Average rating

- **API Endpoints:**
  - `GET /api/earnings/summary` - Earnings summary
  - `GET /api/earnings/daily?date=YYYY-MM-DD` - Daily earnings
  - `GET /api/earnings/weekly` - Weekly breakdown
  - `GET /api/earnings/monthly` - Monthly breakdown

#### Trip History ✅
- **API Endpoints:**
  - `GET /api/drivers/rides` - Get ride history
  - `GET /api/rides/{id}` - Get ride details

---

## 🧑 Rider Features

### 1. Booking Rides

#### Request Ride ✅
- **Flow:**
  1. Enter pickup location
  2. Enter destination
  3. Select vehicle type
  4. View estimated fare
  5. Apply promo code (optional)
  6. Confirm booking

- **API Endpoints:**
  - `POST /api/rides/request` - Create ride request
  - `POST /api/rides/calculate-fare` - Get fare estimate

#### Ride Matching ✅
- **How it works:**
  1. System searches for available drivers
  2. Considers proximity, ratings, vehicle type
  3. Notifies nearest driver
  4. If rejected, notify next driver
  5. Match confirmed when driver accepts

---

### 2. Active Ride Tracking

#### Track Ride ✅
- **Real-time Updates:**
  - Driver location
  - Estimated arrival time
  - Current ride status
  - Distance to pickup/destination

- **WebSocket Events:**
  - `driver_location_update` - Every 5-10 seconds
  - `ride_status_change` - Status updates
  - `driver_arriving` - Near pickup
  - `ride_started` - Trip began
  - `ride_completed` - Trip ended

---

### 3. Ride History

#### View Past Rides ✅
- **Information Shown:**
  - Ride date and time
  - Pickup and drop locations
  - Driver details
  - Fare paid
  - Payment method
  - Rating given

- **API Endpoints:**
  - `GET /api/rides/history` - Get ride history
  - `GET /api/rides/{id}` - Get ride details

---

### 4. Ratings & Reviews

#### Rate Driver ✅
- **Rating System:**
  - 1-5 stars
  - Optional comment
  - Categories (Behavior, Cleanliness, Driving, etc.)

- **API Endpoints:**
  - `POST /api/ratings` - Submit rating
  - `GET /api/ratings/ride/{ride_id}` - Get ride ratings

---

### 5. Wallet Management

#### Digital Wallet ✅
- **Features:**
  - View balance
  - Transaction history
  - Add money (payment gateway pending)
  - Pay for rides from wallet

- **API Endpoints:**
  - `GET /api/wallet/balance` - Get balance
  - `GET /api/wallet/transactions` - Transaction history
  - `POST /api/wallet/topup` - Add money ⚠️ (Payment gateway pending)

#### Promo Codes ✅
- **Features:**
  - Apply promo code during booking
  - View available offers
  - Automatic discount calculation

- **API Endpoints:**
  - `POST /api/promo/validate` - Validate promo code
  - `GET /api/promo/available` - Get available promos

---

### 6. Support

#### Contact Support ✅
- **Features:**
  - Create support tickets
  - Chat with support team
  - View ticket history
  - Attach screenshots

- **API Endpoints:**
  - `POST /api/support/tickets` - Create ticket
  - `GET /api/support/tickets` - List tickets
  - `POST /api/support/tickets/{id}/messages` - Send message
  - `GET /api/support/tickets/{id}` - Get ticket details

---

## 👨‍💼 Admin Features

### 1. Dashboard Analytics

#### Overview Stats ✅
- **Metrics Displayed:**
  - Total users (riders + drivers)
  - Total drivers
  - Total rides
  - Active rides (real-time)
  - Online drivers
  - Total revenue
  - Today's revenue
  - Completed rides
  - Open support tickets
  - Pending driver verifications

- **How to Access:**
  1. Login to admin dashboard (http://localhost:3001)
  2. Phone: 9999999999, OTP: 123456
  3. Dashboard shows on home page

---

### 2. User Management

#### View All Users ✅
- **Features:**
  - List all users with pagination
  - Search by name, phone, email
  - Filter by role (rider/driver/admin)
  - Filter by status (active/blocked)
  - View user details

- **Available Actions:**
  - View user profile
  - Block/unblock users
  - Delete users (with safety checks)
  - View ride history
  - View wallet balance

#### Block Users ✅
- **How it works:**
  1. Admin clicks block button
  2. Confirmation dialog appears
  3. User account is deactivated
  4. User cannot login
  5. If driver, automatically goes offline

#### Delete Users ✅
- **Safety Checks:**
  - Cannot delete if active rides exist
  - Soft delete (deactivates account)
  - Preserves data for compliance

---

### 3. Driver Management

#### Driver Verification ✅
- **Workflow:**
  1. Driver registers
  2. Appears in "Pending Verifications"
  3. Admin reviews details
  4. Admin clicks Verify/Reject
  5. Driver receives notification
  6. Verified drivers can go online

- **Features:**
  - List all drivers
  - Filter by verification status
  - Filter by online status
  - View driver details
  - View vehicle information
  - View performance (rides, rating, earnings)

#### Suspend Drivers ✅
- **Actions:**
  - Suspend driver account
  - Driver goes offline
  - Driver is blocked
  - Cannot accept new rides

---

### 4. Ride Monitoring

#### View All Rides ✅
- **Information:**
  - Ride ID
  - Rider and driver details
  - Pickup and drop locations
  - Status
  - Fare (estimated and actual)
  - Date and time
  - Payment method

- **Filters:**
  - By status (completed/active/cancelled)
  - By date range
  - By rider
  - By driver

#### Ride Details ✅
- **Detailed View:**
  - Complete ride timeline
  - Locations with map
  - Fare breakdown
  - Payment details
  - Ratings
  - Issue reports (if any)

---

### 5. Support Ticket Management

#### View Tickets ✅
- **Features:**
  - List all support tickets
  - Filter by status
  - Filter by priority
  - Sort by date
  - Search by user

#### Manage Tickets ✅
- **Actions:**
  - View ticket details
  - Read message thread
  - Reply to tickets
  - Update status (open/in_progress/resolved/closed)
  - Assign to admin
  - Set priority

---

### 6. Wallet & Transaction Monitoring

#### View Wallets ✅
- **Features:**
  - List all user wallets
  - View total platform balance
  - Filter by minimum balance
  - View wallet status

#### Transaction History ✅
- **Features:**
  - View all transactions
  - Filter by type (credit/debit/refund/ride_payment)
  - Filter by date range
  - View transaction details
  - Monitor platform revenue

---

### 7. Analytics & Reports

#### Revenue Analytics ✅
- **Charts Available:**
  - Revenue trend (daily/weekly/monthly)
  - Ride count trend
  - Dual-axis line chart
  - Interactive tooltips

- **Period Selection:**
  - Daily: Last 7 days
  - Weekly: Last 4 weeks
  - Monthly: Last 6 months

#### Driver Performance ✅
- **Metrics:**
  - Top 10 drivers by rides
  - Driver ratings
  - Total earnings
  - Completion rate
  - Ranking system (medals for top 3)

---

### 8. Promo Code Management

#### Create Promo Codes ✅
- **Configuration:**
  - Code name (auto-uppercase)
  - Discount type (percentage/flat amount)
  - Discount value
  - Max discount cap
  - Minimum ride amount
  - Max total uses
  - Max uses per user
  - Expiry date

- **Example:**
  - Code: SUMMER50
  - Type: Percentage
  - Value: 50%
  - Max discount: ₹100
  - Min ride: ₹200
  - Max uses: 1000
  - Per user: 2 times

#### Manage Promos ✅
- **Features:**
  - View all promo codes
  - See usage statistics
  - Activate/deactivate codes
  - Track redemptions

---

### 9. Fare Configuration

#### Set Fares by Vehicle Type ✅
- **Parameters:**
  - Base fare
  - Per kilometer rate
  - Per minute rate
  - Minimum fare
  - Cancellation fee

- **Features:**
  - Separate config for each vehicle type
  - Live preview with sample calculation
  - Save/reset functionality
  - Fare breakdown display

- **Example Calculation:**
  ```
  Ride: 10 km, 20 minutes
  Base Fare: ₹50
  Distance: 10 × ₹12 = ₹120
  Time: 20 × ₹2 = ₹40
  Total: ₹210
  ```

---

### 10. System Logs & Audit

#### Recent Activities ✅
- **Activity Types:**
  - Ride activities
  - User registrations
  - Support ticket creation
  - Payment transactions

- **Information Shown:**
  - Activity type
  - Description
  - Timestamp
  - Related user
  - Status

---

## ⚡ Real-Time Features

### WebSocket Connections ✅

#### Driver WebSocket
- **Endpoint:** `/ws/driver/{driver_id}`
- **Events Received:**
  - New ride requests
  - Ride cancellations
  - Rider location updates
  - System notifications

#### Rider WebSocket
- **Endpoint:** `/ws/rider/{rider_id}`
- **Events Received:**
  - Ride accepted
  - Driver location updates
  - Driver arriving notification
  - Ride started/completed
  - System notifications

### Live Location Tracking ✅
- **Frequency:** Every 5-10 seconds
- **Data Sent:**
  - Latitude
  - Longitude
  - Speed (optional)
  - Bearing (optional)
  - Timestamp

---

## 💰 Payment Features

### Wallet System ✅
- **Current Implementation:**
  - Wallet balance tracking
  - Transaction history
  - Debit for rides
  - Credit from refunds

### Payment Gateway ⚠️ (Missing)
- **Required:**
  - Razorpay/Stripe integration
  - Add money to wallet
  - Payment verification
  - Refund processing

---

## 📞 Communication Features

### Notifications ✅

#### Backend Notification System
- **Types:**
  - Ride notifications
  - Payment notifications
  - System alerts
  - Promo notifications

- **Storage:**
  - Persistent in database
  - Retrieved via REST API
  - Mark as read functionality

#### Push Notifications ⚠️ (Missing)
- **Required:**
  - Firebase Cloud Messaging (FCM)
  - iOS APNs
  - Real-time delivery

### SMS Notifications ⚠️ (Mocked)
- **Current:** OTP always 123456
- **Required:** Twilio/MSG91 integration

### Email Notifications ⚠️ (Missing)
- **Required:**
  - SendGrid/AWS SES
  - Email templates
  - Transactional emails

---

## 📊 Feature Completion Matrix

| Feature Category | Sub-Features | Status | Notes |
|-----------------|--------------|--------|-------|
| **Authentication** | OTP Login | ✅ Complete | SMS mocked |
| | JWT Tokens | ✅ Complete | 24hr expiry |
| | Role Management | ✅ Complete | 3 roles |
| **Driver** | Registration | ✅ Complete | - |
| | Vehicle Management | ✅ Complete | - |
| | Document Upload | ❌ Missing | Critical |
| | Go Online/Offline | ✅ Complete | - |
| | Accept Rides | ✅ Complete | - |
| | Track Earnings | ✅ Complete | - |
| **Rider** | Book Ride | ✅ Complete | - |
| | Track Ride | ✅ Complete | WebSocket |
| | Rate Driver | ✅ Complete | - |
| | Ride History | ✅ Complete | - |
| | Wallet | ✅ Partial | No topup |
| | Promo Codes | ✅ Complete | - |
| **Admin** | Dashboard | ✅ Complete | 10 pages |
| | User Management | ✅ Complete | - |
| | Driver Verification | ✅ Partial | No docs |
| | Ride Monitoring | ✅ Complete | - |
| | Support Tickets | ✅ Complete | - |
| | Analytics | ✅ Complete | Charts |
| | Promo Management | ✅ Complete | - |
| | Fare Config | ✅ Complete | - |
| **Payment** | Wallet Structure | ✅ Complete | - |
| | Payment Gateway | ❌ Missing | Critical |
| | Refunds | ⚠️ Partial | Manual |
| **Communication** | Notifications API | ✅ Complete | - |
| | Push Notifications | ❌ Missing | High priority |
| | SMS | ⚠️ Mocked | Critical |
| | Email | ❌ Missing | High priority |

---

**Legend:**
- ✅ Complete - Fully functional
- ⚠️ Partial - Working but incomplete
- ❌ Missing - Not implemented

---

*Last Updated: April 5, 2026*  
*Version: 1.0.0*
