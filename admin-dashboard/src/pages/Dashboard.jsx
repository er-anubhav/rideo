import { useEffect, useState } from 'react';
import { Users, Car, MapPin, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import { adminService } from '../services/api';
import { formatCurrency } from '../utils/helpers';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashboardRes, activitiesRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getRecentActivities(10),
      ]);
      setStats(dashboardRes.data.stats);
      setActivities(activitiesRes.data.activities);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="blue"
          subtitle={`${stats?.totalDrivers || 0} drivers`}
        />
        <StatCard
          title="Total Rides"
          value={stats?.totalRides || 0}
          icon={MapPin}
          color="green"
          subtitle={`${stats?.activeRides || 0} active now`}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          color="purple"
          subtitle={`Today: ${formatCurrency(stats?.todayRevenue || 0)}`}
        />
        <StatCard
          title="Online Drivers"
          value={stats?.onlineDrivers || 0}
          icon={Car}
          color="indigo"
          subtitle={`${stats?.completedRides || 0} completed`}
        />
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <h3 className="font-semibold text-yellow-800">Pending Verifications</h3>
              <p className="text-yellow-700">{stats?.pendingVerifications || 0} drivers awaiting verification</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <h3 className="font-semibold text-blue-800">Support Tickets</h3>
              <p className="text-blue-700">{stats?.openSupportTickets || 0} tickets need attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activities</h2>
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div key={index} className="flex items-start border-b pb-3 last:border-b-0">
                <div className={`p-2 rounded mr-3 ${
                  activity.type === 'ride' ? 'bg-green-100' :
                  activity.type === 'registration' ? 'bg-blue-100' :
                  'bg-yellow-100'
                }`}>
                  {activity.type === 'ride' ? <MapPin className="w-4 h-4" /> :
                   activity.type === 'registration' ? <Users className="w-4 h-4" /> :
                   <AlertCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activities</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
