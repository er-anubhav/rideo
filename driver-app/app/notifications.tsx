import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/CustomText';
import { AppNotification, notificationService } from '@/features/notifications/notification.service';
import { appLogger } from '@/utils/app-logger';

const getRelativeTime = (value: string): string => {
    const now = Date.now();
    const then = new Date(value).getTime();
    const diff = Math.max(0, now - then);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
};

const getNotificationMeta = (type: string) => {
    switch (type) {
        case 'EMERGENCY':
            return { icon: 'warning' as const, color: '#EF4444' };
        case 'RIDE':
            return { icon: 'local-taxi' as const, color: '#2563EB' };
        case 'PROMO':
            return { icon: 'card-giftcard' as const, color: '#9333EA' };
        default:
            return { icon: 'notifications' as const, color: '#10B981' };
    }
};

const NotificationItem = ({
    item,
    onPress,
}: {
    item: AppNotification;
    onPress: (notification: AppNotification) => void;
}) => {
    const meta = getNotificationMeta(item.type);
    return (
        <TouchableOpacity
            style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
            activeOpacity={0.7}
            onPress={() => onPress(item)}
        >
            <View style={[styles.iconContainer, { backgroundColor: `${meta.color}15` }]}>
                <MaterialIcons name={meta.icon} size={24} color={meta.color} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>{item.title}</Text>
                    {!item.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.message}>{item.body}</Text>
                <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.time}>{getRelativeTime(item.createdAt)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function NotificationsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const unreadCount = useMemo(
        () => notifications.filter((item) => !item.isRead).length,
        [notifications],
    );

    const loadNotifications = useCallback(async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (error: any) {
            appLogger.warn('Failed to load notifications', error);
            Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Unable to load notifications' });
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadNotifications();
        }, [loadNotifications]),
    );

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllAsRead();
            await loadNotifications();
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Unable to mark all notifications as read' });
        }
    };

    const handleNotificationPress = async (notification: AppNotification) => {
        if (notification.isRead) return;
        try {
            await notificationService.markAsRead(notification.id);
            setNotifications((previous) =>
                previous.map((item) =>
                    item.id === notification.id ? { ...item, isRead: true } : item,
                ),
            );
        } catch (error: any) {
            appLogger.warn('Unable to mark notification as read', error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {unreadCount > 0 && (
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
                    <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#9333EA" />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {notifications.map((item) => (
                        <NotificationItem key={item.id} item={item} onPress={handleNotificationPress} />
                    ))}

                    {notifications.length === 0 && (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>No notifications yet</Text>
                            <Text style={styles.emptySubtitle}>We&apos;ll notify you when something arrives</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f6f8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        letterSpacing: -0.3,
    },
    headerBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    headerBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    markAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    markAllText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#9333EA',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 100,
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    unreadCard: {
        backgroundColor: '#F9FAFB',
        borderColor: '#9333EA',
        borderWidth: 1.5,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
        paddingTop: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#9333EA',
        marginLeft: 8,
    },
    message: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 8,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    time: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
});
