import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/CustomText';
import { Ride, rideService } from '@/features/ride/ride.service';

interface RideRequestModalProps {
    visible: boolean;
    onAccept: (ride: Ride) => void;
    onReject: () => void;
    ride?: Ride | null;
}

const RideRequestModal = ({ visible, onAccept, onReject, ride }: RideRequestModalProps) => {
    const [accepting, setAccepting] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    if (!visible || !ride) return null;

    const handleAccept = async () => {
        setAccepting(true);
        try {
            const acceptedRide = await rideService.acceptRide(ride.id);
            onAccept(acceptedRide);
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to accept ride' });
        } finally {
            setAccepting(false);
        }
    };

    const handleReject = async () => {
        setRejecting(true);
        try {
            // You can add a reason for rejection if needed
            await rideService.cancelRide(ride.id, 'Driver declined');
            onReject();
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to reject ride' });
            onReject(); // Still close the modal
        } finally {
            setRejecting(false);
        }
    };

    // Format fare
    const formattedFare = `₹${ride.fare.toFixed(2)}`;
    const formattedDistance = `${ride.distance.toFixed(1)} km`;
    const riderRating = ride.rider?.rating?.toFixed(1) || '5.0';

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onReject}
        >
            <View className="flex-1 justify-end bg-black/50">
                {/* Modal Content */}
                <View className="bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl">

                    {/* Handle Bar */}
                    <View className="w-16 h-1.5 bg-gray-200 rounded-full self-center mb-6" />

                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <View>
                            <Text className="text-purple-600 font-bold text-xs uppercase tracking-widest font-display mb-1">New Request</Text>
                            <Text className="text-3xl font-extrabold text-gray-900 font-display">{formattedFare}</Text>
                        </View>
                        <View className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 items-center">
                            <Text className="text-gray-900 font-bold text-lg font-display">{formattedDistance}</Text>
                            <Text className="text-gray-400 text-[10px] font-bold uppercase font-display">Distance</Text>
                        </View>
                    </View>

                    {/* Route Visualizer */}
                    <View className="mb-8 relative pl-4">
                        {/* Connecting Line */}
                        <View className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-gray-200" />

                        {/* Pickup */}
                        <View className="flex-row items-center mb-6">
                            <View className="w-6 h-6 rounded-full bg-white border-[3px] border-green-500 z-10 mr-4 shadow-sm" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 font-bold uppercase font-display mb-0.5">Pick Up</Text>
                                <Text className="text-gray-900 font-bold text-base font-display" numberOfLines={1}>
                                    {ride.pickupAddress}
                                </Text>
                            </View>
                        </View>

                        {/* Dropoff */}
                        <View className="flex-row items-center">
                            <View className="w-6 h-6 rounded-full bg-white border-[3px] border-red-500 z-10 mr-4 shadow-sm" />
                            <View className="flex-1">
                                <Text className="text-xs text-gray-400 font-bold uppercase font-display mb-0.5">Drop Off</Text>
                                <Text className="text-gray-900 font-bold text-base font-display" numberOfLines={1}>
                                    {ride.dropAddress}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Passenger Info */}
                    <View className="flex-row items-center mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <View className="h-10 w-10 bg-purple-100 rounded-full items-center justify-center mr-3">
                            <MaterialIcons name="person" size={20} color="#9333EA" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 font-bold font-display">Passenger</Text>
                            <Text className="text-gray-400 text-xs font-display">Cash Payment</Text>
                        </View>
                        <View className="flex-row items-center bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                            <MaterialIcons name="star" size={14} color="#FBBF24" />
                            <Text className="text-gray-900 font-bold text-xs ml-1 font-display">{riderRating}</Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View className="flex-row gap-4">
                        <TouchableOpacity
                            onPress={handleReject}
                            disabled={accepting || rejecting}
                            className="flex-1 py-4 bg-gray-100 rounded-full items-center justify-center active:scale-95"
                        >
                            {rejecting ? (
                                <ActivityIndicator size="small" color="#6B7280" />
                            ) : (
                                <Text className="text-gray-500 font-bold text-lg font-display">Decline</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleAccept}
                            disabled={accepting || rejecting}
                            activeOpacity={0.9}
                            className="flex-[2] rounded-full shadow-lg shadow-green-500/30 overflow-hidden active:scale-95"
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                className="w-full h-full items-center justify-center py-4"
                            >
                                {accepting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text className="text-white font-bold text-lg font-display">Accept Ride</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

export default RideRequestModal;
