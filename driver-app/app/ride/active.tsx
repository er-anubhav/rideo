import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Linking, Platform, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { TextInput } from '@/components/CustomTextInput';
import { Text } from '@/components/CustomText';
import DriverMap from '@/components/DriverMap';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../../global.css';
import { MAPPLS_NAV_DEEPLINK_TEMPLATE, MAP_TILE_URL_TEMPLATE } from '@/constants/api';
import { authService } from '@/features/auth/auth.service';
import { driverControlService, DriverControlData } from '@/features/ride/driver-control.service';
import { Ride, rideService } from '@/features/ride/ride.service';
import { realtimeService } from '@/api/realtime.service';
import { locationPulseService } from '@/api/location-pulse.service';
import { appLogger } from '@/utils/app-logger';
import PermissionModal from '@/components/PermissionModal';

const { width, height } = Dimensions.get('window');

const ActiveRideScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const controlAlertLockRef = React.useRef(false);
    const lastControlEventRef = React.useRef<string | null>(null);

    // Parse ride data from navigation params
    const [ride, setRide] = useState<Ride | null>(null);
    const [loading, setLoading] = useState(false);
    const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [backendDriverLocation, setBackendDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [backendRouteCoordinates, setBackendRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
    const [routeDurationSeconds, setRouteDurationSeconds] = useState(0);
    const [routeDistanceMeters, setRouteDistanceMeters] = useState(0);

    useEffect(() => {
        if (!params.ride) return;

        try {
            const rideData = JSON.parse(params.ride as string);
            setRide(rideData);
        } catch (error) {
            appLogger.error('Error parsing ride data', error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Invalid ride data' });
            router.back();
        }
    }, [params.ride, router]);

    useEffect(() => {
        if (!ride?.id) return;

        const commandTopic = `ride/${ride.id}`;
        const routeTopic = `status/ride/${ride.id}/route`;
        const locationTopic = `status/ride/${ride.id}/location`;
        let isActive = true;

        const bootstrapRealtime = async () => {
            try {
                await realtimeService.connect();
                if (!isActive) return;

                const applyRouteSnapshot = (payload: any) => {
                    const data = payload?.data || payload;
                    const coordinates = (data?.coordinates || data?.route?.coordinates || [])
                        .map((coord: any) => ({
                            latitude: Number(coord.latitude ?? coord.lat),
                            longitude: Number(coord.longitude ?? coord.lng),
                        }))
                        .filter((coord: { latitude: number; longitude: number }) =>
                            Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude),
                        );

                    if (coordinates.length > 1) {
                        setBackendRouteCoordinates(coordinates);
                    }

                    const duration = Number(data?.durationSeconds || data?.route?.durationSeconds || 0);
                    if (Number.isFinite(duration) && duration > 0) {
                        setRouteDurationSeconds(duration);
                    }

                    const distance = Number(data?.distanceMeters || data?.route?.distanceMeters || 0);
                    if (Number.isFinite(distance) && distance > 0) {
                        setRouteDistanceMeters(distance);
                    }
                };

                realtimeService.subscribe(commandTopic, (payload: unknown) => {
                    setLoading(false);
                    if (!payload || typeof payload !== 'object') return;

                    const eventPayload = payload as {
                        event?: string;
                        data?: Partial<Ride>;
                    };

                    const knownEvents = [
                        'ride_matched',
                        'ride_accepted',
                        'ride_arrived',
                        'ride_started',
                        'ride_completed', 
                        'ride_cancelled', 
                        'status_update', 
                        'location_update'
                    ];
                    if (eventPayload.event && !knownEvents.includes(eventPayload.event)) {
                        realtimeService.publish(`error/driver/${ride.driverId}`, {
                            type: 'INCOMPATIBLE_EVENT',
                            receivedEvent: eventPayload.event,
                            version: '1.0.0',
                            timestamp: new Date().toISOString()
                        });
                        appLogger.warn('Unknown ride event received, reported to backend', eventPayload.event);
                        return;
                    }

                    if (eventPayload.event === 'ride_completed') {
                        router.push('/ride/payment');
                    }

                    if (eventPayload.data) {
                        setRide((previousRide) => {
                            if (!previousRide) return previousRide;
                            return { ...previousRide, ...eventPayload.data };
                        });
                    }
                });

                realtimeService.subscribe(routeTopic, (payload: unknown) => {
                    if (!payload || typeof payload !== 'object') return;
                    applyRouteSnapshot(payload);
                });

                realtimeService.subscribe(locationTopic, (payload: unknown) => {
                    if (!payload || typeof payload !== 'object') return;
                    const data = payload as {
                        data?: {
                            smoothed?: { lat?: number; lng?: number; latitude?: number; longitude?: number };
                        };
                    };
                    const location = data.data?.smoothed;
                    const lat = Number(location?.lat ?? location?.latitude);
                    const lng = Number(location?.lng ?? location?.longitude);
                    if (Number.isFinite(lat) && Number.isFinite(lng)) {
                        setBackendDriverLocation({ latitude: lat, longitude: lng });
                    }
                });

                rideService.getRideRoute(ride.id)
                    .then((snapshot) => {
                        if (!isActive) return;
                        applyRouteSnapshot(snapshot);
                    })
                    .catch((error) => {
                        appLogger.warn('Unable to fetch initial ride route snapshot', error);
                    });
            } catch (error) {
                appLogger.warn('Unable to initialize realtime feed for active ride', error);
            }
        };

        bootstrapRealtime();

        return () => {
            isActive = false;
            realtimeService.unsubscribe(commandTopic);
            realtimeService.unsubscribe(routeTopic);
            realtimeService.unsubscribe(locationTopic);
        };
    }, [ride?.id, router]);

    const enforceDriverControl = React.useCallback(
        async (controlData: DriverControlData) => {
            const eventKey = controlData.timestamp || `${controlData.reason || 'control'}-${Date.now()}`;
            if (lastControlEventRef.current === eventKey) return;
            lastControlEventRef.current = eventKey;

            const requiresExit =
                !!controlData.forceLogout ||
                controlData.isBlocked === true ||
                controlData.isActive === false ||
                (controlData.verificationStatus && controlData.verificationStatus !== 'APPROVED');

            if (!requiresExit || controlAlertLockRef.current) return;

            controlAlertLockRef.current = true;
            const reason = controlData.reason || 'Your account status was updated by super admin.';
            Alert.alert(
                'Session Ended',
                reason,
                [
                    {
                        text: 'OK',
                        onPress: async () => {
                            controlAlertLockRef.current = false;
                            await authService.logout();
                            router.replace('/welcome');
                        },
                    },
                ],
                { cancelable: false },
            );
        },
        [router],
    );

    useEffect(() => {
        let unsubscribe = () => { };
        let active = true;

        const bootstrapDriverControl = async () => {
            try {
                unsubscribe = await driverControlService.subscribe((controlData) => {
                    if (!active) return;
                    enforceDriverControl(controlData);
                });
            } catch (error) {
                appLogger.warn('Failed to subscribe to driver control updates in active ride', error);
            }
        };

        bootstrapDriverControl();

        return () => {
            active = false;
            unsubscribe();
        };
    }, [enforceDriverControl]);

    useEffect(() => {
        let locationSubscription: Location.LocationSubscription | null = null;
        let active = true;

        const startLocationTracking = async () => {
            try {
                let permission = await Location.getForegroundPermissionsAsync();
                if (permission.status !== 'granted') {
                    setShowPermissionModal(true);
                    return;
                }

                const current = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                if (active) {
                    setDriverLocation({
                        latitude: current.coords.latitude,
                        longitude: current.coords.longitude,
                    });
                }

                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 4000,
                        distanceInterval: 8,
                    },
                    (position) => {
                        const nextLocation = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        };

                        setDriverLocation(nextLocation);

                        if (ride?.id) {
                            realtimeService.publish(`cmd/ride/${ride.id}/location`, {
                                lat: nextLocation.latitude,
                                lng: nextLocation.longitude,
                                accuracy: position.coords.accuracy ?? undefined,
                                heading: position.coords.heading ?? undefined,
                                speed: position.coords.speed ?? undefined,
                            });
                        }
                    },
                );
            } catch (error) {
                appLogger.warn('Unable to start location tracking for active ride', error);
            }
        };

        startLocationTracking();

        return () => {
            active = false;
            locationSubscription?.remove();
        };
    }, [ride?.id]);

    // Fallback if location permission is denied or GPS is not available
    const fallbackDriverLocation = React.useMemo(() => {
        return (ride && ride.pickupLat && ride.pickupLng)
            ? { latitude: Number(ride.pickupLat) - 0.001, longitude: Number(ride.pickupLng) - 0.001 }
            : { latitude: 28.6129, longitude: 77.2295 };
    }, [ride]);

    const resolvedDriverLocation = backendDriverLocation || driverLocation || fallbackDriverLocation;

    const pickupLocation = React.useMemo(() => {
        return (ride && ride.pickupLat && ride.pickupLng)
            ? { latitude: Number(ride.pickupLat), longitude: Number(ride.pickupLng) }
            : { latitude: 28.6139, longitude: 77.2090 };
    }, [ride]);

    const dropoffLocation = React.useMemo(() => {
        return (ride && ride.dropLat && ride.dropLng)
            ? { latitude: Number(ride.dropLat), longitude: Number(ride.dropLng) }
            : { latitude: 28.6200, longitude: 77.2100 };
    }, [ride]);

    const [showArriveModal, setShowArriveModal] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [otpInput, setOtpInput] = useState('');

    // Determine ride status from ride data
    const rideStatus = React.useMemo(() => {
        if (!ride) return 'pickup';
        if (ride.status === 'IN_PROGRESS') return 'ongoing';
        if (ride.status === 'DRIVER_ARRIVED') return 'ready';
        return 'pickup';
    }, [ride]);

    const openGoogleMaps = async () => {
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const location = rideStatus === 'ongoing' ? dropoffLocation : pickupLocation;
        const lat = location.latitude;
        const lng = location.longitude;
        const label = rideStatus === 'ongoing' ? 'Dropoff Location' : 'Pickup Location';
        const encodedLabel = encodeURIComponent(label);

        const templateUrl = MAPPLS_NAV_DEEPLINK_TEMPLATE
            ? MAPPLS_NAV_DEEPLINK_TEMPLATE
                .replace('{lat}', String(lat))
                .replace('{lng}', String(lng))
                .replace('{label}', encodedLabel)
            : null;

        const mapplsFallbackUrl = `mappls://navigation?dlat=${lat}&dlng=${lng}&dname=${encodedLabel}`;

        const nativeUrl = Platform.select({
            ios: `${scheme}?q=${label}&ll=${lat},${lng}`,
            android: `${scheme}0,0?q=${lat},${lng}(${label})`,
        });

        try {
            if (templateUrl && await Linking.canOpenURL(templateUrl)) {
                await Linking.openURL(templateUrl);
                return;
            }

            if (await Linking.canOpenURL(mapplsFallbackUrl)) {
                await Linking.openURL(mapplsFallbackUrl);
                return;
            }

            if (nativeUrl) {
                await Linking.openURL(nativeUrl);
            }
        } catch (error) {
            appLogger.warn('Failed to open external navigation app', error);
        }
    };

    const handleArriveAtPickup = async () => {
        if (!ride) return;

        setLoading(true);
        try {
            const updatedRide = await rideService.arriveAtPickup(ride.id);
            setRide((previousRide) => previousRide ? { ...previousRide, ...updatedRide } : updatedRide);
            setShowArriveModal(false);
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to update ride status' });
        } finally {
            setLoading(false);
        }
    };

    const handleStartRide = async () => {
        if (!ride) return;

        // Verify OTP matches
        if (otpInput !== ride.otp) {
            Toast.show({ type: 'error', text1: 'Incorrect OTP', text2: 'Please enter the correct OTP from the passenger.' });
            return;
        }

        setLoading(true);
        try {
            const updatedRide = await rideService.startRide(ride.id, otpInput);
            setRide((previousRide) => previousRide ? { ...previousRide, ...updatedRide } : updatedRide);
            setShowOtpModal(false);
            setOtpInput('');
            
            // FIX: Start ride tracking for accurate distance calculation
            locationPulseService.startRideTracking(ride.id);
            appLogger.info('Ride tracking started for ride:', ride.id);
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to start ride' });
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteRide = async () => {
        if (!ride) return;

        setLoading(true);
        try {
            // FIX: Stop ride tracking before completing
            locationPulseService.stopRideTracking();
            appLogger.info('Ride tracking stopped for ride:', ride.id);
            
            await rideService.completeRide(ride.id);
            setRide((previousRide) => previousRide ? { ...previousRide, status: 'COMPLETED' } : previousRide);
            router.replace('/ride/payment');
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to complete ride' });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRide = async () => {
        if (!ride) return;

        Alert.alert(
            'Cancel Ride',
            'Are you sure you want to cancel this ride?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await rideService.cancelRide(ride.id, 'Driver cancelled');
                            setRide((previousRide) => previousRide ? { ...previousRide, status: 'CANCELLED' } : previousRide);
                            router.replace('/dashboard');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to cancel ride');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSos = async () => {
        if (!ride) return;

        Alert.alert(
            'Emergency SOS',
            'This will instantly alert super admins and operations. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send SOS',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const response = await rideService.sendSos(ride.id, {
                                message: 'Driver triggered SOS from active ride screen',
                                latitude: resolvedDriverLocation.latitude,
                                longitude: resolvedDriverLocation.longitude,
                            });

                            Alert.alert(
                                'SOS Sent',
                                `Emergency alert delivered to ${response.notifiedAdmins} admin(s).`,
                            );
                        } catch (error: any) {
                            Alert.alert('SOS Failed', error?.message || 'Unable to send emergency alert');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ],
        );
    };

    if (!ride) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#9333EA" />
                <Text className="mt-4 text-gray-600">Loading ride details...</Text>
            </View>
        );
    }
    const destination = rideStatus === 'ongoing' ? dropoffLocation : pickupLocation;
    const fallbackRouteCoordinates = [
        resolvedDriverLocation,
        destination,
    ];
    const routeCoordinates = backendRouteCoordinates.length > 1
        ? backendRouteCoordinates
        : fallbackRouteCoordinates;
    const pickupLabel = (ride.pickupAddress || 'Pickup').split(',')[0].trim();
    const dropoffLabel = (ride.dropAddress || 'Dropoff').split(',')[0].trim();
    const displayDurationMinutes = routeDurationSeconds > 0
        ? Math.max(1, Math.round(routeDurationSeconds / 60))
        : Math.max(0, Math.round(Number(ride.estimatedDuration || 0) / 60));
    const displayDistanceKm = routeDistanceMeters > 0
        ? routeDistanceMeters / 1000
        : Number((ride.distance || (ride.estimatedDistance ? ride.estimatedDistance / 1000 : 0)) || 0);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* Map */}
            <DriverMap
                style={{ width, height }}
                region={{
                    latitude: resolvedDriverLocation.latitude,
                    longitude: resolvedDriverLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                location={{
                    coords: {
                        latitude: pickupLocation.latitude,
                        longitude: pickupLocation.longitude,
                    },
                }}
                destination={{
                    lat: destination.latitude,
                    lon: destination.longitude,
                    name: rideStatus === 'ongoing' ? dropoffLabel : pickupLabel,
                }}
                driverLocation={resolvedDriverLocation}
                routeCoordinates={routeCoordinates}
                tileUrlTemplate={MAP_TILE_URL_TEMPLATE}
                mapplsRestKey={process.env.EXPO_PUBLIC_MAPPLS_REST_KEY}
                interactive
            />

            {/* SOS / Emergency Button */}
            <SafeAreaView className="absolute top-8 right-6 z-50 pointer-events-none" edges={['top']}>
                <TouchableOpacity
                    className="w-11 h-11 bg-white rounded-full items-center justify-center shadow-xl shadow-red-500/30 border border-red-100 active:scale-95 pointer-events-auto"
                    onPress={handleSos}
                >
                    <View className="w-full h-full rounded-full items-center justify-center bg-red-50">
                        <MaterialIcons name="sos" size={24} color="#EF4444" />
                    </View>
                </TouchableOpacity>
            </SafeAreaView>

            {/* Dynamic Island Location Header */}
            <SafeAreaView className="absolute top-8 w-full items-center z-50 pointer-events-none" edges={['top']}>
                <View className="bg-white px-6 py-3.5 rounded-full flex-row items-center gap-4 shadow-2xl shadow-black/40 border border-white/10 pointer-events-auto">

                    {/* Pickup Section */}
                    <View className={`flex-row items-center gap-2 ${rideStatus === 'ongoing' ? 'opacity-40' : 'opacity-100'} transition-opacity`}>
                        <View className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        <Text className="text-[11px] font-bold font-display tracking-wide max-w-[90px]" numberOfLines={1}>
                            {pickupLabel}
                        </Text>
                    </View>

                    {/* Animated Divider/Arrow */}
                    <View className="flex-row items-center opacity-40">
                        <MaterialIcons name="chevron-right" size={16} color="black" />
                    </View>

                    {/* Dropoff Section */}
                    <View className={`flex-row items-center gap-2 ${rideStatus === 'ongoing' ? 'opacity-100' : 'opacity-40'} transition-opacity`}>
                        <View className="w-2 h-2 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                        <Text className="text-[11px] font-bold font-display tracking-wide max-w-[90px]" numberOfLines={1}>
                            {dropoffLabel}
                        </Text>
                    </View>

                </View>
            </SafeAreaView>

            {/* Bottom Sheet - Compact & Optimized */}
            <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-[0_-10px_50px_rgba(0,0,0,0.1)] p-5 pb-8 border-t border-gray-50">
                {/* Drag Indicator */}
                <View className="items-center mb-4">
                    <View className="w-10 h-1 bg-gray-200 rounded-full opacity-60" />
                </View>

                {/* Passenger Info & Actions Row */}
                <View className="flex-row items-center justify-between mb-6">
                    {/* Passenger Profile */}
                    <View className="flex-row items-center gap-3 flex-1">
                        <View className="w-14 h-14 bg-gray-50 rounded-full items-center justify-center border border-purple-100 shadow-sm p-0.5">
                            <View className="w-full h-full bg-white rounded-full items-center justify-center overflow-hidden">
                                <Ionicons name="person" size={24} color="#9CA3AF" />
                            </View>
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-bold font-display text-gray-900 tracking-tight" numberOfLines={1}>Passenger</Text>
                            <View className="flex-row items-center gap-2 mt-0.5">
                                <View className="bg-amber-50 px-1.5 py-0.5 rounded flex-row items-center gap-1 border border-amber-100">
                                    <MaterialIcons name="star" size={10} color="#D97706" />
                                    <Text className="text-amber-700 font-bold text-[10px]">{ride.rider?.rating?.toFixed(1) || '5.0'}</Text>
                                </View>
                                <Text className="text-gray-400 font-medium text-[10px] uppercase tracking-wide">Cash Trip</Text>
                            </View>
                        </View>
                    </View>

                    {/* Actions: Chat, Call, Navigate */}
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => router.push('/ride/chat')}
                            className="w-11 h-11 bg-gray-50 rounded-xl items-center justify-center border border-gray-100 active:scale-95"
                        >
                            <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity className="w-11 h-11 bg-emerald-50 rounded-xl items-center justify-center border border-emerald-100 active:scale-95">
                            <Ionicons name="call-outline" size={20} color="#10B981" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={openGoogleMaps}
                            className="w-11 h-11 bg-blue-50 rounded-xl items-center justify-center border border-blue-100 active:scale-95 shadow-sm shadow-blue-500/20"
                        >
                            <MaterialIcons name="navigation" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Trip Route Details - Full Addresses */}
                <View className="mb-6 px-1 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mt-2">
                    {/* Pickup */}
                    <View className={`flex-row items-start gap-3 relative ${rideStatus === 'ongoing' ? 'opacity-40' : 'opacity-100'} transition-opacity`}>
                        {/* Timeline Line */}
                        <View className="absolute left-[5px] top-3 bottom-[-16px] w-[2px] bg-gray-200" />

                        <View className="mt-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm z-10" />
                        <View className="flex-1 mb-4">
                            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Pickup Point</Text>
                            <Text className="text-sm font-bold text-gray-900 font-display leading-snug">
                                {ride.pickupAddress}
                            </Text>
                        </View>
                    </View>

                    {/* Dropoff */}
                    <View className={`flex-row items-start gap-3 ${rideStatus === 'ongoing' ? 'opacity-100' : 'opacity-40'} transition-opacity`}>
                        <View className="mt-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm z-10" />
                        <View className="flex-1">
                            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Dropoff Point</Text>
                            <Text className="text-sm font-bold text-gray-900 font-display leading-snug">
                                {ride.dropAddress}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Trip Info Grid - Compact */}
                <View className="flex-row gap-2.5 mb-6">
                    <View className="flex-1 bg-gray-50 py-3 px-2 rounded-2xl border border-gray-100 items-center justify-center">
                        <Text className="text-gray-400 text-[9px] font-bold uppercase mb-0.5 tracking-wider">Time</Text>
                        <Text className="text-lg font-extrabold text-gray-900 font-display">{displayDurationMinutes} <Text className="text-[10px] text-gray-500 font-bold">min</Text></Text>
                    </View>
                    <View className="flex-1 bg-gray-50 py-3 px-2 rounded-2xl border border-gray-100 items-center justify-center">
                        <Text className="text-gray-400 text-[9px] font-bold uppercase mb-0.5 tracking-wider">Dist</Text>
                        <Text className="text-lg font-extrabold text-gray-900 font-display">
                            {displayDistanceKm.toFixed(1)} <Text className="text-[10px] text-gray-500 font-bold">km</Text>
                        </Text>
                    </View>
                    <View className="flex-1 bg-[#F5F3FF] py-3 px-2 rounded-2xl border border-[#ede9fe] items-center justify-center relative overflow-hidden">
                        <View className="absolute -right-3 -top-3 w-8 h-8 bg-[#8b5cf6] rounded-full opacity-10" />
                        <Text className="text-[#8b5cf6] text-[9px] font-bold uppercase mb-0.5 tracking-wider">Fare</Text>
                        <Text className="text-lg font-extrabold text-[#7C3aED] font-display">₹{Number(ride.fare || ride.totalFare || 0).toFixed(0)}</Text>
                    </View>
                </View>

                {/* Dynamic Action Button based on Ride Status */}
                {rideStatus === 'pickup' && (
                    <TouchableOpacity
                        className="w-full active:scale-[0.98] shadow-lg shadow-[#7C3aED]/20 rounded-full"
                        onPress={() => setShowArriveModal(true)}
                    >
                        <LinearGradient
                            colors={['#7C3aED', '#6D28D9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="w-full h-14 flex-row items-center justify-between px-2"
                            style={{ borderRadius: 9999 }}
                        >
                            <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center ml-0.5">
                                <MaterialIcons name="keyboard-arrow-right" size={24} color="white" />
                            </View>
                            <Text className="text-white font-bold text-base font-display uppercase tracking-widest flex-1 text-center pr-10">Swipe to Arrive</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {rideStatus === 'ready' && (
                    <View className="w-full gap-3">
                        <TouchableOpacity
                            className="w-full active:scale-[0.98] shadow-lg shadow-emerald-500/20 rounded-full"
                            onPress={() => setShowOtpModal(true)}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']} // Emerald Gradient
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                className="w-full h-14 flex-row items-center justify-center gap-2"
                                style={{ borderRadius: 9999 }}
                            >
                                <MaterialIcons name="play-arrow" size={24} color="white" />
                                <Text className="text-white font-bold text-base font-display uppercase tracking-widest">Start Trip</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleCancelRide}
                            disabled={loading}
                            className="w-full py-3 rounded-full items-center active:bg-red-50"
                        >
                            <Text className="text-red-500 font-bold font-display uppercase tracking-wider text-xs">Cancel Ride</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {rideStatus === 'ongoing' && (
                    <TouchableOpacity
                        className="w-full active:scale-[0.98] shadow-lg shadow-red-500/20 rounded-full"
                        onPress={handleCompleteRide}
                    >
                        <LinearGradient
                            colors={['#EF4444', '#DC2626']} // Red Gradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="w-full h-14 flex-row items-center justify-between px-2"
                            style={{ borderRadius: 9999 }}
                        >
                            <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center ml-0.5">
                                <MaterialIcons name="check" size={24} color="white" />
                            </View>
                            <Text className="text-white font-bold text-base font-display uppercase tracking-widest flex-1 text-center pr-10">Complete Ride</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {/* Custom Arrival Confirmation Modal */}
            {showArriveModal && (
                <View className="absolute inset-0 z-50 items-center justify-center bg-black/60 backdrop-blur-sm p-6">
                    <View className="bg-white w-full max-w-sm rounded-[2rem] p-6 items-center shadow-2xl scale-100">
                        <View className="w-16 h-16 bg-[#F5F3FF] rounded-full items-center justify-center mb-4 border border-[#ede9fe]">
                            <MaterialIcons name="verified" size={32} color="#7C3aED" />
                        </View>

                        <Text className="text-xl font-bold text-gray-900 font-display mb-2 text-center">Arrived at Pickup?</Text>
                        <Text className="text-sm text-gray-500 font-display text-center mb-8 px-4 leading-relaxed">
                            Confirm that you have reached the pickup location and are ready to wait for the passenger.
                        </Text>

                        <View className="w-full gap-3">
                            <TouchableOpacity
                                onPress={handleArriveAtPickup}
                                disabled={loading}
                                className="w-full"
                            >
                                <LinearGradient
                                    colors={['#7C3aED', '#6D28D9']}
                                    className="w-full py-4 rounded-xl items-center shadow-lg shadow-purple-500/20"
                                    style={{ borderRadius: 12 }}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text className="text-white font-bold font-display tracking-widest uppercase text-sm">Yes, I&apos;m Here</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowArriveModal(false)}
                                className="w-full py-4 rounded-xl items-center border border-gray-100 bg-gray-50 active:bg-gray-100"
                            >
                                <Text className="text-gray-500 font-bold font-display tracking-widest uppercase text-sm">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* OTP Verification Modal */}
            {showOtpModal && (
                <View className="absolute inset-0 z-50 items-center justify-center bg-black/60 backdrop-blur-sm p-6">
                    <View className="bg-white w-full max-w-sm rounded-[2rem] p-6 items-center shadow-2xl scale-100">
                        <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-4 border border-emerald-100">
                            <MaterialIcons name="lock-outline" size={32} color="#10B981" />
                        </View>

                        <Text className="text-xl font-bold text-gray-900 font-display mb-2 text-center">Enter OTP</Text>
                        <Text className="text-sm text-gray-500 font-display text-center mb-6 px-4 leading-relaxed">
                            Ask the passenger for the 4-digit PIN to start the ride.
                        </Text>

                        {/* OTP Input */}
                        <TextInput
                            className="bg-gray-50 border border-gray-200 rounded-2xl w-full p-4 text-center text-3xl font-bold tracking-[12px] text-gray-900 mb-8 font-display"
                            keyboardType="number-pad"
                            maxLength={4}
                            value={otpInput}
                            onChangeText={setOtpInput}
                            placeholder="••••"
                            placeholderTextColor="#D1D5DB"
                            autoFocus
                        />

                        <View className="w-full gap-3">
                            <TouchableOpacity
                                onPress={handleStartRide}
                                disabled={loading}
                                className="w-full"
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    className="w-full py-4 rounded-xl items-center shadow-lg shadow-emerald-500/20"
                                    style={{ borderRadius: 12 }}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text className="text-white font-bold font-display tracking-widest uppercase text-sm">Verify & Start</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setShowOtpModal(false);
                                    setOtpInput('');
                                }}
                                className="w-full py-4 rounded-xl items-center border border-gray-100 bg-gray-50 active:bg-gray-100"
                            >
                                <Text className="text-gray-500 font-bold font-display tracking-widest uppercase text-sm">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            <PermissionModal 
                visible={showPermissionModal}
                onGranted={() => setShowPermissionModal(false)}
                onDeclined={() => {
                    setShowPermissionModal(false);
                    Toast.show({ type: 'error', text1: 'Permission Required', text2: 'Please enable location to track this ride.' });
                }}
            />
        </View>
    );
};

export default ActiveRideScreen;
