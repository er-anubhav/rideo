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
    <div className="auth-shell">
      <div className="auth-card">
        <div className="text-center">
          <div className="auth-mark">
            <LogIn className="h-8 w-8" />
          </div>
          <span className="auth-kicker">Secure Access</span>
          <h1 className="page-title mt-5">
            Admin <span className="display-accent">login</span>
          </h1>
          <p className="page-subtitle mx-auto">
            Sign in to monitor rides, manage wallets, and keep the platform moving without friction.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-black/10 bg-black px-4 py-3 text-sm font-medium text-white">
            {error}
          </div>
        )}

        <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="mt-8 space-y-5">
          <div className="input-shell">
            <label className="field-label">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="form-control"
              placeholder="9999999999"
              required
              disabled={otpSent}
            />
          </div>

          {otpSent && (
            <div className="input-shell">
              <label className="field-label">One Time Password</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="form-control"
                placeholder="123456"
                required
                maxLength="6"
              />
              <p className="field-help">Default OTP for testing: `123456`</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="button-primary w-full">
            {loading ? 'Please wait...' : otpSent ? 'Verify OTP' : 'Send OTP'}
          </button>

          {otpSent && (
            <button type="button" onClick={() => setOtpSent(false)} className="button-secondary w-full">
              Change Phone Number
            </button>
          )}
        </form>

        <div className="mt-8 border-t border-black/10 pt-6 text-center">
          <p className="table-note">
            Admin phone for local testing: <strong className="text-black">9999999999</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
