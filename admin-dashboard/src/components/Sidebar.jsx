import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Car, MapPin, MessageSquare, 
  Wallet, BarChart3, Ticket, Settings, LogOut 
} from 'lucide-react';
import { authService } from '../services/api';

const Sidebar = () => {
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/drivers', icon: Car, label: 'Drivers' },
    { path: '/rides', icon: MapPin, label: 'Rides' },
    { path: '/support', icon: MessageSquare, label: 'Support' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/promo', icon: Ticket, label: 'Promo Codes' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="sidebar-shell">
      <div className="sidebar-panel">
        <div>
          <span className="page-kicker">Operations Console</span>
          <h1 className="brand-title">
            Rideo <span className="display-accent">admin</span>
          </h1>
          <p className="brand-subtitle">Control the platform, track performance, and manage live operations.</p>
        </div>

        <nav className="nav-list">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}

        <button
          onClick={authService.logout}
          className="nav-logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="nav-label">Logout</span>
        </button>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
