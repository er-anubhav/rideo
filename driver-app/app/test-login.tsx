import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { TextInput } from '@/components/CustomTextInput';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../global.css';
import { authService } from '@/features/auth/auth.service';
const TestLoginScreen = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [vehicleType, setVehicleType] = useState('CAB_SEDAN');
    const [loading, setLoading] = useState(false);
    const handleRegisterAndProceed = async () => {
        if (!name || name.length < 2) {
            Toast.show({ type: 'error', text1: 'Invalid Name', text2: 'Please enter your name' });
            return;
        }
        if (!phoneNumber || phoneNumber.length < 10) {
            Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Please enter a valid phone number' });
            return;
        }
        setLoading(true);
        try {
            // Register and get token
            await authService.testDriverRegister(phoneNumber, name, vehicleType);
            
            Toast.show({ type: 'success', text1: 'Success', text2: 'Test Driver registered automatically' });
            
            // Go strictly to dashboard
            router.replace('/dashboard');
            
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to register test driver' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white relative">
            <StatusBar style="dark" />

            {/* Background Gradient */}
            <View className="absolute top-0 left-0 right-0 h-[500px] w-full pointer-events-none opacity-10 z-0">
                <LinearGradient
                    colors={['rgba(168, 85, 247, 0.15)', 'transparent']}
                    className="w-full h-full"
                />
            </View>

            <SafeAreaView className="flex-1 z-10 p-6 flex-col">

                {/* Header: Back Button */}
                <View className="flex-row items-center justify-between py-2">
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/');
                            }
                        }}
                        className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <View className="w-10" />
                </View>

                {/* Main Content */}
                <View className="flex-1 pt-[-10px] justify-center w-full py-2">
                    {/* Header Text */}
                    <View className="mb-10 text-center items-center">
                        <Text className="text-3xl font-extrabold tracking-tight mb-2 text-gray-900 font-display">Test Login</Text>
                        <Text className="text-gray-600 text-sm font-medium font-display">Fast-track test driver registration.</Text>
                    </View>

                    {/* Inputs */}
                    <View className="gap-6 w-full">
                        
                        {/* Name Input */}
                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-4 text-gray-700 uppercase tracking-wide font-display">Name</Text>
                            <View className="relative">
                                <View className="absolute left-5 top-0 bottom-0 justify-center z-10 pointer-events-none">
                                    <MaterialIcons name="person" size={20} color="#9333EA" />
                                </View>
                                <TextInput
                                    className="w-full rounded-full border border-gray-200 bg-gray-50 py-4 pl-14 pr-4 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-purple-600 focus:bg-white"
                                    placeholder="Driver Name"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                    value={name}
                                    onChangeText={setName}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Phone Number Input */}
                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-4 text-gray-700 uppercase tracking-wide font-display">Phone Number</Text>
                            <View className="relative">
                                <View className="absolute left-5 top-0 bottom-0 justify-center z-10 pointer-events-none">
                                    <MaterialIcons name="smartphone" size={20} color="#9333EA" />
                                </View>
                                <TextInput
                                    className="w-full rounded-full border border-gray-200 bg-gray-50 py-4 pl-14 pr-4 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-purple-600 focus:bg-white"
                                    placeholder="(555) 000-0000"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    editable={!loading}
                                />
                            </View>
                        </View>
                        
                        {/* Vehicle Type Selection */}
                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-4 text-gray-700 uppercase tracking-wide font-display">Vehicle Type</Text>
                            <View className="flex-row gap-4 mt-2 px-1">
                                <TouchableOpacity
                                    onPress={() => setVehicleType('BIKE')}
                                    className={`flex-1 py-4 items-center justify-center rounded-2xl border-2 ${vehicleType === 'BIKE' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-white'}`}
                                >
                                    <MaterialIcons name="two-wheeler" size={32} color={vehicleType === 'BIKE' ? '#9333EA' : '#6B7280'} />
                                    <Text className={`mt-2 font-bold ${vehicleType === 'BIKE' ? 'text-purple-600' : 'text-gray-500'}`}>Bike</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    onPress={() => setVehicleType('CAB_SEDAN')}
                                    className={`flex-1 py-4 items-center justify-center rounded-2xl border-2 ${vehicleType === 'CAB_SEDAN' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 bg-white'}`}
                                >
                                    <MaterialIcons name="local-taxi" size={32} color={vehicleType === 'CAB_SEDAN' ? '#9333EA' : '#6B7280'} />
                                    <Text className={`mt-2 font-bold ${vehicleType === 'CAB_SEDAN' ? 'text-purple-600' : 'text-gray-500'}`}>Car</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Proceed Button */}
                        <TouchableOpacity
                            onPress={handleRegisterAndProceed}
                            disabled={loading}
                            className={`mt-4 w-full rounded-full py-4 items-center justify-center shadow-lg shadow-purple-600/30 active:scale-[0.98] ${loading ? 'bg-gray-300' : 'bg-purple-900'}`}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text className="text-lg font-bold text-white font-display">Register & Proceed</Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </View>

            </SafeAreaView>
        </View>
    );
};

export default TestLoginScreen;
