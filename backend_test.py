#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Rideshare Application
Tests all major endpoints including auth, drivers, rides, maps, admin, and WebSocket
"""

import requests
import json
import sys
import time
import asyncio
import websockets
from datetime import datetime
from typing import Optional, Dict, Any

class RideshareAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.rider_token = None
        self.driver_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials from review request
        self.test_rider_phone = "9876543210"
        self.test_driver_phone = "8888888888"
        self.admin_phone = "9999999999"
        self.fallback_otp = "123456"
        
        # Store created resources for cleanup
        self.created_ride_id = None
        self.driver_profile_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return (success, response_data)"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}"
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text, "status_code": response.status_code}
            
            if not success:
                return False, f"Expected {expected_status}, got {response.status_code}: {response_data}"
            
            return True, response_data
            
        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_health_check(self):
        """Test basic health endpoint"""
        success, data = self.make_request('GET', '/api/health')
        self.log_test("Health Check", success, "" if success else str(data), data)
        return success

    def test_send_otp(self, phone: str) -> bool:
        """Test sending OTP to phone number"""
        success, data = self.make_request('POST', '/api/auth/send-otp', 
                                        {"phone": phone})
        self.log_test(f"Send OTP to {phone}", success, 
                     "" if success else str(data), data)
        return success

    def test_verify_otp(self, phone: str, name: str = None) -> Optional[str]:
        """Test OTP verification and return access token"""
        request_data = {"phone": phone, "otp": self.fallback_otp}
        if name:
            request_data["name"] = name
            
        success, data = self.make_request('POST', '/api/auth/verify-otp', request_data)
        
        if success and data.get("access_token"):
            token = data["access_token"]
            self.log_test(f"Verify OTP for {phone}", True, f"Token received", data)
            return token
        else:
            self.log_test(f"Verify OTP for {phone}", False, str(data), data)
            return None

    def test_get_user_profile(self, token: str, user_type: str) -> bool:
        """Test getting current user profile"""
        success, data = self.make_request('GET', '/api/users/me', token=token)
        self.log_test(f"Get {user_type} Profile", success, 
                     "" if success else str(data), data)
        return success

    def test_driver_registration(self, token: str) -> bool:
        """Test driver registration with vehicle"""
        driver_data = {
            "license_number": "DL1234567890",
            "license_expiry": "2025-12-31",
            "vehicle": {
                "vehicle_type": "sedan",
                "make": "Maruti",
                "model": "Swift Dzire",
                "color": "White",
                "number_plate": "DL01AB1234",
                "year": 2022
            }
        }
        
        success, data = self.make_request('POST', '/api/drivers/register', 
                                        driver_data, token=token)
        
        if success:
            self.driver_profile_id = data.get("driver_profile", {}).get("id")
        
        self.log_test("Driver Registration", success, 
                     "" if success else str(data), data)
        return success

    def test_toggle_driver_online(self, token: str) -> bool:
        """Test toggling driver online status"""
        online_data = {
            "is_online": True,
            "lat": 28.6139,
            "lng": 77.2090
        }
        
        success, data = self.make_request('POST', '/api/drivers/toggle-online', 
                                        online_data, token=token)
        self.log_test("Toggle Driver Online", success, 
                     "" if success else str(data), data)
        return success

    def test_maps_distance(self) -> bool:
        """Test maps distance calculation"""
        # Use the correct GET endpoint with query parameters
        params = {
            "origin_lat": 28.6139,
            "origin_lng": 77.2090,
            "dest_lat": 28.5355,
            "dest_lng": 77.3910
        }
        
        try:
            url = f"{self.base_url}/api/maps/distance"
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Maps Distance", True, "", data)
                return True
            else:
                try:
                    error_data = response.json()
                except:
                    error_data = {"raw_response": response.text, "status_code": response.status_code}
                self.log_test("Maps Distance", False, f"Status {response.status_code}: {error_data}")
                return False
                
        except Exception as e:
            self.log_test("Maps Distance", False, f"Request failed: {str(e)}")
            return False

    def test_ride_estimate(self, token: str) -> bool:
        """Test ride fare estimation"""
        estimate_data = {
            "pickup_lat": 28.6139,
            "pickup_lng": 77.2090,
            "drop_lat": 28.5355,
            "drop_lng": 77.3910,
            "vehicle_type": "sedan"
        }
        
        success, data = self.make_request('POST', '/api/rides/estimate', 
                                        estimate_data, token=token)
        self.log_test("Ride Estimate", success, 
                     "" if success else str(data), data)
        return success

    def test_ride_request(self, token: str) -> Optional[str]:
        """Test creating ride request"""
        ride_data = {
            "pickup_lat": 28.6139,
            "pickup_lng": 77.2090,
            "pickup_address": "Connaught Place, New Delhi",
            "drop_lat": 28.5355,
            "drop_lng": 77.3910,
            "drop_address": "Gurgaon Cyber City",
            "vehicle_type": "sedan"
        }
        
        success, data = self.make_request('POST', '/api/rides/request', 
                                        ride_data, token=token)
        
        if success and data.get("ride", {}).get("id"):
            ride_id = data["ride"]["id"]
            self.created_ride_id = ride_id
            self.log_test("Create Ride Request", True, f"Ride ID: {ride_id}", data)
            return ride_id
        else:
            self.log_test("Create Ride Request", False, str(data), data)
            return None

    def test_get_current_ride(self, token: str, user_type: str) -> bool:
        """Test getting current active ride"""
        success, data = self.make_request('GET', '/api/rides/current', token=token)
        self.log_test(f"Get Current Ride ({user_type})", success, 
                     "" if success else str(data), data)
        return success

    def test_admin_dashboard(self, token: str) -> bool:
        """Test admin dashboard stats"""
        success, data = self.make_request('GET', '/api/admin/dashboard', token=token)
        self.log_test("Admin Dashboard", success, 
                     "" if success else str(data), data)
        return success

    def test_rate_ride(self, token: str) -> bool:
        """Test rating a ride"""
        if not self.created_ride_id:
            self.log_test("Rate Ride", False, "No ride ID available for rating")
            return False
        
        rating_data = {
            "ride_id": self.created_ride_id,
            "rating": 5,
            "comment": "Great ride!"
        }
        
        success, data = self.make_request('POST', '/api/ratings/', 
                                        rating_data, token=token)
        self.log_test("Rate Ride", success, 
                     "" if success else str(data), data)
        return success

    async def test_driver_websocket(self, driver_id: str, token: str) -> bool:
        """Test driver WebSocket connection"""
        try:
            uri = f"ws://localhost:8001/ws/driver/{driver_id}?token={token}"
            
            # Fix websocket connection without timeout parameter
            async with websockets.connect(uri) as websocket:
                # Send location update
                location_update = {
                    "event": "location_update",
                    "lat": 28.6139,
                    "lng": 77.2090
                }
                await websocket.send(json.dumps(location_update))
                
                # Wait for acknowledgment or response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    self.log_test("Driver WebSocket", True, f"Connected and sent location update")
                    return True
                except asyncio.TimeoutError:
                    # No response expected for location update, connection success is enough
                    self.log_test("Driver WebSocket", True, "Connected successfully")
                    return True
                    
        except Exception as e:
            self.log_test("Driver WebSocket", False, f"WebSocket error: {str(e)}")
            return False

    def run_comprehensive_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Rideshare Backend API Tests")
        print("=" * 60)
        
        # 1. Health Check
        if not self.test_health_check():
            print("❌ Backend not healthy, stopping tests")
            return False
        
        # 2. Authentication Flow - Rider
        print("\n📱 Testing Rider Authentication...")
        if not self.test_send_otp(self.test_rider_phone):
            print("❌ Rider OTP send failed")
        else:
            self.rider_token = self.test_verify_otp(self.test_rider_phone, "Test Rider")
            if self.rider_token:
                self.test_get_user_profile(self.rider_token, "Rider")
        
        # 3. Authentication Flow - Driver
        print("\n🚗 Testing Driver Authentication...")
        if not self.test_send_otp(self.test_driver_phone):
            print("❌ Driver OTP send failed")
        else:
            self.driver_token = self.test_verify_otp(self.test_driver_phone, "Test Driver")
            if self.driver_token:
                self.test_get_user_profile(self.driver_token, "Driver")
        
        # 4. Authentication Flow - Admin
        print("\n👑 Testing Admin Authentication...")
        if not self.test_send_otp(self.admin_phone):
            print("❌ Admin OTP send failed")
        else:
            self.admin_token = self.test_verify_otp(self.admin_phone, "Admin User")
            if self.admin_token:
                self.test_get_user_profile(self.admin_token, "Admin")
        
        # 5. Driver Registration
        if self.driver_token:
            print("\n🚗 Testing Driver Registration...")
            # Try to register, but expect it might fail if already registered
            registration_success = self.test_driver_registration(self.driver_token)
            if not registration_success:
                print("ℹ️ Driver already registered (expected for admin user)")
            
            # Try to toggle online, but expect it might fail if not verified
            online_success = self.test_toggle_driver_online(self.driver_token)
            if not online_success:
                print("ℹ️ Driver not verified yet (expected for new registrations)")
        
        # 6. Maps and Distance
        print("\n🗺️ Testing Maps Integration...")
        self.test_maps_distance()
        
        # 7. Ride Operations
        if self.rider_token:
            print("\n🚕 Testing Ride Operations...")
            self.test_ride_estimate(self.rider_token)
            ride_id = self.test_ride_request(self.rider_token)
            self.test_get_current_ride(self.rider_token, "Rider")
            
            if self.driver_token:
                self.test_get_current_ride(self.driver_token, "Driver")
        
        # 8. Admin Dashboard
        if self.admin_token:
            print("\n📊 Testing Admin Dashboard...")
            self.test_admin_dashboard(self.admin_token)
        
        # 9. Rating System
        if self.rider_token and self.created_ride_id:
            print("\n⭐ Testing Rating System...")
            # Note: This will fail because ride needs to be completed first
            rating_success = self.test_rate_ride(self.rider_token)
            if not rating_success:
                print("ℹ️ Rating failed - ride needs to be completed first (expected)")
        
        # 10. WebSocket Testing
        if self.driver_token:
            print("\n🔌 Testing WebSocket Connection...")
            # Extract driver ID from token or use a test ID
            driver_id = "test-driver-id"  # This should be extracted from auth response
            try:
                asyncio.run(self.test_driver_websocket(driver_id, self.driver_token))
            except Exception as e:
                self.log_test("Driver WebSocket", False, f"Async error: {str(e)}")
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Print failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['details']}")
        
        print("\n✅ Passed Tests:")
        passed_tests = [r for r in self.test_results if r["success"]]
        for test in passed_tests:
            print(f"  • {test['test']}")

def main():
    """Main test execution"""
    print("Rideshare Backend API Tester")
    print("Testing all major endpoints...")
    
    tester = RideshareAPITester()
    
    try:
        tester.run_comprehensive_tests()
        tester.print_summary()
        
        # Return appropriate exit code
        if tester.tests_passed == tester.tests_run:
            print("\n🎉 All tests passed!")
            return 0
        else:
            print(f"\n⚠️ {tester.tests_run - tester.tests_passed} tests failed")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())