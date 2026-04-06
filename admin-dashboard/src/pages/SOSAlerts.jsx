import { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Phone, User, Car, Clock, CheckCircle, XCircle } from 'lucide-react';
import { adminService } from '../services/api';
import { formatDistance, formatDateTime } from '../utils/helpers';

const SOSAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [resolvedAlerts, setResolvedAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // active, resolved, all

    useEffect(() => {
        loadAlerts();
        
        // Set up WebSocket connection for real-time SOS alerts
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/ws';
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('token');
        
        if (userId && token) {
            const ws = new WebSocket(`${wsUrl}/admin/${userId}?token=${token}`);
            
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                
                if (message.event === 'sos_alert') {
                    // Play alert sound
                    playAlertSound();
                    
                    // Add to active alerts
                    const newAlert = {
                        id: message.data.ride_id,
                        rideId: message.data.ride_id,
                        userId: message.data.user_id,
                        userName: message.data.user_name,
                        userPhone: message.data.user_phone,
                        userRole: message.data.user_role,
                        message: message.data.message,
                        location: message.data.location,
                        rideDetails: message.data.ride_details,
                        timestamp: message.data.timestamp,
                        status: 'active'
                    };
                    
                    setActiveAlerts(prev => [newAlert, ...prev]);
                    
                    // Show browser notification
                    if (Notification.permission === 'granted') {
                        new Notification('🚨 EMERGENCY SOS ALERT', {
                            body: `${message.data.user_role.toUpperCase()}: ${message.data.user_name} needs help!`,
                            icon: '/alert-icon.png',
                            requireInteraction: true
                        });
                    }
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            return () => ws.close();
        }
    }, []);

    const loadAlerts = async () => {
        try {
            // Load SOS history from backend
            const response = await adminService.getSOSAlerts();
            setAlerts(response.data.alerts || []);
            setActiveAlerts(response.data.alerts?.filter(a => a.status === 'active') || []);
            setResolvedAlerts(response.data.alerts?.filter(a => a.status === 'resolved') || []);
        } catch (error) {
            console.error('Failed to load SOS alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const playAlertSound = () => {
        const audio = new Audio('/alert-sound.mp3');
        audio.play().catch(e => console.error('Failed to play alert sound:', e));
    };

    const handleResolve = async (alertId) => {
        try {
            await adminService.resolveSOSAlert(alertId);
            setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
            setResolvedAlerts(prev => [...prev, activeAlerts.find(a => a.id === alertId)]);
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const handleCall = (phone) => {
        window.location.href = `tel:${phone}`;
    };

    const openMap = (lat, lng) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    const displayedAlerts = filter === 'active' ? activeAlerts : 
                           filter === 'resolved' ? resolvedAlerts : 
                           [...activeAlerts, ...resolvedAlerts];

    if (loading) {
        return (
            <div className="page-shell">
                <div className="surface-card empty-state">Loading SOS alerts...</div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div className="page-heading">
                <div>
                    <span className="page-kicker">Emergency Response</span>
                    <h1 className="page-title">
                        SOS <span className="display-accent">Alerts</span>
                    </h1>
                    <p className="page-subtitle">
                        Real-time emergency alerts from riders and drivers
                    </p>
                </div>
            </div>

            {/* Alert Stats */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-6">
                <div className="surface-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Active Alerts</p>
                            <p className="text-3xl font-extrabold text-red-600 mt-2">{activeAlerts.length}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-full">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="surface-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Resolved Today</p>
                            <p className="text-3xl font-extrabold text-green-600 mt-2">{resolvedAlerts.length}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="surface-card p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Response Time</p>
                            <p className="text-3xl font-extrabold text-blue-600 mt-2">&lt; 2m</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex gap-8">
                    <button
                        onClick={() => setFilter('active')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            filter === 'active'
                                ? 'border-red-500 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Active ({activeAlerts.length})
                    </button>
                    <button
                        onClick={() => setFilter('resolved')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                            filter === 'resolved'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Resolved ({resolvedAlerts.length})
                    </button>
                </nav>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
                {displayedAlerts.length === 0 ? (
                    <div className="surface-card empty-state">
                        <p className="text-gray-500">No {filter} SOS alerts</p>
                    </div>
                ) : (
                    displayedAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`surface-card p-6 ${
                                alert.status === 'active' ? 'border-l-4 border-red-500 bg-red-50' : ''
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-full ${
                                            alert.status === 'active' ? 'bg-red-100' : 'bg-gray-100'
                                        }`}>
                                            <AlertTriangle className={`h-5 w-5 ${
                                                alert.status === 'active' ? 'text-red-600' : 'text-gray-600'
                                            }`} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {alert.userRole === 'rider' ? '🧑 Rider' : '🚗 Driver'} Emergency
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {formatDateTime(alert.timestamp)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm">
                                                <strong>{alert.userName}</strong> ({alert.userRole})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <button
                                                onClick={() => handleCall(alert.userPhone)}
                                                className="text-sm text-blue-600 hover:underline font-medium"
                                            >
                                                {alert.userPhone}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            <button
                                                onClick={() => openMap(alert.location.latitude, alert.location.longitude)}
                                                className="text-sm text-blue-600 hover:underline font-medium"
                                            >
                                                View on Map →
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Car className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm">
                                                Ride ID: {alert.rideId?.substring(0, 8)}...
                                            </span>
                                        </div>
                                    </div>

                                    {alert.message && (
                                        <div className="p-3 bg-white rounded-lg border border-gray-200 mb-4">
                                            <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                                        </div>
                                    )}

                                    <div className="text-xs text-gray-500">
                                        <strong>Pickup:</strong> {alert.rideDetails?.pickup} <br />
                                        <strong>Drop:</strong> {alert.rideDetails?.drop}
                                    </div>
                                </div>

                                <div className="ml-4 flex flex-col gap-2">
                                    {alert.status === 'active' && (
                                        <>
                                            <button
                                                onClick={() => handleCall(alert.userPhone)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                            >
                                                Call Now
                                            </button>
                                            <button
                                                onClick={() => handleResolve(alert.id)}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                                            >
                                                Mark Resolved
                                            </button>
                                        </>
                                    )}
                                    {alert.status === 'resolved' && (
                                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium text-center">
                                            ✓ Resolved
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SOSAlerts;
