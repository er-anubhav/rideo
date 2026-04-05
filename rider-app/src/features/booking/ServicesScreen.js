import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const ServicesScreen = ({ navigation }) => {
    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* Header */}
            <SafeAreaView className="bg-white z-10" edges={['top']}>
                <View className="flex-row items-center justify-between px-6 pt-1 pb-4">
                    <Text className="text-2xl pt-2 font-extrabold text-gray-900 font-display">Services</Text>
                    <TouchableOpacity className="w-8 h-8 mt-2 bg-gray-50 rounded-full items-center justify-center border border-gray-200">
                        <MaterialIcons name="search" size={20} color="#111827" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                {/* Recent Activity / Promo */}
                <Text className="text-gray-900 font-bold text-lg mb-4 font-display">Promotions</Text>
                <TouchableOpacity className="rounded-2xl bg-purple-900 p-5 mb-8 shadow-lg shadow-purple-600/20 relative overflow-hidden">
                    <View className="w-[60%]">
                        <Text className="text-white font-bold text-xl mb-1 font-display">Get 20% off</Text>
                        <Text className="text-purple-100 text-sm mb-4 font-display">On your first intercity ride this weekend.</Text>
                        <View className="bg-white/20 self-start px-3 py-1.5 rounded-full">
                            <Text className="text-white text-xs font-bold font-display px-2">USE CODE: WEEKEND</Text>
                        </View>
                    </View>

                    {/* Decorative Elements */}
                    <View className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <View className="absolute right-[-10] top-1/2 -translate-y-1/2">
                        <MaterialIcons name="campaign" size={80} color="rgba(255,255,255,0.2)" />
                    </View>
                </TouchableOpacity>


                {/* Suggestions Section */}
                <Text className="text-gray-900 font-bold text-lg mb-4 mt-2 font-display">Suggestions</Text>
                <View className="flex-row justify-between mb-8">
                    <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 shadow-sm border border-gray-200 items-center gap-2" onPress={() => navigation.navigate('Home')}>
                        <View className="h-14 w-14 bg-purple-50 rounded-full items-center justify-center mb-1">
                            <MaterialIcons name="local-taxi" size={28} color="#9333EA" />
                        </View>
                        <Text className="text-gray-900 font-bold text-base font-display">Ride</Text>
                        <Text className="text-gray-500 text-xs text-center font-display">Go anywhere</Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 shadow-sm border border-gray-200 items-center gap-2">
                        <View className="h-14 w-14 bg-purple-50 rounded-full items-center justify-center mb-1">
                            <MaterialIcons name="local-shipping" size={28} color="#9333EA" />
                        </View>
                        <Text className="text-gray-900 font-bold text-base font-display">Package</Text>
                        <Text className="text-gray-500 text-xs text-center font-display">Send instantly</Text>
                    </TouchableOpacity>
                </View>

                {/* Go Anywhere Section */}
                <Text className="text-gray-900 font-bold text-lg mb-4 font-display">Go Anywhere</Text>
                <View className="bg-white rounded-2xl p-0 border border-gray-200 overflow-hidden mb-6 shadow-sm">
                    <View className="flex-row flex-wrap">
                        <TouchableOpacity className="w-1/4 items-center py-4 border-r border-b border-gray-100" onPress={() => navigation.navigate('Home')}>
                            <View className="h-10 w-10 bg-purple-50 rounded-full items-center justify-center mb-2">
                                <MaterialIcons name="two-wheeler" size={20} color="#9333EA" />
                            </View>
                            <Text className="text-gray-900 font-medium text-xs font-display">Bike</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="w-1/4 items-center py-4 border-r border-b border-gray-100">
                            <View className="h-10 w-10 bg-purple-50 rounded-full items-center justify-center mb-2">
                                <MaterialIcons name="electric-rickshaw" size={20} color="#9333EA" />
                            </View>
                            <Text className="text-gray-900 font-medium text-xs font-display">Auto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="w-1/4 items-center py-4 border-r border-b border-gray-100">
                            <View className="h-10 w-10 bg-purple-50 rounded-full items-center justify-center mb-2">
                                <MaterialIcons name="local-taxi" size={20} color="#9333EA" />
                            </View>
                            <Text className="text-gray-900 font-medium text-xs font-display">Rentals</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="w-1/4 items-center py-4 border-b border-gray-100">
                            <View className="h-10 w-10 bg-purple-50 rounded-full items-center justify-center mb-2">
                                <MaterialIcons name="commute" size={20} color="#9333EA" />
                            </View>
                            <Text className="text-gray-900 font-medium text-xs font-display">Intercity</Text>
                        </TouchableOpacity>

                        {/* Second Row */}
                        <TouchableOpacity className="w-1/4 items-center py-4 border-r border-gray-100">
                            <View className="h-10 w-10 bg-purple-50 rounded-full items-center justify-center mb-2">
                                <MaterialIcons name="directions-bus" size={20} color="#9333EA" />
                            </View>
                            <Text className="text-gray-900 font-medium text-xs font-display">Shuttle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="w-1/4 items-center py-4 border-r border-gray-100">
                            <View className="h-10 w-10 bg-purple-50 rounded-full items-center justify-center mb-2">
                                <MaterialIcons name="train" size={20} color="#9333EA" />
                            </View>
                            <Text className="text-gray-900 font-medium text-xs font-display">Train</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                

            </ScrollView>
        </View>
    );
};

export default ServicesScreen;
