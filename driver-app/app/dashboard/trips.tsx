import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/CustomText';
import { Ride, rideService } from '@/features/ride/ride.service';

interface TripCardData {
    id: string;
    date: string;
    pickup: string;
    dropoff: string;
    fare: string;
    status: string;
    distance: string;
    time: string;
    rating?: number;
    rawStatus: string; // for filtering
}

const formatRideToCard = (ride: Ride): TripCardData => {
    const date = new Date(ride.createdAt);
    const formattedDate = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    let displayStatus: string = ride.status;
    if (ride.status === 'COMPLETED') displayStatus = 'Completed';
    else if (ride.status === 'CANCELLED') displayStatus = 'Cancelled';
    else if (['MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(ride.status)) displayStatus = 'Upcoming';

    return {
        id: ride.id,
        date: formattedDate,
        pickup: ride.pickupAddress || 'Unknown Pickup',
        dropoff: ride.dropAddress || 'Unknown Dropoff',
        fare: `₹${Number(ride.totalFare || ride.fare || 0).toFixed(0)}`,
        status: displayStatus,
        rawStatus: ride.status,
        distance: `${(Number(ride.actualDistance || ride.estimatedDistance || 0) / 1000).toFixed(1)} km`,
        time: `${Math.round(Number(ride.actualDuration || ride.estimatedDuration || 0) / 60)} min`,
        rating: ride.status === 'COMPLETED' ? 5 : undefined,
    };
};

const RideCard = ({ item }: { item: TripCardData }) => {
    const getBadgeStyle = () => {
        switch (item.status) {
            case 'Completed': return styles.completedBadge;
            case 'Cancelled': return styles.cancelledBadge;
            default: return styles.scheduledBadge;
        }
    };

    const getTextStyle = () => {
        switch (item.status) {
            case 'Completed': return styles.completedText;
            case 'Cancelled': return styles.cancelledText;
            default: return styles.scheduledText;
        }
    };

    return (
        <View style={styles.card}>
            {/* Header with Date and Status */}
            <View style={styles.cardHeader}>
                <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
                    <Text style={styles.date}>{item.date}</Text>
                </View>
                <View style={[styles.statusBadge, getBadgeStyle()]}>
                    <Text style={[styles.statusText, getTextStyle()]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            {/* Route Timeline */}
            <View style={styles.routeContainer}>
                <View style={styles.timeline}>
                    <View style={styles.timelineStart} />
                    <View style={styles.timelineLine} />
                    <View style={styles.timelineEnd} />
                </View>
                <View style={styles.routeDetails}>
                    <View style={styles.locationBlock}>
                        <Text style={styles.locationLabel}>PICKUP</Text>
                        <Text style={styles.locationText} numberOfLines={1}>{item.pickup}</Text>
                    </View>
                    <View style={styles.locationBlock}>
                        <Text style={styles.locationLabel}>DROP-OFF</Text>
                        <Text style={styles.locationText} numberOfLines={1}>{item.dropoff}</Text>
                    </View>
                </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Footer with Fare and Info */}
            <View style={styles.cardFooter}>
                <View>
                    <Text style={styles.fareLabel}>TOTAL FARE</Text>
                    <Text style={styles.fare}>{item.fare}</Text>
                </View>
                {item.rating ? (
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.ratingText}>{item.rating}.0</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.detailsButton}>
                        <Text style={styles.detailsButtonText}>VIEW DETAILS</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Trip Metadata */}
            <View style={styles.metadata}>
                <View style={styles.metadataItem}>
                    <Ionicons name="navigate-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.metadataText}>{item.distance}</Text>
                </View>
                <View style={styles.metadataItem}>
                    <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                    <Text style={styles.metadataText}>{item.time}</Text>
                </View>
            </View>
        </View>
    );
};

export default function TripsScreen() {
    type TabType = 'All' | 'Completed' | 'Cancelled';
    const [activeTab, setActiveTab] = useState<TabType>('All');
    const [allRides, setAllRides] = useState<TripCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRides = async () => {
        try {
            const rides = await rideService.getAllRides();
            setAllRides(rides.map(formatRideToCard));
        } catch (error: any) {
            console.error('Error fetching rides:', error);
            Alert.alert('Error', error.message || 'Failed to fetch rides');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRides();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRides();
    };

    const getFilteredRides = () => {
        switch (activeTab) {
            case 'Completed':
                return allRides.filter(r => r.status === 'Completed');
            case 'Cancelled':
                return allRides.filter(r => r.status === 'Cancelled');
            default:
                return allRides;
        }
    };

    const filteredRides = getFilteredRides();

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#9333EA" />
                <Text style={{ marginTop: 16, color: '#6B7280' }}>Loading all trips...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Gradient Header */}
            <LinearGradient
                colors={['#F3E8FF', '#FFFFFF']}
                style={styles.gradientHeader}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.subtitle}>YOUR HISTORY</Text>
                    <Text style={styles.title}>All Trips</Text>
                </View>
            </LinearGradient>

            {/* Tab Selector */}
            <View style={styles.tabScrollContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={['All', 'Completed', 'Cancelled']}
                    keyExtractor={(item) => item}
                    contentContainerStyle={styles.tabContainer}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.tab, activeTab === item && styles.activeTab]}
                            onPress={() => setActiveTab(item as TabType)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, activeTab === item && styles.activeTabText]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Trips List */}
            <FlatList
                data={filteredRides}
                renderItem={({ item }) => <RideCard item={item} />}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#9333EA']}
                        tintColor="#9333EA"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="documents-outline" size={48} color="#D1D5DB" />
                        </View>
                        <Text style={styles.emptyTitle}>No trips found</Text>
                        <Text style={styles.emptySubtitle}>
                            You don&apos;t have any {activeTab === 'All' ? '' : activeTab.toLowerCase()} rides yet.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f6f8',
    },
    gradientHeader: {
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: {
        gap: 4,
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 30,
        fontWeight: '500',
        color: '#111827',
        letterSpacing: -0.5,
    },
    tabScrollContainer: {
        marginTop: 24,
        marginBottom: 20,
    },
    tabContainer: {
        paddingHorizontal: 24,
        gap: 12,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeTab: {
        backgroundColor: '#9333EA',
        borderColor: '#9333EA',
        shadowColor: '#9333EA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    date: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
    },
    scheduledBadge: {
        backgroundColor: '#DDD6FE',
    },
    completedBadge: {
        backgroundColor: '#D1FAE5',
    },
    cancelledBadge: {
        backgroundColor: '#FEE2E2',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    scheduledText: {
        color: '#6B21A8',
    },
    completedText: {
        color: '#047857',
    },
    cancelledText: {
        color: '#B91C1C',
    },
    routeContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timeline: {
        width: 24,
        alignItems: 'center',
        marginRight: 16,
    },
    timelineStart: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: '#9333EA',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 4,
    },
    timelineEnd: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#9333EA',
    },
    routeDetails: {
        flex: 1,
        justifyContent: 'space-between',
    },
    locationBlock: {
        marginBottom: 12,
    },
    locationLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    locationText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginBottom: 16,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    fareLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    fare: {
        fontSize: 24,
        fontWeight: '500',
        color: '#9333EA',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    detailsButton: {
        backgroundColor: '#9333EA',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 9999,
        shadowColor: '#9333EA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    detailsButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    metadata: {
        flexDirection: 'row',
        gap: 16,
    },
    metadataItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metadataText: {
        fontSize: 12,
        fontWeight: '500',
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
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
});
