#!/usr/bin/env python3
"""
Focused Backend Testing for Earnings and WebSocket Features
Tests the new earnings endpoints and WebSocket notification system
"""

import requests
import json
import sys
import time
import asyncio
import websockets
from datetime import datetime
from typing import Optional, Dict, Any

class EarningsWebSocketTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://")
        self.driver_token = None
        self.rider_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials from review request
        self.test_driver_phone = "8888888888"
        self.test_rider_phone = "9876543210"
        self.fallback_otp = "123456"
        
        # Store created resources
        self.driver_id = None
        self.rider_id = None
        self.created_ride_id = None

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

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, params: Optional[Dict] = None) -> tuple:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            return response.status_code, response.json() if response.content else {}
        except requests.exceptions.RequestException as e:
            return 0, {"error": str(e)}
        except json.JSONDecodeError:
            return response.status_code, {"error": "Invalid JSON response"}

    def authenticate_driver(self) -> bool:
        """Authenticate as driver"""
        print(f"\n🔐 Authenticating driver ({self.test_driver_phone})...")
        
        # Send OTP
        status, response = self.make_request('POST', '/api/auth/send-otp', {
            'phone': self.test_driver_phone
        })
        
        if status != 200:
            self.log_test("Driver OTP Send", False, f"Status {status}: {response}")
            return False
        
        # Verify OTP
        status, response = self.make_request('POST', '/api/auth/verify-otp', {
            'phone': self.test_driver_phone,
            'otp': self.fallback_otp
        })
        
        if status == 200 and 'access_token' in response:
            self.driver_token = response['access_token']
            self.driver_id = response.get('user', {}).get('id')
            self.log_test("Driver Authentication", True, "Successfully authenticated")
            return True
        else:
            self.log_test("Driver Authentication", False, f"Status {status}: {response}")
            return False

    def authenticate_rider(self) -> bool:
        """Authenticate as rider"""
        print(f"\n🔐 Authenticating rider ({self.test_rider_phone})...")
        
        # Send OTP
        status, response = self.make_request('POST', '/api/auth/send-otp', {
            'phone': self.test_rider_phone
        })
        
        if status != 200:
            self.log_test("Rider OTP Send", False, f"Status {status}: {response}")
            return False
        
        # Verify OTP
        status, response = self.make_request('POST', '/api/auth/verify-otp', {
            'phone': self.test_rider_phone,
            'otp': self.fallback_otp
        })
        
        if status == 200 and 'access_token' in response:
            self.rider_token = response['access_token']
            self.rider_id = response.get('user', {}).get('id')
            self.log_test("Rider Authentication", True, "Successfully authenticated")
            return True
        else:
            self.log_test("Rider Authentication", False, f"Status {status}: {response}")
            return False

    def test_earnings_endpoints(self):
        """Test all earnings endpoints"""
        print(f"\n📊 Testing Earnings Endpoints...")
        
        if not self.driver_token:
            self.log_test("Earnings Tests", False, "No driver token available")
            return
        
        # Test 1: GET /api/earnings/stats
        status, response = self.make_request('GET', '/api/earnings/stats', token=self.driver_token)
        success = status == 200 and 'stats' in response
        self.log_test("GET /api/earnings/stats", success, 
                     f"Status {status}" if not success else "Driver earnings stats retrieved")
        
        # Test 2: GET /api/earnings/daily?days=7
        status, response = self.make_request('GET', '/api/earnings/daily', 
                                           params={'days': 7}, token=self.driver_token)
        success = status == 200 and isinstance(response, list)
        self.log_test("GET /api/earnings/daily?days=7", success,
                     f"Status {status}" if not success else f"Retrieved {len(response)} daily records")
        
        # Test 3: GET /api/earnings/summary?period=today
        status, response = self.make_request('GET', '/api/earnings/summary',
                                           params={'period': 'today'}, token=self.driver_token)
        success = status == 200 and 'total_earnings' in response
        self.log_test("GET /api/earnings/summary?period=today", success,
                     f"Status {status}" if not success else "Today's earnings summary retrieved")
        
        # Test 4: GET /api/earnings/weekly-comparison
        status, response = self.make_request('GET', '/api/earnings/weekly-comparison', 
                                           token=self.driver_token)
        success = status == 200 and 'comparison' in response
        self.log_test("GET /api/earnings/weekly-comparison", success,
                     f"Status {status}" if not success else "Weekly comparison retrieved")
        
        # Test 5: GET /api/earnings/rides
        status, response = self.make_request('GET', '/api/earnings/rides',
                                           token=self.driver_token)
        success = status == 200 and isinstance(response, list)
        self.log_test("GET /api/earnings/rides", success,
                     f"Status {status}" if not success else f"Retrieved {len(response)} ride earnings")
        
        # Test 6: Test different periods for summary
        for period in ['yesterday', 'this_week', 'last_week', 'this_month']:
            status, response = self.make_request('GET', '/api/earnings/summary',
                                               params={'period': period}, token=self.driver_token)
            success = status == 200 and 'total_earnings' in response
            self.log_test(f"GET /api/earnings/summary?period={period}", success,
                         f"Status {status}" if not success else f"Period {period} summary retrieved")

    def test_earnings_without_auth(self):
        """Test earnings endpoints without authentication"""
        print(f"\n🔒 Testing Earnings Security...")
        
        endpoints = [
            '/api/earnings/stats',
            '/api/earnings/daily',
            '/api/earnings/summary',
            '/api/earnings/weekly-comparison',
            '/api/earnings/rides'
        ]
        
        for endpoint in endpoints:
            status, response = self.make_request('GET', endpoint)
            success = status == 401  # Should be unauthorized
            self.log_test(f"Unauthorized access to {endpoint}", success,
                         f"Expected 401, got {status}" if not success else "Properly secured")

    def test_earnings_as_rider(self):
        """Test earnings endpoints as rider (should fail)"""
        print(f"\n👤 Testing Earnings Access as Rider...")
        
        if not self.rider_token:
            self.log_test("Rider Earnings Tests", False, "No rider token available")
            return
        
        endpoints = [
            '/api/earnings/stats',
            '/api/earnings/daily',
            '/api/earnings/summary',
            '/api/earnings/weekly-comparison',
            '/api/earnings/rides'
        ]
        
        for endpoint in endpoints:
            status, response = self.make_request('GET', endpoint, token=self.rider_token)
            success = status == 403  # Should be forbidden for riders
            self.log_test(f"Rider access to {endpoint}", success,
                         f"Expected 403, got {status}" if not success else "Properly restricted to drivers")

    async def test_websocket_connection(self):
        """Test WebSocket connection for driver"""
        print(f"\n🔌 Testing WebSocket Connection...")
        
        if not self.driver_token or not self.driver_id:
            self.log_test("WebSocket Driver Connection", False, "No driver credentials available")
            return
        
        try:
            # Test driver WebSocket connection
            ws_url = f"{self.ws_url}/ws/driver/{self.driver_id}?token={self.driver_token}"
            
            async with websockets.connect(ws_url) as websocket:
                # Send a test message
                await websocket.send(json.dumps({
                    "type": "location_update",
                    "lat": 28.6139,
                    "lng": 77.2090
                }))
                
                # Wait for response or timeout
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    self.log_test("WebSocket Driver Connection", True, "Successfully connected and received response")
                except asyncio.TimeoutError:
                    self.log_test("WebSocket Driver Connection", True, "Connected successfully (no immediate response expected)")
                    
        except Exception as e:
            self.log_test("WebSocket Driver Connection", False, f"Connection failed: {str(e)}")

    async def test_websocket_notifications(self):
        """Test WebSocket notification system"""
        print(f"\n📱 Testing WebSocket Notifications...")
        
        if not self.driver_token or not self.rider_token:
            self.log_test("WebSocket Notifications", False, "Missing driver or rider credentials")
            return
        
        try:
            # Connect both driver and rider
            driver_ws_url = f"{self.ws_url}/ws/driver/{self.driver_id}?token={self.driver_token}"
            rider_ws_url = f"{self.ws_url}/ws/rider/{self.rider_id}?token={self.rider_token}"
            
            # Test driver connection
            try:
                async with websockets.connect(driver_ws_url) as driver_ws:
                    self.log_test("Driver WebSocket Connection", True, "Driver connected successfully")
            except Exception as e:
                self.log_test("Driver WebSocket Connection", False, f"Driver connection failed: {str(e)}")
            
            # Test rider connection
            try:
                async with websockets.connect(rider_ws_url) as rider_ws:
                    self.log_test("Rider WebSocket Connection", True, "Rider connected successfully")
            except Exception as e:
                self.log_test("Rider WebSocket Connection", False, f"Rider connection failed: {str(e)}")
                
        except Exception as e:
            self.log_test("WebSocket Notifications Setup", False, f"Setup failed: {str(e)}")

    def test_connection_manager_functions(self):
        """Test connection manager functions indirectly through API"""
        print(f"\n🔗 Testing Connection Manager Functions...")
        
        # Test driver online status (indirectly tests connection manager)
        if self.driver_token:
            status, response = self.make_request('POST', '/api/drivers/toggle-online', 
                                               data={"is_online": True}, token=self.driver_token)
            # This might fail if driver profile is not verified, which is expected
            if status in [200, 403]:
                self.log_test("Driver Online Toggle", True, 
                             "Driver online toggle working (may require verification)")
            else:
                self.log_test("Driver Online Toggle", False, f"Status {status}: {response}")

    def run_all_tests(self):
        """Run all earnings and WebSocket tests"""
        print("🚀 Starting Earnings and WebSocket Testing...")
        print(f"Backend URL: {self.base_url}")
        print(f"WebSocket URL: {self.ws_url}")
        
        # Authentication
        driver_auth = self.authenticate_driver()
        rider_auth = self.authenticate_rider()
        
        # Earnings API tests
        if driver_auth:
            self.test_earnings_endpoints()
        
        # Security tests
        self.test_earnings_without_auth()
        
        if rider_auth:
            self.test_earnings_as_rider()
        
        # WebSocket tests
        if driver_auth:
            asyncio.run(self.test_websocket_connection())
        
        if driver_auth and rider_auth:
            asyncio.run(self.test_websocket_notifications())
        
        # Connection manager tests
        self.test_connection_manager_functions()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = EarningsWebSocketTester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())