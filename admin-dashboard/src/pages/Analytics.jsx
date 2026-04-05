import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Car } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { adminService } from '../services/api';
import { formatCurrency } from '../utils/helpers';

const Analytics = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [topDrivers, setTopDrivers] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [revenueRes, driversRes] = await Promise.all([
        adminService.getRevenueAnalytics(period),
        adminService.getDriverAnalytics(),
      ]);

      setRevenueData(revenueRes.data.data);
      setTopDrivers(driversRes.data.topDrivers);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalRides = revenueData.reduce((sum, item) => sum + (item.rideCount || 0), 0);

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Performance</span>
          <h1 className="page-title">
            Analytics <span className="display-accent">& reports</span>
          </h1>
          <p className="page-subtitle">Revenue and driver trends now sit inside a single monochrome reporting surface with clearer hierarchy.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="metric-label">Period Revenue</p>
              <h3 className="metric-value">{formatCurrency(totalRevenue)}</h3>
            </div>
            <div className="metric-icon">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="metric-card metric-card-dark">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="metric-label">Period Rides</p>
              <h3 className="metric-value">{totalRides}</h3>
            </div>
            <div className="metric-icon">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="metric-label">Average Fare</p>
              <h3 className="metric-value">{formatCurrency(totalRides > 0 ? totalRevenue / totalRides : 0)}</h3>
            </div>
            <div className="metric-icon">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="metric-label">Top Drivers</p>
              <h3 className="metric-value">{topDrivers.length}</h3>
            </div>
            <div className="metric-icon">
              <Car className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="surface-card-strong">
        <div className="page-heading mb-6">
          <div>
            <span className="page-kicker">Revenue Trend</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Time series view</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {['day', 'week', 'month'].map((value) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`tab-button ${period === value ? 'tab-button-active' : ''}`}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading chart data...</div>
        ) : revenueData.length === 0 ? (
          <div className="empty-state">No data available for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={revenueData}>
              <CartesianGrid stroke="rgba(17,17,17,0.08)" strokeDasharray="4 8" />
              <XAxis dataKey="period" stroke="#8e8e8e" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
              <YAxis yAxisId="left" stroke="#8e8e8e" />
              <YAxis yAxisId="right" orientation="right" stroke="#8e8e8e" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(17,17,17,0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 18px 50px rgba(17,17,17,0.08)',
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [name === 'revenue' ? formatCurrency(value) : value, name === 'revenue' ? 'Revenue' : 'Rides']}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#111111" strokeWidth={2.4} name="Revenue" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="rideCount" stroke="#6a6a6a" strokeWidth={2.1} name="Rides" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="table-shell">
        <div className="flex items-center justify-between border-b border-black/8 px-6 py-5">
          <h2 className="text-xl font-extrabold tracking-tight">Top performing drivers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Driver</th>
                <th>Phone</th>
                <th>Rating</th>
                <th>Total Rides</th>
                <th>Total Earnings</th>
              </tr>
            </thead>
            <tbody>
              {topDrivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No driver data available
                  </td>
                </tr>
              ) : (
                topDrivers.map((driver, index) => (
                  <tr key={driver.id}>
                    <td>
                      <span className={index === 0 ? 'status-pill status-pill-strong' : 'status-pill'}>#{index + 1}</span>
                    </td>
                    <td className="font-semibold text-black">{driver.name}</td>
                    <td className="muted-number">{driver.phone}</td>
                    <td>★ {driver.rating?.toFixed(1) || 'N/A'}</td>
                    <td>{driver.totalRides || 0}</td>
                    <td className="font-semibold">{formatCurrency(driver.totalEarnings || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
