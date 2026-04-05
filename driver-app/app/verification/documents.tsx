import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View, Image } from 'react-native';
import { Text } from '@/components/CustomText';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import '../../global.css';
import { driverService } from '@/features/dashboard/driver.service';

const DocumentUploadScreen = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});

    const documents = [
        { id: 'license', title: 'Driving License', subtitle: 'Front and Back side' },
        { id: 'insurance', title: 'Vehicle Insurance', subtitle: 'Valid Policy Document' },
        { id: 'rc', title: 'Registration Certificate (RC)', subtitle: 'Vehicle Ownership Proof' },
        { id: 'pan', title: 'PAN Card', subtitle: 'Identity Proof' },
    ];

    const pickImage = async (docId: string) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setUploadedDocs(prev => ({
                    ...prev,
                    [docId]: result.assets[0].uri
                }));
            }
        } catch {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSubmit = async () => {
        // Validation
        const missingDocs = documents.map(d => d.id).filter(id => !uploadedDocs[id]);

        if (missingDocs.length > 0) {
            Alert.alert('Missing Documents', 'Please upload all required documents to proceed.');
            return;
        }

        Alert.alert(
            'Submit Documents',
            'Are you sure you want to submit? Ensure all details are correct.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Submit',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await driverService.submitDocuments();
                            Alert.alert(
                                'Success',
                                'Documents submitted successfully! Your profile is now under review.',
                                [{ text: 'OK', onPress: () => router.push('/verification/status') }]
                            );
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to submit documents');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1 bg-white relative">
            <StatusBar style="dark" />
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100 -ml-2"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 ml-2 font-display">Upload Documents</Text>
                </View>

                <ScrollView className="flex-1 px-6 pt-6">
                    <View className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                        <View className="flex-row items-start">
                            <MaterialIcons name="info-outline" size={20} color="#3B82F6" />
                            <View className="flex-1 ml-3">
                                <Text className="text-sm font-bold text-blue-900 mb-1 font-display">Important</Text>
                                <Text className="text-xs text-blue-700 leading-5 font-display">
                                    Please upload clear photos of original documents. Ensure all text is readable and corners are visible.
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="gap-4">
                        {documents.map((doc) => {
                            const isUploaded = !!uploadedDocs[doc.id];
                            return (
                                <TouchableOpacity
                                    key={doc.id}
                                    onPress={() => pickImage(doc.id)}
                                    className={`flex-row items-center p-4 rounded-2xl border active:bg-gray-50 ${isUploaded ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}
                                    disabled={loading}
                                >
                                    <View className={`h-12 w-12 rounded-xl items-center justify-center mr-4 overflow-hidden ${isUploaded ? 'bg-white' : 'bg-purple-100'}`}>
                                        {isUploaded ? (
                                            <Image source={{ uri: uploadedDocs[doc.id] }} className="h-full w-full" />
                                        ) : (
                                            <MaterialIcons name="description" size={24} color="#9333EA" />
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`text-base font-bold font-display ${isUploaded ? 'text-purple-900' : 'text-gray-900'}`}>
                                            {doc.title}
                                        </Text>
                                        <Text className={`text-xs font-display ${isUploaded ? 'text-purple-600' : 'text-gray-500'}`}>
                                            {isUploaded ? 'Document Uploaded' : doc.subtitle}
                                        </Text>
                                    </View>
                                    <View className={`h-8 w-8 rounded-full items-center justify-center border shadow-sm ${isUploaded ? 'bg-green-500 border-green-500' : 'bg-white border-gray-200'}`}>
                                        <MaterialIcons
                                            name={isUploaded ? "check" : "add"}
                                            size={20}
                                            color={isUploaded ? "white" : "#4B5563"}
                                        />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
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
                            <Text className="text-lg font-bold text-white font-display">Submit for Verification</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
};

export default DocumentUploadScreen;
