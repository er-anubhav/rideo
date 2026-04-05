import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { authService, normalizeIndianPhone } from '@/features/auth/authService';

const getRequestUrl = (config) => {
    if (!config) return undefined;
    if (!config.url) return config.baseURL;
    if (/^https?:\/\//i.test(config.url)) return config.url;
    if (!config.baseURL) return config.url;
    return `${config.baseURL.replace(/\/+$/, '')}/${config.url.replace(/^\/+/, '')}`;
};

const getApiErrorMessage = (error, fallbackMessage) => {
    const message = error?.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) {
        return message[0];
    }
    if (typeof message === 'string' && message.trim().length > 0) {
        return message;
    }
    if (error?.request && !error?.response) {
        const requestUrl = getRequestUrl(error?.config);
        if (requestUrl) {
            return `Unable to reach API server at ${requestUrl}. Please check backend connectivity.`;
        }
        return 'Unable to reach API server. Please check backend connectivity.';
    }
    if (typeof error?.message === 'string' && error.message.trim().length > 0) {
        return error.message;
    }
    return fallbackMessage;
};

const TestLoginScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegisterAndProceed = async () => {
        if (!name || name.length < 2) {
            Alert.alert('Invalid Name', 'Please enter your name');
            return;
        }

        const sanitizedPhone = (phoneNumber || '').replace(/\D/g, '');
        if (!sanitizedPhone || sanitizedPhone.length < 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid test phone number');
            return;
        }

        setLoading(true);
        try {
            // Keep test login normalized to India format by default.
            const formattedPhone = normalizeIndianPhone(sanitizedPhone);
            
            // First we 'verify' the test OTP explicitly
            await authService.verifyOtp(formattedPhone, '123456');

            // Split name into first and last
            const [firstName, ...lastNames] = name.split(' ');
            const lastName = lastNames.join(' ');

            // Then we update the user's name since this is a test registration
            await authService.updateProfile({ firstName, lastName });

            navigation.replace('LocationLoading');
        } catch (error) {
            console.error('Test login failed:', error);
            Alert.alert('Error', getApiErrorMessage(error, 'Failed to login as test rider'));
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
                        onPress={() => navigation.goBack()}
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
                        <Text className="text-gray-600 text-sm font-medium font-display">Fast-track test rider registration.</Text>
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
                                    placeholder="Rider Name"
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
                                    placeholder="90000 00000"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    editable={!loading}
                                />
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
