import { useEffect, useState } from 'react';
import { Users, Car, MapPin, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import { adminService } from '../services/api';
import { formatCurrency } from '../utils/helpers';

const activityTone = {
  ride: 'status-pill status-pill-strong',
  registration: 'status-pill',
  default: 'status-pill status-pill-soft',
};

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
      <div className="page-shell">
        <div className="surface-card empty-state">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Command Center</span>
          <h1 className="page-title">
            Platform <span className="display-accent">overview</span>
          </h1>
          <p className="page-subtitle">
            Daily visibility across riders, trips, revenue, and support pressure in one clean operating layer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          subtitle={`${stats?.totalDrivers || 0} drivers onboarded`}
        />
        <StatCard
          title="Total Rides"
          value={stats?.totalRides || 0}
          icon={MapPin}
          color="soft"
          subtitle={`${stats?.activeRides || 0} live right now`}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          color="inverse"
          subtitle={`Today ${formatCurrency(stats?.todayRevenue || 0)}`}
        />
        <StatCard
          title="Online Drivers"
          value={stats?.onlineDrivers || 0}
          icon={Car}
          subtitle={`${stats?.completedRides || 0} rides completed`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="alert-card">
          <div className="alert-icon">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">Pending Verifications</h3>
            <p className="page-subtitle mt-2 text-sm">
              {stats?.pendingVerifications || 0} drivers are waiting for approval and need a final compliance pass.
            </p>
          </div>
        </div>
        <div className="alert-card">
          <div className="alert-icon">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">Support Queue</h3>
            <p className="page-subtitle mt-2 text-sm">
              {stats?.openSupportTickets || 0} tickets still need attention from the operations team.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card-strong">
        <div className="page-heading mb-6">
          <div>
            <span className="page-kicker">Recent Activity</span>
            <h2 className="text-2xl font-extrabold tracking-tight">Operational feed</h2>
          </div>
        </div>

        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-2xl border border-black/8 bg-white/80 p-4 md:flex-row md:items-start"
              >
                <span className={activityTone[activity.type] || activityTone.default}>
                  {activity.type === 'ride' ? 'Ride' : activity.type === 'registration' ? 'Signup' : 'Alert'}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-black/90">{activity.description}</p>
                  <p className="table-note mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No recent activities</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
