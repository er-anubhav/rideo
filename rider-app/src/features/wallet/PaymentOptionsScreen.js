import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { walletService } from '@/features/wallet/walletService';

const PaymentOptionsScreen = () => {
    const navigation = useNavigation();
    const [balance, setBalance] = useState('0.00');
    const [selectedAmount, setSelectedAmount] = useState(500);
    const [customAmount, setCustomAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [useWalletFirst, setUseWalletFirst] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const data = await walletService.getBalance();
                setBalance(data.balance.toString());
            } catch (error) {
                console.error('Failed to fetch wallet balance', error);
            }
        };

        fetchBalance();

        const unsubPromise = walletService.subscribeToBalance((data) => {
            if (data && data.balance !== undefined) {
                setBalance(data.balance.toString());
            }
        });

        return () => {
            unsubPromise.then(unsub => unsub && unsub());
        };
    }, []);

    const amountToAdd = customAmount.trim() ? Number(customAmount) : selectedAmount;

    const handleTopUp = async () => {
        if (!Number.isFinite(amountToAdd) || amountToAdd <= 0) {
            Alert.alert('Invalid Amount', 'Enter a valid amount greater than ₹0.');
            return;
        }

        setIsProcessing(true);
        try {
            const updatedWallet = await walletService.topUp(amountToAdd);
            setBalance(updatedWallet.balance.toString());
            Alert.alert('Top Up Successful', `₹${amountToAdd} added to your wallet.`);
            navigation.goBack();
        } catch (error) {
            Alert.alert(
                'Top Up Failed',
                error.response?.data?.message || 'Unable to top up wallet right now.'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center px-4 pb-4 pt-2 z-10 bg-white">
                <TouchableOpacity onPress={() => navigation.goBack()} className="h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
                    <MaterialIcons name="arrow-back-ios" size={20} color="#111827" />
                </TouchableOpacity>
                <Text className="text-gray-900 text-lg font-bold flex-1 text-center pr-10 font-display">Payment Options</Text>
            </View>

            <ScrollView className="flex-1 px-4 py-2 mb-24" showsVerticalScrollIndicator={false}>

                {/* Wallet Card */}
                <View className="mb-6 rounded-2xl overflow-hidden shadow-lg shadow-purple-600/20 border border-purple-100 relative">
                    <LinearGradient
                        colors={['#7E22CE', '#9333EA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="p-5"
                    >
                        <View className="relative z-10 gap-4">
                            <View className="flex-row items-center gap-3">
                                <View className="bg-white/20 p-2 rounded-full"><MaterialIcons name="account-balance-wallet" size={24} color="white" /></View>
                                <View>
                                    <Text className="text-purple-100 text-sm font-medium opacity-90 font-display">Rideo Cash</Text>
                                    <Text className="text-white text-2xl font-bold tracking-tight font-display">₹{balance}</Text>
                                </View>
                            </View>
                            <View className="h-px w-full bg-white/20" />
                            <View className="flex-row items-center justify-between">
                                <Text className="text-white/90 text-sm font-medium font-display">Use wallet balance first</Text>
                                <Switch
                                    trackColor={{ false: "#767577", true: "#E9D5FF" }}
                                    thumbColor={useWalletFirst ? "#fff" : "#f4f3f4"}
                                    value={useWalletFirst}
                                    onValueChange={setUseWalletFirst}
                                />
                            </View>
                        </View>
                        <View className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    </LinearGradient>
                </View>

                <View className="mb-6">
                    <Text className="text-gray-900 text-lg font-bold mb-3 px-1 font-display">Add Funds</Text>
                    <View className="flex-row flex-wrap gap-3 mb-3">
                        {[100, 300, 500, 1000].map((amount) => (
                            <TouchableOpacity
                                key={amount}
                                onPress={() => {
                                    setSelectedAmount(amount);
                                    setCustomAmount('');
                                }}
                                className={`px-4 py-2 rounded-full border ${selectedAmount === amount && !customAmount.trim()
                                        ? 'bg-purple-900 border-purple-600'
                                        : 'bg-white border-gray-200'
                                    }`}
                            >
                                <Text className={`font-display font-semibold ${selectedAmount === amount && !customAmount.trim() ? 'text-white' : 'text-gray-700'}`}>
                                    ₹{amount}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View className="bg-gray-50 rounded-xl p-2 flex-row items-center gap-3 border border-gray-200">
                        <Text className="text-gray-500 font-display pl-2">₹</Text>
                        <TextInput
                            placeholder="Custom amount"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={customAmount}
                            onChangeText={setCustomAmount}
                            className="flex-1 text-gray-900 font-medium font-display"
                        />
                    </View>
                </View>

                {/* Payment Methods */}
                <View className="mb-6">
                    <Text className="text-gray-900 text-lg font-bold mb-3 px-1 font-display">Payment Methods</Text>

                    {/* 1. UPI */}
                    <TouchableOpacity className="flex-row items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 mb-3 shadow-sm shadow-gray-200/50">
                        <View className="flex-row items-center gap-4">
                            <View className="h-10 w-12 items-center justify-center rounded border border-gray-100 bg-gray-50 p-1">
                                <MaterialIcons name="qr-code-scanner" size={24} color="#111827" />
                            </View>
                            <View>
                                <Text className="text-gray-900 text-base font-semibold font-display">UPI</Text>
                                <Text className="text-gray-500 text-xs font-display">Google Pay, PhonePe, Paytm</Text>
                            </View>
                        </View>
                        <View className="h-5 w-5 rounded-full border border-purple-600 bg-purple-900 items-center justify-center">
                            <View className="h-2.5 w-2.5 rounded-full bg-white" />
                        </View>
                    </TouchableOpacity>

                    {/* 2. Net Banking */}
                    <TouchableOpacity className="flex-row items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 mb-3 shadow-sm shadow-gray-200/50">
                        <View className="flex-row items-center gap-4">
                            <View className="h-10 w-12 items-center justify-center rounded border border-gray-100 bg-gray-50 p-1">
                                <MaterialIcons name="account-balance" size={24} color="#111827" />
                            </View>
                            <View>
                                <Text className="text-gray-900 text-base font-medium font-display">Net Banking</Text>
                                <Text className="text-gray-500 text-xs font-display">All Major Banks Supported</Text>
                            </View>
                        </View>
                        <View className="h-5 w-5 rounded-full border border-gray-300" />
                    </TouchableOpacity>

                    {/* 3. Debit / Credit Card */}
                    <TouchableOpacity className="flex-row items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 mb-3 shadow-sm shadow-gray-200/50">
                        <View className="flex-row items-center gap-4">
                            <View className="h-10 w-12 items-center justify-center rounded border border-gray-100 bg-gray-50 p-1">
                                <MaterialIcons name="credit-card" size={24} color="#111827" />
                            </View>
                            <View>
                                <Text className="text-gray-900 text-base font-medium font-display">Debit / Credit Card</Text>
                                <Text className="text-gray-500 text-xs font-display">Visa, Mastercard, Rupay</Text>
                            </View>
                        </View>
                        <View className="h-5 w-5 rounded-full border border-gray-300" />
                    </TouchableOpacity>

                    {/* 4. Cash */}
                    <TouchableOpacity className="flex-row items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 mb-3 shadow-sm shadow-gray-200/50">
                        <View className="flex-row items-center gap-4">
                            <View className="h-10 w-12 items-center justify-center rounded border border-gray-100 bg-gray-50 p-1">
                                <MaterialIcons name="payments" size={24} color="#111827" />
                            </View>
                            <View>
                                <Text className="text-gray-900 text-base font-medium font-display">Cash</Text>
                                <Text className="text-gray-500 text-xs font-display">Pay after ride</Text>
                            </View>
                        </View>
                        <View className="h-5 w-5 rounded-full border border-gray-300" />
                    </TouchableOpacity>
                </View>

                {/* Promo */}
                <View className="bg-gray-50 rounded-xl p-2 flex-row items-center gap-3 border border-gray-200">
                    <View className="pl-3"><MaterialIcons name="local-offer" size={20} color="#9CA3AF" /></View>
                    <TextInput placeholder="Enter promo code" placeholderTextColor="#9CA3AF" className="flex-1 text-gray-900 font-medium font-display" />
                    <TouchableOpacity className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <Text className="text-purple-600 text-sm font-bold font-display">Apply</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Confirm Button */}
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 border-t border-gray-100 pb-8">
                <TouchableOpacity
                    onPress={handleTopUp}
                    disabled={isProcessing}
                    className={`w-full rounded-full py-4 flex-row items-center justify-center gap-2 shadow-lg shadow-purple-600/30 ${isProcessing ? 'bg-purple-400' : 'bg-purple-900'}`}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <MaterialIcons name="lock" size={20} color="white" />
                    )}
                    <Text className="text-white text-base font-bold font-display">
                        {isProcessing ? 'Processing...' : `Add ₹${amountToAdd || 0}`}
                    </Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

export default PaymentOptionsScreen;
