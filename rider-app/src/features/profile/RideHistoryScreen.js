import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '@/api/apiClient';
import { normalizeRideHistory } from '@/features/ride/rideAdapter';

const RideHistoryScreen = ({ navigation }) => {
    const [filter, setFilter] = useState('All');
    const [rides, setRides] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ totalSpent: 0, cabCount: 0, bikeCount: 0 });

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await apiClient.get('/rides/history');
                const history = normalizeRideHistory(response.data?.rides || response.data || []);
                setRides(history);

                // Calculate stats
                const totalSpent = history.reduce((sum, r) => sum + (Number(r.totalFare) || 0), 0);
                const cabCount = history.filter(r => r.vehicleType?.startsWith('CAB')).length;
                const bikeCount = history.filter(r => r.vehicleType === 'BIKE').length;

                setStats({ totalSpent, cabCount, bikeCount });
            } catch (error) {
                console.error('Failed to fetch ride history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const FilterButton = ({ label, icon, value }) => (
        <TouchableOpacity
            onPress={() => setFilter(value)}
            className={`flex-row h-9 items-center justify-center gap-2 rounded-full px-5 transition-transform active:scale-95 mr-3 ${filter === value ? 'bg-[#9333EA] shadow-lg shadow-purple-600/30' : 'bg-gray-100 border border-gray-200'}`}
        >
            {icon && <MaterialIcons name={icon} size={18} color={filter === value ? 'white' : '#4B5563'} />}
            <Text className={`text-sm font-bold ${filter === value ? 'text-white' : 'text-gray-600'}`}>{label}</Text>
        </TouchableOpacity>
    );

    const getIcon = (type) => {
        if (type?.startsWith('CAB')) return 'local-taxi';
        if (type === 'BIKE') return 'two-wheeler';
        if (type === 'AUTO') return 'electric-rickshaw';
        return 'inventory';
    };

    const filteredRides = filter === 'All'
        ? rides
        : rides.filter(ride => {
            if (filter === 'Cabs') return ride.vehicleType?.startsWith('CAB');
            if (filter === 'Bikes') return ride.vehicleType === 'BIKE';
            return ride.vehicleType === filter;
        });

    if (isLoading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#9333EA" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <StatusBar style="dark" backgroundColor="transparent" translucent />

            {/* Header */}
            <View className="flex-row mt-2 items-center justify-between px-4 pb-2 bg-white z-20">
                <Text className="text-gray-900 mt-2 mb-2 text-2xl font-extrabold tracking-tight font-display">Your Rides</Text>
            </View>

            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 flex-row grow-0 h-14 mb-2">
                <FilterButton label="All" value="All" />
                <FilterButton label="Cabs" value="Cabs" icon="local-taxi" />
                <FilterButton label="Bikes" value="Bikes" icon="two-wheeler" />
                <FilterButton label="Parcel" value="PARCEL" icon="inventory" />
            </ScrollView>

            <ScrollView className="flex-1 px-4 pb-6">
                {/* Spending Card */}
                <LinearGradient
                    colors={['#9333EA', '#7E22CE']}
                    className="rounded-2xl p-5 mb-6 relative overflow-hidden shadow-lg shadow-purple-600/30"
                >
                    <View className="absolute -right-5 -top-5 opacity-20">
                        <MaterialIcons name="history" size={120} color="white" />
                    </View>
                    <Text className="text-purple-100 text-sm font-medium mb-1 font-display">Total Spent</Text>
                    <Text className="text-white text-3xl font-extrabold tracking-tight font-display">₹{stats.totalSpent.toFixed(2)}</Text>
                    <View className="mt-4 flex-row gap-4">
                        <View className="flex-row items-center gap-1 bg-white/20 px-2 py-1 rounded-lg border border-white/10">
                            <MaterialIcons name="local-taxi" size={14} color="white" />
                            <Text className="text-white text-xs font-medium font-display">{stats.cabCount} Rides</Text>
                        </View>
                        <View className="flex-row items-center gap-1 bg-white/20 px-2 py-1 rounded-lg border border-white/10">
                            <MaterialIcons name="two-wheeler" size={14} color="white" />
                            <Text className="text-white text-xs font-medium font-display">{stats.bikeCount} Rides</Text>
                        </View>
                    </View>
                </LinearGradient>

                {rides.length === 0 ? (
                    <View className="pt-20 mt-[30%] items-center justify-center">
                        <MaterialIcons name="history" size={64} color="#E5E7EB" />
                        <Text className="text-gray-400 mt-4 font-display">No rides found</Text>
                    </View>
                ) : (
                    <>
                        <View className="py-3 px-1 mt-2">
                            <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider font-display">Recent Activity</Text>
                        </View>

                        {/* Ride List */}
                        {filteredRides.map((ride) => (
                            <TouchableOpacity key={ride.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm active:scale-[0.99]">
                                <View className="flex-row justify-between items-start">
                                    <View className="flex-row items-center gap-3">
                                        <View className={`h-10 w-10 items-center justify-center rounded-full ${ride.status === 'CANCELLED' ? 'bg-red-50' : 'bg-purple-50'}`}>
                                            <MaterialIcons name={getIcon(ride.vehicleType)} size={20} color={ride.status === 'CANCELLED' ? '#ef4444' : '#9333EA'} />
                                        </View>
                                        <View>
                                            <View className="flex-row items-center gap-2">
                                                <Text className="text-gray-900 text-base font-bold font-display">{ride.vehicleType?.replace('_', ' ') || 'Ride'}</Text>
                                                <View className={`px-2 py-0.5 rounded-full border ${ride.status === 'CANCELLED' ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'}`}>
                                                    <Text className={`${ride.status === 'CANCELLED' ? 'text-red-600' : 'text-green-700'} text-[10px] font-bold uppercase tracking-wide font-display`}>{ride.status}</Text>
                                                </View>
                                            </View>
                                            <Text className="text-gray-500 text-xs mt-0.5 font-medium font-display">{new Date(ride.requestedAt).toLocaleDateString()} • {new Date(ride.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Text className={`text-lg font-bold font-display ${ride.status === 'CANCELLED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>₹{ride.totalFare || '0.00'}</Text>
                                        <Text className="text-gray-400 text-xs font-display">Wallet</Text>
                                    </View>
                                </View>

                                <View className={`relative pl-3 mt-4 ${ride.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                                    <View className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full" />
                                    <View className="flex-row items-center gap-3 mb-2 z-10">
                                        <View className={`h-2.5 w-2.5 rounded-full ${ride.status === 'CANCELLED' ? 'bg-gray-400' : 'bg-purple-900'}`} />
                                        <Text className="text-gray-600 text-sm font-medium font-display" numberOfLines={1}>{ride.pickupAddress}</Text>
                                    </View>
                                    <View className="flex-row items-center gap-3 z-10">
                                        <View className={`h-2.5 w-2.5 rounded-sm ${ride.status === 'CANCELLED' ? 'bg-gray-300' : 'bg-gray-900'}`} />
                                        <Text className="text-gray-600 text-sm font-medium font-display" numberOfLines={1}>{ride.dropAddress}</Text>
                                    </View>
                                </View>

                                <View className="border-t border-gray-100 mt-4 pt-3 flex-row justify-between items-center">
                                    <TouchableOpacity
                                        className="flex-row items-center gap-1 ml-auto"
                                        onPress={() => navigation.navigate('RideHistoryDetails', { ride: ride })}
                                    >
                                        <Text className="text-purple-600 text-xs font-bold font-display">View Details</Text>
                                        <MaterialIcons name="arrow-forward" size={14} color="#9333EA" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                <View className="h-20" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default RideHistoryScreen;
