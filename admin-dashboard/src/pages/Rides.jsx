import { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import { formatDate, formatCurrency, getStatusColor } from '../utils/helpers';

const Rides = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadRides();
  }, [page, statusFilter]);

  const loadRides = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status_filter = statusFilter;

      const response = await adminService.getRides(params);
      setRides(response.data.rides);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load rides:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Trips</span>
          <h1 className="page-title">
            Ride <span className="display-accent">management</span>
          </h1>
          <p className="page-subtitle">Follow trip volume, filter active demand, and review ride outcomes in a tighter operational table.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-card">
          <p className="metric-label">Total Rides</p>
          <h3 className="metric-value">{total}</h3>
        </div>
        <div className="metric-card">
          <p className="metric-label">Completed</p>
          <h3 className="metric-value">{rides.filter((ride) => ride.status === 'completed').length}</h3>
        </div>
        <div className="metric-card metric-card-dark">
          <p className="metric-label">Active</p>
          <h3 className="metric-value">
            {rides.filter((ride) => ['searching', 'accepted', 'in_progress'].includes(ride.status)).length}
          </h3>
        </div>
        <div className="metric-card">
          <p className="metric-label">Cancelled</p>
          <h3 className="metric-value">{rides.filter((ride) => ride.status === 'cancelled').length}</h3>
        </div>
      </div>

      <div className="filter-shell">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-control">
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="cancelled">Cancelled</option>
            <option value="searching">Searching</option>
          </select>
        </div>
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ride ID</th>
                <th>Rider</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Fare</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading rides...
                  </td>
                </tr>
              ) : rides.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No rides found
                  </td>
                </tr>
              ) : (
                rides.map((ride) => (
                  <tr key={ride.id}>
                    <td className="font-mono text-sm">{ride.id.substring(0, 8)}...</td>
                    <td>
                      <div className="font-semibold text-black">{ride.rider?.name || 'N/A'}</div>
                      <div className="table-note mt-1">{ride.rider?.phone || ''}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-black">{ride.driver?.name || 'Not assigned'}</div>
                      <div className="table-note mt-1">{ride.driver?.phone || ''}</div>
                    </td>
                    <td>
                      <span className={getStatusColor(ride.status)}>{ride.status.replace('_', ' ')}</span>
                    </td>
                    <td>{formatCurrency(ride.actual_fare || ride.estimated_fare)}</td>
                    <td className="table-note">{formatDate(ride.created_at)}</td>
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

export default Rides;
