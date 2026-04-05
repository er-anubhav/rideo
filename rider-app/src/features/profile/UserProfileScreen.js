import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/features/auth/authService';
import { walletService } from '@/features/wallet/walletService';

const UserProfileScreen = ({ navigation }) => {
    const [userData, setUserData] = useState(null);
    const [balance, setBalance] = useState('0.00');

    useEffect(() => {
        const loadData = async () => {
            try {
                const freshUser = await authService.getMe();
                setUserData(freshUser);
            } catch {
                const storedUser = await AsyncStorage.getItem('userData');
                if (storedUser) {
                    setUserData(JSON.parse(storedUser));
                }
            }

            try {
                const balanceData = await walletService.getBalance();
                setBalance(balanceData.balance.toString());
            } catch {
                // Non-blocking wallet fetch failure.
            }
        };

        // Initial load
        loadData();

        // Reload when screen comes into focus
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });

        // Subscribe to wallet for real-time updates
        const unsubWalletPromise = walletService.subscribeToBalance((data) => {
            if (data && data.balance !== undefined) {
                setBalance(data.balance.toString());
            }
        });

        return () => {
            unsubscribe();
            unsubWalletPromise.then(unsub => {
                if (unsub && typeof unsub === 'function') unsub();
            });
        };
    }, [navigation]);

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await authService.logout();
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Welcome' }],
                    });
                }
            }
        ]);
    };

    const displayName = userData?.name
        || [userData?.firstName, userData?.lastName].filter(Boolean).join(' ')
        || userData?.phone
        || 'User';

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            <ScrollView className="flex-1 mt-10 pt-12 pb-24" showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View className="p-4 pt-2 items-center gap-6">
                    <View className="items-center gap-4">
                        <View className="relative">
                            <View className="w-32 h-32 rounded-full border-4 border-purple-50 bg-purple-100 items-center justify-center overflow-hidden">
                                <MaterialIcons name="person" size={80} color="#9333EA" />
                            </View>
                        </View>
                        <View className="items-center">
                            <Text className="text-gray-900 text-2xl font-bold mb-1 font-display">{displayName}</Text>
                            <View className="flex-row items-center gap-2 mb-2">
                                <View className="px-2.5 py-1 rounded-md bg-purple-100 border border-purple-200">
                                    <Text className="text-purple-700 text-xs font-semibold font-display">Rider</Text>
                                </View>
                            </View>
                            <View className="flex-row items-center gap-2 text-gray-500">
                                <Text className="text-sm text-gray-500 font-display">Member since 2026</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} className="w-full max-w-[200px] h-10 items-center justify-center rounded-full bg-purple-900 shadow-lg shadow-purple-600/30">
                        <Text className="text-white font-bold font-display">Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Wallet Banner */}
                <View className="px-4 py-2">
                    <View className="flex-row justify-between items-center rounded-2xl bg-purple-900 p-5 shadow-lg shadow-purple-600/20">
                        <View className="gap-1">
                            <View className="flex-row items-center gap-2">
                                <MaterialIcons name="account-balance-wallet" size={16} color="#E9D5FF" />
                                <Text className="text-purple-100 text-sm font-medium font-display">Wallet Balance</Text>
                            </View>
                            <Text className="text-white text-3xl font-bold tracking-tight font-display">₹{balance}</Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('PaymentOptions')} className="h-10 px-6 items-center justify-center rounded-full bg-white shadow-md active:scale-95">
                            <Text className="text-purple-600 text-sm font-bold font-display">Top Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="h-4" />
                <View className="bg-white pb-8">
                    <Text className="text-gray-900 text-lg font-bold px-4 pb-3 pt-2 font-display">Support</Text>
                    <View className="px-4 gap-3">
                        <TouchableOpacity onPress={() => navigation.navigate('HelpCenter')} className="flex-row items-center justify-between p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                            <View className="flex-row items-center gap-4">
                                <View className="bg-purple-50 p-2.5 rounded-full"><MaterialIcons name="help" size={20} color="#9333EA" /></View>
                                <Text className="text-gray-900 text-base font-medium font-display">Help Center</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-center p-4 mt-6 rounded-full bg-red-50 border border-red-100">
                            <Text className="text-red-500 font-bold font-display">Log Out</Text>
                        </TouchableOpacity>
                        <Text className="text-center text-gray-400 text-xs mt-6 mb-4 font-mono">Backend Realtime v1.0</Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

export default UserProfileScreen;
