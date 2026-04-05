import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '@/components/Map';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rideService } from '@/features/booking/rideService';
import { realtimeService } from '@/features/ride/realtime.service';

const safeGetProp = (obj, key) => {
    try {
        return obj?.[key];
    } catch {
        return undefined;
    }
};

const InRideScreen = (props = {}) => {
    const navigation = safeGetProp(props, 'navigation');
    const route = safeGetProp(props, 'route') || {};
    const routeParams = route?.params || {};
    const rideRequest = routeParams.rideRequest || null;
    const initialSearching = Boolean(routeParams.isSearching);
    const routeRideId = routeParams.rideId || null;

    const navigateTo = useCallback((screen, params) => {
        if (navigation && typeof navigation.navigate === 'function') {
            navigation.navigate(screen, params);
        }
    }, [navigation]);

    const [ride, setRide] = useState(null);
    const [isSearching, setIsSearching] = useState(initialSearching);
    const [rideStatus, setRideStatus] = useState('SEARCHING');
    const [activeRideId, setActiveRideId] = useState(routeRideId);
    const [isCancelling, setIsCancelling] = useState(false);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeEtaSeconds, setRouteEtaSeconds] = useState(0);
    const [liveDriverLocation, setLiveDriverLocation] = useState(null);

    useEffect(() => {
        let unsubRide = null;
        let unsubDiscovery = null;
        let unsubRoute = null;
        let unsubLocation = null;

        const handleStatusUpdate = (payload) => {
            const data = payload?.data || payload;
            const status = payload?.status || data?.status;
            const id = payload?.id || data?.id || payload?.rideId || routeRideId || null;

            // If we're getting an update from the discovery topic, it might contain the rideId
            if (id && id !== activeRideId) {
                setActiveRideId(id);
                // Switch to specific ride channel
                if (unsubRide) unsubRide();
                unsubRide = rideService.subscribeToRide(id, handleStatusUpdate);
            }

            setRide(data);
            if (status) {
                setRideStatus(status);
            }
            if (id) {
                setActiveRideId(id);
            }

            if (status && !['SEARCHING', 'REQUESTED'].includes(status)) {
                setIsSearching(false);
            }

            if (status === 'COMPLETED') {
                Alert.alert('Ride Completed', 'Your ride has ended. Hope you had a great trip!', [
                    { text: 'OK', onPress: () => navigateTo('Home') }
                ]);
            }

            if (status === 'CANCELLED') {
                Alert.alert('Ride Cancelled', 'The ride was cancelled.', [
                    { text: 'OK', onPress: () => navigateTo('Home') }
                ]);
            }
        };

        const handleRouteUpdate = (payload) => {
            const data = payload?.data || payload;
            const coordinates = (data?.coordinates || data?.route?.coordinates || [])
                .map((coord) => ({
                    latitude: Number(coord.latitude ?? coord.lat),
                    longitude: Number(coord.longitude ?? coord.lng),
                }))
                .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude));

            if (coordinates.length > 0) {
                setRouteCoordinates(coordinates);
            }

            const durationSeconds = Number(data?.durationSeconds || data?.route?.durationSeconds || 0);
            if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
                setRouteEtaSeconds(durationSeconds);
            }
        };

        const handleLocationUpdate = (payload) => {
            const data = payload?.data || payload;
            const smoothed = data?.smoothed || data?.location;
            const lat = Number(smoothed?.lat ?? smoothed?.latitude);
            const lng = Number(smoothed?.lng ?? smoothed?.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                setLiveDriverLocation({ lat, lng });
            }
        };

        const init = async () => {
            await realtimeService.connect().catch(() => { });
            const storedUser = await AsyncStorage.getItem('userData');
            if (storedUser) {
                const user = JSON.parse(storedUser);

                // If we don't have a ride ID, listen for discovery
                if (!routeRideId && !activeRideId) {
                    unsubDiscovery = rideService.subscribeToActiveRide(user.id, handleStatusUpdate);
                }
            }
        };

        init();

        if (activeRideId) {
            unsubRide = rideService.subscribeToRide(activeRideId, handleStatusUpdate);
            unsubRoute = rideService.subscribeToRideRoute(activeRideId, handleRouteUpdate);
            unsubLocation = rideService.subscribeToRideLocation(activeRideId, handleLocationUpdate);
            rideService.getRideRoute(activeRideId)
                .then(handleRouteUpdate)
                .catch(() => { });
        }

        return () => {
            if (unsubRide) unsubRide();
            if (unsubDiscovery) unsubDiscovery();
            if (unsubRoute) unsubRoute();
            if (unsubLocation) unsubLocation();
        };
    }, [activeRideId, navigateTo, routeRideId]);

    const handleCancelRide = async () => {
        if (!activeRideId) {
            navigateTo('Home');
            return;
        }

        setIsCancelling(true);
        try {
            await rideService.cancelRide(activeRideId, 'Cancelled by rider');
            navigateTo('Home');
        } catch (error) {
            Alert.alert(
                'Cancellation Failed',
                error.response?.data?.message || 'Unable to cancel the ride right now.'
            );
        } finally {
            setIsCancelling(false);
        }
    };

    // Format time/ETA
    const eta = routeEtaSeconds > 0
        ? `${Math.max(1, Math.round(routeEtaSeconds / 60))} min`
        : (ride?.eta || '12 min');
    const arrivalTime = ride?.arrivalTime || '10:45 PM';
    const driverLocation = liveDriverLocation || (ride?.driverLocation
        ? { lat: Number(ride.driverLocation.lat), lng: Number(ride.driverLocation.lng) }
        : null);

    return (
        <View className="flex-1 bg-white relative">
            <StatusBar style="dark" />

            {/* Map Background */}
            <View className="absolute inset-0 z-0">
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={{ width: '100%', height: '65%' }}
                    initialRegion={{
                        latitude: rideRequest?.pickupLat || 12.9716,
                        longitude: rideRequest?.pickupLng || 77.5946,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    {routeCoordinates.length > 1 && (
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor="#7E22CE"
                            strokeWidth={4}
                        />
                    )}

                    {/* Pickup Marker */}
                    <Marker coordinate={{
                        latitude: rideRequest?.pickupLat || 12.9716,
                        longitude: rideRequest?.pickupLng || 77.5946
                    }}>
                        <View className="bg-white p-1 rounded-full shadow-md border border-purple-100">
                            <MaterialIcons name="location-pin" size={20} color="#9333EA" />
                        </View>
                    </Marker>

                    {/* Drop Marker */}
                    <Marker coordinate={{
                        latitude: rideRequest?.dropLat || 12.2958,
                        longitude: rideRequest?.dropLng || 76.6394
                    }}>
                        <View className="bg-black p-1 rounded-full shadow-md">
                            <MaterialIcons name="flag" size={20} color="white" />
                        </View>
                    </Marker>

                    {/* Driver Marker (only if matched) */}
                    {driverLocation && (
                        <Marker coordinate={{
                            latitude: driverLocation.lat,
                            longitude: driverLocation.lng
                        }}>
                            <View className="bg-purple-900 p-1 rounded-full shadow-xl border-2 border-white">
                                <MaterialIcons name="directions-car" size={24} color="white" />
                            </View>
                        </Marker>
                    )}
                </MapView>

                <View className="absolute inset-x-0 bottom-[35%] h-40 bg-gradient-to-b from-transparent to-white pointer-events-none" />
            </View>

            {/* Header */}
            <SafeAreaView className="z-10 w-full px-4 items-center">
                {isSearching ? (
                    <View className="bg-white border border-gray-200 shadow-xl px-8 py-4 rounded-full flex-row items-center gap-4">
                        <ActivityIndicator color="#9333EA" />
                        <Text className="text-gray-900 font-bold font-display">Finding you a ride...</Text>
                    </View>
                ) : (
                    <View className="bg-white border border-gray-200 shadow-xl px-5 py-3 rounded-full flex-row items-center gap-3">
                        <View className="items-center">
                            <Text className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5 font-display">
                                {rideStatus === 'MATCHED' || rideStatus === 'DRIVER_ARRIVED' ? 'Pickup' : 'Arrival'}
                            </Text>
                            <Text className="text-xl font-bold text-gray-900 font-display">{arrivalTime}</Text>
                        </View>
                        <View className="h-8 w-[1px] bg-gray-200" />
                        <View className="items-start">
                            <Text className="text-sm font-semibold text-purple-600 font-display">{eta}</Text>
                            <Text className="text-[11px] text-gray-500 font-display">to {rideStatus === 'MATCHED' ? 'you' : 'destination'}</Text>
                        </View>
                    </View>
                )}
            </SafeAreaView>

            <View className="flex-1" />

            {/* Bottom Sheet */}
            <View className="bg-white w-full rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] pb-8 z-20">
                <View className="w-full items-center pt-3 pb-1"><View className="h-1 w-12 rounded-full bg-gray-200" /></View>

                {/* OTP Display Card (Only if accepted/arrived) */}
                {(rideStatus === 'ACCEPTED' || rideStatus === 'DRIVER_ARRIVED' || rideStatus === 'MATCHED') && ride?.otp && (
                    <View className="px-6 py-4">
                        <View className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex-row items-center justify-between">
                            <View>
                                <Text className="text-purple-600 text-[10px] font-bold tracking-widest uppercase mb-1">YOUR SECURE OTP</Text>
                                <Text className="text-gray-900 text-sm font-semibold">Share this with the driver to start</Text>
                            </View>
                            <View className="bg-white px-4 py-2 rounded-xl border border-purple-200">
                                <Text className="text-purple-600 text-2xl font-bold tracking-tighter">{ride.otp}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Progress (Only if trip started) */}
                {(rideStatus === 'STARTED' || rideStatus === 'IN_PROGRESS') && (
                    <View className="px-6 py-4">
                        <View className="flex-row justify-between items-end mb-2">
                            <Text className="text-xs font-bold text-gray-400 tracking-wide font-display">TRIP PROGRESS</Text>
                            <Text className="text-xs font-bold text-purple-600 font-display">{ride?.progress || 0}%</Text>
                        </View>
                        <View className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <View className="h-full bg-purple-900 w-[65%] rounded-full shadow-sm" style={{ width: `${ride?.progress || 0}%` }} />
                        </View>
                    </View>
                )}

                {/* Driver Info / Status Text */}
                <View className="px-4 mb-6 mt-2">
                    {ride?.driver ? (
                        <View className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                            <View className="flex-1">
                                <Text className="text-gray-900 text-lg font-bold font-display">{ride.driver?.name || 'Driver'}</Text>
                                <Text className="text-gray-500 text-sm font-display">
                                    {ride.driver?.vehicleBrand} {ride.driver?.vehicleModel} - {ride.driver?.vehiclePlate}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View className="bg-gray-50 rounded-2xl p-8 items-center justify-center border border-dashed border-gray-200">
                            <Text className="text-gray-400 italic font-display">Waiting for driver to accept...</Text>
                        </View>
                    )}
                </View>

                {/* Actions Grid */}
                <View className="flex-row justify-between px-6 mb-6">
                    <TouchableOpacity
                        className="items-center gap-2"
                        onPress={() => navigateTo('ChatSupport', { rideId: activeRideId })}
                    >
                        <View className="h-14 w-14 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center">
                            <MaterialIcons name="chat-bubble" size={24} color="#4B5563" />
                        </View>
                        <Text className="text-[11px] font-medium text-gray-500 font-display">Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="items-center gap-2">
                        <View className="h-14 w-14 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center">
                            <MaterialIcons name="ios-share" size={24} color="#4B5563" />
                        </View>
                        <Text className="text-[11px] font-medium text-gray-500 font-display">Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="items-center gap-2">
                        <View className="h-14 w-14 rounded-full bg-red-50 border border-red-100 items-center justify-center">
                            <MaterialIcons name="local-police" size={24} color="#EF4444" />
                        </View>
                        <Text className="text-[11px] font-medium text-red-500 font-display">SOS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigateTo('Home')}
                        className="items-center gap-2"
                    >
                        <View className="h-14 w-14 rounded-full bg-gray-50 border border-gray-200 items-center justify-center">
                            <MaterialIcons name="close" size={24} color="#4B5563" />
                        </View>
                        <Text className="text-[11px] font-medium text-gray-500 font-display">Back</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View className="px-6 border-t border-gray-100 pt-4">
                    <View className="flex-row items-center justify-between mb-6">
                        <View className="flex-row items-center gap-3">
                            <View className="h-8 w-8 rounded-full bg-green-100 items-center justify-center">
                                <MaterialIcons name="payments" size={18} color="#166534" />
                            </View>
                            <View>
                                <Text className="text-xs text-gray-500 font-display">Wallet Payment</Text>
                                <Text className="text-sm font-bold text-gray-900 font-display">₹{ride?.fare || '0.00'}</Text>
                            </View>
                        </View>
                    </View>

                    {['SEARCHING', 'REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(rideStatus) ? (
                        <TouchableOpacity
                            onPress={() => {
                                Alert.alert('Cancel Ride', 'Are you sure you want to cancel?', [
                                    { text: 'No' },
                                    { text: 'Yes', onPress: handleCancelRide }
                                ]);
                            }}
                            disabled={isCancelling}
                            className="w-full py-3 rounded-xl border border-red-100 bg-red-50 items-center"
                        >
                            <Text className="text-red-600 text-sm font-bold font-display">
                                {isCancelling ? 'Cancelling...' : 'Cancel Ride'}
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

            </View>
        </View>
    );
};

export default InRideScreen;
