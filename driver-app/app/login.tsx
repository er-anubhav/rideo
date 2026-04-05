import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { TextInput } from '@/components/CustomTextInput';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../global.css';
import { authService } from '@/features/auth/auth.service';
import { driverService, DriverProfile } from '@/features/dashboard/driver.service';

const getNextRoute = (profile: DriverProfile | null): '/dashboard' | '/verification/status' | '/verification/vehicle' | '/verification/details' => {
    if (!profile) return '/verification/details';

    if (!profile.vehicles || profile.vehicles.length === 0) {
        return '/verification/vehicle';
    }

    return profile.verificationStatus === 'APPROVED'
        ? '/dashboard'
        : '/verification/status';
};

const LoginScreen = () => {
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);

    const handleGetOTP = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            Toast.show({ type: 'error', text1: 'Invalid Phone', text2: 'Please enter a valid phone number' });
            return;
        }

        setOtpLoading(true);
        try {
            // Hardcoded OTP: Bypass external service
            // await authService.requestOTP(phoneNumber);
            setOtpSent(true);
            setOtp('123456');
            Toast.show({ type: 'success', text1: 'Success', text2: 'OTP generated automatically (123456)' });
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to send OTP' });
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyAndProceed = async () => {
        if (!otp || otp.length < 4) {
             Toast.show({ type: 'error', text1: 'Invalid OTP', text2: 'Please enter the OTP sent to your phone' });
            return;
        }

        setLoading(true);
        try {
            // Verify OTP and get token
            await authService.verifyOTP(phoneNumber, otp);

            // Check driver profile status
            try {
                const profile = await driverService.getProfile();

                router.replace(getNextRoute(profile));
            } catch {
                // No profile exists, go to verification
                router.replace('/verification/details');
            }
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to verify OTP' });
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
                        <Text className="text-3xl font-extrabold tracking-tight mb-2 text-gray-900 font-display">Login via OTP</Text>
                        <Text className="text-gray-600 text-sm font-medium font-display">Enter your mobile number to receive a verification code.</Text>
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
                                    placeholder="(555) 000-0000"
                                    placeholderTextColor="rgba(107, 114, 128, 0.6)"
                                    keyboardType="phone-pad"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    editable={!otpSent && !otpLoading}
                                />
                                <TouchableOpacity
                                    onPress={handleGetOTP}
                                    disabled={otpLoading || otpSent}
                                    className={`absolute right-1.5 top-1.5 bottom-1.5 items-center justify-center px-5 rounded-full shadow-lg active:scale-95 ${otpSent ? 'bg-green-600' : 'bg-purple-900'}`}
                                >
                                    {otpLoading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text className="text-white font-bold text-xs font-display">
                                            {otpSent ? '✓ Sent' : 'Get OTP'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Verification Code Input */}
                        <View className="gap-2">
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
                                    editable={otpSent && !loading}
                                />
                            </View>
                        </View>

                        {/* Proceed Button */}
                        <TouchableOpacity
                            onPress={handleVerifyAndProceed}
                            disabled={loading || !otpSent}
                            className={`mt-4 w-full rounded-full py-4 items-center justify-center shadow-lg shadow-purple-600/30 active:scale-[0.98] ${loading || !otpSent ? 'bg-gray-300' : 'bg-purple-900'}`}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text className="text-lg font-bold text-white font-display">Verify & Proceed</Text>
                            )}
                        </TouchableOpacity>

                        {/* Resend OTP */}
                        {otpSent && (
                            <TouchableOpacity
                                onPress={() => {
                                    setOtpSent(false);
                                    setOtp('');
                                }}
                                className="items-center"
                            >
                                <Text className="text-purple-600 font-bold text-sm font-display">Resend OTP</Text>
                            </TouchableOpacity>
                        )}
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
