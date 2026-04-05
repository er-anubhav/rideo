import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Switch, TouchableOpacity, View, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/CustomText';
import Map from '@/components/Map';
import RideRequestPanel from '@/features/ride/components/RideRequestPanel';
import { driverService, DriverProfile, DriverStats } from '@/features/dashboard/driver.service';
import { rideService, Ride } from '@/features/ride/ride.service';
import { notificationService, AppNotification } from '@/features/notifications/notification.service';
import { realtimeService } from '@/api/realtime.service';
import { userStorage } from '@/utils/storage';
import { appLogger } from '@/utils/app-logger';
import PermissionModal from '@/components/PermissionModal';
import { locationPulseService } from '@/api/location-pulse.service';

const DashboardScreen = () => {
    const router = useRouter();
    const [isOnline, setIsOnline] = useState(false);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [requestVisible, setRequestVisible] = useState(false);
    const [currentRide, setCurrentRide] = useState<Ride | null>(null);

    // Data states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const [stats, setStats] = useState<DriverStats | null>(null);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const radarAnim = useRef(new Animated.Value(0)).current;

    const [showPermissionModal, setShowPermissionModal] = useState(false);

    const handlePermissionGranted = async () => {
        setShowPermissionModal(false);
        try {
            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);
        } catch (e) {
            appLogger.warn('Could not fetch location after permission granted', e);
        }
    };

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [profileData, statsData] = await Promise.all([
                driverService.getProfile(),
                driverService.getStats()
            ]);
            setProfile(profileData);
            setStats(statsData);
            setIsOnline(profileData.isOnline);
            try {
                const latestNotifications = await notificationService.getNotifications();
                setNotifications(latestNotifications);
            } catch (notificationError) {
                appLogger.warn('Unable to refresh notifications for dashboard', notificationError);
            }
        } catch (error: any) {
            appLogger.error('Error fetching dashboard data', error);
            // Don't alert here to avoid annoying the user if it's just a background refresh
            if (showLoading) {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load dashboard data' });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(false);
    }, []);

    const toggleSwitch = async () => {
        const previousState = isOnline;
        // Optimistic update
        setIsOnline(!previousState);

        try {
            if (!previousState) {
                // Fetch current location for Go Online payload
                let lat = 0, lng = 0, bearing = 0;
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    lat = loc.coords.latitude;
                    lng = loc.coords.longitude;
                    bearing = loc.coords.heading || 0;
                } catch (locError) {
                    appLogger.warn('Failed to get precise location for goOnline, using defaults', locError);
                }

                await driverService.goOnline({
                    latitude: lat,
                    longitude: lng,
                    bearing: bearing,
                    deviceToken: 'placeholder-token' // TODO: Implement expo-notifications
                });
            } else {
                await driverService.goOffline();
            }
            // Success, fetch fresh data to sync
            fetchData(false);
        } catch (error: any) {
            // Revert state on error
            setIsOnline(previousState);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to update status' });
        }
    };

    useEffect(() => {
        fetchData();

        // Status Pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();

        // Get Location
        (async () => {
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                setShowPermissionModal(true);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        })();
    }, [pulseAnim]);

    useEffect(() => {
        if (isOnline) {
            locationPulseService.start();
            radarAnim.setValue(0);
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(radarAnim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(radarAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    })
                ])
            );
            animation.start();
            return () => {
                animation.stop();
                locationPulseService.stop();
            };
        } else {
            locationPulseService.stop();
            radarAnim.stopAnimation();
            radarAnim.setValue(0);
        }
    }, [isOnline, radarAnim]);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe = () => { };

        const subscribeToActiveRide = async () => {
            try {
                const user = await userStorage.get();
                if (!user?.id) return;

                const topic = `status/user/${user.id}/active-ride`;
                await realtimeService.connect();

                const handler = (payload: unknown) => {
                    if (!isMounted || !payload || typeof payload !== 'object') return;

                    const message = payload as { status?: Ride['status']; data?: Ride };
                    if (!message.status) return;

                    const knownStatuses: Ride['status'][] = ['MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
                    if (!knownStatuses.includes(message.status)) {
                        realtimeService.publish(`error/driver/${user.id}`, {
                            type: 'INCOMPATIBLE_STATE',
                            receivedStatus: message.status,
                            version: '1.0.0', // TODO: Use actual app version
                            timestamp: new Date().toISOString()
                        });
                        appLogger.warn('Unknown ride status received, reported to backend', message.status);
                        return;
                    }

                    if (message.status === 'MATCHED' && message.data) {
                        const rideId = message.data.id;
                        // P2 Fix: Subscribe immediately to avoid missing early status events
                        realtimeService.subscribe(`ride/${rideId}`, (rideUpdate) => {
                            appLogger.debug('Early ride update received on dashboard', rideUpdate);
                        });
                        
                        setCurrentRide(message.data);
                        setRequestVisible(true);
                        return;
                    }

                    if (
                        ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(message.status) &&
                        message.data
                    ) {
                        setCurrentRide(message.data);
                        setRequestVisible(false);
                        return;
                    }

                    if (['CANCELLED', 'COMPLETED', 'NO_DRIVERS_AVAILABLE'].includes(message.status)) {
                        setCurrentRide(null);
                        setRequestVisible(false);
                    }
                };

                realtimeService.subscribe(topic, handler);
                unsubscribe = () => realtimeService.unsubscribe(topic, handler);
            } catch (error) {
                appLogger.warn('Unable to subscribe to active ride status feed', error);
            }
        };

        subscribeToActiveRide();

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const syncMatchedRide = async () => {
            if (!isOnline) return;

            try {
                const upcoming = await rideService.getUpcomingRides();
                const matchedRide = upcoming.find((item) => item.status === 'MATCHED');
                if (matchedRide && !requestVisible) {
                    setCurrentRide(matchedRide);
                    setRequestVisible(true);
                }
            } catch (error) {
                appLogger.warn('Unable to sync upcoming rides', error);
            }
        };

        syncMatchedRide();
    }, [isOnline, requestVisible]);

    const handleAccept = async () => {
        if (!currentRide) return;

        try {
            const acceptedRide = await rideService.acceptRide(currentRide.id);
            setRequestVisible(false);
            router.push({
                pathname: '/ride/active',
                params: { ride: JSON.stringify(acceptedRide) }
            } as any);
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to accept ride' });
        }
    };

    const handleReject = async () => {
        if (!currentRide) {
            setRequestVisible(false);
            return;
        }

        try {
            await rideService.cancelRide(currentRide.id, 'Driver rejected request');
            setRequestVisible(false);
            setCurrentRide(null);
        } catch {
            setRequestVisible(false);
            setCurrentRide(null);
        }
    };

    const formatRelativeTime = (dateString: string) => {
        const now = Date.now();
        const then = new Date(dateString).getTime();
        const diff = Math.max(0, now - then);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getNotificationMeta = (type: string) => {
        switch (type) {
            case 'EMERGENCY':
                return { icon: 'warning', color: '#EF4444' };
            case 'RIDE':
                return { icon: 'local-taxi', color: '#2563EB' };
            case 'PROMO':
                return { icon: 'card-giftcard', color: '#9333EA' };
            default:
                return { icon: 'notifications', color: '#10B981' };
        }
    };

    const dashboardNotifications = notifications.slice(0, 4).map((notification) => {
        const meta = getNotificationMeta(notification.type);
        return {
            id: notification.id,
            title: notification.title,
            message: notification.body,
            time: formatRelativeTime(notification.createdAt),
            icon: meta.icon,
            color: meta.color,
        };
    });

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9333EA" />
                <Text style={styles.loadingText}>Loading Dashboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.avatar}
                            onPress={() => router.push('/dashboard/profile')}
                        >
                            <MaterialIcons name="person" size={30} color="#D1D5DB" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.welcomeText}>Welcome back,</Text>
                            <Text style={styles.userName}>{profile ? `${profile.firstName}` : "Driver"}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => router.push('/notifications' as any)}
                    >
                        <View style={styles.notificationIconContainer}>
                            <MaterialIcons name="notifications-none" size={26} color="#374151" />
                            <View style={styles.notificationBadge} />
                        </View>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9333EA']} />
                    }
                >
                    {/* Status Toggle Card */}
                    <LinearGradient
                        colors={isOnline ? ['#9333EA', '#7E22CE'] : ['#374151', '#1F2937']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}
                    >
                        <View style={styles.statusCardBg1} />
                        <View style={styles.statusCardBg2} />

                        <View style={styles.statusIcon}>
                            <MaterialIcons name={isOnline ? "wifi" : "wifi-off"} size={28} color="white" />
                        </View>

                        <Text style={styles.statusTitle}>
                            {isOnline ? 'You are Online' : 'You are Offline'}
                        </Text>
                        <Text style={styles.statusSubtitle}>
                            {isOnline ? 'Searching for nearby rides...' : 'Go online to start earning'}
                        </Text>

                        <View style={styles.switchContainer}>
                            <Switch
                                trackColor={{ false: "#6B7280", true: "#C084FC" }}
                                thumbColor={isOnline ? "#ffffff" : "#D1D5DB"}
                                ios_backgroundColor="#6B7280"
                                onValueChange={toggleSwitch}
                                value={isOnline}
                            />
                        </View>
                    </LinearGradient>

                    {/* Quick Stats */}
                    <View style={styles.statsHeader}>
                        <Text style={styles.statsTitle}>Today&apos;s Overview</Text>
                        <TouchableOpacity onPress={() => router.push('/dashboard/trips')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statsGrid}>
                        <TouchableOpacity
                            style={styles.statCard}
                            onPress={() => router.push('/dashboard/earnings')}
                        >
                            <View style={styles.statCardBg} />
                            <View style={styles.statIconContainer}>
                                <MaterialIcons name="attach-money" size={26} color="#059669" />
                            </View>
                            <Text style={styles.statLabel}>EARNINGS</Text>
                            <Text style={styles.statValue}>₹{stats?.today.earnings.toFixed(0) || '0'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.statCard}
                            onPress={() => router.push('/dashboard/trips')}
                        >
                            <View style={styles.statCardBg} />
                            <View style={styles.statIconContainer}>
                                <MaterialIcons name="local-taxi" size={26} color="#2563EB" />
                            </View>
                            <Text style={styles.statLabel}>TRIPS</Text>
                            <Text style={styles.statValue}>{stats?.today.trips || '0'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Live Map */}
                    <Text style={styles.sectionTitle}>Live Insights</Text>
                    <View style={styles.mapContainer}>
                        {location ? (
                            <Map
                                style={styles.map}
                                region={{
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                                showsUserLocation={true}
                                showsMyLocationButton={false}
                                showsCompass={false}
                                scrollEnabled={false}
                                zoomEnabled={false}
                                pitchEnabled={false}
                                rotateEnabled={false}
                            />
                        ) : (
                            <View style={styles.mapPlaceholder}>
                                <MaterialIcons name="location-off" size={24} color="#9CA3AF" />
                                <Text style={styles.mapPlaceholderText}>Fetching Location...</Text>
                            </View>
                        )}

                        {/* Radar Animation */}
                        {isOnline && (
                            <View style={styles.radarContainer}>
                                <Animated.View
                                    style={[
                                        styles.radarCircle1,
                                        {
                                            transform: [{ scale: radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }],
                                            opacity: radarAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.4, 0] })
                                        }
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        styles.radarCircle2,
                                        {
                                            transform: [{ scale: radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] }) }],
                                            opacity: radarAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] })
                                        }
                                    ]}
                                />
                            </View>
                        )}

                        <View style={styles.mapLabel}>
                            <Text style={styles.mapLabelText}>
                                {isOnline ? 'Scanning for rides near you...' : 'Go online to view heatmap'}
                            </Text>
                        </View>
                    </View>

                    {/* Recent Notifications */}
                    <Text style={styles.sectionTitle}>Recent Updates</Text>
                    <View style={styles.notificationsContainer}>
                        {dashboardNotifications.map((notif) => (
                            <TouchableOpacity key={notif.id} style={styles.notificationCard}>
                                <View style={[styles.notifIcon, { backgroundColor: `${notif.color}15` }]}>
                                    <MaterialIcons name={notif.icon as any} size={24} color={notif.color} />
                                </View>
                                <View style={styles.notifContent}>
                                    <View style={styles.notifHeader}>
                                        <Text style={styles.notifTitle}>{notif.title}</Text>
                                        <Text style={styles.notifTime}>{notif.time}</Text>
                                    </View>
                                    <Text style={styles.notifMessage}>{notif.message}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {dashboardNotifications.length === 0 && (
                            <View style={[styles.notificationCard, { justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={styles.notifMessage}>No recent notifications</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>

            {currentRide && (
                <RideRequestPanel
                    visible={requestVisible}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    tripDetails={{
                        pickup: currentRide.pickupAddress,
                        dropoff: currentRide.dropAddress,
                        fare: `₹${currentRide.totalFare || currentRide.fare}`,
                        distance: `${currentRide.estimatedDistance ? (currentRide.estimatedDistance / 1000).toFixed(1) : currentRide.distance} km`,
                        time: `${currentRide.estimatedDuration ? Math.ceil(currentRide.estimatedDuration / 60) : currentRide.estimatedDuration} min`,
                        rating: "4.9"
                    }}
                />
            )}

            <PermissionModal 
                visible={showPermissionModal}
                onGranted={handlePermissionGranted}
                onDeclined={() => setShowPermissionModal(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f6f8',
        position: 'relative',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7f6f8',
    },
    loadingText: {
        marginTop: 16,
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '500',
    },
    safeArea: {
        flex: 1,
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginBottom: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        height: 48,
        width: 48,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    welcomeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        letterSpacing: -0.3,
    },
    notificationButton: {
        height: 44,
        width: 44,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    notificationIconContainer: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 8,
        right: 10,
        height: 10,
        width: 10,
        backgroundColor: '#EF4444',
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    statusCard: {
        width: '100%',
        padding: 24,
        borderRadius: 32,
        marginBottom: 32,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    statusCardOnline: {
        shadowColor: '#9333EA',
    },
    statusCardOffline: {
        shadowColor: '#374151',
    },
    statusCardBg1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    statusCardBg2: {
        position: 'absolute',
        bottom: -40,
        left: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    statusIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statusTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    statusSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 24,
    },
    switchContainer: {
        transform: [{ scale: 1.3 }],
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#9333EA',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 36,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    statCardBg: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 80,
        height: 80,
        backgroundColor: '#F9FAFB',
        borderBottomLeftRadius: 64,
        marginRight: -32,
        marginTop: -32,
    },
    statIconContainer: {
        height: 44,
        width: 44,
        backgroundColor: '#F3F4F6',
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        zIndex: 10,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
        zIndex: 10,
    },
    statValue: {
        fontSize: 30,
        fontWeight: '500',
        color: '#111827',
        zIndex: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    mapContainer: {
        width: '100%',
        height: 208,
        borderRadius: 32,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F3F4F6',
    },
    map: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    mapPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E5E7EB',
    },
    mapPlaceholderText: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 8,
    },
    radarContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
    },
    radarCircle1: {
        position: 'absolute',
        width: 256,
        height: 256,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.5)',
        borderRadius: 128,
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
    },
    radarCircle2: {
        position: 'absolute',
        width: 256,
        height: 256,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
        borderRadius: 128,
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
    },
    mapLabel: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    mapLabelText: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 12,
        fontWeight: '600',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    notificationsContainer: {
        gap: 16,
        marginBottom: 32,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    notifIcon: {
        height: 48,
        width: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    notifContent: {
        flex: 1,
        paddingTop: 4,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notifTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    notifTime: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9CA3AF',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    notifMessage: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        lineHeight: 18,
    },
});

export default DashboardScreen;
