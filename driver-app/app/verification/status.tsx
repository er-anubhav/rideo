import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../../global.css';
import { driverService, DriverProfile } from '@/features/dashboard/driver.service';

const VerificationStatusScreen = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<DriverProfile | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const driverProfile = await driverService.getProfile();
            setProfile(driverProfile);
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to fetch verification status' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#9333EA" />
                <Text className="mt-4 text-gray-600">Loading verification status...</Text>
            </View>
        );
    }

    const getStatusConfig = () => {
        switch (profile?.verificationStatus) {
            case 'APPROVED':
                return {
                    icon: 'check-circle',
                    iconColor: '#10B981',
                    bgColor: 'bg-green-100',
                    title: 'Verification Approved!',
                    message: 'Congratulations! Your profile has been verified. You can now start accepting ride requests.',
                    buttonText: 'Go to Dashboard',
                    buttonAction: () => router.replace('/dashboard' as any),
                };
            case 'REJECTED':
                return {
                    icon: 'cancel',
                    iconColor: '#EF4444',
                    bgColor: 'bg-red-100',
                    title: 'Verification Rejected',
                    message: 'Unfortunately, your verification was rejected. Please contact support for more information or resubmit your documents.',
                    buttonText: 'Contact Support',
                    buttonAction: () => router.push('/support' as any),
                };
            default: // PENDING
                return {
                    icon: 'hourglass-empty',
                    iconColor: '#F59E0B',
                    bgColor: 'bg-yellow-100',
                    title: 'Verification Pending',
                    message: 'We are reviewing your documents. This typically takes 24-48 hours. You will be notified once approved.',
                    buttonText: 'Go to Dashboard',
                    buttonAction: () => router.replace('/dashboard' as any),
                };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <View className="flex-1 bg-white relative">
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1 items-center justify-center p-6">

                <View className="items-center mb-10 w-full">
                    {/* Status Icon */}
                    <View className="relative mb-8">
                        <View className={`w-24 h-24 ${statusConfig.bgColor} rounded-full items-center justify-center`}>
                            <View className={`w-16 h-16 rounded-full items-center justify-center shadow-lg`} style={{ backgroundColor: statusConfig.iconColor }}>
                                <MaterialIcons name={statusConfig.icon as any} size={32} color="white" />
                            </View>
                        </View>
                    </View>

                    <Text className="text-2xl font-extrabold text-gray-900 mb-3 text-center font-display">{statusConfig.title}</Text>
                    <Text className="text-gray-500 text-center text-base leading-relaxed px-4 font-display">
                        {statusConfig.message}
                    </Text>
                </View>

                {/* Info Card */}
                {profile?.verificationStatus === 'PENDING' && (
                    <View className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8">
                        <View className="flex-row items-center mb-2">
                            <MaterialIcons name="info-outline" size={20} color="#9333EA" />
                            <Text className="text-sm font-bold text-gray-800 ml-2 font-display">What happens next?</Text>
                        </View>
                        <Text className="text-xs text-gray-500 leading-5 font-display">
                            Our team checks the validity of your Driving License and Vehicle Insurance. Ensure your phone is reachable for any clarifications.
                        </Text>
                    </View>
                )}

                {/* Profile Info Card */}
                <View className="w-full bg-purple-50 p-4 rounded-2xl border border-purple-100 mb-8">
                    <Text className="text-sm font-bold text-purple-900 mb-3 font-display">Your Profile</Text>
                    <View className="gap-2">
                        <View className="flex-row justify-between">
                            <Text className="text-xs text-purple-700 font-display">Name:</Text>
                            <Text className="text-lg font-bold text-gray-900 font-display">
                                {profile ? `${profile.firstName} ${profile.lastName}` : 'Driver'}
                            </Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-xs text-purple-700 font-display">Email:</Text>
                            <Text className="text-xs font-bold text-purple-900 font-display">{profile?.email}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-xs text-purple-700 font-display">City:</Text>
                            <Text className="text-xs font-bold text-purple-900 font-display">{profile?.city}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-xs text-purple-700 font-display">Status:</Text>
                            <Text className="text-xs font-bold text-purple-900 font-display uppercase">{profile?.verificationStatus}</Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={statusConfig.buttonAction}
                    className="w-full rounded-full bg-purple-900 py-4 items-center justify-center shadow-lg shadow-purple-600/30 active:scale-[0.98]"
                >
                    <Text className="text-base font-bold text-white font-display">{statusConfig.buttonText}</Text>
                </TouchableOpacity>

                {/* Refresh Button */}
                <TouchableOpacity
                    onPress={fetchProfile}
                    className="mt-4 py-2"
                >
                    <Text className="text-sm font-bold text-purple-600 font-display">Refresh Status</Text>
                </TouchableOpacity>

            </SafeAreaView>
        </View>
    );
};

export default VerificationStatusScreen;
