import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Polyline } from '@/components/Map';
import * as Location from 'expo-location';
import { rideService } from '@/features/booking/rideService';
import { walletService } from '@/features/wallet/walletService';
import { realtimeService } from '@/features/ride/realtime.service';
import { geocodingService } from '@/features/booking/geocodingService';

const ACTIVE_RIDE_STATUSES = ['REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'];
const SEARCHING_RIDE_STATUSES = ['REQUESTED', 'MATCHED'];

const toNumberOrUndefined = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};


const HomeScreen = ({ navigation, route }) => {
    const [location, setLocation] = useState(route.params?.initialLocation || null);
    const [address, setAddress] = useState("Locating...");
    const [destination, setDestination] = useState(null);
    const [mapRegion, setMapRegion] = useState(route.params?.mapRegion || null);
    const [walletBalance, setWalletBalance] = useState('0.00');
    const [recentDestinations, setRecentDestinations] = useState([]);
    const hasAutoNavigatedToRide = useRef(false);

    const navigateToActiveRide = useCallback((ride) => {
        const status = ride?.status;
        const rideId = ride?.id || ride?.rideId;

        if (!rideId || hasAutoNavigatedToRide.current) {
            return false;
        }

        if (status && !ACTIVE_RIDE_STATUSES.includes(status)) {
            return false;
        }

        hasAutoNavigatedToRide.current = true;
        navigation.navigate('InRide', {
            rideId,
            isSearching: SEARCHING_RIDE_STATUSES.includes(status),
            rideRequest: {
                pickupLat: toNumberOrUndefined(ride?.pickupLat),
                pickupLng: toNumberOrUndefined(ride?.pickupLng),
                pickupAddress: ride?.pickupAddress,
                dropLat: toNumberOrUndefined(ride?.dropLat),
                dropLng: toNumberOrUndefined(ride?.dropLng),
                dropAddress: ride?.dropAddress,
            },
        });

        return true;
    }, [navigation]);
    useEffect(() => {
        const loadRecent = async () => {
            if (route.params?.destination) {
                const dest = route.params.destination;
                setDestination(dest);

                // Reload recent destinations after a new one is selected
                const recent = await geocodingService.getRecentDestinations();
                setRecentDestinations(recent);
            }
        };
        loadRecent();
    }, [route.params?.destination]);

    // Adjust map region to fit both pickup and destination
    useEffect(() => {
        if (location && destination) {
            const pickupLat = location.coords.latitude;
            const pickupLon = location.coords.longitude;
            const destLat = destination.lat;
            const destLon = destination.lon;

            const midLat = (pickupLat + destLat) / 2;
            const midLon = (pickupLon + destLon) / 2;

            const latDelta = Math.abs(pickupLat - destLat) * 2.5; // Add padding
            const lonDelta = Math.abs(pickupLon - destLon) * 2.5;

            setMapRegion({
                latitude: midLat,
                longitude: midLon,
                latitudeDelta: Math.max(latDelta, 0.01), // Minimum zoom level
                longitudeDelta: Math.max(lonDelta, 0.01),
            });
        }
    }, [destination, location]);

    useEffect(() => {
        let isMounted = true;
        let unsubscribeWallet = () => { };
        let unsubscribeActiveRide = () => { };

        const initData = async () => {
            let parsedUser = null;

            try {
                const userRaw = await AsyncStorage.getItem('userData');
                if (userRaw) {
                    parsedUser = JSON.parse(userRaw);
                }
            } catch (_err) {
                parsedUser = null;
            }

            // Connect to realtime first so live ride-status updates can trigger navigation.
            await realtimeService.connect().catch(() => { });

            if (parsedUser?.id && isMounted) {
                unsubscribeActiveRide = rideService.subscribeToActiveRide(parsedUser.id, (payload) => {
                    if (!isMounted) return;
                    const data = payload?.data || payload || {};
                    navigateToActiveRide({
                        ...data,
                        id: payload?.id || data?.id || payload?.rideId,
                        status: payload?.status || data?.status,
                    });
                });

                try {
                    const activeRide = await rideService.getMyActiveRide();
                    if (isMounted && navigateToActiveRide(activeRide)) {
                        return;
                    }
                } catch {
                    // Keep screen usable if active-ride recovery call fails temporarily.
                }
            }

            // Load recent destinations
            const recent = await geocodingService.getRecentDestinations();
            if (isMounted) {
                setRecentDestinations(recent);
            }

            // Subscribe to wallet updates
            unsubscribeWallet = await walletService.subscribeToBalance((data) => {
                if (data && data.balance !== undefined) {
                    setWalletBalance(data.balance.toString());
                }
            });

            // Initial balance fetch
            try {
                const balanceData = await walletService.getBalance();
                if (isMounted) {
                    setWalletBalance(balanceData.balance.toString());
                }
            } catch {
                // Do not block home screen if balance fetch fails temporarily.
            }
        };
        initData();

        return () => {
            isMounted = false;
            if (typeof unsubscribeWallet === 'function') {
                unsubscribeWallet();
            }
            if (typeof unsubscribeActiveRide === 'function') {
                unsubscribeActiveRide();
            }
        };
    }, [navigateToActiveRide]);

    useEffect(() => {
        if (location || route.params?.locationError) {
            return;
        }

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setAddress("Location Denied");
                return;
            }

            try {
                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
                setMapRegion({
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });

                try {
                    const reverseGeocode = await Location.reverseGeocodeAsync({
                        latitude: currentLocation.coords.latitude,
                        longitude: currentLocation.coords.longitude
                    });

                    if (reverseGeocode.length > 0) {
                        const { street, name, city, region } = reverseGeocode[0];
                        const formattedAddress = `${name || street || ''}, ${city || region || ''}`.replace(/^, /, '').trim();
                        setAddress(formattedAddress || "Current Location");
                    }
                } catch {
                    setAddress("Current Location");
                }
            } catch {
                setAddress("Location Unavailable");
            }
        })();
    }, [location, route.params?.locationError]);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" backgroundColor="transparent" translucent />

            {/* Full Screen Map Background */}
            <View className="absolute inset-0">
                {mapRegion ? (
                    <MapView
                        style={{ width: '100%', height: '100%' }}
                        region={mapRegion}
                        onRegionChangeComplete={(region) => setMapRegion(region)}
                        showsUserLocation={true}
                        followsUserLocation={true}
                        showsMyLocationButton={false}
                        className="w-full h-full"
                    >

                        {/* Destination Marker */}
                        {destination && (
                            <Marker
                                coordinate={{
                                    latitude: destination.lat,
                                    longitude: destination.lon,
                                }}
                                title="Destination"
                                description={destination.name}
                                pinColor="red"
                            />
                        )}

                        {/* Route Polyline */}
                        {location && destination && (
                            <Polyline
                                coordinates={[
                                    {
                                        latitude: location.coords.latitude,
                                        longitude: location.coords.longitude,
                                    },
                                    {
                                        latitude: destination.lat,
                                        longitude: destination.lon,
                                    },
                                ]}
                                strokeColor="#9333EA"
                                strokeWidth={4}
                            />
                        )}
                    </MapView>
                ) : (
                    <View className="w-full h-full items-center justify-center bg-slate-100">
                        {/* Fallback Image while loading or if permission denied */}
                        <Image
                            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQzyybfeFi7vTjH93Xf1jbUG2kbjVSdrblaiE9Pdtu4kwwwVnS3h9EGNqkr6IwAPa5_dRcRCNbBD9YjjWGpmvnqFc8HW8z7Mnbm5spmU73_OeyVUJx8quuQ-AuJcSE2yeAZbAAqeJ0ianAY-V_6265LaajBCtqEgSX5xdO7N3SOiAZcPDy7nHn3Sqgw2jaLti7y9jg7K4J1491mNsYKGTCHQk073I0K_Lge9jY4p52u3_93_zVgxivSDY2fVRPNIE2YAgWjgA6RTM' }}
                            className="absolute inset-0 w-full h-full opacity-60"
                            resizeMode="cover"
                        />
                        <ActivityIndicator size="large" color="#7E22CE" className="z-10" />
                    </View>
                )}
            </View>

            <SafeAreaView className="flex-1 justify-end pointer-events-box-none">

                {/* Header - Floating */}
                <View className="absolute top-16 left-0 right-0 z-50 px-5 flex-row justify-between items-center bg-transparent pointer-events-box-none">
                    {/* Profile Button and Balance */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('UserProfile')}
                        className="flex-row items-center bg-white rounded-full p-1 shadow-xl border border-gray-100"
                    >
                        <View className="w-10 h-10 rounded-full border-2 border-purple-100 overflow-hidden">
                            <Image
                                source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuCB3WOaMPCxtxOfCW5Ycs8t1EkSrEX8Ssd3bhyDTjSv2cbN6xY4OiYhFGPtl-EAztXkxAlDkDISHH2rlammS8Z1gmTjYq4LmCxoPioIv85EW1wsToxlKC_B_tFk3zwysIc3idiNpjLfzMRoM_x9exnL0duVg5UDSmgR6RjBI0rtJd28NwO3aqBCWgvReYWIVuWHJenrH-6skRUCu6KTKwQFxjCLRX7guL6Z-i2HoEbMMWeuAw6caRFGraXnKaAhGUHJS1s4_CUDnqk" }}
                                className="w-full h-full"
                            />
                        </View>
                        <View className="mx-2 pr-2">
                            <Text className="text-[10px] text-gray-500 font-bold uppercase font-display">Wallet</Text>
                            <Text className="text-gray-900 font-bold text-xs font-display">₹{walletBalance}</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Location Pill */}
                    <View className="flex-1 mx-3 h-12 bg-white rounded-full flex-row items-center px-4 shadow-lg border border-gray-100">
                        <View className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                        <View className="flex-1">
                            <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-display">Current Location</Text>
                            <Text className="text-gray-900 font-bold text-sm font-display truncate" numberOfLines={1}>
                                {address}
                            </Text>
                        </View>
                    </View>

                    {/* Inbox Button */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Inbox')}
                        className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-xl border border-gray-100"
                    >
                        <View className="absolute top-3 right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full z-10 border-2 border-white" />
                        <Ionicons name="notifications-outline" size={24} color="#1F2937" />
                    </TouchableOpacity>
                </View>

                {/* Recent Destinations Dynamic Island */}
                {recentDestinations.length > 0 && !destination && (
                    <View className="absolute top-32 left-0 right-0 z-40 px-5 pointer-events-box-none">
                        <View className="bg-white/95 backdrop-blur-xl rounded-3xl p-3 shadow-lg border border-gray-100">
                            {recentDestinations.map((dest, index) => (
                                <View key={index}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            // Navigate directly to Check Prices screen
                                            navigation.navigate('RideDetails', {
                                                pickup: {
                                                    lat: location?.coords?.latitude || 0,
                                                    lon: location?.coords?.longitude || 0,
                                                    address: address
                                                },
                                                drop: {
                                                    lat: dest.lat,
                                                    lon: dest.lon,
                                                    address: dest.name
                                                }
                                            });
                                        }}
                                        className="py-2 px-3 flex-row items-center"
                                    >
                                        <MaterialIcons name="location-on" size={18} color="#9333EA" />
                                        <Text className="ml-3 text-gray-900 text-sm font-display flex-1" numberOfLines={1}>
                                            {dest.name}
                                        </Text>
                                    </TouchableOpacity>
                                    {/* Divider - don't show after last item */}
                                    {index < recentDestinations.length - 1 && (
                                        <View className="h-[1px] bg-gray-200 mx-3" />
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Bottom Sheet Content */}
                <View className="px-5 pb-3 pt-6 w-full bg-white rounded-t-[30px] shadow-2xl">

                    {/* Shortcuts */}
                    {/* <View className="flex-row gap-1 mb-3">
                        <TouchableOpacity className="flex-row items-center bg-white shadow-sm px-4 py-3 rounded-full border border-gray-200">
                            <Ionicons name="home" size={16} color="#9333EA" />
                            <Text className="text-gray-900 ml-2 font-display font-medium">Home</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-row items-center bg-white shadow-sm px-4 py-3 rounded-full border border-gray-200">
                            <Ionicons name="briefcase" size={16} color="#9333EA" />
                            <Text className="text-gray-900 ml-2 font-display font-medium">Work</Text>
                        </TouchableOpacity>
                    </View> */}

                    {/* Search Input */}
                    <View className="mb-3">
                        <TouchableOpacity
                            onPress={() => navigation.navigate('DestinationSearch', {
                                pickup: {
                                    lat: location?.coords?.latitude || 0,
                                    lon: location?.coords?.longitude || 0,
                                    address: address
                                }
                            })}
                            className="bg-gray-50 backdrop-blur-xl border border-gray-200 rounded-3xl p-4 flex-row items-center shadow-lg"
                        >
                            <View className="flex-1">
                                <Text className="text-purple-600 text-xs font-display ml-1">Where to?</Text>
                                <Text className={`text-lg font-bold font-display ml-1 ${destination ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                                    {destination ? destination.name : 'Enter your destination'}
                                </Text>
                            </View>
                            <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                                <MaterialIcons name="search" size={24} color="#9333EA" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Check Prices Button */}
                    <TouchableOpacity
                        className={`w-full rounded-[30px] p-3 items-center justify-center shadow-lg ${destination ? 'bg-purple-900 shadow-purple-600/30' : 'bg-gray-300'} active:scale-95 transition-transform`}
                        onPress={() => {
                            if (!destination) {
                                Alert.alert('Destination Required', 'Please select a destination first');
                                return;
                            }
                            navigation.navigate('RideDetails', {
                                pickup: {
                                    lat: location?.coords?.latitude || 0,
                                    lon: location?.coords?.longitude || 0,
                                    address: address
                                },
                                drop: {
                                    lat: destination.lat,
                                    lon: destination.lon,
                                    address: destination.name
                                }
                            });
                        }}
                        disabled={!destination}
                    >
                        <Text className="text-white font-bold text-lg font-display">Check prices</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};
export default HomeScreen;
