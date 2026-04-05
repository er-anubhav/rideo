import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { notificationService } from '@/features/support/notificationService';
import { useFocusEffect } from '@react-navigation/native';

const InboxScreen = ({ navigation }) => {
    const [notifications, setNotifications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchNotifications();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            fetchNotifications();

            let intervalId = null;

            const startPolling = () => {
                if (intervalId) return;
                intervalId = setInterval(() => {
                    notificationService.getNotifications()
                        .then(data => setNotifications(data))
                        .catch(() => { });
                }, 10000); // 10 seconds interval
            };

            const stopPolling = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            };

            // Start initially
            startPolling();

            // Listen for app state changes (background/foreground)
            const subscription = AppState.addEventListener('change', nextAppState => {
                if (nextAppState === 'active') {
                    startPolling();
                    fetchNotifications(); // Immediate fetch on resume
                } else {
                    stopPolling();
                }
            });

            return () => {
                stopPolling();
                subscription.remove();
            };
        }, [])
    );

    const handleMarkAllRead = async () => {
        await notificationService.markAllAsRead();
        fetchNotifications();
    };

    const handleNotificationPress = async (item) => {
        if (!item.isRead) {
            await notificationService.markAsRead(item.id);
            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === item.id ? { ...n, isRead: true } : n
            ));
        }
    };

    const getIconData = (type) => {
        switch (type) {
            case 'PROMO': return { icon: 'local-offer', color: '#9333EA', bg: 'bg-purple-50' };
            case 'RIDE': return { icon: 'directions-car', color: '#059669', bg: 'bg-green-50' };
            case 'SYSTEM': return { icon: 'security', color: '#DC2626', bg: 'bg-red-50' };
            default: return { icon: 'notifications', color: '#4B5563', bg: 'bg-gray-100' };
        }
    };


    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <SafeAreaView className="bg-white z-10" edges={['top']}>
                <View className="flex-row mt-2 items-center justify-between px-6 pt-1 pb-4">
                    <Text className="text-2xl pt-2 font-extrabold text-gray-900 font-display">Inbox</Text>
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity onPress={handleMarkAllRead}>
                            <Text className="text-purple-600 font-bold text-sm font-display">Mark all as read</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9333EA']} />
                }
            >
                <Text className="text-gray-900 font-bold text-lg mb-4 mt-2 font-display">Recent</Text>

                {loading ? (
                    <Text className="text-gray-400 text-center mt-10">Loading...</Text>
                ) : notifications.length === 0 ? (
                    <View className="items-center mt-[30%] py-10">
                        <MaterialIcons name="notifications-none" size={48} color="#E5E7EB" />
                        <Text className="text-gray-400 mt-2 font-display">No notifications yet</Text>
                    </View>
                ) : (
                    notifications.map((item) => {
                        const { icon, color, bg } = getIconData(item.type);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => handleNotificationPress(item)}
                                className={`flex-row items-start p-4 mb-3 rounded-2xl border ${!item.isRead ? 'bg-white border-purple-100 shadow-sm' : 'bg-gray-50 border-gray-100'}`}
                            >
                                <View className={`h-12 w-12 rounded-full items-center justify-center ${bg} mr-4`}>
                                    <MaterialIcons name={icon} size={24} color={color} />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row justify-between items-start">
                                        <Text className={`text-base font-bold mb-1 flex-1 ${!item.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {item.title}
                                        </Text>
                                        <Text className="text-xs text-gray-400 font-medium font-display ml-2 mt-1">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text className={`text-sm leading-5 font-display ${!item.isRead ? 'text-gray-600' : 'text-gray-500'}`}>
                                        {item.body}
                                    </Text>
                                </View>
                                {!item.isRead && (
                                    <View className="absolute top-4 right-4 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                                )}
                            </TouchableOpacity>
                        );
                    })
                )}

                <View className="items-center py-6">
                    <Text className="text-gray-400 text-xs font-display">That&apos;s all for now</Text>
                </View>

                {/* Spacer for bottom tabs */}
                <View className="h-20" />
            </ScrollView>
        </View>
    );
};

export default InboxScreen;
