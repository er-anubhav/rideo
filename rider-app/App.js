import './global.css';
import React, { useCallback, useEffect } from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import WelcomeScreen from '@/features/auth/WelcomeScreen';
import LoginScreen from '@/features/auth/LoginScreen';
import TestLoginScreen from '@/features/auth/TestLoginScreen';
import LocationLoadingScreen from '@/features/ride/LocationLoadingScreen';
import RideDetailsScreen from '@/features/ride/RideDetailsScreen';
import InRideScreen from '@/features/ride/InRideScreen';
import PaymentOptionsScreen from '@/features/wallet/PaymentOptionsScreen';
import RideHistoryScreen from '@/features/profile/RideHistoryScreen';
import UserProfileScreen from '@/features/profile/UserProfileScreen';
import RateRideScreen from '@/features/ride/RateRideScreen';
import HelpCenterScreen from '@/features/support/HelpCenterScreen';
import ChatSupportScreen from '@/features/support/ChatSupportScreen';
import RideHistoryDetailsScreen from '@/features/profile/RideHistoryDetailsScreen';
import EditProfileScreen from '@/features/profile/EditProfileScreen';
import DestinationSearchScreen from '@/features/booking/DestinationSearchScreen';
import { loggingService } from '@/utils/loggingService';
import { configService } from '@/api/config.service';
import BottomTabs from '@/navigation/BottomTabs';

// Ignore specific warnings
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => { });

const Stack = createNativeStackNavigator();

const BUILD_TAG = 'rider-nav-fix-2026-03-24-v3';

export default function App() {
  useEffect(() => {
    console.log(`[RiderApp] Build ${BUILD_TAG} loaded`);
  }, []);

  useEffect(() => {
    configService.initialize();
  }, []);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const uninstall = loggingService.installGlobalErrorHandler();
    return uninstall;
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <NavigationContainer
        onReady={() => {
          console.log(`[RiderApp] Navigation ready (${BUILD_TAG})`);
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="TestLogin" component={TestLoginScreen} />
          <Stack.Screen name="LocationLoading" component={LocationLoadingScreen} />
          <Stack.Screen name="Home" component={BottomTabs} />
          <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
          <Stack.Screen name="InRide" component={InRideScreen} />
          <Stack.Screen name="PaymentOptions" component={PaymentOptionsScreen} />
          <Stack.Screen name="RideHistory" component={RideHistoryScreen} />
          <Stack.Screen name="RideHistoryDetails" component={RideHistoryDetailsScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="RateRide" component={RateRideScreen} />
          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
          <Stack.Screen name="ChatSupport" component={ChatSupportScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="DestinationSearch" component={DestinationSearchScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
    </SafeAreaProvider >
  );
}
