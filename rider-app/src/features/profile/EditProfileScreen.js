import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { authService } from '@/features/auth/authService';

const EditProfileScreen = () => {
    const navigation = useNavigation();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('userData');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const fullName = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ');
                setName(fullName || '');
                setEmail(user.email || '');
                setPhone(user.phone || '');
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        setIsLoading(true);
        try {
            const trimmedName = name.trim();
            const parts = trimmedName.split(/\s+/);
            const firstName = parts.shift() || '';
            const lastName = parts.join(' ') || null;
            const normalizedEmail = email.trim() ? email.trim() : null;

            await authService.updateProfile({
                firstName,
                lastName,
                email: normalizedEmail,
            });

            Alert.alert('Success', 'Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="p-2 rounded-full bg-gray-50 active:bg-gray-100"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 font-display">Edit Profile</Text>
                    <View className="w-10" />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>

                        {/* Avatar Section */}
                        <View className="items-center mb-8">
                            <View className="relative">
                                <View className="w-28 h-28 rounded-full bg-purple-100 items-center justify-center border-4 border-purple-50 overflow-hidden">
                                    <MaterialIcons name="person" size={64} color="#9333EA" />
                                </View>
                                <TouchableOpacity className="absolute bottom-0 right-0 bg-purple-900 p-2 rounded-full border-4 border-white shadow-sm">
                                    <MaterialIcons name="camera-alt" size={16} color="white" />
                                </TouchableOpacity>
                            </View>
                            <Text className="mt-3 text-sm text-purple-600 font-semibold font-display">Change Profile Picture</Text>
                        </View>

                        {/* Form Fields */}
                        <View className="gap-5">
                            <View>
                                <Text className="text-gray-700 font-medium mb-1.5 ml-1 font-display">Full Name</Text>
                                <View className="flex-row items-center px-4 h-12 bg-gray-50 rounded-xl border border-gray-200 focus:border-purple-500">
                                    <MaterialIcons name="person-outline" size={20} color="#9CA3AF" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-900 font-display"
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Enter your name"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-gray-700 font-medium mb-1.5 ml-1 font-display">Email Address</Text>
                                <View className="flex-row items-center px-4 h-12 bg-gray-50 rounded-xl border border-gray-200 focus:border-purple-500">
                                    <MaterialIcons name="mail-outline" size={20} color="#9CA3AF" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-900 font-display"
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="Enter your email"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                            </View>

                            <View>
                                <Text className="text-gray-700 font-medium mb-1.5 ml-1 font-display">Phone Number</Text>
                                <View className="flex-row items-center px-4 h-12 bg-gray-100 rounded-xl border border-gray-200 opacity-80">
                                    <MaterialIcons name="phone" size={20} color="#9CA3AF" />
                                    <TextInput
                                        className="flex-1 ml-3 text-gray-500 font-display"
                                        value={phone}
                                        editable={false}
                                        placeholder="Phone number"
                                    />
                                    <MaterialIcons name="lock" size={16} color="#9CA3AF" />
                                </View>
                                <Text className="text-xs text-gray-400 mt-1 ml-1 font-display">Phone number cannot be changed</Text>
                            </View>
                        </View>

                    </ScrollView>

                    {/* Footer Button */}
                    <View className="p-4 border-t border-gray-100 bg-white shadow-lg shadow-purple-900/5">
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isLoading}
                            className={`w-full py-3.5 rounded-full items-center justify-center shadow-lg shadow-purple-600/30 ${isLoading ? 'bg-purple-400' : 'bg-purple-900'}`}
                        >
                            {isLoading ? (
                                <Text className="text-white font-bold font-display">Saving...</Text>
                            ) : (
                                <Text className="text-white font-bold text-lg font-display">Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

export default EditProfileScreen;
