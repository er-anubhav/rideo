import React, { useEffect, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

const LocationLoadingScreen = ({ navigation }) => {
    const [status, setStatus] = useState('Requesting location permission...');
    const [error, setError] = useState(null);

    const fetchLocation = useCallback(async () => {
        try {
            setStatus('Requesting location permission...');

            // Request location permission
            let { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setError('Location permission denied');
                setStatus('Please enable location to continue');
                // Navigate anyway after 2 seconds
                setTimeout(() => {
                    navigation.replace('Home', { locationError: true });
                }, 2000);
                return;
            }

            setStatus('Getting your location...');

            // Get current location
            let currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setStatus('Location found! Loading map...');

            // Pass location to Home screen
            setTimeout(() => {
                navigation.replace('Home', {
                    initialLocation: currentLocation,
                    mapRegion: {
                        latitude: currentLocation.coords.latitude,
                        longitude: currentLocation.coords.longitude,
                        latitudeDelta: 0.002, // Maximum zoom - very detailed street level
                        longitudeDelta: 0.002, // Maximum zoom - very detailed street level
                    }
                });
            }, 500);

        } catch (err) {
            console.error('Location error:', err);
            setError(err.message);
            setStatus('Unable to get location');
            // Navigate anyway after 2 seconds
            setTimeout(() => {
                navigation.replace('Home', { locationError: true });
            }, 2000);
        }
    }, [navigation]);

    useEffect(() => {
        fetchLocation();
    }, [fetchLocation]);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            <SafeAreaView className="flex-1 items-center justify-center px-6">
                <View className="items-center">
                    {/* Icon */}
                    <View className="w-20 h-20 rounded-full bg-purple-100 items-center justify-center mb-6">
                        {error ? (
                            <MaterialIcons name="location-off" size={40} color="#9333EA" />
                        ) : (
                            <MaterialIcons name="my-location" size={40} color="#9333EA" />
                        )}
                    </View>

                    {/* Status Text */}
                    <Text className="text-2xl font-bold text-gray-900 text-center mb-2 font-display">
                        {error ? 'Location Error' : 'Finding You'}
                    </Text>

                    <Text className="text-gray-600 text-center font-display font-medium">
                        {status}
                    </Text>

                    {error && (
                        <Text className="text-red-500 text-sm text-center mt-4 font-display">
                            {error}
                        </Text>
                    )}
                </View>
            </SafeAreaView>
        </View>
    );
};

export default LocationLoadingScreen;
