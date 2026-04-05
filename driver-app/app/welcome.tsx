import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* Background Decorative Gradient */}
            <View className="absolute top-0 left-0 right-0 h-full w-full opacity-10">
                <LinearGradient
                    colors={['rgba(147, 51, 234, 0.2)', 'transparent', 'rgba(147, 51, 234, 0.1)']}
                    className="w-full h-full"
                />
            </View>

            <SafeAreaView className="flex-1 px-6 py-10 justify-between">
                {/* Brand Section */}
                <View className="items-center mt-10">
                    <Text className="text-4xl font-extrabold text-gray-900 tracking-tight font-display">
                        Mr. <Text className="text-purple-600">Rideo</Text>
                    </Text>
                    <View className="bg-purple-100 px-3 py-1 rounded-full mt-2">
                        <Text className="text-purple-600 font-bold text-xs tracking-widest uppercase">Driver Partner</Text>
                    </View>
                </View>

                {/* Content Section */}
                <View>
                    <Text className="text-3xl font-bold text-gray-900 leading-tight mb-4 font-display">
                        Your Journey,{"\n"}
                        <Text className="text-purple-600">Your Earnings.</Text>
                    </Text>
                    <Text className="text-gray-500 text-lg font-medium leading-relaxed mb-8">
                        Join the most premium fleet in India. Drive with pride, earn with confidence.
                    </Text>

                    {/* Features */}
                    <View className="gap-4 mb-10">
                        <View className="flex-row items-center gap-4">
                            <View className="h-10 w-10 bg-green-100 rounded-full items-center justify-center">
                                <MaterialIcons name="insights" size={20} color="#10B981" />
                            </View>
                            <Text className="text-gray-700 font-bold">Fast Payouts & Daily Rewards</Text>
                        </View>
                        <View className="flex-row items-center gap-4">
                            <View className="h-10 w-10 bg-blue-100 rounded-full items-center justify-center">
                                <MaterialIcons name="security" size={20} color="#3B82F6" />
                            </View>
                            <Text className="text-gray-700 font-bold">24/7 Safety & Partner Support</Text>
                        </View>
                        <View className="flex-row items-center gap-4">
                            <View className="h-10 w-10 bg-orange-100 rounded-full items-center justify-center">
                                <MaterialIcons name="history" size={20} color="#F59E0B" />
                            </View>
                            <Text className="text-gray-700 font-bold">Flexible Hours, Limitless Rides</Text>
                        </View>
                    </View>
                </View>

                {/* Action Section */}
                <View className="gap-4">
                    <TouchableOpacity
                        onPress={() => router.push('/login')}
                        className="bg-purple-900 w-full py-5 rounded-2xl items-center justify-center shadow-xl shadow-purple-600/30 active:scale-[0.98]"
                    >
                        <Text className="text-white text-lg font-bold">Get Started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/test-login')}
                        className="bg-purple-100 border-2 border-purple-200 w-full py-4 rounded-2xl items-center justify-center active:scale-[0.98]"
                    >
                        <Text className="text-purple-900 text-base font-bold font-display">Testing User</Text>
                    </TouchableOpacity>

                    <View className="flex-row justify-center items-center gap-2">
                        <Text className="text-gray-400 font-medium">Already a partner?</Text>
                        <TouchableOpacity onPress={() => router.push('/login')}>
                            <Text className="text-purple-600 font-bold">Manage Account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}
