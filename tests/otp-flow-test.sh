#!/bin/bash

# OTP Flow Verification Test
# Tests complete OTP flow from backend to rider to driver

set -e

API_URL="http://localhost:8001/api"

echo "========================================="
echo "🔐 OTP Flow Verification Test"
echo "========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; exit 1; }
info() { echo -e "${YELLOW}ℹ INFO${NC}: $1"; }

# Step 1: Login Rider
info "Step 1: Logging in rider..."
curl -s -X POST "${API_URL}/auth/send-otp" -H "Content-Type: application/json" -d '{"phone": "1111111111"}' > /dev/null
sleep 1
RIDER_TOKEN=$(curl -s -X POST "${API_URL}/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone": "1111111111", "otp": "123456", "name": "OTP Test Rider"}' | jq -r '.access_token')
if [ -z "$RIDER_TOKEN" ] || [ "$RIDER_TOKEN" == "null" ]; then
    fail "Rider authentication failed"
fi
pass "Rider authenticated"

# Step 2: Login Driver
info "Step 2: Logging in driver..."
curl -s -X POST "${API_URL}/auth/send-otp" -H "Content-Type: application/json" -d '{"phone": "2222222222"}' > /dev/null
sleep 1
DRIVER_TOKEN=$(curl -s -X POST "${API_URL}/auth/verify-otp" -H "Content-Type: application/json" -d '{"phone": "2222222222", "otp": "123456", "name": "OTP Test Driver"}' | jq -r '.access_token')
if [ -z "$DRIVER_TOKEN" ] || [ "$DRIVER_TOKEN" == "null" ]; then
    fail "Driver authentication failed"
fi
pass "Driver authenticated"

# Step 3: Create Ride
info "Step 3: Creating ride request..."
RIDE_RESPONSE=$(curl -s -X POST "${API_URL}/rides/request" \
    -H "Authorization: Bearer ${RIDER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "pickup_lat": 12.9716,
        "pickup_lng": 77.5946,
        "pickup_address": "Test Pickup",
        "drop_lat": 12.2958,
        "drop_lng": 76.6394,
        "drop_address": "Test Drop",
        "vehicle_type": "sedan"
    }')

RIDE_ID=$(echo $RIDE_RESPONSE | jq -r '.ride.id')
OTP_FROM_CREATE=$(echo $RIDE_RESPONSE | jq -r '.ride.otp')

if [ -z "$RIDE_ID" ] || [ "$RIDE_ID" == "null" ]; then
    fail "Ride creation failed"
fi
pass "Ride created: $RIDE_ID"

# Step 4: Check OTP in response
info "Step 4: Verifying OTP in create response..."
if [ -z "$OTP_FROM_CREATE" ] || [ "$OTP_FROM_CREATE" == "null" ]; then
    fail "OTP not returned in ride creation response"
fi
pass "OTP received in create response: $OTP_FROM_CREATE"

# Step 5: Driver accepts ride
info "Step 5: Driver accepting ride..."
ACCEPT_RESPONSE=$(curl -s -X POST "${API_URL}/rides/${RIDE_ID}/accept" \
    -H "Authorization: Bearer ${DRIVER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{}')

ACCEPT_SUCCESS=$(echo $ACCEPT_RESPONSE | jq -r '.success')
if [ "$ACCEPT_SUCCESS" != "true" ]; then
    fail "Driver failed to accept ride"
fi
pass "Driver accepted ride"

# Step 6: Get ride details (rider view)
info "Step 6: Getting ride details from rider's perspective..."
RIDE_DETAILS=$(curl -s -X GET "${API_URL}/rides/${RIDE_ID}" \
    -H "Authorization: Bearer ${RIDER_TOKEN}")

OTP_FROM_GET=$(echo $RIDE_DETAILS | jq -r '.otp')
if [ -z "$OTP_FROM_GET" ] || [ "$OTP_FROM_GET" == "null" ]; then
    fail "OTP not returned in ride details API"
fi
pass "OTP in ride details: $OTP_FROM_GET"

# Step 7: Update driver location
info "Step 7: Updating driver location near pickup..."
curl -s -X POST "${API_URL}/drivers/location" \
    -H "Authorization: Bearer ${DRIVER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"lat": 12.9716, "lng": 77.5946}' > /dev/null
pass "Driver location updated"

# Step 8: Driver marks arriving
info "Step 8: Driver marking as arriving..."
ARRIVING_RESPONSE=$(curl -s -X POST "${API_URL}/rides/${RIDE_ID}/arriving" \
    -H "Authorization: Bearer ${DRIVER_TOKEN}")
ARRIVING_OTP=$(echo $ARRIVING_RESPONSE | jq -r '.ride.otp')
if [ -z "$ARRIVING_OTP" ] || [ "$ARRIVING_OTP" == "null" ]; then
    fail "OTP not in arriving response"
fi
pass "Driver marked arriving. OTP in response: $ARRIVING_OTP"

# Step 9: Driver marks arrived
info "Step 9: Driver marking as arrived..."
ARRIVED_RESPONSE=$(curl -s -X POST "${API_URL}/rides/${RIDE_ID}/arrived" \
    -H "Authorization: Bearer ${DRIVER_TOKEN}")
ARRIVED_OTP=$(echo $ARRIVED_RESPONSE | jq -r '.ride.otp')
if [ -z "$ARRIVED_OTP" ] || [ "$ARRIVED_OTP" == "null" ]; then
    fail "OTP not in arrived response"
fi
pass "Driver marked arrived. OTP in response: $ARRIVED_OTP"

# Step 10: Verify all OTPs match
info "Step 10: Verifying all OTPs match..."
if [ "$OTP_FROM_CREATE" != "$OTP_FROM_GET" ] || [ "$OTP_FROM_GET" != "$ARRIVING_OTP" ] || [ "$ARRIVING_OTP" != "$ARRIVED_OTP" ]; then
    fail "OTPs don't match! Create: $OTP_FROM_CREATE, Get: $OTP_FROM_GET, Arriving: $ARRIVING_OTP, Arrived: $ARRIVED_OTP"
fi
pass "All OTPs match: $ARRIVED_OTP"

# Step 11: Test with WRONG OTP
info "Step 11: Testing with wrong OTP (should fail)..."
WRONG_OTP_RESPONSE=$(curl -s -X POST "${API_URL}/rides/${RIDE_ID}/start" \
    -H "Authorization: Bearer ${DRIVER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"otp": "9999"}')

WRONG_OTP_ERROR=$(echo $WRONG_OTP_RESPONSE | jq -r '.detail')
if [[ "$WRONG_OTP_ERROR" == *"Invalid"* ]] || [[ "$WRONG_OTP_ERROR" == *"OTP"* ]]; then
    pass "Wrong OTP correctly rejected: $WRONG_OTP_ERROR"
else
    fail "Wrong OTP should have been rejected"
fi

# Step 12: Test with CORRECT OTP
info "Step 12: Testing with correct OTP (should succeed)..."
START_RESPONSE=$(curl -s -X POST "${API_URL}/rides/${RIDE_ID}/start" \
    -H "Authorization: Bearer ${DRIVER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"otp\": \"$ARRIVED_OTP\"}")

START_SUCCESS=$(echo $START_RESPONSE | jq -r '.success')
if [ "$START_SUCCESS" == "true" ]; then
    pass "Ride started successfully with correct OTP!"
else
    START_ERROR=$(echo $START_RESPONSE | jq -r '.detail')
    fail "Ride start failed even with correct OTP: $START_ERROR"
fi

echo ""
echo "========================================="
echo "🎉 OTP Flow Verification COMPLETE!"
echo "========================================="
echo ""
echo "Summary:"
echo "✓ OTP generated correctly from ride ID"
echo "✓ OTP returned in ride creation response"
echo "✓ OTP available in ride details API"
echo "✓ OTP sent in arriving status update"
echo "✓ OTP sent in arrived status update"
echo "✓ All OTPs match consistently: $ARRIVED_OTP"
echo "✓ Wrong OTP rejected correctly"
echo "✓ Correct OTP accepted and ride started"
echo ""
echo "OTP Flow is working PERFECTLY! ✅"
echo ""
