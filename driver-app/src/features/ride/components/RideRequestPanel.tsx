import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/CustomText';

const { width } = Dimensions.get('window');

interface RideRequestProps {
    visible: boolean;
    onAccept: () => void;
    onReject: () => void;
    tripDetails?: {
        pickup: string;
        dropoff: string;
        fare: string;
        distance: string;
        time: string;
        rating: string;
    }
}

const RideRequestPanel = ({ visible, onAccept, onReject, tripDetails }: RideRequestProps) => {
    // Start off-screen to the LEFT (-width)
    const slideAnim = useRef(new Animated.Value(-width)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 20,
                    stiffness: 90
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -width, // Slide back out to left
                    duration: 300,
                    useNativeDriver: true
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [visible, fadeAnim, slideAnim]);

    if (!visible) return null;

    const details = tripDetails || {
        pickup: "7958 Swift Village",
        dropoff: "105 William St, Chicago, US",
        fare: "Rs 250.00",
        distance: "5.2 km",
        time: "14 min",
        rating: "4.8"
    };

    return (
        <>
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim, zIndex: 40 }
                ]}
                pointerEvents="auto"
            />
            <Animated.View
                className="absolute top-[20%] left-4 right-4 bg-white rounded-3xl shadow-xl shadow-gray-900/10 border border-gray-100 overflow-hidden"
                style={{ transform: [{ translateX: slideAnim }], zIndex: 50 }}
            >
                <View className="p-6">
                    {/* Header Row: Fare & Time */}
                    <View className="flex-row justify-between items-center mb-5">
                        <View className="flex-row items-center gap-2">
                            <View className="bg-purple-100 px-3 py-1.5 rounded-lg">
                                <Text className="text-purple-700 font-bold text-xs uppercase tracking-wide font-display">New Request</Text>
                            </View>
                            <Text className="text-gray-500 text-sm font-bold font-display">- {details.time} away</Text>
                        </View>
                        <Text className="text-3xl font-extrabold text-black font-display">{details.fare}</Text>
                    </View>

                    {/* Locations (Compact) */}
                    <View className="mb-6 space-y-3">
                        <View className="flex-row items-center">
                            <View className="w-3 h-3 rounded-full bg-green-500 mr-3" />
                            <Text className="text-black font-bold text-sm font-display flex-1" numberOfLines={1}>{details.pickup}</Text>
                        </View>
                        <View className="flex-row items-center">
                            <View className="w-3 h-3 rounded-full bg-red-500 mr-3" />
                            <Text className="text-black font-bold text-sm font-display flex-1" numberOfLines={1}>{details.dropoff}</Text>
                        </View>
                    </View>

                    {/* Compact Actions */}
                    <View className="flex-row gap-3 mt-2">
                        <TouchableOpacity
                            onPress={onReject}
                            className="flex-1 h-11 bg-gray-50 rounded-xl items-center justify-center active:bg-gray-100 border border-gray-200"
                        >
                            <Text className="text-gray-600 font-bold text-sm font-display">Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onAccept}
                            activeOpacity={0.9}
                            className="flex-1 h-11 rounded-xl shadow-sm shadow-purple-500/20 active:scale-95 overflow-hidden"
                        >
                            <LinearGradient
                                colors={['#9333EA', '#7E22CE']}
                                className="w-full h-full items-center justify-center"
                            >
                                <Text className="text-white font-bold text-sm font-display">Accept</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </>
    );
};

export default RideRequestPanel;


