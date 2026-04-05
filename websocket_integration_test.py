#!/usr/bin/env python3
"""
Quick integration test for WebSocket notification system
Tests the actual notification methods in connection_manager
"""

import requests
import json
import asyncio
import websockets
from datetime import datetime

async def test_websocket_notifications():
    """Test WebSocket notification system with actual ride flow"""
    base_url = "http://localhost:8001"
    ws_url = "ws://localhost:8001"
    
    print("🔔 Testing WebSocket Notification System...")
    
    # Authenticate driver
    auth_response = requests.post(f"{base_url}/api/auth/send-otp", json={"phone": "8888888888"})
    if auth_response.status_code == 200:
        verify_response = requests.post(f"{base_url}/api/auth/verify-otp", json={
            "phone": "8888888888", 
            "otp": "123456"
        })
        if verify_response.status_code == 200:
            driver_token = verify_response.json()["access_token"]
            driver_id = verify_response.json()["user"]["id"]
            print(f"✅ Driver authenticated: {driver_id}")
        else:
            print("❌ Driver auth failed")
            return
    else:
        print("❌ Driver OTP failed")
        return
    
    # Authenticate rider  
    auth_response = requests.post(f"{base_url}/api/auth/send-otp", json={"phone": "9876543210"})
    if auth_response.status_code == 200:
        verify_response = requests.post(f"{base_url}/api/auth/verify-otp", json={
            "phone": "9876543210",
            "otp": "123456"
        })
        if verify_response.status_code == 200:
            rider_token = verify_response.json()["access_token"]
            rider_id = verify_response.json()["user"]["id"]
            print(f"✅ Rider authenticated: {rider_id}")
        else:
            print("❌ Rider auth failed")
            return
    else:
        print("❌ Rider OTP failed")
        return
    
    # Test WebSocket connections with message exchange
    try:
        driver_ws_url = f"{ws_url}/ws/driver/{driver_id}?token={driver_token}"
        rider_ws_url = f"{ws_url}/ws/rider/{rider_id}?token={rider_token}"
        
        async with websockets.connect(driver_ws_url) as driver_ws:
            print("✅ Driver WebSocket connected")
            
            # Send location update
            await driver_ws.send(json.dumps({
                "event": "location_update",
                "lat": 28.6139,
                "lng": 77.2090
            }))
            print("✅ Driver location update sent")
            
            async with websockets.connect(rider_ws_url) as rider_ws:
                print("✅ Rider WebSocket connected")
                
                # Test ride request broadcast
                await rider_ws.send(json.dumps({
                    "event": "request_ride",
                    "ride_id": "test-ride-123",
                    "pickup": {"lat": 28.6139, "lng": 77.2090, "address": "Test Pickup"},
                    "drop": {"lat": 28.7041, "lng": 77.1025, "address": "Test Drop"},
                    "vehicle_type": "sedan",
                    "fare": 150.0
                }))
                print("✅ Ride request broadcast sent")
                
                # Wait a bit for any responses
                await asyncio.sleep(2)
                
                print("✅ WebSocket notification system test completed")
                
    except Exception as e:
        print(f"❌ WebSocket test failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_websocket_notifications())