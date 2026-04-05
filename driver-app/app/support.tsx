import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../global.css';

export default function SupportScreen() {
    const router = useRouter();

    const FAQItem = ({ question, answer }: any) => (
        <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100">
            <Text className="font-bold text-gray-900 font-display mb-2">{question}</Text>
            <Text className="text-gray-500 text-sm font-display leading-relaxed">{answer}</Text>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50/50">
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="px-6 py-4 flex-row items-center gap-4 bg-white border-b border-gray-100">
                    <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
                        <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-900 font-display">Help & Support</Text>
                </View>

                <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
                    {/* Contact Channels */}
                    <Text className="text-gray-900 font-bold font-display text-base mb-4">Contact Us</Text>
                    <View className="flex-row gap-4 mb-8">
                        <TouchableOpacity className="flex-1 bg-[#EEF2FF] p-4 rounded-2xl items-center border border-[#E0E7FF] active:scale-95">
                            <View className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center mb-2">
                                <Ionicons name="chatbox" size={24} color="#6366F1" />
                            </View>
                            <Text className="font-bold text-indigo-900">Live Chat</Text>
                            <Text className="text-xs text-indigo-500 mt-1">Wait: 2 min</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-1 bg-[#ECFDF5] p-4 rounded-2xl items-center border border-[#D1FAE5] active:scale-95">
                            <View className="w-12 h-12 bg-emerald-100 rounded-full items-center justify-center mb-2">
                                <Ionicons name="call" size={24} color="#10B981" />
                            </View>
                            <Text className="font-bold text-emerald-900">Call Support</Text>
                            <Text className="text-xs text-emerald-500 mt-1">Utc: 24/7</Text>
                        </TouchableOpacity>
                    </View>

                    {/* FAQ */}
                    <Text className="text-gray-900 font-bold font-display text-base mb-4">Frequently Asked Questions</Text>
                    <FAQItem
                        question="How do I change my bank account?"
                        answer="Go to Earnings > Withdraw > Linked Accounts to update your bank details."
                    />
                    <FAQItem
                        question="Why was my ride cancelled?"
                        answer="Rides can be cancelled by passengers or due to timeouts. Check the specific ride in 'Trips' for details."
                    />
                    <FAQItem
                        question="How to improve my rating?"
                        answer="Keep your vehicle clean, be polite, and drive safely to ensure 5-star ratings."
                    />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
