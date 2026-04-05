import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { TextInput } from '@/components/CustomTextInput';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../../global.css';

const ChatScreen = () => {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        { id: 1, text: "Hi, I'm waiting at the pickup point.", sender: 'passenger', time: '10:23 AM' },
        { id: 2, text: "On my way! Traffic is a bit heavy.", sender: 'driver', time: '10:24 AM' },
    ]);

    const quickReplies = ["I'll be there in 5 mins", "Stuck in traffic", "I've arrived", "Call me please"];

    const sendMessage = (text: string) => {
        if (!text.trim()) return;

        const newMessage = {
            id: Date.now(),
            text: text,
            sender: 'driver',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages([...messages, newMessage]);
        setMessage('');
    };

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1" edges={['top']}>

                {/* Header */}
                <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between bg-white z-10 shadow-sm">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 active:bg-gray-100"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>

                    <View className="items-center">
                        <Text className="text-lg font-bold text-gray-900 font-display">Rohan K.</Text>
                        <View className="flex-row items-center gap-1">
                            <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <Text className="text-xs text-green-600 font-medium font-display">Online</Text>
                        </View>
                    </View>

                    <TouchableOpacity className="w-10 h-10 bg-emerald-50 rounded-full items-center justify-center border border-emerald-100 active:bg-emerald-100">
                        <Ionicons name="call" size={20} color="#10B981" />
                    </TouchableOpacity>
                </View>

                {/* Messages List */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        className="flex-1 px-4 bg-gray-50/50"
                        contentContainerStyle={{ paddingVertical: 20, gap: 16 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Time Divider */}
                        <View className="items-center mb-4">
                            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-3 py-1 bg-gray-100 rounded-full">Today</Text>
                        </View>

                        {messages.map((msg) => (
                            <View
                                key={msg.id}
                                className={`flex-row ${msg.sender === 'driver' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.sender === 'passenger' && (
                                    <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center mr-2 self-end mb-1 border border-white shadow-sm">
                                        <Ionicons name="person" size={16} color="#6B7280" />
                                    </View>
                                )}

                                <View
                                    className={`relative max-w-[75%] px-4 py-3 shadow-sm ${msg.sender === 'driver'
                                            ? 'bg-[#7C3aED] rounded-2xl rounded-tr-none'
                                            : 'bg-white rounded-2xl rounded-tl-none border border-gray-100'
                                        }`}
                                >
                                    <Text
                                        className={`text-[15px] font-medium leading-relaxed font-display ${msg.sender === 'driver' ? 'text-white' : 'text-gray-800'
                                            }`}
                                    >
                                        {msg.text}
                                    </Text>
                                    <View className="flex-row items-center justify-end gap-1 mt-1">
                                        <Text
                                            className={`text-[9px] ${msg.sender === 'driver' ? 'text-purple-200' : 'text-gray-400'
                                                }`}
                                        >
                                            {msg.time}
                                        </Text>
                                        {msg.sender === 'driver' && (
                                            <MaterialIcons name="done-all" size={12} color="#ddd6fe" />
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Quick Replies & Input */}
                    <View className="bg-white border-t border-gray-100 pb-8 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
                        {/* Quick Replies Scroll */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="py-3 pl-4 border-b border-gray-50 mb-2"
                        >
                            {quickReplies.map((reply, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => sendMessage(reply)}
                                    className="mr-2 bg-gray-50 px-3 py-2 rounded-full border border-gray-200 active:bg-purple-50 active:border-purple-200"
                                >
                                    <Text className="text-xs font-semibold text-gray-600 font-display">{reply}</Text>
                                </TouchableOpacity>
                            ))}
                            <View className="w-6" />
                        </ScrollView>

                        {/* Input Area */}
                        <View className="flex-row items-center px-4 gap-3">
                            <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center border border-gray-100 active:bg-gray-100">
                                <MaterialIcons name="add" size={24} color="#6B7280" />
                            </TouchableOpacity>

                            <View className="flex-1 flex-row items-center bg-gray-50 border border-gray-200 rounded-full px-4 h-12 focus:border-purple-500 transition-colors">
                                <TextInput
                                    className="flex-1 text-gray-900 font-display text-base h-full"
                                    placeholder="Type a message..."
                                    placeholderTextColor="#9CA3AF"
                                    value={message}
                                    onChangeText={setMessage}
                                    onSubmitEditing={() => sendMessage(message)}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={() => sendMessage(message)}
                                className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${message.trim()
                                        ? 'bg-[#7C3aED] shadow-purple-500/30'
                                        : 'bg-gray-200 shadow-none'
                                    }`}
                                disabled={!message.trim()}
                            >
                                <MaterialIcons
                                    name="send"
                                    size={20}
                                    color="white"
                                    style={{ marginLeft: 2 }}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

export default ChatScreen;
