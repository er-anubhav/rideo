import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View, ActivityIndicator, Alert, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/CustomText';
import { driverService, DriverProfile } from '@/features/dashboard/driver.service';
import { authService } from '@/features/auth/auth.service';

const MenuOption = ({ icon, title, subtitle, onPress, color = "#6B7280" }: any) => (
    <TouchableOpacity
        onPress={onPress}
        style={styles.menuOption}
        activeOpacity={0.7}
    >
        <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
            <MaterialIcons name={icon} size={22} color={color} />
        </View>
        <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>{title}</Text>
            {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#D1D5DB" />
    </TouchableOpacity>
);

export default function ProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const fetchProfile = async () => {
        try {
            const data = await driverService.getProfile();
            setProfile(data);
        } catch {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load profile' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await authService.logout();
                        router.replace('/');
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#9333EA" />
            </View>
        );
    }


    const vehicleInfo = profile?.vehicles && profile.vehicles.length > 0
        ? `${profile.vehicles[0].make} ${profile.vehicles[0].model} - ${profile.vehicles[0].registrationNumber}`
        : 'No vehicle added';

    const appVersion = Constants.expoConfig?.version ?? '1.0.0';
    const buildNumber = Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber
        : Constants.expoConfig?.android?.versionCode?.toString();
    const versionLabel = buildNumber
        ? `Version ${appVersion} (Build ${buildNumber})`
        : `Version ${appVersion}`;
    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Profile */}
                <View style={styles.header}>
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarInner}>
                                <Ionicons name="person" size={40} color="#CBD5E1" />
                            </View>
                            {profile?.isOnline && <View style={styles.onlineBadge} />}
                        </View>
                        <View>
                            <Text style={styles.profileName}>{profile ? `${profile.firstName}` : ''}</Text>
                            <View style={styles.badgeRow}>
                                <MaterialIcons
                                    name={profile?.verificationStatus === 'APPROVED' ? "verified" : "info-outline"}
                                    size={14}
                                    color={profile?.verificationStatus === 'APPROVED' ? "#9333EA" : "#F59E0B"}
                                />
                                <Text style={[
                                    styles.badgeText,
                                    { color: profile?.verificationStatus === 'APPROVED' ? "#9333EA" : "#F59E0B" }
                                ]}>
                                    {profile?.verificationStatus === 'APPROVED' ? 'VERIFIED DRIVER' : 'VERIFICATION PENDING'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statCardDark}>
                            <Text style={styles.statLabelDark}>RATING</Text>
                            <View style={styles.ratingRow}>
                                <Text style={styles.statValueDark}>{(profile?.rating || 0).toFixed(1)}</Text>
                                <MaterialIcons name="star" size={14} color="#F59E0B" />
                            </View>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>RIDES</Text>
                            <Text style={styles.statValue}>{profile?.totalRides || '0'}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>STATUS</Text>
                            <Text style={[
                                styles.statValue,
                                { fontSize: 14, color: profile?.isOnline ? '#10B981' : '#6B7280' }
                            ]}>
                                {profile?.isOnline ? 'ONLINE' : 'OFFLINE'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Menu Sections */}
                <View style={styles.menuContainer}>
                    <Text style={styles.sectionTitle}>Vehicle & Account</Text>
                    <MenuOption
                        icon="directions-car"
                        title="My Vehicle"
                        subtitle={vehicleInfo}
                        onPress={() => { }}
                        color="#3B82F6"
                    />
                    <MenuOption
                        icon="description"
                        title="Documents"
                        subtitle="License, Insurance, RC"
                        onPress={() => router.push('/verification/status')}
                        color="#F59E0B"
                    />

                    <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>App Settings</Text>

                    <View style={styles.notificationRow}>
                        <View style={styles.notificationLeft}>
                            <View style={styles.menuIconContainer}>
                                <MaterialIcons name="notifications-none" size={22} color="#6B7280" />
                            </View>
                            <Text style={styles.menuTitle}>Notifications</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#E5E7EB", true: "#DDD6FE" }}
                            thumbColor={notificationsEnabled ? "#9333EA" : "#f4f3f4"}
                        />
                    </View>

                    <MenuOption
                        icon="language"
                        title="Language"
                        subtitle="English (US)"
                        onPress={() => { }}
                    />

                    <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Support & Growth</Text>
                    <MenuOption
                        icon="card-giftcard"
                        title="Refer & Earn"
                        subtitle="Invite friends, get Rs 500"
                        onPress={() => router.push('/referral' as any)}
                        color="#9333EA"
                    />
                    <MenuOption
                        icon="support-agent"
                        title="Help & Support"
                        subtitle="FAQ, Chat with us"
                        onPress={() => router.push('/support' as any)}
                        color="#10B981"
                    />

                    <MenuOption
                        icon="logout"
                        title="Logout"
                        onPress={handleLogout}
                        color="#EF4444"
                    />

                    <Text style={styles.versionText}>{versionLabel}</Text>
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
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 24,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#F3E8FF',
        borderRadius: 40,
        padding: 4,
        borderWidth: 2,
        borderColor: '#DDD6FE',
        position: 'relative',
    },
    avatarInner: {
        width: '100%',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        width: 20,
        height: 20,
        borderRadius: 10,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCardDark: {
        flex: 1,
        backgroundColor: '#111827',
        padding: 16,
        borderRadius: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        borderRadius: 16,
    },
    statLabelDark: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    statValueDark: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
    },
    menuContainer: {
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 12,
        marginLeft: 4,
    },
    sectionTitleSpaced: {
        marginTop: 16,
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    menuSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        marginTop: 2,
    },
    notificationRow: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    notificationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    versionText: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 24,
        marginBottom: 16,
    },
});

