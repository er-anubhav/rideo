import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View, Modal, FlatList, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { TextInput } from '@/components/CustomTextInput';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import '../../global.css';
import { driverService } from '@/features/dashboard/driver.service';
import { INDIAN_STATES } from '@/constants/locations';

const PersonalDetailsScreen = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');

    // DOB State
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');

    // State Picker State
    const [state, setState] = useState('');
    const [showStatePicker, setShowStatePicker] = useState(false);

    const [pincode, setPincode] = useState('');

    const handleLicenseChange = (text: string) => {
        // Alphanumeric only, max 16 chars
        const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16);
        setLicenseNumber(cleaned);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDateOfBirth(selectedDate);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    };

    const validateForm = (): boolean => {
        if (!firstName.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your first name' });
            return false;
        }
        if (!lastName.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your last name' });
            return false;
        }
        if (!email.trim() || !email.includes('@')) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid email address' });
            return false;
        }
        if (!licenseNumber.trim() || licenseNumber.length < 5) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid driving license number' });
            return false;
        }
        if (!dateOfBirth) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select your date of birth' });
            return false;
        }
        if (!address.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your address' });
            return false;
        }
        if (!city.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your city' });
            return false;
        }
        if (!state.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select your state' });
            return false;
        }
        if (!pincode.trim() || pincode.length !== 6) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid 6-digit pincode' });
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            await driverService.createProfile({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                licenseNumber: licenseNumber.trim(),
                dateOfBirth: formatDate(dateOfBirth),
                address: address.trim(),
                city: city.trim(),
                state: state.trim(),
                pincode: pincode.trim(),
                emergencyContact: '', // Removed from UI
            });

            Toast.show({ type: 'success', text1: 'Success', text2: 'Profile created successfully!' });
            router.push('/verification/vehicle');
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Failed to create profile' });
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
                    <Text className="text-lg font-bold text-gray-900 ml-2 font-display">Personal Details</Text>
                </View>

                <ScrollView className="flex-1 px-6 pt-6">
                    {/* Profile Picture Upload Placeholder */}
                    <View className="items-center mb-8">
                        <View className="w-24 h-24 bg-purple-50 rounded-full items-center justify-center border-2 border-dashed border-purple-200 mb-3 relative">
                            <MaterialIcons name="add-a-photo" size={32} color="#9333EA" />
                            <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center border-2 border-white">
                                <MaterialIcons name="edit" size={14} color="white" />
                            </View>
                        </View>
                        <Text className="text-sm font-medium text-purple-700 font-display">Upload Profile Picture</Text>
                    </View>

                    {/* Form Fields */}
                    <View className="gap-5">
                        <View className="flex-row gap-4">
                            <View className="flex-1 gap-2">
                                <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">First Name *</Text>
                                <TextInput
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                    placeholder="John"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                    editable={!loading}
                                />
                            </View>
                            <View className="flex-1 gap-2">
                                <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Last Name *</Text>
                                <TextInput
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                    placeholder="Doe"
                                    value={lastName}
                                    onChangeText={setLastName}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Email Address *</Text>
                            <TextInput
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                placeholder="john@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                                editable={!loading}
                            />
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Driving License No. *</Text>
                            <TextInput
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                placeholder="MH0120220000001"
                                autoCapitalize="characters"
                                value={licenseNumber}
                                onChangeText={handleLicenseChange}
                                maxLength={16}
                                editable={!loading}
                            />
                            <Text className="text-xs text-gray-400 text-right">{licenseNumber.length}/16</Text>
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Date of Birth *</Text>
                            <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4"
                            >
                                <Text className={`text-base font-medium ${dateOfBirth ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {dateOfBirth ? formatDate(dateOfBirth) : 'DD/MM/YYYY'}
                                </Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={dateOfBirth || new Date()}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                    maximumDate={new Date()}
                                />
                            )}
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Address *</Text>
                            <TextInput
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                placeholder="Street address, apartment, etc."
                                multiline
                                numberOfLines={2}
                                value={address}
                                onChangeText={setAddress}
                                editable={!loading}
                            />
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">City *</Text>
                            <TextInput
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                placeholder="e.g. Mumbai"
                                value={city}
                                onChangeText={setCity}
                                editable={!loading}
                            />
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">State *</Text>
                            <TouchableOpacity
                                onPress={() => setShowStatePicker(true)}
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 flex-row justify-between items-center"
                            >
                                <Text className={`text-base font-medium ${state ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {state || 'Select State'}
                                </Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-2">
                            <Text className="text-xs font-bold ml-1 text-gray-700 uppercase tracking-wide font-display">Pincode *</Text>
                            <TextInput
                                className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-base font-medium text-gray-900 focus:border-purple-600 focus:bg-white"
                                placeholder="6-digit pincode"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={pincode}
                                onChangeText={setPincode}
                                editable={!loading}
                            />
                        </View>
                    </View>
                    <View className="h-20" />
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

                {/* State Picker Modal */}
                <Modal
                    visible={showStatePicker}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowStatePicker(false)}
                >
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-white rounded-t-3xl h-[70%]">
                            <View className="p-4 border-b border-gray-100 flex-row justify-between items-center">
                                <Text className="text-lg font-bold text-gray-900 font-display">Select State</Text>
                                <TouchableOpacity onPress={() => setShowStatePicker(false)} className="p-2">
                                    <MaterialIcons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={INDIAN_STATES}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setState(item);
                                            setShowStatePicker(false);
                                        }}
                                        className="p-4 border-b border-gray-50 active:bg-purple-50"
                                    >
                                        <Text className={`text-base ${state === item ? 'text-purple-700 font-bold' : 'text-gray-900'}`}>
                                            {item}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={{ paddingBottom: 40 }}
                            />
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
};

export default PersonalDetailsScreen;
