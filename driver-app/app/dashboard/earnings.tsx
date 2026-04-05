import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/CustomText';
import { driverService, DriverStats } from '@/features/dashboard/driver.service';
import { rideService, Ride } from '@/features/ride/ride.service';

const TransactionItem = ({ ride }: { ride: Ride }) => (
    <View style={styles.transactionCard}>
        <View style={styles.transactionLeft}>
            <View style={[styles.iconContainer, styles.creditIcon]}>
                <Ionicons name="arrow-down" size={20} color="#10B981" />
            </View>
            <View>
                <Text style={styles.transactionTitle}>Trip Payment</Text>
                <Text style={styles.transactionDate}>
                    {new Date(ride.completedAt || ride.createdAt).toLocaleDateString()}
                </Text>
            </View>
        </View>
        <Text style={[styles.transactionAmount, styles.creditAmount]}>
            + ₹{ride.totalFare || ride.fare}
        </Text>
    </View>
);

export default function EarningsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<DriverStats | null>(null);
    const [recentRides, setRecentRides] = useState<Ride[]>([]);

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [statsData, completedRides] = await Promise.all([
                driverService.getStats(),
                rideService.getCompletedRides()
            ]);
            setStats(statsData);
            setRecentRides(completedRides.slice(0, 5)); // Show last 5
        } catch (error: any) {
            console.error('Error fetching earnings data:', error);
            if (showLoading) Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load earnings data' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(false);
    }, []);

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9333EA" />
                <Text style={styles.loadingText}>Loading Earnings...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9333EA']} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.subtitle}>YOUR WALLET</Text>
                    <Text style={styles.title}>Earnings</Text>
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCardContainer}>
                    <LinearGradient
                        colors={['#9333EA', '#7E22CE']}
                        style={styles.balanceCard}
                    >
                        <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                        <Text style={styles.balanceAmount}>₹{stats?.total.earnings.toFixed(2) || '0.00'}</Text>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={styles.cardButton}
                                activeOpacity={0.7}
                                onPress={() => Toast.show({ type: 'info', text1: 'Request Withdrawal', text2: 'This feature will be available soon.' })}
                            >
                                <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.cardButtonText}>Withdraw</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cardButton}
                                activeOpacity={0.7}
                                onPress={() => Toast.show({ type: 'info', text1: 'History', text2: 'Extended history is under development.' })}
                            >
                                <Ionicons name="time-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.cardButtonText}>History</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>TODAY</Text>
                        <Text style={styles.statValue}>₹{stats?.today.earnings.toFixed(0) || '0'}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>TOTAL</Text>
                        <Text style={styles.statValueGreen}>₹{stats?.total.earnings.toFixed(0) || '0'}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>TRIPS</Text>
                        <Text style={styles.statValue}>{stats?.total.trips || '0'}</Text>
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={styles.activitySection}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>

                    {recentRides.length > 0 ? (
                        recentRides.map((ride) => (
                            <TransactionItem key={ride.id} ride={ride} />
                        ))
                    ) : (
                        <View style={styles.emptyActivity}>
                            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No recent activity found</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f6f8',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f7f6f8',
    },
    loadingText: {
        marginTop: 16,
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '500',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 16,
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontSize: 30,
        fontWeight: '500',
        color: '#111827',
        letterSpacing: -0.5,
    },
    balanceCardContainer: {
        marginHorizontal: 16,
        marginBottom: 24,
    },
    balanceCard: {
        padding: 24,
        borderRadius: 24,
        shadowColor: '#9333EA',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    balanceLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.7)',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    balanceAmount: {
        fontSize: 40,
        fontWeight: '500',
        color: '#FFFFFF',
        marginBottom: 24,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cardButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        gap: 6,
    },
    cardButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        marginHorizontal: 16,
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    statValueGreen: {
        fontSize: 20,
        fontWeight: '700',
        color: '#10B981',
    },
    activitySection: {
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 16,
    },
    transactionCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    creditIcon: {
        backgroundColor: '#D1FAE5',
    },
    transactionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    transactionDate: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    transactionAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    creditAmount: {
        color: '#10B981',
    },
    emptyActivity: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
});
