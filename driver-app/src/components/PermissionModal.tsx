import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, TouchableOpacity, View } from 'react-native';
import { Text } from './CustomText';
import '../../global.css';

interface PermissionModalProps {
    visible: boolean;
    onGranted: () => void;
    onDeclined: () => void;
}

export default function PermissionModal({ visible, onGranted, onDeclined }: PermissionModalProps) {
    const [loading, setLoading] = useState(false);

    const handleGrantPermission = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                onGranted();
            } else {
                onDeclined();
            }
        } catch (error) {
            console.error('Error requesting permissions', error);
            onDeclined();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onDeclined}
        >
            <View className="flex-1 justify-end bg-black/60">
                <View className="bg-white rounded-t-[2.5rem] px-6 pt-8 pb-10 items-center shadow-2xl">
                    
                    {/* Drag Indicator */}
                    <View className="w-12 h-1.5 bg-gray-200 rounded-full mb-8" />

                    {/* Icon/Illustration */}
                    <View className="mb-6 items-center justify-center relative">
                        <View className="absolute w-32 h-32 bg-purple-50 rounded-full" />
                        <View className="w-20 h-20 bg-purple-100 rounded-full items-center justify-center shadow-sm border border-purple-200">
                            <MaterialIcons name="share-location" size={36} color="#9333EA" />
                        </View>
                    </View>

                    {/* Title & Description */}
                    <Text className="text-2xl font-extrabold text-gray-900 text-center mb-3 font-display tracking-tight">
                        Enable Location
                    </Text>
                    <Text className="text-sm text-gray-500 text-center leading-relaxed px-4 font-display mb-8">
                        We use your device location to match you with nearby riders and provide accurate navigation.
                    </Text>

                    {/* Actions */}
                    <View className="w-full gap-3">
                        <TouchableOpacity
                            onPress={handleGrantPermission}
                            disabled={loading}
                            className={`w-full bg-purple-900 rounded-2xl py-4 items-center justify-center shadow-lg shadow-purple-600/30 active:scale-[0.98] ${loading ? 'opacity-80' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text className="text-base font-bold text-white font-display uppercase tracking-wider">
                                    Allow Access
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={onDeclined}
                            disabled={loading}
                            className="w-full py-4 items-center justify-center active:bg-gray-50 rounded-2xl"
                        >
                            <Text className="text-sm font-bold text-gray-500 font-display">Not Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
