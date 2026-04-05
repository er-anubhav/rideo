import * as Location from 'expo-location';
import { realtimeService } from './realtime.service';
import { userStorage } from '@/utils/storage';
import { appLogger } from '@/utils/app-logger';

const PULSE_INTERVAL = 5000; // 5 seconds as per PDF
const LOCATION_TOPIC = (driverId: string) => `location/driver/${driverId}`;

class LocationPulseService {
    private intervalId: any = null;
    private isRunning = false;

    /**
     * Start the location pulse
     */
    async start() {
        if (this.isRunning) return;

        const user = await userStorage.get();
        if (!user?.id) {
            appLogger.warn('Cannot start location pulse: No user ID found');
            return;
        }

        this.isRunning = true;
        appLogger.info('Starting location pulse for driver', user.id);

        // Immediate first pulse
        this.pulse(user.id);

        this.intervalId = setInterval(() => {
            this.pulse(user.id);
        }, PULSE_INTERVAL);
    }

    /**
     * Stop the location pulse
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        appLogger.info('Location pulse stopped');
    }

    /**
     * Single pulse logic
     */
    private async pulse(driverId: string) {
        try {
            // Check if the realtime channel is connected
            if (!realtimeService.getStatus()) {
                await realtimeService.connect();
            }

            // Get location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            const payload = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                bearing: location.coords.heading || 0,
                speed: location.coords.speed || 0,
                timestamp: new Date().toISOString()
            };

            const topic = LOCATION_TOPIC(driverId);
            realtimeService.publish(topic, payload);
        } catch (error) {
            appLogger.error('Location pulse failed', error);
        }
    }
}

export const locationPulseService = new LocationPulseService();
