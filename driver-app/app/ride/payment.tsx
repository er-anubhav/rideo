import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { TextInput } from '@/components/CustomTextInput';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentService } from '@/api/payment.service';
import { rideService } from '@/features/ride/ride.service';
import { appLogger } from '@/utils/app-logger';
import '../../global.css';

const PaymentScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [rideData, setRideData] = useState<any>(null);

    useEffect(() => {
        // Get ride data from current ride
        const loadRideData = async () => {
            try {
                const currentRide = await rideService.getCurrentRide();
                setRideData(currentRide);
            } catch (error) {
                appLogger.error('Failed to load ride data', error);
            }
        };
        loadRideData();
    }, []);

    const handleConfirmPayment = async () => {
        if (!rideData?.id) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'No ride data found' });
            return;
        }

        setLoading(true);
        try {
            // FIX: Confirm payment with backend
            const result = await paymentService.confirmPayment(rideData.id);
            setPaymentConfirmed(true);
            
            Toast.show({
                type: 'success',
                text1: 'Payment Confirmed!',
                text2: `₹${result.amount} confirmed as received`,
            });
            
            appLogger.info('Payment confirmed for ride:', rideData.id);
            
            // Navigate to dashboard after a short delay
            setTimeout(() => {
                router.push('/dashboard' as any);
            }, 1500);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to confirm payment',
            });
            appLogger.error('Payment confirmation failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 1 }}>
                {/* Header */}
                <SafeAreaView className="pb-6 mt-8 pt-4 rounded-b-[2rem]">
                    <View className="px-6 pt-2 items-center">
                        <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4 border-4 border-white shadow-md">
                            <MaterialIcons name="check" size={32} color="#10B981" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 font-display mb-1">Ride Completed!</Text>
                        <Text className="text-sm text-gray-500 font-display">Fri, 12 Oct • 11:42 AM</Text>
                    </View>
                </SafeAreaView>

                {/* Fare Summary Card */}
                <View className="mx-6 bg-white p-6 rounded-3xl">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-gray-900 font-bold text-lg font-display">Total Fare</Text>
                        <Text className="text-3xl font-extrabold text-[#7C3aED] font-display">
                            ₹{rideData?.actualFare?.toFixed(2) || rideData?.fare?.toFixed(2) || '240.00'}
                        </Text>
                    </View>

                    <View className="space-y-3">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500 text-sm font-display">Base Fare</Text>
                            <Text className="text-gray-900 font-bold text-sm font-display">
                                ₹{rideData?.baseFare?.toFixed(2) || '180.00'}
                            </Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500 text-sm font-display">
                                Distance ({rideData?.actualDistanceKm?.toFixed(1) || rideData?.distanceKm?.toFixed(1) || '4.2'}km)
                            </Text>
                            <Text className="text-gray-900 font-bold text-sm font-display">
                                ₹{((rideData?.actualDistanceKm || rideData?.distanceKm || 4.2) * 10).toFixed(2)}
                            </Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500 text-sm font-display">Platform Fee</Text>
                            <Text className="text-gray-900 font-bold text-sm font-display">₹10.00</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500 text-sm font-display">Taxes</Text>
                            <Text className="text-gray-900 font-bold text-sm font-display">₹8.00</Text>
                        </View>
                    </View>

                    <View className="h-[1px] bg-gray-100 my-6" />

                    <View className="flex-row items-center justify-between bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
                                <Text className="text-lg">💵</Text>
                            </View>
                            <View>
                                <Text className="text-amber-900 font-bold text-sm font-display">Cash Payment</Text>
                                <Text className="text-amber-700/60 text-xs font-display">
                                    {paymentConfirmed ? 'Payment Confirmed ✓' : 'Collect cash from passenger'}
                                </Text>
                            </View>
                        </View>
                        {paymentConfirmed && (
                            <MaterialIcons name="check-circle" size={24} color="#10B981" />
                        )}
                    </View>
                </View>

                {/* Rate Passenger */}
                <View className="mx-6 mt-8">
                    <Text className="text-center text-gray-900 font-bold text-lg font-display mb-2">Rate Passenger</Text>
                    <Text className="text-center text-gray-500 text-sm font-display mb-6">How was your experience with Rohan?</Text>

                    <View className="flex-row justify-center gap-2 mb-8">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => setRating(star)}
                                className="active:scale-110 transition-transform"
                            >
                                <MaterialIcons
                                    name="star"
                                    size={42}
                                    color={star <= rating ? "#F59E0B" : "#E5E7EB"}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-2xl p-4 font-display mx-4 text-gray-900 min-h-[100px] text-justify"
                        placeholder="Add a comment (optional)..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        textAlignVertical="top"
                        value={comment}
                        onChangeText={setComment}
                    />
                </View>
            </ScrollView>

            {/* Bottom Action */}
            <SafeAreaView className="bg-white border-t border-gray-50 p-6 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                <TouchableOpacity
                    className="w-full px-6 shadow-lg shadow-[#7C3aED]/25"
                    onPress={handleConfirmPayment}
                    disabled={loading || paymentConfirmed}
                >
                    <LinearGradient
                        colors={paymentConfirmed ? ['#10B981', '#059669'] : ['#7C3aED', '#6D28D9']}
                        className="w-full py-4 rounded-xl items-center"
                        style={{ borderRadius: 16, opacity: (loading || paymentConfirmed) ? 0.7 : 1 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold font-display text-lg">
                                {paymentConfirmed ? 'Payment Confirmed ✓' : `Confirm Cash Received (₹${rideData?.actualFare?.toFixed(2) || rideData?.fare?.toFixed(2) || '240.00'})`}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
};

export default PaymentScreen;
