import { realtimeService } from '@/api/realtime.service';
import { userStorage } from '@/utils/storage';
import { appLogger } from '@/utils/app-logger';

export interface DriverControlData {
    userId?: string;
    verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    isApproved?: boolean;
    isActive?: boolean;
    isOnline?: boolean;
    isBlocked?: boolean;
    forceLogout?: boolean;
    reason?: string;
    timestamp?: string;
}

export interface DriverControlMessage {
    event?: string;
    data?: DriverControlData;
}

type DriverControlHandler = (data: DriverControlData) => void;

export const driverControlService = {
    async subscribe(handler: DriverControlHandler): Promise<() => void> {
        const user = await userStorage.get();
        const userId = user?.id;

        if (!userId) {
            appLogger.warn('Skipping driver control subscription because user id is unavailable');
            return () => { };
        }

        const topic = `status/driver/${userId}`;
        await realtimeService.connect();

        const wrappedHandler = (message: unknown) => {
            if (!message || typeof message !== 'object') return;

            const control = message as DriverControlMessage;
            if (control.event !== 'driver_control_updated') return;
            if (!control.data) return;

            handler(control.data);
        };

        realtimeService.subscribe(topic, wrappedHandler);
        appLogger.info('Subscribed to driver control topic', topic);

        return () => {
            realtimeService.unsubscribe(topic, wrappedHandler);
            appLogger.debug('Unsubscribed from driver control topic', topic);
        };
    },
};
