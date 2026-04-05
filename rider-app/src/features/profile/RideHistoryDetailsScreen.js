import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '@/components/Map';
import { LinearGradient } from 'expo-linear-gradient';
import { rideService } from '@/features/booking/rideService';
import { loggingService } from '@/utils/loggingService';

const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return `\u20b9${amount.toFixed(2)}`;
};

const formatVehicleLabel = (vehicleType) => {
    if (!vehicleType) return 'Ride';
    return vehicleType.replace(/_/g, ' ');
};

const RideHistoryDetailsScreen = ({ route, navigation }) => {
    const { ride } = route.params;
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);

    const pickupLat = Number(ride?.pickupLat || 12.9716);
    const pickupLng = Number(ride?.pickupLng || 77.5946);
    const dropLat = Number(ride?.dropLat || pickupLat);
    const dropLng = Number(ride?.dropLng || pickupLng);

    const requestedAt = ride?.requestedAt ? new Date(ride.requestedAt) : null;
    const completedAt = ride?.completedAt ? new Date(ride.completedAt) : null;
    const status = ride?.status || 'UNKNOWN';
    const riderFare = formatCurrency(ride?.totalFare || 0);
    const driverName = [ride?.driver?.driverProfile?.firstName, ride?.driver?.driverProfile?.lastName]
        .filter(Boolean)
        .join(' ') || 'Driver details unavailable';

    const handleDownloadInvoice = async () => {
        setDownloadingInvoice(true);
        try {
            const invoice = await rideService.getInvoice(ride.id);
            Alert.alert(
                'Invoice Ready',
                `Invoice ID: ${invoice.invoiceId}\nTotal: ${formatCurrency(invoice.totalFare)}\nStatus: ${invoice.paymentStatus}`,
            );
        } catch (error) {
            await loggingService.error(error?.message || 'Failed to fetch ride invoice', 'RIDE_HISTORY_DETAILS', {
                rideId: ride?.id,
            });
            Alert.alert('Invoice Error', error.response?.data?.message || 'Unable to generate invoice right now.');
        } finally {
            setDownloadingInvoice(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            <SafeAreaView className="z-10 bg-white shadow-sm" edges={['top']}>
                <View className="flex-row items-center justify-between px-4 py-3">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="h-10 w-10 items-center justify-center rounded-full bg-gray-50 border border-gray-100"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-gray-900 text-lg font-bold font-display">Ride Details</Text>
                    <TouchableOpacity
                        className="h-10 w-10 items-center justify-center"
                        onPress={() => navigation.navigate('HelpCenter')}
                    >
                        <Text className="text-purple-600 font-bold text-xs font-display">Help</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="h-64 w-full bg-gray-100 relative">
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        style={{ width: '100%', height: '100%' }}
                        initialRegion={{
                            latitude: (pickupLat + dropLat) / 2,
                            longitude: (pickupLng + dropLng) / 2,
                            latitudeDelta: Math.max(Math.abs(pickupLat - dropLat) * 1.8, 0.02),
                            longitudeDelta: Math.max(Math.abs(pickupLng - dropLng) * 1.8, 0.02),
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                    >
                        <Marker coordinate={{ latitude: pickupLat, longitude: pickupLng }}>
                            <View className="bg-white p-1 rounded-full shadow-md border border-gray-200">
                                <View className="h-3 w-3 bg-green-500 rounded-full" />
                            </View>
                        </Marker>
                        <Marker coordinate={{ latitude: dropLat, longitude: dropLng }}>
                            <View className="bg-white p-1 rounded-full shadow-md border border-gray-200">
                                <View className="h-3 w-3 bg-red-500 rounded-sm" />
                            </View>
                        </Marker>
                        <Polyline
                            coordinates={[
                                { latitude: pickupLat, longitude: pickupLng },
                                { latitude: dropLat, longitude: dropLng },
                            ]}
                            strokeColor="#9333EA"
                            strokeWidth={3}
                        />
                    </MapView>
                    <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,1)']}
                        className="absolute bottom-0 left-0 right-0 h-10"
                    />
                </View>

                <View className="-mt-6 px-4">
                    <View className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md">
                        <View className="flex-row justify-between items-start mb-4 border-b border-gray-100 pb-4">
                            <View>
                                <Text className="text-gray-900 text-xl font-bold font-display">
                                    {requestedAt ? requestedAt.toLocaleDateString() : 'Trip'}
                                </Text>
                                <Text className="text-gray-500 text-sm font-display mt-0.5">
                                    Ride ID: {ride?.id?.slice(0, 8) || 'N/A'}
                                </Text>
                            </View>
                            <View className={`px-3 py-1 rounded-full ${status === 'CANCELLED' ? 'bg-red-50' : 'bg-green-50'}`}>
                                <Text className={`text-xs font-bold uppercase ${status === 'CANCELLED' ? 'text-red-600' : 'text-green-700'}`}>
                                    {status}
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-4 mb-2">
                            <View className="h-12 w-12 rounded-full bg-purple-50 items-center justify-center border border-purple-100">
                                <MaterialIcons name="local-taxi" size={24} color="#9333EA" />
                            </View>
                            <View>
                                <Text className="text-gray-900 text-base font-bold font-display">{formatVehicleLabel(ride?.vehicleType)}</Text>
                                <Text className="text-gray-500 text-xs font-display">{driverName}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="px-4 mt-6 mb-2">
                    <Text className="text-gray-900 text-base font-bold mb-3 px-1 font-display">Trip Route</Text>
                    <View className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <View className="relative pl-4 gap-4 border-l-2 border-dashed border-gray-200 ml-2">
                            <View className="relative">
                                <View className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-green-50" />
                                <Text className="text-xs text-gray-500 font-bold uppercase mb-0.5">
                                    Pickup {requestedAt ? `\u2022 ${requestedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                </Text>
                                <Text className="text-gray-900 text-sm font-medium font-display leading-5">
                                    {ride?.pickupAddress || 'Pickup not available'}
                                </Text>
                            </View>

                            <View className="relative">
                                <View className="absolute -left-[23px] top-1 h-3 w-3 rounded-sm bg-red-500 ring-4 ring-red-50" />
                                <Text className="text-xs text-gray-500 font-bold uppercase mb-0.5">
                                    Dropoff {completedAt ? `\u2022 ${completedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                </Text>
                                <Text className="text-gray-900 text-sm font-medium font-display leading-5">
                                    {ride?.dropAddress || 'Drop location not available'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="px-4 mt-4 mb-8">
                    <Text className="text-gray-900 text-base font-bold mb-3 px-1 font-display">Bill Details</Text>
                    <View className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-500 text-sm font-display">Trip Fare</Text>
                            <Text className="text-gray-900 text-sm font-medium font-display">{riderFare}</Text>
                        </View>
                        <View className="h-px bg-gray-100 my-3" />
                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-900 text-base font-bold font-display">Total Bill</Text>
                            <Text className="text-gray-900 text-xl font-bold font-display">{riderFare}</Text>
                        </View>
                        <View className="flex-row items-center gap-2 mt-2 bg-gray-50 p-2 rounded-lg">
                            <MaterialIcons name="payment" size={16} color="#6B7280" />
                            <Text className="text-gray-500 text-xs font-display flex-1">Paid via WALLET</Text>
                        </View>
                    </View>
                </View>

                <View className="px-4 mb-8 gap-3">
                    <TouchableOpacity
                        disabled={downloadingInvoice}
                        className="w-full py-4 rounded-xl bg-purple-900 items-center justify-center shadow-lg shadow-purple-600/20"
                        onPress={handleDownloadInvoice}
                    >
                        {downloadingInvoice ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-base font-display">Download Invoice</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="w-full py-4 rounded-xl bg-white border border-gray-200 items-center justify-center"
                        onPress={() => navigation.navigate('HelpCenter')}
                    >
                        <Text className="text-gray-900 font-bold text-base font-display">Report an Issue</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

export default RideHistoryDetailsScreen;
