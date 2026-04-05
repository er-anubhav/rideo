import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { authService } from '@/features/auth/authService';
const WelcomeScreen = ({ navigation }) => {
    const checkLoginStatus = React.useCallback(async () => {
        try {
            const isAuth = await authService.isAuthenticated();
            if (isAuth) {
                // Validate token and refresh user snapshot before bypassing auth screens.
                await authService.getMe();
                navigation.replace('LocationLoading');
            }
        } catch {
            await authService.logout();
        }
    }, [navigation]);
    useEffect(() => {
        checkLoginStatus();
    }, [checkLoginStatus]);

    return (
        <View className="flex-1 bg-white relative">
            <StatusBar style="dark" />
            {/* Content Container */}
            <SafeAreaView className="flex-1 p-6">
    
    {/* Top Section */}
    <View className="gap-8">
        <View className="space-y-6">
            {/* Status Pill */}
            <View className="flex-row items-center mb-4 gap-2 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 self-start">
                <Text className="text-[12px] font-bold uppercase tracking-wider text-purple-700 font-display">
                    Ready to pickup
                </Text>
                <View className="w-2 h-2 bg-purple-900 rounded-full" />
            </View>

            {/* Title */}
            <Text className="text-4xl mb-4 font-extrabold tracking-tight leading-[1.05] text-gray-900 font-display">
                Your Ride, <Text className="text-purple-600">Your Way</Text>
            </Text>

            {/* Description */}
            <Text className="text-lg text-gray-600 font-medium leading-relaxed max-w-[80%] font-display">
                Skip the traffic. Whether you need a quick bike zip or a comfortable cab ride, we get you there.
            </Text>
        </View>
    </View>

    {/* Bottom Section */}
    <View className="mt-auto gap-1 pb-6">
        
        <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.9}
            className="w-full h-16 bg-purple-900 rounded-[2rem] flex-row items-center justify-between pl-2 pr-6 shadow-lg overflow-hidden"
        >
            <View className="w-12 h-12 bg-white rounded-full items-center justify-center">
                <MaterialIcons name="near-me" size={24} color="#9333EA" />
            </View>

            <Text className="flex-1 text-center text-white text-lg font-bold tracking-wide font-display">
                Let&apos;s Ride
            </Text>

            <MaterialIcons name="arrow-forward" size={24} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>

        <TouchableOpacity
            onPress={() => navigation.navigate('TestLogin')}
            className="bg-purple-100 border-2 rounded-full bg-purple-900 w-full py-4 rounded-2xl items-center justify-center"
        >
            <Text className="text-white text-base font-bold font-display">
                Testing User
            </Text>
            
        </TouchableOpacity>

        <View className="items-center">
            <View className="flex-row mt-4 items-center">
                <Text className="text-gray-500 text-sm font-medium font-display">
                    Login via
                </Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    className="flex-row items-center ml-1"
                >
                    <Text className="text-purple-600 text-sm font-bold font-display">
                        OTP
                    </Text>
                </TouchableOpacity>
            </View>
        </View>

    </View>

</SafeAreaView>
        </View>
    );
};

export default WelcomeScreen;
