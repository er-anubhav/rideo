# Admin Dashboard - Ride Sharing Platform

Production-ready React admin dashboard for managing the entire ride-sharing platform.

## Features

### ✅ Implemented
- **Dashboard Overview** - Real-time statistics and recent activities
- **User Management** - View, search, filter, block/unblock, and delete users
- **Authentication** - Secure OTP-based admin login
- **Responsive Design** - Modern UI with Tailwind CSS
- **API Integration** - Full integration with backend admin APIs

### 🚧 Coming Soon
- Driver verification and management
- Ride monitoring and tracking
- Support ticket management with admin replies
- Wallet and transaction monitoring
- Revenue analytics with charts
- Promo code creation and management
- Fare configuration
- System settings

## Tech Stack

- **Frontend**: React 19+ with Hooks
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite v8
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Charts**: Recharts (for analytics)

## Installation

```bash
cd /app/admin-dashboard
yarn install
```

## Running the Dashboard

### Development Mode
```bash
yarn dev
```
The dashboard will run on `http://localhost:3001`

### Production Build
```bash
yarn build
yarn preview
```

## Login Credentials

**Admin Phone**: `9999999999`  
**OTP**: `123456`

## Project Structure

```
admin-dashboard/
├── public/              # Static files
├── src/
│   ├── components/      # Reusable components
│   │   ├── Sidebar.jsx
│   │   └── StatCard.jsx
│   ├── pages/           # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Users.jsx
│   │   ├── Drivers.jsx
│   │   ├── Rides.jsx
│   │   ├── Support.jsx
│   │   ├── Wallet.jsx
│   │   ├── Analytics.jsx
│   │   ├── Promo.jsx
│   │   └── Settings.jsx
│   ├── services/        # API services
│   │   └── api.js
│   ├── utils/           # Helper functions
│   │   └── helpers.js
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── .env                 # Environment variables
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── package.json         # Dependencies
```

## Available Pages

| Route | Page | Status |
|-------|------|--------|
| `/login` | Admin Login | ✅ Complete |
| `/` | Dashboard | ✅ Complete |
| `/users` | User Management | ✅ Complete |
| `/drivers` | Driver Management | 🚧 Placeholder |
| `/rides` | Ride Monitoring | 🚧 Placeholder |
| `/support` | Support Tickets | 🚧 Placeholder |
| `/wallet` | Wallet & Transactions | 🚧 Placeholder |
| `/analytics` | Analytics & Reports | 🚧 Placeholder |
| `/promo` | Promo Codes | 🚧 Placeholder |
| `/settings` | Settings | 🚧 Placeholder |

## API Endpoints Used

### Dashboard
- `GET /api/admin/dashboard` - Get statistics
- `GET /api/admin/logs/recent-activities` - Recent activities

### User Management
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{id}` - Get user details
- `PUT /api/admin/users/{id}/block` - Block/unblock user
- `DELETE /api/admin/users/{id}` - Delete user

### Authentication
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP and get token

## Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8001
```

## Features Breakdown

### Dashboard
- **Total Users** - Count of all registered users
- **Total Rides** - Total and active rides
- **Revenue** - Total and daily revenue
- **Online Drivers** - Currently active drivers
- **Alerts** - Pending verifications and support tickets
- **Activity Feed** - Recent platform activities

### User Management
- Search by name, phone, or email
- Filter by role (Rider, Driver, Admin)
- View user details with ride history
- Block/unblock users
- Delete users (with active ride check)
- Pagination support

## Development Notes

- All API calls use JWT token authentication
- Token stored in localStorage
- Auto-redirect to login on 401/403 errors
- Proxy configured for API calls (/api → http://localhost:8001)

## Production Deployment

1. Build the application:
   ```bash
   yarn build
   ```

2. Serve the `dist` folder with any static server:
   ```bash
   yarn preview
   # OR
   npx serve -s dist -p 3001
   ```

3. Configure nginx or Apache to serve the built files

## Security

- JWT token-based authentication
- Role-based access control (admin only)
- Token expiration handling
- Secure API communication
- Environment variable management

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

This is part of the ride-sharing platform backend alignment project.

## License

MIT
