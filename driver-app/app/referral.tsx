import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../global.css';

export default function ReferralScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white">
            <LinearGradient
                colors={['#7C3aED', '#4C1D95']}
                className="absolute top-0 left-0 right-0 h-[45%]"
            />

            <SafeAreaView className="flex-1" edges={['top']}>
                <View className="px-6 py-4 flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                        <MaterialIcons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-white font-display">Refer & Earn</Text>
                </View>

                <View className="flex-1 px-6 items-center justify-center -mt-10">
                    <View className="bg-white p-8 w-full rounded-[2.5rem] shadow-2xl items-center shadow-purple-900/40">
                        <View className="w-20 h-20 bg-amber-100 rounded-full items-center justify-center mb-6 border-4 border-amber-50">
                            <FontAwesome5 name="gift" size={36} color="#D97706" />
                        </View>

                        <Text className="text-2xl font-bold text-gray-900 font-display text-center mb-2">Invite Friends</Text>
                        <Text className="text-gray-500 font-display text-center mb-8 px-4 leading-relaxed">
                            Share your code with friends. They get ₹100 off their first ride, and you earn ₹500!
                        </Text>

                        {/* Code Container */}
                        <View className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 items-center mb-6">
                            <Text className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Your Code</Text>
                            <Text className="text-3xl font-extrabold text-[#7C3aED] font-display tracking-widest">AMIT2024</Text>
                        </View>

                        <TouchableOpacity className="w-full shadow-lg shadow-purple-500/30 active:scale-[0.98]">
                            <LinearGradient
                                colors={['#7C3aED', '#6D28D9']}
                                className="w-full py-4 rounded-xl items-center"
                                style={{ borderRadius: 16 }}
                            >
                                <Text className="text-white font-bold font-display uppercase tracking-widest text-sm">Share Code</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Footer Stats */}
                <View className="pb-8 px-8">
                    <View className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex-row justify-between">
                        <View>
                            <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Total Earned</Text>
                            <Text className="text-2xl font-extrabold text-gray-900">₹2,500</Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Successful</Text>
                            <Text className="text-2xl font-extrabold text-green-600">5</Text>
                        </View>
                    </View>
                </View>

            </SafeAreaView>
        </View>
    );
}
