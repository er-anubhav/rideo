import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { authService } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('9999999999');
  const [otp, setOtp] = useState('123456');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await authService.sendOTP(phone);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await authService.verifyOTP(phone, otp, 'Admin');
      localStorage.setItem('adminToken', response.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Login</h1>
          <p className="text-gray-600 mt-2">Ride Sharing Platform</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP}>
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="9999999999"
              required
              disabled={otpSent}
            />
          </div>

          {otpSent && (
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
                required
                maxLength="6"
              />
              <p className="text-sm text-gray-500 mt-2">
                Default OTP for testing: 123456
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : otpSent ? 'Verify OTP' : 'Send OTP'}
          </button>

          {otpSent && (
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full mt-3 text-blue-600 hover:text-blue-700 font-medium"
            >
              Change Phone Number
            </button>
          )}
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Admin Phone: <strong>9999999999</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
