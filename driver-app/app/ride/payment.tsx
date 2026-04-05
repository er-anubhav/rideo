import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { TextInput } from '@/components/CustomTextInput';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../../global.css';

const PaymentScreen = () => {
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

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
                        <Text className="text-3xl font-extrabold text-[#7C3aED] font-display">₹240.00</Text>
                    </View>

                    <View className="space-y-3">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500 text-sm font-display">Base Fare</Text>
                            <Text className="text-gray-900 font-bold text-sm font-display">₹180.00</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500 text-sm font-display">Distance (4.2km)</Text>
                            <Text className="text-gray-900 font-bold text-sm font-display">₹42.00</Text>
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
                                <Text className="text-amber-700/60 text-xs font-display">Collect cash from passenger</Text>
                            </View>
                        </View>
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
                    onPress={() => router.push('/dashboard' as any)}
                >
                    <LinearGradient
                        colors={['#7C3aED', '#6D28D9']}
                        className="w-full py-4 rounded-xl items-center"
                        style={{ borderRadius: 16 }}
                    >
                        <Text className="text-white font-bold font-display text-lg">
                            Collect Cash & Done
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
};

export default PaymentScreen;
