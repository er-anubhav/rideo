import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { authService } from '@/features/auth/auth.service';
import { driverService, DriverProfile } from '@/features/dashboard/driver.service';
import { appLogger } from '@/utils/app-logger';
import { driverStorage } from '@/utils/storage';

const getStartupRoute = (profile: DriverProfile | null): '/dashboard' | '/verification/status' | '/verification/vehicle' | '/verification/details' => {
    if (!profile) return '/verification/details';

    if (!profile.vehicles || profile.vehicles.length === 0) {
        return '/verification/vehicle';
    }

    return profile.verificationStatus === 'APPROVED'
        ? '/dashboard'
        : '/verification/status';
};

export default function Index() {
    const router = useRouter();
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        let active = true;

        const checkStatus = async () => {
            try {
                const authenticated = await authService.isAuthenticated();

                if (!authenticated) {
                    router.replace('/welcome');
                    return;
                }

                try {
                    const profile = await driverService.getProfile();
                    router.replace(getStartupRoute(profile));
                    return;
                } catch {
                    appLogger.warn('Unable to fetch profile during bootstrap. Falling back to cached state.');
                    const cachedProfile = await driverStorage.get();
                    router.replace(getStartupRoute(cachedProfile));
                    return;
                }
            } catch (error) {
                appLogger.error('Initialization error', error);
                router.replace('/welcome');
            } finally {
                if (active) {
                    setInitializing(false);
                }
            }
        };

        checkStatus();

        return () => {
            active = false;
        };
    }, [router]);

    if (!initializing) {
        return null;
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#9333EA" />
        </View>
    );
}
