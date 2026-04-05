import { ENABLE_REALTIME, WS_BASE_URL } from '@/constants/api';
import { tokenStorage, userStorage } from '@/utils/storage';
import { appLogger } from '@/utils/app-logger';
import { normalizeDriverRide } from '@/features/backend/backend-adapter';

import { configService } from './config.service';

const getTrimmedEnv = (value?: string): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const envWsBaseUrl = getTrimmedEnv(process.env.EXPO_PUBLIC_WS_BASE_URL);
const localDevWsBaseUrl = __DEV__ && envWsBaseUrl
    ? envWsBaseUrl.replace(/\/+$/, '')
    : null;

type SubscriptionHandler = (message: unknown) => void;
type QueuedMessage = { topic: string; message: Record<string, unknown> };

const buildSocketUrl = (baseUrl: string, driverId: string, token: string) => {
    const normalized = baseUrl.replace(/\/+$/, '');

    if (/\/driver\/[^/?]+$/i.test(normalized)) {
        return `${normalized}?token=${encodeURIComponent(token)}`;
    }

    if (/\/ws$/i.test(normalized)) {
        return `${normalized}/driver/${driverId}?token=${encodeURIComponent(token)}`;
    }

    return `${normalized}/ws/driver/${driverId}?token=${encodeURIComponent(token)}`;
};

class RealtimeService {
    private socket: WebSocket | null = null;
    private isConnected = false;
    private connectPromise: Promise<void> | null = null;
    private offlineQueue: QueuedMessage[] = [];
    private subscriptions = new Map<string, Set<SubscriptionHandler>>();
    private authToken: string | null = null;
    private driverId: string | null = null;
    private readonly MAX_OFFLINE_QUEUE_SIZE = 100;

    getStatus(): boolean {
        return this.isConnected;
    }

    async connect(serverUrl?: string): Promise<void> {
        if (!ENABLE_REALTIME) {
            appLogger.info('Realtime transport is disabled by configuration.');
            return;
        }

        const [user, token] = await Promise.all([
            userStorage.get(),
            tokenStorage.get(),
        ]);

        if (!user?.id || !token) {
            appLogger.warn('Skipping realtime connect because auth identity is unavailable.');
            return;
        }

        this.driverId = user.id;
        this.authToken = token;

        let targetUrl = serverUrl;
        if (!targetUrl) {
            if (localDevWsBaseUrl) {
                targetUrl = localDevWsBaseUrl;
            } else {
                const cached = await configService.getCachedConfig();
                targetUrl = cached?.wsBaseUrl || cached?.mqttBrokerUrl || WS_BASE_URL;
            }
        }

        if (this.socket && this.isConnected) {
            return;
        }

        if (this.connectPromise) {
            return this.connectPromise;
        }

        this.connectPromise = this.initializeConnection(targetUrl || WS_BASE_URL).finally(() => {
            this.connectPromise = null;
        });

        return this.connectPromise;
    }

    private async initializeConnection(serverUrl: string): Promise<void> {
        if (!this.driverId || !this.authToken) {
            return;
        }

        const socketUrl = buildSocketUrl(serverUrl, this.driverId, this.authToken);

        return new Promise((resolve, reject) => {
            let settled = false;
            this.socket = new WebSocket(socketUrl);

            this.socket.onopen = () => {
                this.isConnected = true;
                appLogger.info('Driver realtime socket connected');
                this.flushQueue();

                if (!settled) {
                    settled = true;
                    resolve();
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    this.routeIncomingMessage(payload);
                } catch (error) {
                    appLogger.warn('Failed to parse realtime message', error);
                }
            };

            this.socket.onerror = () => {
                this.isConnected = false;
                if (!settled) {
                    settled = true;
                    reject(new Error('Driver realtime connection failed'));
                }
            };

            this.socket.onclose = () => {
                this.isConnected = false;
                this.socket = null;
                appLogger.debug('Driver realtime socket closed');
            };
        });
    }

    publish(topic: string, message: Record<string, unknown>): void {
        try {
            if (this.isConnected && this.socket) {
                const translated = this.translateTopicToEvent(topic, message);
                if (!translated) {
                    return;
                }

                this.socket.send(JSON.stringify(translated));
                return;
            }

            this.enqueueOfflineMessage({ topic, message });
            appLogger.debug('Realtime socket offline. Queued message.', topic);
        } catch (error) {
            appLogger.error('Realtime publish error', error);
        }
    }

    subscribe(topic: string, callback: SubscriptionHandler): void {
        const handlers = this.subscriptions.get(topic) || new Set<SubscriptionHandler>();
        handlers.add(callback);
        this.subscriptions.set(topic, handlers);
    }

    unsubscribe(topic: string, callback?: SubscriptionHandler): void {
        if (!callback) {
            this.subscriptions.delete(topic);
            return;
        }

        const handlers = this.subscriptions.get(topic);
        if (!handlers) return;

        handlers.delete(callback);
        if (handlers.size === 0) {
            this.subscriptions.delete(topic);
            return;
        }

        this.subscriptions.set(topic, handlers);
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.isConnected = false;
        this.driverId = null;
        this.authToken = null;
    }

    private routeIncomingMessage(payload: any): void {
        const event = payload?.event;
        const type = payload?.type;

        if (event === 'new_ride_request') {
            const ride = normalizeDriverRide({
                id: payload?.ride_id,
                pickup: payload?.pickup,
                drop: payload?.drop,
                status: 'searching',
                fare: { estimated: payload?.fare },
                vehicle_type: payload?.vehicle_type,
            }, { overrideStatus: 'MATCHED' });

            if (this.driverId) {
                this.emit(`status/user/${this.driverId}/active-ride`, {
                    id: ride.id,
                    status: 'MATCHED',
                    data: ride,
                });
            }

            this.emit(`ride/${ride.id}`, {
                event: 'ride_matched',
                data: ride,
            });
            return;
        }

        if (event === 'ride_cancelled' || type === 'ride_cancelled') {
            const rideId = String(payload?.ride_id || payload?.data?.ride_id || payload?.data?.rideId || '');
            const message = {
                id: rideId,
                status: 'CANCELLED',
                data: { id: rideId, status: 'CANCELLED' },
                event: 'ride_cancelled',
            };

            if (this.driverId) {
                this.emit(`status/user/${this.driverId}/active-ride`, message);
            }
            this.emit(`ride/${rideId}`, message);
            return;
        }

        if (event === 'notification' && this.driverId) {
            this.emit(`status/driver/${this.driverId}`, payload);
        }
    }

    private translateTopicToEvent(topic: string, message: Record<string, unknown>) {
        const rideLocationMatch = topic.match(/^cmd\/ride\/([^/]+)\/location$/);
        if (rideLocationMatch) {
            return {
                event: 'location_update',
                ride_id: rideLocationMatch[1],
                lat: message.lat ?? message.latitude,
                lng: message.lng ?? message.longitude,
            };
        }

        const driverLocationMatch = topic.match(/^location\/driver\/([^/]+)$/);
        if (driverLocationMatch) {
            return {
                event: 'location_update',
                lat: message.lat ?? message.latitude,
                lng: message.lng ?? message.longitude,
            };
        }

        const arriveMatch = topic.match(/^cmd\/ride\/([^/]+)\/arrive$/);
        if (arriveMatch) {
            return { event: 'ride_status_update', ride_id: arriveMatch[1], status: 'arriving' };
        }

        const startMatch = topic.match(/^cmd\/ride\/([^/]+)\/start$/);
        if (startMatch) {
            return { event: 'ride_status_update', ride_id: startMatch[1], status: 'started' };
        }

        const completeMatch = topic.match(/^cmd\/ride\/([^/]+)\/complete$/);
        if (completeMatch) {
            return { event: 'ride_status_update', ride_id: completeMatch[1], status: 'completed' };
        }

        const cancelMatch = topic.match(/^cmd\/ride\/([^/]+)\/cancel$/);
        if (cancelMatch) {
            return { event: 'ride_status_update', ride_id: cancelMatch[1], status: 'cancelled' };
        }

        if (topic.startsWith('error/driver/')) {
            appLogger.warn('Driver reported compatibility issue', { topic, ...message });
            return null;
        }

        return message;
    }

    private emit(topic: string, payload: unknown): void {
        const handlers = this.subscriptions.get(topic);
        if (!handlers || handlers.size === 0) {
            return;
        }

        handlers.forEach((handler) => {
            try {
                handler(payload);
            } catch (error) {
                appLogger.warn('Realtime subscription handler failed', error);
            }
        });
    }

    private enqueueOfflineMessage(item: QueuedMessage): void {
        if (this.offlineQueue.length >= this.MAX_OFFLINE_QUEUE_SIZE) {
            this.offlineQueue.shift();
        }
        this.offlineQueue.push(item);
    }

    private flushQueue(): void {
        if (!this.socket || !this.isConnected || this.offlineQueue.length === 0) {
            return;
        }

        while (this.offlineQueue.length > 0) {
            const next = this.offlineQueue.shift();
            if (!next) continue;
            const translated = this.translateTopicToEvent(next.topic, next.message);
            if (!translated) continue;
            this.socket.send(JSON.stringify(translated));
        }
    }
}

export const realtimeService = new RealtimeService();
