import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';




const RateRideScreen = ({ navigation }) => {
    const [rating, setRating] = useState(4);
    const [tip, setTip] = useState(0);

    return (
        <View className="flex-1 bg-white relative">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="pt-12 pb-2 px-4 bg-white z-10 w-full">
                <View className="items-center justify-center">
                    <View className="h-1.5 w-12 rounded-full bg-gray-200 mb-4" />
                    <TouchableOpacity onPress={() => navigation.navigate('Home')} className="absolute right-0 top-0 pt-4">
                        <Text className="text-gray-500 text-sm font-semibold font-display">Skip</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pb-24" showsVerticalScrollIndicator={false}>
                <View className="text-center mb-6 items-center">
                    <Text className="text-2xl font-bold tracking-tight mb-1 text-gray-900 text-center font-display">How was your ride?</Text>
                    <Text className="text-gray-500 text-sm text-center font-display">You arrived at Cyber Hub, DLF Phase 2</Text>
                </View>

                <View className="items-center gap-4 mb-8">
                    <View className="relative">
                        <Image
                            source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHT3gpIIw7yuaBKq_wMIXK7WZgAT_1Gdxeco3KP7eCSiN34RLe-IJ8U4M-99upyCMWf0NOsQOc5t9zDQo6dTtRowGexY8o-FOPXiM7UT3nJTBdmopIGhblAYywPtzZugab-iySqBvlpLtW4MJsSZUE_RddDbVEJ9mj3UjyKoy6gv_dzuk5T48QcpU7xc1W5gYKQL3-o2SQkHWmcI4Bv1DOEqUaIHvnwoP4bsOpVeiAPT265cf4tQzVxuKReMxBL4oRRFWiVssIyiI" }}
                            className="w-24 h-24 rounded-full border-4 border-purple-50"
                        />
                        <View className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-full shadow-md border border-gray-100">
                            <MaterialIcons name="verified" size={18} color="#9333EA" />
                        </View>
                    </View>
                    <View className="items-center">
                        <Text className="text-xl font-bold text-gray-900 font-display">Rajesh Kumar</Text>
                        <Text className="text-gray-500 text-sm font-medium mt-1 font-display">Honda Shine • UP16 Z 1234</Text>
                    </View>
                </View>

                {/* Stars */}
                <View className="items-center gap-3 mb-8">
                    <View className="flex-row items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                <MaterialIcons
                                    name={star <= rating ? "star" : "star-border"}
                                    size={40}
                                    color={star <= rating ? "#FBBF24" : "#E5E7EB"}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text className="text-gray-900 font-semibold text-lg font-display">{rating >= 4 ? "Great!" : rating >= 3 ? "Good" : "Okay"}</Text>
                </View>

                {/* Tags */}
                <View className="mb-8">
                    <Text className="text-gray-900 font-bold text-sm mb-4 px-1 font-display">What went well?</Text>
                    <View className="flex-row flex-wrap gap-3">
                        {['Polite Driver', 'Clean Vehicle', 'Safe Ride', 'Punctual', 'Good Route'].map((tag) => (
                            <TouchableOpacity key={tag} className="h-9 px-4 rounded-full bg-white border border-gray-200 hover:border-purple-300 shadow-sm items-center justify-center">
                                <Text className="text-gray-600 text-sm font-medium font-display">{tag}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Tip */}
                <View className="mb-8">
                    <View className="flex-row justify-between items-end mb-4 px-1">
                        <Text className="text-gray-900 font-bold text-sm font-display">Add a tip for Rajesh</Text>
                        <Text className="text-gray-500 text-xs font-display">100% goes to driver</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 pb-2">
                        {[20, 50, 100].map((amount) => (
                            <TouchableOpacity
                                key={amount}
                                onPress={() => setTip(amount)}
                                className={`w-16 h-16 rounded-2xl items-center justify-center flex-col gap-0.5 border ${tip === amount ? 'bg-purple-900 border-purple-600 shadow-lg shadow-purple-600/30 transform scale-105' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                            >
                                <Text className={`text-xs ${tip === amount ? 'text-purple-100' : 'text-gray-500'}`}>₹</Text>
                                <Text className={`text-lg font-bold ${tip === amount ? 'text-white' : 'text-gray-900'}`}>{amount}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity className="w-16 h-16 rounded-2xl items-center justify-center bg-white border border-gray-200 flex-col gap-0.5 border-dashed">
                            <MaterialIcons name="edit" size={24} color="#9CA3AF" />
                            <Text className="text-[10px] font-medium text-gray-500 uppercase tracking-wide font-display">Custom</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <View className="mb-4">
                    <TextInput
                        multiline
                        placeholder="Leave a note for Rajesh..."
                        placeholderTextColor="#9CA3AF"
                        className="w-full h-32 bg-gray-50 rounded-xl p-4 text-sm text-gray-900 font-display border border-gray-200"
                    />
                </View>

            </ScrollView>

            <View className="absolute bottom-0 left-0 w-full p-4 bg-white/95 border-t border-gray-100">
                <TouchableOpacity
                    onPress={() => navigation.navigate('Home')}
                    className="w-full h-14 bg-purple-900 rounded-full items-center justify-center shadow-lg shadow-purple-600/30"
                >
                    <Text className="text-white text-base font-bold tracking-wide font-display">Submit Rating</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
};

export default RateRideScreen;
