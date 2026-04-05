import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  sendOTP: (phone) => api.post('/api/auth/send-otp', { phone }),
  verifyOTP: (phone, otp, name) => api.post('/api/auth/verify-otp', { phone, otp, name }),
  logout: () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  },
};

export const adminService = {
  getDashboard: () => api.get('/api/admin/dashboard'),
  
  // Users
  getUsers: (params) => api.get('/api/admin/users', { params }),
  getUserDetails: (userId) => api.get(`/api/admin/users/${userId}`),
  blockUser: (userId) => api.put(`/api/admin/users/${userId}/block`),
  deleteUser: (userId) => api.delete(`/api/admin/users/${userId}`),
  
  // Drivers
  getDrivers: (params) => api.get('/api/admin/drivers', { params }),
  verifyDriver: (driverId, isVerified) => 
    api.put(`/api/admin/drivers/${driverId}/verify?is_verified=${isVerified}`),
  suspendDriver: (driverId) => api.put(`/api/admin/drivers/${driverId}/suspend`),
  
  // Rides
  getRides: (params) => api.get('/api/admin/rides', { params }),
  getRideDetails: (rideId) => api.get(`/api/admin/rides/${rideId}`),
  
  // Support
  getTickets: (params) => api.get('/api/admin/support/tickets', { params }),
  getTicketDetails: (ticketId) => api.get(`/api/admin/support/tickets/${ticketId}`),
  replyToTicket: (ticketId, message) => 
    api.post(`/api/admin/support/tickets/${ticketId}/reply?message=${encodeURIComponent(message)}`),
  updateTicketStatus: (ticketId, status) => 
    api.put(`/api/admin/support/tickets/${ticketId}/status?new_status=${status}`),
  
  // Wallet
  getWallets: (params) => api.get('/api/admin/wallets', { params }),
  getTransactions: (params) => api.get('/api/admin/transactions', { params }),
  
  // Analytics
  getRevenueAnalytics: (period) => api.get(`/api/admin/analytics/revenue?period=${period}`),
  getDriverAnalytics: () => api.get('/api/admin/analytics/drivers'),
  
  // Promo
  getPromoCodes: () => api.get('/api/admin/promo-codes'),
  createPromoCode: (data) => api.post('/api/admin/promo-codes', null, { params: data }),
  
  // Fare
  getFareConfigs: () => api.get('/api/admin/fare-configs'),
  updateFareConfig: (vehicleType, data) => 
    api.put(`/api/admin/fare-configs/${vehicleType}`, null, { params: data }),
  
  // Logs
  getRecentActivities: (limit) => api.get(`/api/admin/logs/recent-activities?limit=${limit}`),
};

export default api;