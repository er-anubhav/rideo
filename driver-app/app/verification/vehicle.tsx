import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { TextInput } from '@/components/CustomTextInput';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import '../../global.css';
import { driverService } from '@/features/dashboard/driver.service';

const VehicleDetailsScreen = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [vehicleType, setVehicleType] = useState('BIKE'); // BIKE, AUTO, CAB_SEDAN
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');
    const [rcNumber, setRcNumber] = useState('');

    const vehicleTypes = [
        { id: 'BIKE', label: 'Bike', icon: 'two-wheeler' },
        { id: 'AUTO', label: 'Auto', icon: 'electric-rickshaw' },
        { id: 'CAB_SEDAN', label: 'Car', icon: 'directions-car' },
    ];

    const validateForm = (): boolean => {
        if (!vehicleNumber.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter vehicle registration number' });
            return false;
        }
        if (!make.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter vehicle make (e.g. Honda)' });
            return false;
        }
        if (!model.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter vehicle model (e.g. Activa)' });
            return false;
        }
        if (!vehicleColor.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter vehicle color' });
            return false;
        }
        if (!rcNumber.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter RC number' });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            await driverService.addVehicle({
                vehicleType: vehicleType as any,
                registrationNumber: vehicleNumber.trim().toUpperCase(),
                make: make.trim(),
                model: model.trim(),
                color: vehicleColor.trim(),
                rcNumber: rcNumber.trim().toUpperCase(),
            });

            Toast.show({ type: 'success', text1: 'Success', text2: 'Vehicle details added successfully!' });
            router.push('/verification/documents');
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to add vehicle details' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white relative">
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
                    <TouchableOpacity
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/welcome');
                            }
                        }}
                        className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100 -ml-2"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 ml-2 font-display">Vehicle Details</Text>
                </View>

                <ScrollView className="flex-1 px-6 pt-6">

                    {/* Vehicle Type Selection */}
                    <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display mb-3">Vehicle Type *</Text>
                    <View className="flex-row gap-3 mb-6">
                        {vehicleTypes.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                onPress={() => setVehicleType(type.id)}
                                disabled={loading}
                                className={`flex-1 items-center justify-center p-4 rounded-xl border ${vehicleType === type.id ? 'bg-purple-50 border-purple-600' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <MaterialIcons
                                    name={type.icon as any}
                                    size={24}
                                    color={vehicleType === type.id ? '#9333EA' : '#6B7280'}
                                />
                                <Text className={`mt-2 text-sm font-bold font-display ${vehicleType === type.id ? 'text-purple-700' : 'text-gray-500'}`}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Form Fields */}
                    <View className="gap-5 mb-8">
                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Registration Number *</Text>
                            <TextInput
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white uppercase"
                                placeholder="e.g. MH 01 AB 1234"
                                value={vehicleNumber}
                                onChangeText={setVehicleNumber}
                                autoCapitalize="characters"
                                editable={!loading}
                            />
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1 gap-2">
                                <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Make *</Text>
                                <TextInput
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                    placeholder="e.g. Honda"
                                    value={make}
                                    onChangeText={setMake}
                                    editable={!loading}
                                />
                            </View>
                            <View className="flex-1 gap-2">
                                <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Model *</Text>
                                <TextInput
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                    placeholder="e.g. Activa 6G"
                                    value={model}
                                    onChangeText={setModel}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Vehicle Color *</Text>
                            <TextInput
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                placeholder="e.g. Black"
                                value={vehicleColor}
                                onChangeText={setVehicleColor}
                                editable={!loading}
                            />
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">RC Number *</Text>
                            <TextInput
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white uppercase"
                                placeholder="e.g. MH01AB1234567890"
                                value={rcNumber}
                                onChangeText={setRcNumber}
                                autoCapitalize="characters"
                                editable={!loading}
                            />
                        </View>
                    </View>

                    {/* Image Uploads */}
                    <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display mb-3">Vehicle Photos</Text>
                    <View className="flex-row gap-3">
                        {['Front View', 'Back View', 'Side View'].map((label, index) => (
                            <TouchableOpacity
                                key={index}
                                className="flex-1 aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 items-center justify-center active:bg-gray-100"
                                disabled={loading}
                            >
                                <MaterialIcons name="add-a-photo" size={24} color="#9CA3AF" />
                                <Text className="text-[10px] font-bold text-gray-400 mt-2 font-display text-center">{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                </ScrollView>

                {/* Footer Action */}
                <View className="p-6 border-t border-gray-100">
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={loading}
                        className={`w-full rounded-full py-4 items-center justify-center shadow-lg shadow-purple-600/30 active:scale-[0.98] ${loading ? 'bg-gray-300' : 'bg-purple-900'}`}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text className="text-lg font-bold text-white font-display">Next Step</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

export default VehicleDetailsScreen;
