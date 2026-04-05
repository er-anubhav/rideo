import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const HelpCenterScreen = ({ navigation }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const FAQ_ITEMS = [
        {
            category: 'Rides',
            items: [
                { id: 1, question: 'How do I schedule a ride?', answer: 'You can schedule a ride by tapping the clock icon on the home screen next to the "Where to?" box.' },
                { id: 2, question: 'Can I change my destination during a trip?', answer: 'Yes, ask your driver or tap "Edit destination" on the trip screen.' },
            ]
        },
        {
            category: 'Payment',
            items: [
                { id: 3, question: 'What payment methods are accepted?', answer: 'We accept credit/debit cards, UPI, and cash.' },
                { id: 4, question: 'How do I add a promo code?', answer: 'Go to the Payment section or enter it before confirming your ride.' },
            ]
        },
        {
            category: 'Account',
            items: [
                { id: 5, question: 'How do I change my phone number?', answer: 'Phone changes require verification. Contact support chat and we will help securely update it.' },
            ]
        }
    ];

    const CONTACT_OPTIONS = [
        { id: 'chat', label: 'Chat with Support', icon: 'chat', color: '#9333EA', bg: 'bg-purple-50' },
        { id: 'call', label: 'Call Customer Care', icon: 'call', color: '#10B981', bg: 'bg-green-50' },
        { id: 'email', label: 'Email Us', icon: 'email', color: '#3B82F6', bg: 'bg-blue-50' },
    ];

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            {/* Header */}
            <SafeAreaView className="bg-white z-10" edges={['top']}>
                <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1 rounded-full hover:bg-gray-50">
                        <MaterialIcons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text className="text-xl font-extrabold text-gray-900 font-display">Help Center</Text>
                </View>

                {/* Search Bar */}
                <View className="px-4 pb-4 pt-2">
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                        <MaterialIcons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            placeholder="Search for help..."
                            placeholderTextColor="#9CA3AF"
                            className="flex-1 ml-2 text-gray-900 font-display"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>

                {/* Contact Options */}
                <Text className="text-gray-900 font-bold text-lg mb-3 mt-4 font-display">Contact Us</Text>
                <View className="flex-row justify-between mb-6">
                    {CONTACT_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            onPress={() => option.id === 'chat' && navigation.navigate('ChatSupport')}
                            className="w-[31%] bg-white border border-gray-100 rounded-2xl p-3 items-center shadow-sm"
                        >
                            <View className={`h-10 w-10 rounded-full items-center justify-center mb-2 ${option.bg}`}>
                                <MaterialIcons name={option.icon} size={20} color={option.color} />
                            </View>
                            <Text className="text-gray-900 text-xs font-bold text-center font-display leading-4">{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* FAQs */}
                <Text className="text-gray-900 font-bold text-lg mb-3 font-display">Frequently Asked</Text>
                {FAQ_ITEMS.map((section, index) => (
                    <View key={index} className="mb-4">
                        <Text className="text-purple-600 font-semibold text-sm mb-2 font-display uppercase tracking-wider">{section.category}</Text>
                        <View className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            {section.items.map((item, itemIndex) => {
                                const isExpanded = expandedId === item.id;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => setExpandedId(isExpanded ? null : item.id)}
                                        className={`p-4 ${itemIndex !== section.items.length - 1 ? 'border-b border-gray-50' : ''}`}
                                        activeOpacity={0.7}
                                    >
                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-gray-900 font-bold text-sm font-display flex-1 mr-2">{item.question}</Text>
                                            <MaterialIcons
                                                name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                                size={20}
                                                color="#9CA3AF"
                                            />
                                        </View>
                                        {isExpanded && (
                                            <Text className="text-gray-500 text-xs leading-relaxed font-display mt-2">
                                                {item.answer}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                ))}

                {/* Recent Tickets Section (Mock) */}
                <Text className="text-gray-900 font-bold text-lg mb-3 mt-2 font-display">Recent Tickets</Text>
                <View className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm mb-8">
                    <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-row items-center gap-2">
                            <MaterialIcons name="confirmation-number" size={16} color="#9333EA" />
                            <Text className="text-gray-900 font-bold text-sm font-display">Ticket #2049</Text>
                        </View>
                        <View className="bg-green-100 px-2 py-0.5 rounded border border-green-200">
                            <Text className="text-green-700 text-[10px] font-bold uppercase tracking-wide">Resolved</Text>
                        </View>
                    </View>
                    <Text className="text-gray-900 font-medium text-xs font-display mb-1">Refund for Ride #9823</Text>
                    <Text className="text-gray-500 text-[10px] font-display">Updated 2 days ago</Text>
                </View>

                <View className="h-8" />

            </ScrollView>
        </View>
    );
};

export default HelpCenterScreen;
