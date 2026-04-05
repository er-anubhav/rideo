import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { authService, normalizeIndianPhone } from '@/features/auth/authService';

const LoginScreen = ({ navigation }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);

    const handleGetOtp = async () => {
        let normalizedPhone = '';
        try {
            normalizedPhone = normalizeIndianPhone(phoneNumber);
        } catch {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        setIsLoading(true);
        try {
            if (normalizedPhone === '+919000000000') {
                // Hardcoded test user logic
                setOtp('123456');
                setIsOtpSent(true);
                Alert.alert('Testing Mode', 'Test user detected. OTP auto-filled.');
            } else {
                await authService.sendOtp(normalizedPhone);
                setIsOtpSent(true);
                Alert.alert('Success', 'Verification code sent successfully!');
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            Alert.alert('Error', 'Please enter a 6-digit verification code');
            return;
        }

        let normalizedPhone = '';
        try {
            normalizedPhone = normalizeIndianPhone(phoneNumber);
        } catch {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        setIsLoading(true);
        try {
            await authService.verifyOtp(normalizedPhone, otp);
            navigation.replace('LocationLoading');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Invalid verification code');
        } finally {
            setIsLoading(false);
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
                        <Text className="text-3xl font-extrabold tracking-tight mb-2 text-gray-900 font-display">Login via OTP</Text>
                        <Text className="text-gray-600 text-sm font-medium font-display text-center">Enter your mobile number to receive a verification code.</Text>
                    </View>

                    {/* Inputs */}
                    <View className="gap-6 w-full">
                        {/* Phone Number Input */}
                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-4 text-gray-700 uppercase tracking-wide font-display">Phone Number</Text>
                            <View className="relative">
                                <View className="absolute left-5 top-0 bottom-0 justify-center z-10 pointer-events-none">
                                    <MaterialIcons name="smartphone" size={20} color="#9333EA" />
                                </View>
                                <TextInput
                                    className="w-full rounded-full border border-gray-200 bg-gray-50 py-4 pl-14 pr-32 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-purple-600 focus:bg-white"
                                    placeholder="+91 90000 00000"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    editable={!isLoading && !isOtpSent}
                                />
                                <TouchableOpacity
                                    onPress={handleGetOtp}
                                    disabled={isLoading || isOtpSent}
                                    className={`absolute right-1.5 top-1.5 bottom-1.5 ${isOtpSent ? 'bg-green-500' : 'bg-purple-900'} items-center justify-center px-5 rounded-full shadow-lg active:scale-95`}
                                >
                                    {isLoading && !isOtpSent ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text className="text-white font-bold text-xs font-display">{isOtpSent ? 'SENT' : 'Get OTP'}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Verification Code Input */}
                        <View className={`gap-2 ${!isOtpSent ? 'opacity-50' : ''}`}>
                            <Text className="text-xs font-bold ml-4 text-gray-700 uppercase tracking-wide font-display">Verification Code</Text>
                            <View className="relative">
                                <View className="absolute left-5 top-0 bottom-0 justify-center z-10 pointer-events-none">
                                    <MaterialIcons name="lock" size={20} color="#9333EA" />
                                </View>
                                <TextInput
                                    className="w-full rounded-full border border-gray-200 bg-gray-50 py-4 pl-14 pr-4 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-purple-600 focus:bg-white tracking-widest"
                                    placeholder="• • • • • •"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={otp}
                                    onChangeText={setOtp}
                                    editable={!isLoading && isOtpSent}
                                />
                            </View>
                        </View>

                        {/* Proceed Button */}
                        <TouchableOpacity
                            onPress={handleVerifyOtp}
                            disabled={isLoading || !isOtpSent}
                            className={`mt-4 w-full rounded-full ${!isOtpSent ? 'bg-gray-300' : 'bg-purple-900'} py-4 items-center justify-center shadow-lg shadow-purple-600/30 active:scale-[0.98]`}
                        >
                            {isLoading && isOtpSent ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text className="text-lg font-bold text-white font-display">Verify & Proceed</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Footer Terms */}
                <View className="shrink-0 items-center px-4 pb-4 pt-2">
                    <Text className="text-xs text-center text-gray-500 leading-relaxed font-display">
                        By tapping &quot;Verify &amp; Proceed&quot;, you agree to our {"\n"}
                        <Text className="font-bold text-gray-900">Terms of Service</Text>
                        {" "}and{" "}
                        <Text className="font-bold text-gray-900">Privacy Policy</Text>.
                    </Text>
                </View>

            </SafeAreaView>
        </View>
    );
};

export default LoginScreen;
