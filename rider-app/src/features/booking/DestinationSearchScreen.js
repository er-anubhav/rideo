import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { geocodingService } from '@/features/booking/geocodingService';

const DestinationSearchScreen = ({ navigation, route }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [recentDestinations, setRecentDestinations] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load recent destinations on mount
    useEffect(() => {
        loadRecentDestinations();
    }, []);

    const loadRecentDestinations = async () => {
        const recent = await geocodingService.getRecentDestinations();
        setRecentDestinations(recent);
    };

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length < 4) {
            setSearchResults([]);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        const timeoutId = setTimeout(async () => {
            try {
                const pickup = route.params?.pickup;
                const results = await geocodingService.searchPlaces(searchQuery, pickup?.lat, pickup?.lon);
                setSearchResults(results);
            } catch {
                setError('Search failed. Please try again.');
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSelectLocation = async (location) => {
        setIsLoading(true);

        try {
            let finalLat = location.lat;
            let finalLon = location.lon;

            // If Mappls AutoSuggest did not provide coordinates (0, 0), resolve them
            if (!finalLat || !finalLon || (finalLat === 0 && finalLon === 0)) {
                // Pass the full address without redundantly prefixing the name
                const searchString = location.fullAddress || location.name;
                
                // Try Expo Location natively (Super accurate & precise using Google/Apple Play Services)
                try {
                    let locationResult = await Location.geocodeAsync(searchString);
                    if (!locationResult || locationResult.length === 0) {
                        // Fallback: search just the name
                        locationResult = await Location.geocodeAsync(location.name);
                    }
                    if (locationResult && locationResult.length > 0) {
                        finalLat = locationResult[0].latitude;
                        finalLon = locationResult[0].longitude;
                    } else {
                        throw new Error("Could not find native coordinates");
                    }
                } catch (expoErr) {
                    // Ultimate fallback to backend string matching
                    const coords = await geocodingService.getPlaceDetails(searchString);
                    finalLat = coords.lat;
                    finalLon = coords.lon;
                }
                
                // Update the location object with real coords for recent destinations
                location.lat = finalLat;
                location.lon = finalLon;
            }

            // Save to recent destinations
            await geocodingService.saveRecentDestination(location);

            // Get pickup from route params
            const pickup = route.params?.pickup || {
                lat: 0,
                lon: 0,
                address: 'Current Location'
            };

            setIsLoading(false);

            // Navigate directly to RideDetails, replacing Search in history
            navigation.replace('RideDetails', {
                pickup: pickup,
                drop: {
                    lat: finalLat,
                    lon: finalLon,
                    address: location.name
                }
            });
        } catch (err) {
            setIsLoading(false);
            setError('Could not get coordinates for this location. Please try another.');
        }
    };

    const renderLocationItem = (location, isRecent = false) => (
        <TouchableOpacity
            key={location.id}
            onPress={() => handleSelectLocation(location)}
            className="flex-row items-center p-4 border-b border-gray-100 active:bg-gray-50"
        >
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isRecent ? 'bg-purple-100' : 'bg-gray-100'}`}>
                <MaterialIcons
                    name={isRecent ? 'history' : 'location-on'}
                    size={20}
                    color={isRecent ? '#9333EA' : '#6B7280'}
                />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base font-display">{location.name}</Text>
                {location.fullAddress && (
                    <Text className="text-gray-500 text-sm font-display mt-0.5" numberOfLines={1}>
                        {location.fullAddress}
                    </Text>
                )}
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            <SafeAreaView className="bg-white" edges={['top']}>
                {/* Header Section */}
                <View className="px-5 py-4 border-b border-gray-100 shadow-sm">
                    {/* Back Button and Title */}
                    <View className="flex-row items-center mb-6">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 mr-4"
                        >
                            <MaterialIcons name="arrow-back" size={22} color="#111827" />
                        </TouchableOpacity>
                        <Text className="text-xl font-bold font-display text-gray-900">Enter Destination</Text>
                    </View>

                    {/* Search Container */}
                    <View className="flex-row">
                        {/* Route Line/Icons */}
                        <View className="items-center mr-4 pt-4">
                            <View className="w-2.5 h-2.5 rounded-full bg-purple-900" />
                            <View className="w-0.5 h-10 bg-gray-200 border-l border-dashed border-gray-300 my-1" />
                            <View className="w-2.5 h-2.5 rounded-sm bg-gray-900" />
                        </View>

                        {/* Inputs Container */}
                        <View className="flex-1 gap-3">
                            {/* Pickup (Read-only) */}
                            <View className="h-11 bg-gray-50 rounded-xl px-4 flex-row items-center border border-gray-100">
                                <Text className="flex-1 text-gray-500 font-display text-sm" numberOfLines={1}>
                                    {route.params?.pickup?.address || 'Current Location'}
                                </Text>
                            </View>

                            {/* Destination Input */}
                            <View className="h-11 bg-purple-50 rounded-xl px-4 flex-row items-center border border-purple-100">
                                <TextInput
                                    className="flex-1 text-purple-900 font-display font-medium text-sm"
                                    placeholder="Enter destination"
                                    placeholderTextColor="#A855F7"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <MaterialIcons name="close" size={18} color="#9333EA" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Favorite/Plus icon optional */}
                        <View className="justify-center ml-2">
                            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
                                <MaterialIcons name="add" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView className="flex-1">
                {/* Loading State */}
                {isLoading && (
                    <View className="flex-row items-center justify-center py-8">
                        <ActivityIndicator size="small" color="#9333EA" />
                        <Text className="text-gray-500 ml-3 font-display">Searching...</Text>
                    </View>
                )}

                {/* Error State */}
                {error && (
                    <View className="px-4 py-8">
                        <Text className="text-red-500 text-center font-display">{error}</Text>
                    </View>
                )}

                {/* Search Results */}
                {!isLoading && searchQuery.trim().length >= 4 && searchResults.length > 0 && (
                    <View className="mt-2">
                        <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider px-4 py-2 font-display">
                            Search Results
                        </Text>
                        {searchResults.map(location => renderLocationItem(location, false))}
                    </View>
                )}

                {/* No Results */}
                {!isLoading && searchQuery.trim().length >= 4 && searchResults.length === 0 && !error && (
                    <View className="px-4 py-8">
                        <Text className="text-gray-400 text-center font-display">No locations found in India</Text>
                    </View>
                )}

                {/* Recent Destinations */}
                {searchQuery.trim().length < 4 && recentDestinations.length > 0 && (
                    <View className="mt-2">
                        <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider px-4 py-2 font-display">
                            Recent Destinations
                        </Text>
                        {recentDestinations.map(location => renderLocationItem(location, true))}
                    </View>
                )}

                {/* Empty State */}
                {searchQuery.trim().length < 4 && recentDestinations.length === 0 && (
                    <View className="items-center justify-center mt-[40%] py-16">
                        <MaterialIcons name="location-searching" size={48} color="#E5E7EB" />
                        <Text className="text-gray-400 mt-4 font-display">Search for a destination in India</Text>
                        <Text className="text-gray-400 text-sm mt-1 font-display">Type at least 4 characters</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

export default DestinationSearchScreen;
