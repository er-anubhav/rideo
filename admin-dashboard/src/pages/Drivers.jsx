import { useEffect, useState } from 'react';
import { Search, CheckCircle, XCircle, Ban } from 'lucide-react';
import { adminService } from '../services/api';
import { formatDate, getStatusColor } from '../utils/helpers';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadDrivers();
  }, [page, verifiedFilter, onlineFilter]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (verifiedFilter !== '') params.verified = verifiedFilter === 'true';
      if (onlineFilter !== '') params.online = onlineFilter === 'true';
      
      const response = await adminService.getDrivers(params);
      setDrivers(response.data.drivers);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDriver = async (driverId, currentStatus) => {
    const action = currentStatus ? 'unverify' : 'verify';
    if (!confirm(`Are you sure you want to ${action} this driver?`)) return;
    
    try {
      await adminService.verifyDriver(driverId, !currentStatus);
      loadDrivers();
    } catch (error) {
      alert('Failed to update driver verification');
    }
  };

  const handleSuspendDriver = async (driverId) => {
    if (!confirm('Are you sure you want to suspend this driver? They will be logged out and blocked.')) return;
    
    try {
      await adminService.suspendDriver(driverId);
      loadDrivers();
    } catch (error) {
      alert('Failed to suspend driver');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Driver Management</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Drivers</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Online Only</option>
            <option value="false">Offline Only</option>
          </select>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rides</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  Loading drivers...
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No drivers found
                </td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{driver.user?.name}</div>
                    <div className="text-sm text-gray-500">{driver.user?.email || 'No email'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{driver.user?.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      driver.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {driver.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      driver.is_online ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {driver.is_online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    ⭐ {driver.rating?.toFixed(1) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {driver.total_rides || 0}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyDriver(driver.user_id, driver.is_verified)}
                        className={`${
                          driver.is_verified ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'
                        }`}
                        title={driver.is_verified ? 'Unverify Driver' : 'Verify Driver'}
                      >
                        {driver.is_verified ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleSuspendDriver(driver.user_id)}
                        className="text-red-600 hover:text-red-800"
                        title="Suspend Driver"
                      >
                        <Ban className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Drivers;
