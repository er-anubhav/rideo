import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, Polyline, UrlTile } from '@/components/Map';
import { rideService } from '@/features/booking/rideService';
import { CONFIG } from '@/config/config';


const ServiceOption = ({ id, title, subtitle, time, dropTime, price, originalPrice, selected, onSelect }) => (
    <TouchableOpacity
        onPress={() => onSelect(id)}
        activeOpacity={0.9}
        className={`flex-row items-center justify-between rounded-2xl p-3 my-1.5 ${selected ? 'bg-white border border-purple-600' : 'bg-white border border-gray-200'}`}
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}
    >
        {/* Vehicle Details */}
        <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-0.5">
                <Text className={`text-base font-bold font-display ${selected ? 'text-purple-900' : 'text-gray-900'}`}>{title}</Text>
            </View>
            <Text className="text-xs text-gray-600 font-display">{time} · Drop {dropTime}</Text>
            {subtitle && <Text className="text-xs text-gray-500 font-display mt-0.5">{subtitle}</Text>}
        </View>

        {/* Price */}
        <View className="items-end ml-3">
            <Text className={`text-lg font-bold font-display ${selected ? 'text-purple-900' : 'text-gray-900'}`}>₹{price}</Text>
            {originalPrice && (
                <Text className="text-xs text-gray-400 line-through font-display">₹{originalPrice}</Text>
            )}
        </View>
    </TouchableOpacity>
);


const RideDetailsScreen = ({ navigation, route }) => {
    const [selectedService, setSelectedService] = useState('BIKE'); // Default to Bike as in reference
    const [isLoading, setIsLoading] = useState(false);
    const [mapRegion, setMapRegion] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeMeta, setRouteMeta] = useState({ durationSeconds: 0, distanceMeters: 0 });

    // Get pickup and drop from route params (passed from HomeScreen)
    const pickupData = route.params?.pickup || {
        lat: 12.9716,
        lon: 77.5946,
        address: 'Current Location'
    };

    const dropData = route.params?.drop || {
        lat: 12.2958,
        lon: 76.6394,
        address: 'Destination'
    };

    // Fetch route from backend map orchestrator (Mappls + fallback)
    useEffect(() => {
        const fetchRoute = async () => {
            try {
                const preview = await rideService.getRoutePreview(
                    { lat: pickupData.lat, lng: pickupData.lon },
                    { lat: dropData.lat, lng: dropData.lon },
                    { phase: 'preview' },
                );

                const coordinates = (preview?.route?.coordinates || preview?.coordinates || [])
                    .map((coord) => ({
                        latitude: Number(coord.latitude ?? coord.lat),
                        longitude: Number(coord.longitude ?? coord.lng),
                    }))
                    .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude));

                if (coordinates.length > 0) {
                    setRouteCoordinates(coordinates);
                } else {
                    throw new Error('No route coordinates returned from backend');
                }

                setRouteMeta({
                    durationSeconds: Number(preview?.route?.durationSeconds || preview?.durationSeconds || 0),
                    distanceMeters: Number(preview?.route?.distanceMeters || preview?.distanceMeters || 0),
                });
            } catch (error) {
                console.error('Error fetching route preview:', error);
                // Fallback to straight line if routing fails
                setRouteCoordinates([
                    { latitude: pickupData.lat, longitude: pickupData.lon },
                    { latitude: dropData.lat, longitude: dropData.lon }
                ]);
                setRouteMeta({ durationSeconds: 0, distanceMeters: 0 });
            }
        };

        fetchRoute();
    }, [dropData.lat, dropData.lon, pickupData.lat, pickupData.lon]); // Refetch when route points change

    // Calculate map region to fit both markers with proper padding
    useEffect(() => {
        const pickupLat = pickupData.lat;
        const pickupLon = pickupData.lon;
        const destLat = dropData.lat;
        const destLon = dropData.lon;

        const midLat = (pickupLat + destLat) / 2;
        const midLon = (pickupLon + destLon) / 2;

        // Use 1.5x multiplier for better padding (not too zoomed out)
        const latDelta = Math.abs(pickupLat - destLat) * 1.5;
        const lonDelta = Math.abs(pickupLon - destLon) * 1.5;

        setMapRegion({
            latitude: midLat,
            longitude: midLon,
            latitudeDelta: Math.max(latDelta, 0.02), // Minimum zoom level
            longitudeDelta: Math.max(lonDelta, 0.02),
        });
    }, [dropData.lat, dropData.lon, pickupData.lat, pickupData.lon]);

    const handleBookRide = async () => {
        setIsLoading(true);
        try {
            const vehicleTypeMap = {
                BIKE: 'BIKE',
                AUTO: 'AUTO',
                CAB_SEDAN: 'CAB_SEDAN',
                CAB_PRIORITY: 'CAB_SUV',
                CAB_PREMIUM: 'CAB_SUV',
            };

            const rideRequest = {
                pickupLat: pickupData.lat,
                pickupLng: pickupData.lon,
                pickupAddress: pickupData.address,
                dropLat: dropData.lat,
                dropLng: dropData.lon,
                dropAddress: dropData.address,
                vehicleType: vehicleTypeMap[selectedService] || 'CAB_SEDAN',
            };

            const createdRide = await rideService.requestRide(rideRequest);

            // Navigate to InRide and wait for status updates
            navigation.navigate('InRide', {
                rideId: createdRide.id,
                rideRequest,
                isSearching: true,
            });
        } catch (error) {
            Alert.alert(
                'Booking Failed',
                error.response?.data?.message || 'Unable to reach the service. Please check your connection.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const etaMinutes = routeMeta.durationSeconds > 0
        ? Math.max(1, Math.round(routeMeta.durationSeconds / 60))
        : 18;

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" backgroundColor="transparent" translucent />

            {/* Map Container - 60% of screen */}
            <View className="absolute top-0 left-0 right-0" style={{ height: '70%' }}>
                {mapRegion ? (
                    <MapView
                        style={{ width: '100%', height: '100%' }}
                        region={mapRegion}
                        onRegionChangeComplete={(region) => setMapRegion(region)}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                    >
                        {/* Pickup Marker - Green Pin */}
                        <Marker
                            coordinate={{
                                latitude: pickupData.lat,
                                longitude: pickupData.lon,
                            }}
                            title="Pickup Location"
                            description={pickupData.address}
                        >
                            <View className="items-center">
                                <View className="bg-green-500 w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-lg">
                                    <View className="w-3 h-3 bg-white rounded-full" />
                                </View>
                                <View className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-green-500" style={{ marginTop: -2 }} />
                            </View>
                        </Marker>

                        {/* Destination Marker - Red Pin */}
                        <Marker
                            coordinate={{
                                latitude: dropData.lat,
                                longitude: dropData.lon,
                            }}
                            title="Destination"
                            description={dropData.address}
                        >
                            <View className="items-center">
                                <View className="bg-red-500 w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-lg">
                                    <View className="w-3 h-3 bg-white rounded-full" />
                                </View>
                                <View className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" style={{ marginTop: -2 }} />
                            </View>
                        </Marker>

                        {/* Route Polyline - Actual Road Route */}
                        {routeCoordinates.length > 0 && (
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor="#9333EA"
                                strokeWidth={2}
                            />
                        )}
                    </MapView>
                ) : (
                    <View className="w-full h-full items-center justify-center bg-slate-100">
                        <ActivityIndicator size="large" color="#7E22CE" />
                    </View>
                )}
            </View>

            {/* Back Button */}
            <SafeAreaView className="absolute top-0 left-0 z-50 p-4" edges={['top']}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-lg"
                >
                    <MaterialIcons name="arrow-back-ios" size={18} color="#111827" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Bottom Sheet */}
            <SafeAreaView className="absolute bottom-0 left-0 right-0 z-50 pointer-events-box-none" edges={['bottom']}>
                <View className="bg-white rounded-t-[30px] shadow-2xl px-5 pb-3 pt-6 pointer-events-auto">
                    {/* Route Summary */}
                    <View className="mb-4">
                        <View className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <View className="flex-row items-center gap-3">
                                <View className="items-center gap-1 mt-1">
                                    <View className="w-2.5 h-2.5 rounded-full bg-purple-900" />
                                    <View className="w-0.5 h-6 bg-gray-200 border-l border-dashed border-gray-300" />
                                    <View className="w-2.5 h-2.5 rounded-sm bg-gray-900" />
                                </View>
                                <View className="flex-1 gap-3">
                                    <View className="flex-row justify-between items-center border-b border-gray-100 pb-2">
                                        <Text className="text-gray-900 text-sm font-medium font-display" numberOfLines={1}>{pickupData.address}</Text>
                                        <Text className="text-xs text-gray-500 font-display">NOW</Text>
                                    </View>
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-gray-900 text-sm font-medium font-display flex-1" numberOfLines={1}>{dropData.address}</Text>
                                        <Text className="text-xs text-gray-500 font-display ml-2">ETA: {etaMinutes} min</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Savings Banner */}
                    {/* <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 flex-row items-center">
                        <MaterialIcons name="check-circle" size={20} color="#16A34A" />
                        <Text className="ml-2 text-green-800 text-sm font-medium font-display">You've saved upto ₹9 on your Bike ride!</Text>
                    </View> */}

                    {/* Available Rides */}
                    <ScrollView
                        className="max-h-72"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 10 }}
                    >
                        <ServiceOption
                            id="AUTO"
                            title="Auto"
                            time="5 mins"
                            dropTime="12:21 am"
                            price="84"
                            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDQzyybfeFi7vTjH93Xf1jbUG2kbjVSdrblaiE9Pdtu4kwwwVnS3h9EGNqkr6IwAPa5_dRcRCNbBD9YjjWGpmvnqFc8HW8z7Mnbm5spmU73_OeyVUJx8quuQ-AuJcSE2yeAZbAAqeJ0ianAY-V_6265LaajBCtqEgSX5xdO7N3SOiAZcPDy7nHn3Sqgw2jaLti7y9jg7K4J1491mNsYKGTCHQk073I0K_Lge9jY4p52u3_93_zVgxivSDY2fVRPNIE2YAgWjgA6RTM"
                            selected={selectedService === 'AUTO'}
                            onSelect={setSelectedService}
                        />

                        <ServiceOption
                            id="CAB_SEDAN"
                            title="Cab Economy"
                            time="2 mins"
                            dropTime="12:21 am"
                            price="127"
                            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDQzyybfeFi7vTjH93Xf1jbUG2kbjVSdrblaiE9Pdtu4kwwwVnS3h9EGNqkr6IwAPa5_dRcRCNbBD9YjjWGpmvnqFc8HW8z7Mnbm5spmU73_OeyVUJx8quuQ-AuJcSE2yeAZbAAqeJ0ianAY-V_6265LaajBCtqEgSX5xdO7N3SOiAZcPDy7nHn3Sqgw2jaLti7y9jg7K4J1491mNsYKGTCHQk073I0K_Lge9jY4p52u3_93_zVgxivSDY2fVRPNIE2YAgWjgA6RTM"
                            selected={selectedService === 'CAB_SEDAN'}
                            onSelect={setSelectedService}
                        />

                        <ServiceOption
                            id="BIKE"
                            title="Bike"
                            subtitle="Quick Bike rides"
                            time="2 mins away"
                            dropTime="12:15 am"
                            price="53"
                            originalPrice="62"
                            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDQzyybfeFi7vTjH93Xf1jbUG2kbjVSdrblaiE9Pdtu4kwwwVnS3h9EGNqkr6IwAPa5_dRcRCNbBD9YjjWGpmvnqFc8HW8z7Mnbm5spmU73_OeyVUJx8quuQ-AuJcSE2yeAZbAAqeJ0ianAY-V_6265LaajBCtqEgSX5xdO7N3SOiAZcPDy7nHn3Sqgw2jaLti7y9jg7K4J1491mNsYKGTCHQk073I0K_Lge9jY4p52u3_93_zVgxivSDY2fVRPNIE2YAgWjgA6RTM"
                            selected={selectedService === 'BIKE'}
                            onSelect={setSelectedService}
                        />

                        <ServiceOption
                            id="CAB_PRIORITY"
                            title="Cab Priority"
                            badge="Quickest"
                            time="2 mins"
                            dropTime="12:18 am"
                            price="170"
                            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDQzyybfeFi7vTjH93Xf1jbUG2kbjVSdrblaiE9Pdtu4kwwwVnS3h9EGNqkr6IwAPa5_dRcRCNbBD9YjjWGpmvnqFc8HW8z7Mnbm5spmU73_OeyVUJx8quuQ-AuJcSE2yeAZbAAqeJ0ianAY-V_6265LaajBCtqEgSX5xdO7N3SOiAZcPDy7nHn3Sqgw2jaLti7y9jg7K4J1491mNsYKGTCHQk073I0K_Lge9jY4p52u3_93_zVgxivSDY2fVRPNIE2YAgWjgA6RTM"
                            selected={selectedService === 'CAB_PRIORITY'}
                            onSelect={setSelectedService}
                        />

                        <ServiceOption
                            id="CAB_PREMIUM"
                            title="Cab Premium"
                            time="3 mins"
                            dropTime="12:19 am"
                            price="195"
                            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDQzyybfeFi7vTjH93Xf1jbUG2kbjVSdrblaiE9Pdtu4kwwwVnS3h9EGNqkr6IwAPa5_dRcRCNbBD9YjjWGpmvnqFc8HW8z7Mnbm5spmU73_OeyVUJx8quuQ-AuJcSE2yeAZbAAqeJ0ianAY-V_6265LaajBCtqEgSX5xdO7N3SOiAZcPDy7nHn3Sqgw2jaLti7y9jg7K4J1491mNsYKGTCHQk073I0K_Lge9jY4p52u3_93_zVgxivSDY2fVRPNIE2YAgWjgA6RTM"
                            selected={selectedService === 'CAB_PREMIUM'}
                            onSelect={setSelectedService}
                        />
                    </ScrollView>

                    {/* Gradient Shadow Separator */}
                    <View className="mt-2">
                        <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.04)' }} />
                        <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.02)' }} />
                        <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.01)' }} />
                    </View>

                    {/* Payment & Offers Row */}
                    <View className="flex-row items-center justify-between mt-3 mb-3">
                        <TouchableOpacity className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 flex-1 mr-2">
                            <MaterialIcons name="account-balance-wallet" size={18} color="#111827" />
                            <Text className="ml-2 text-gray-900 text-sm font-medium font-display">Cash</Text>
                            <MaterialIcons name="chevron-right" size={18} color="#6B7280" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 flex-1">
                            <MaterialIcons name="local-offer" size={18} color="#9333EA" />
                            <Text className="ml-2 text-gray-900 text-sm font-medium font-display">Offers</Text>
                            <View className="ml-1 bg-purple-100 rounded-full px-1.5 py-0.5">
                                <Text className="text-purple-700 text-[10px] font-bold font-display">9 applied</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={18} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Book Button */}
                    <TouchableOpacity
                        className={`w-full flex-row items-center justify-center gap-2 py-4 px-6 rounded-[30px] shadow-lg ${isLoading ? 'bg-purple-400' : 'bg-purple-900 shadow-purple-600/30'} active:scale-[0.98]`}
                        onPress={handleBookRide}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className="text-white font-bold text-lg font-display">
                                    Book {selectedService === 'BIKE' ? 'Bike' : selectedService === 'AUTO' ? 'Auto' : selectedService === 'CAB_PRIORITY' ? 'Cab Priority' : selectedService === 'CAB_PREMIUM' ? 'Cab Premium' : 'Cab Economy'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};


export default RideDetailsScreen;
