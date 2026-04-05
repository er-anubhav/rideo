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
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-sm text-gray-400">Ride Sharing Platform</p>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
                isActive ? 'bg-gray-800 text-white border-l-4 border-blue-500' : ''
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        
        <button
          onClick={authService.logout}
          className="flex items-center w-full px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors mt-4"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;
