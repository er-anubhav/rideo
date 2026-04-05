import React from 'react';
import { View } from 'react-native';
import { ToastConfig } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './CustomText';

export const toastConfig: ToastConfig = {
  success: ({ text1, text2, props }) => (
    <View className="flex-row items-center bg-green-50 rounded-2xl w-[90%] mx-5 p-4 mt-2 shadow-sm border border-green-100">
      <View className="bg-green-100 p-2 rounded-full mr-3">
        <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
      </View>
      <View className="flex-1">
        <Text className="text-green-900 font-display text-base">{text1}</Text>
        {text2 && <Text className="text-green-700 text-sm mt-0.5">{text2}</Text>}
      </View>
    </View>
  ),
  error: ({ text1, text2, props }) => (
    <View className="flex-row items-center bg-red-50 rounded-2xl w-[90%] mx-5 p-4 mt-2 shadow-sm border border-red-100">
      <View className="bg-red-100 p-2 rounded-full mr-3">
        <Ionicons name="alert-circle" size={24} color="#dc2626" />
      </View>
      <View className="flex-1">
        <Text className="text-red-900 font-display text-base">{text1}</Text>
        {text2 && <Text className="text-red-700 text-sm mt-0.5">{text2}</Text>}
      </View>
    </View>
  ),
  info: ({ text1, text2, props }) => (
    <View className="flex-row items-center bg-blue-50 rounded-2xl w-[90%] mx-5 p-4 mt-2 shadow-sm border border-blue-100">
      <View className="bg-blue-100 p-2 rounded-full mr-3">
        <Ionicons name="information-circle" size={24} color="#2563eb" />
      </View>
      <View className="flex-1">
        <Text className="text-blue-900 font-display text-base">{text1}</Text>
        {text2 && <Text className="text-blue-700 text-sm mt-0.5">{text2}</Text>}
      </View>
    </View>
  ),
  warning: ({ text1, text2, props }) => (
    <View className="flex-row items-center bg-yellow-50 rounded-2xl w-[90%] mx-5 p-4 mt-2 shadow-sm border border-yellow-100">
      <View className="bg-yellow-100 p-2 rounded-full mr-3">
        <Ionicons name="warning" size={24} color="#d97706" />
      </View>
      <View className="flex-1">
        <Text className="text-yellow-900 font-display text-base">{text1}</Text>
        {text2 && <Text className="text-yellow-700 text-sm mt-0.5">{text2}</Text>}
      </View>
    </View>
  ),
};
