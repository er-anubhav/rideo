import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Ban } from 'lucide-react';
import { adminService } from '../services/api';

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
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Fleet</span>
          <h1 className="page-title">
            Driver <span className="display-accent">management</span>
          </h1>
          <p className="page-subtitle">Review verification state, live availability, and intervention actions with consistent controls.</p>
        </div>
      </div>

      <div className="filter-shell">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} className="form-control">
            <option value="">All Drivers</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified Only</option>
          </select>
          <select value={onlineFilter} onChange={(e) => setOnlineFilter(e.target.value)} className="form-control">
            <option value="">All Status</option>
            <option value="true">Online Only</option>
            <option value="false">Offline Only</option>
          </select>
        </div>
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Phone</th>
                <th>Verified</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Rides</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    Loading drivers...
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No drivers found
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td>
                      <div className="font-semibold text-black">{driver.user?.name}</div>
                      <div className="table-note mt-1">{driver.user?.email || 'No email'}</div>
                    </td>
                    <td className="muted-number">{driver.user?.phone}</td>
                    <td>
                      <span className={driver.is_verified ? 'status-pill status-pill-strong' : 'status-pill status-pill-soft'}>
                        {driver.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className={driver.is_online ? 'status-pill' : 'status-pill status-pill-muted'}>
                        {driver.is_online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>★ {driver.rating?.toFixed(1) || 'N/A'}</td>
                    <td>{driver.total_rides || 0}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerifyDriver(driver.user_id, driver.is_verified)}
                          className="button-icon"
                          title={driver.is_verified ? 'Unverify Driver' : 'Verify Driver'}
                        >
                          {driver.is_verified ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => handleSuspendDriver(driver.user_id)}
                          className="button-icon button-icon-danger"
                          title="Suspend Driver"
                        >
                          <Ban className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 && (
        <div className="pagination-shell">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="button-secondary">
            Previous
          </button>
          <span className="table-note">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="button-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Drivers;
