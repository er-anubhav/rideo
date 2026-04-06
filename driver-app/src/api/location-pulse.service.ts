import * as Location from 'expo-location';
import { realtimeService } from './realtime.service';
import { userStorage } from '@/utils/storage';
import { appLogger } from '@/utils/app-logger';
import api from './api';

const PULSE_INTERVAL = 5000; // 5 seconds
const TRACKING_INTERVAL = 10000; // 10 seconds for ride tracking
const LOCATION_TOPIC = (driverId: string) => `location/driver/${driverId}`;

class LocationPulseService {
    private intervalId: any = null;
    private trackingIntervalId: any = null;
    private isRunning = false;
    private activeRideId: string | null = null;

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
     * Start tracking for an active ride
     * Sends location points to backend for route tracking
     */
    startRideTracking(rideId: string) {
        if (this.trackingIntervalId) {
            this.stopRideTracking();
        }

        this.activeRideId = rideId;
        appLogger.info('Starting ride tracking for ride:', rideId);

        // Immediate first tracking point
        this.sendTrackingPoint(rideId);

        this.trackingIntervalId = setInterval(() => {
            this.sendTrackingPoint(rideId);
        }, TRACKING_INTERVAL);
    }

    /**
     * Stop ride tracking
     */
    stopRideTracking() {
        if (this.trackingIntervalId) {
            clearInterval(this.trackingIntervalId);
            this.trackingIntervalId = null;
        }
        this.activeRideId = null;
        appLogger.info('Ride tracking stopped');
    }

    /**
     * Stop the location pulse
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.stopRideTracking();
        this.isRunning = false;
        appLogger.info('Location pulse stopped');
    }

    /**
     * Send tracking point to backend API
     */
    private async sendTrackingPoint(rideId: string) {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            await api.post(`/rides/${rideId}/track`, {
                lat: location.coords.latitude,
                lng: location.coords.longitude
            });

            appLogger.debug('Tracking point sent for ride:', rideId);
        } catch (error) {
            appLogger.error('Failed to send tracking point', error);
        }
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
