import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Car } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Analytics & Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Period Revenue</p>
              <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Period Rides</p>
              <h3 className="text-2xl font-bold mt-1">{totalRides}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Fare</p>
              <h3 className="text-2xl font-bold mt-1">
                {formatCurrency(totalRides > 0 ? totalRevenue / totalRides : 0)}
              </h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Top Drivers</p>
              <h3 className="text-2xl font-bold mt-1">{topDrivers.length}</h3>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Car className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Revenue Trend</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('day')}
              className={`px-4 py-2 rounded ${
                period === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded ${
                period === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded ${
                period === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            Loading chart data...
          </div>
        ) : revenueData.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-500">
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(value) : value,
                  name === 'revenue' ? 'Revenue' : 'Rides'
                ]}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Revenue"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="rideCount" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Rides"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Drivers */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Top Performing Drivers</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Rides</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topDrivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No driver data available
                  </td>
                </tr>
              ) : (
                topDrivers.map((driver, index) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{driver.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{driver.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ⭐ {driver.rating?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{driver.totalRides || 0}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(driver.totalEarnings || 0)}
                    </td>
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
