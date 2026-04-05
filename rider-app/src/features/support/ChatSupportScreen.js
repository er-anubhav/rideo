import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { supportService } from '@/features/support/supportService';
import { loggingService } from '@/utils/loggingService';

const mapSender = (sender) => (sender === 'RIDER' ? 'user' : 'support');

const ChatSupportScreen = ({ navigation }) => {
    const [message, setMessage] = useState('');
    const [ticketId, setTicketId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState('OPEN');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const loadConversation = useCallback(async () => {
        setLoading(true);
        try {
            const conversation = await supportService.getConversation();
            setTicketId(conversation.ticketId || null);
            setStatus(conversation.status || 'OPEN');
            setMessages(
                (conversation.messages || []).map((item) => ({
                    id: item.id,
                    text: item.text,
                    sender: mapSender(item.sender),
                    time: new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                })),
            );
        } catch (error) {
            await loggingService.error(error?.message || 'Failed to fetch support conversation', 'SUPPORT_CHAT', {
                endpoint: '/support/chat',
            });
            Alert.alert('Support Unavailable', 'Unable to load support conversation right now.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadConversation();
        }, [loadConversation]),
    );

    const handleSend = async () => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage || sending) {
            return;
        }

        setSending(true);
        try {
            const conversation = await supportService.sendMessage(trimmedMessage);
            setMessage('');
            setTicketId(conversation.ticketId || null);
            setStatus(conversation.status || 'OPEN');
            setMessages(
                (conversation.messages || []).map((item) => ({
                    id: item.id,
                    text: item.text,
                    sender: mapSender(item.sender),
                    time: new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                })),
            );
        } catch (error) {
            await loggingService.error(error?.message || 'Failed to send support message', 'SUPPORT_CHAT', {
                endpoint: '/support/chat/message',
            });
            Alert.alert('Send Failed', error.response?.data?.message || 'Unable to send message right now.');
        } finally {
            setSending(false);
        }
    };

    const handleCloseTicket = async () => {
        if (status === 'CLOSED') {
            return;
        }

        try {
            const conversation = await supportService.closeTicket();
            setTicketId(conversation.ticketId || null);
            setStatus(conversation.status || 'CLOSED');
            setMessages(
                (conversation.messages || []).map((item) => ({
                    id: item.id,
                    text: item.text,
                    sender: mapSender(item.sender),
                    time: new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                })),
            );
        } catch (error) {
            await loggingService.error(error?.message || 'Failed to close support ticket', 'SUPPORT_CHAT', {
                endpoint: '/support/chat/close',
            });
            Alert.alert('Close Failed', 'Unable to close this ticket right now.');
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            <SafeAreaView className="bg-white z-10 border-b border-gray-100" edges={['top']}>
                <View className="flex-row items-center justify-between px-4 py-3">
                    <View className="flex-row items-center">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-1 rounded-full hover:bg-gray-50">
                            <MaterialIcons name="arrow-back" size={24} color="#111827" />
                        </TouchableOpacity>
                        <View>
                            <Text className="text-lg font-extrabold text-gray-900 font-display">Support Chat</Text>
                            <View className="flex-row items-center">
                                <View className={`w-2 h-2 rounded-full mr-1.5 ${status === 'CLOSED' ? 'bg-gray-400' : 'bg-green-500'}`} />
                                <Text className="text-xs text-gray-500 font-medium font-display">
                                    {ticketId ? `Ticket ${ticketId}` : 'No active ticket'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleCloseTicket}
                        disabled={status === 'CLOSED' || !ticketId}
                        className={`px-3 py-1.5 rounded-full border ${status === 'CLOSED' || !ticketId ? 'border-gray-200 bg-gray-100' : 'border-purple-200 bg-purple-50'}`}
                    >
                        <Text className={`text-xs font-bold font-display ${status === 'CLOSED' || !ticketId ? 'text-gray-400' : 'text-purple-700'}`}>
                            {status === 'CLOSED' ? 'Closed' : 'Close'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={0}
            >
                <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 20 }}>
                    <Text className="text-center text-xs text-gray-400 font-bold mb-6 font-display uppercase tracking-widest">Today</Text>

                    {loading ? (
                        <View className="py-12 items-center">
                            <ActivityIndicator color="#9333EA" />
                            <Text className="text-gray-500 text-sm mt-2 font-display">Loading conversation...</Text>
                        </View>
                    ) : messages.length === 0 ? (
                        <View className="py-12 items-center">
                            <MaterialIcons name="support-agent" size={42} color="#D1D5DB" />
                            <Text className="text-gray-500 text-sm mt-2 font-display">Start a chat and our team will respond.</Text>
                        </View>
                    ) : (
                        messages.map((msg) => (
                            <View
                                key={msg.id}
                                className={`mb-4 max-w-[80%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
                            >
                                <View
                                    className={`px-4 py-3 rounded-2xl ${msg.sender === 'user'
                                        ? 'bg-purple-900 rounded-tr-sm'
                                        : 'bg-gray-100 rounded-tl-sm'
                                        }`}
                                >
                                    <Text className={`text-sm font-display leading-5 ${msg.sender === 'user' ? 'text-white' : 'text-gray-900'}`}>
                                        {msg.text}
                                    </Text>
                                </View>
                                <Text className="text-[10px] text-gray-400 mt-1 font-medium px-1">{msg.time}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>

                <View className="p-4 bg-white border-t border-gray-100 pb-8">
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-full px-4 pr-2 py-1">
                        <TextInput
                            className="flex-1 h-10 text-gray-900 font-display mr-2"
                            placeholder={status === 'CLOSED' ? 'Ticket closed' : 'Type a message...'}
                            placeholderTextColor="#9CA3AF"
                            value={message}
                            onChangeText={setMessage}
                            editable={status !== 'CLOSED' && !sending}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!message.trim() || status === 'CLOSED' || sending}
                            className={`w-8 h-8 rounded-full items-center justify-center ${message.trim() && status !== 'CLOSED' && !sending ? 'bg-purple-900' : 'bg-gray-200'}`}
                        >
                            {sending ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <MaterialIcons name="send" size={16} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default ChatSupportScreen;
