import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/CustomText';
import { driverService, DriverProfile } from '@/features/dashboard/driver.service';
import { authService } from '@/features/auth/auth.service';
import { driverControlService, DriverControlData } from '@/features/ride/driver-control.service';
import { appLogger } from '@/utils/app-logger';

export default function DashboardTabsLayout() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<DriverProfile | null>(null);
    const lastControlEventRef = useRef<string | null>(null);
    const controlAlertLockRef = useRef(false);

    const checkProfile = useCallback(async () => {
        try {
            const authenticated = await authService.isAuthenticated();
            if (!authenticated) {
                router.replace('/welcome');
                return;
            }

            const data = await driverService.getProfile();
            setProfile(data);
        } catch (error) {
            appLogger.warn('Unable to resolve driver profile in dashboard layout', error);
            // If 404, we have no profile at all
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        checkProfile();
    }, [checkProfile]);

    const enforceDriverControl = useCallback(
        async (controlData: DriverControlData) => {
            const eventKey = controlData.timestamp || `${controlData.reason || 'control'}-${Date.now()}`;
            if (lastControlEventRef.current === eventKey) {
                return;
            }
            lastControlEventRef.current = eventKey;

            setProfile((previous) => {
                if (!previous) return previous;

                return {
                    ...previous,
                    isOnline:
                        typeof controlData.isOnline === 'boolean'
                            ? controlData.isOnline
                            : previous.isOnline,
                    isApproved:
                        typeof controlData.isApproved === 'boolean'
                            ? controlData.isApproved
                            : previous.isApproved,
                    isActive:
                        typeof controlData.isActive === 'boolean'
                            ? controlData.isActive
                            : previous.isActive,
                    verificationStatus:
                        controlData.verificationStatus || previous.verificationStatus,
                };
            });

            if (controlAlertLockRef.current) {
                return;
            }

            const reason = controlData.reason || 'Your account status was updated by super admin.';
            const requiresLogout =
                !!controlData.forceLogout ||
                controlData.isBlocked === true ||
                controlData.isActive === false;

            if (requiresLogout) {
                controlAlertLockRef.current = true;
                Alert.alert(
                    'Session Ended',
                    reason,
                    [
                        {
                            text: 'OK',
                            onPress: async () => {
                                controlAlertLockRef.current = false;
                                await authService.logout();
                                router.replace('/welcome');
                            },
                        },
                    ],
                    { cancelable: false },
                );
                return;
            }

            if (controlData.verificationStatus && controlData.verificationStatus !== 'APPROVED') {
                controlAlertLockRef.current = true;
                Alert.alert(
                    'Account Status Updated',
                    reason,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                controlAlertLockRef.current = false;
                                router.replace('/verification/status');
                            },
                        },
                    ],
                    { cancelable: false },
                );
            }
        },
        [router],
    );

    useEffect(() => {
        if (loading) return;

        let unsubscribe = () => { };
        let active = true;

        const bootstrapDriverControl = async () => {
            try {
                unsubscribe = await driverControlService.subscribe((controlData) => {
                    if (!active) return;
                    enforceDriverControl(controlData);
                });
            } catch (error) {
                appLogger.warn('Failed to subscribe to driver control updates', error);
            }
        };

        bootstrapDriverControl();

        return () => {
            active = false;
            unsubscribe();
        };
    }, [loading, enforceDriverControl]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#9333EA" />
            </View>
        );
    }

    const isApproved =
        profile?.verificationStatus === 'APPROVED' &&
        profile?.isActive !== false;

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: '#ffffff',
                        borderTopWidth: 0,
                        elevation: 10,
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        height: 65,
                        paddingBottom: 10,
                        paddingTop: 10,
                        display: isApproved ? 'flex' : 'none', // Hide tabs if not approved
                    },
                    tabBarActiveTintColor: '#7C3aED',
                    tabBarInactiveTintColor: '#9CA3AF',
                }}
            >
                <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />) }} />
                <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />) }} />
                <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? "wallet" : "wallet-outline"} size={24} color={color} />) }} />
                <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => (<Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />) }} />
            </Tabs>

            {!isApproved && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.95)', justifyContent: 'center', alignItems: 'center', padding: 30, zIndex: 999 }]}>
                    <View style={{ backgroundColor: '#F3E8FF', padding: 20, borderRadius: 100, marginBottom: 24 }}>
                        <MaterialIcons name="lock-outline" size={60} color="#9333EA" />
                    </View>

                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 12 }}>
                        {!profile ? 'Complete Your Profile' :
                            profile.isActive === false ? 'Account Deactivated' :
                            (!profile.vehicles || profile.vehicles.length === 0) ? 'Add Vehicle Details' :
                                'Account Pending Approval'}
                    </Text>

                    <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
                        {!profile
                            ? "Please provide your personal details to start accepting ride requests and earning with Mr. Rideo."
                            : profile.isActive === false
                                ? "Your account has been deactivated by a super admin. Please contact support."
                            : (!profile.vehicles || profile.vehicles.length === 0)
                                ? "You need to add a vehicle to your profile before your account can be approved."
                                : "Your profile is under review by our admin team. This usually takes 24-48 hours. We'll notify you once you're ready to drive!"}
                    </Text>

                    <TouchableOpacity
                        onPress={() => {
                            if (!profile) {
                                router.push('/verification/details');
                            } else if (!profile.vehicles || profile.vehicles.length === 0) {
                                router.push('/verification/vehicle');
                            }
                        }}
                        disabled={!!(profile && profile.vehicles && profile.vehicles.length > 0 && profile.verificationStatus !== 'REJECTED')}
                        style={{
                            backgroundColor: (profile && profile.vehicles && profile.vehicles.length > 0 && profile.verificationStatus !== 'REJECTED') ? '#E5E7EB' : '#9333EA',
                            paddingVertical: 16,
                            paddingHorizontal: 32,
                            borderRadius: 999,
                            width: '100%',
                            alignItems: 'center',
                            shadowColor: '#9333EA',
                            shadowOpacity: 0.3,
                            shadowRadius: 10,
                            elevation: 5,
                            opacity: (profile && profile.vehicles && profile.vehicles.length > 0 && profile.verificationStatus !== 'REJECTED') ? 0.7 : 1
                        }}
                    >
                        <Text style={{ color: (profile && profile.vehicles && profile.vehicles.length > 0 && profile.verificationStatus !== 'REJECTED') ? '#6B7280' : '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
                            {!profile ? 'Complete Profile Now' :
                                (!profile.vehicles || profile.vehicles.length === 0) ? 'Add Vehicle' :
                                    'Application Submitted'}
                        </Text>
                    </TouchableOpacity>

                    {profile?.verificationStatus === 'REJECTED' && (
                        <View style={{ marginTop: 24, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 12, width: '100%' }}>
                            <Text style={{ color: '#B91C1C', fontWeight: 'bold', marginBottom: 4 }}>Profile Rejected</Text>
                            <Text style={{ color: '#EF4444', fontSize: 14 }}>Please review your details and re-submit for verification.</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert('Logout', 'Are you sure you want to logout?', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Logout',
                                    style: 'destructive',
                                    onPress: async () => {
                                        await authService.logout();
                                        router.replace('/');
                                    }
                                }
                            ]);
                        }}
                        style={{ marginTop: 20, paddingVertical: 12 }}
                    >
                        <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: '600' }}>Logout</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
