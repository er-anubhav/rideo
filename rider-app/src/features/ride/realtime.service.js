import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/config/config';
import { resolveBackendUrl } from '@/utils/networkConfig';
import { configService } from '../../api/config.service';
import {
    mapBackendRideStatusToRider,
    normalizeRide,
    normalizeRoutePayload,
} from './rideAdapter';

const getTrimmedEnv = (value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const envWsBaseUrl = getTrimmedEnv(process.env.EXPO_PUBLIC_WS_BASE_URL);
const localDevWsBaseUrl = __DEV__ && envWsBaseUrl
    ? resolveBackendUrl(envWsBaseUrl)
    : null;

const buildSocketUrl = (baseUrl, riderId, token) => {
    const normalized = baseUrl.replace(/\/+$/, '');

    if (/\/rider\/[^/?]+$/i.test(normalized)) {
        return `${normalized}?token=${encodeURIComponent(token)}`;
    }

    if (/\/ws$/i.test(normalized)) {
        return `${normalized}/rider/${riderId}?token=${encodeURIComponent(token)}`;
    }

    return `${normalized}/ws/rider/${riderId}?token=${encodeURIComponent(token)}`;
};

class RealtimeService {
    client = null;
    isConnected = false;
    offlineQueue = [];
    subscriptions = new Map();
    userId = null;
    authToken = null;

    async loadIdentity() {
        const [storedUserData, token] = await Promise.all([
            AsyncStorage.getItem('userData'),
            AsyncStorage.getItem('userToken'),
        ]);

        let userId = null;
        if (storedUserData) {
            try {
                userId = JSON.parse(storedUserData)?.id || null;
            } catch {
                userId = null;
            }
        }

        return { userId, token };
    }

    async getApiBaseUrl() {
        return configService.getApiBaseUrl(CONFIG.API_BASE_URL);
    }

    async connect() {
        const { userId, token } = await this.loadIdentity();

        if (!userId || !token) {
            return false;
        }

        const identityChanged = this.userId !== userId || this.authToken !== token;
        if (identityChanged && this.client) {
            this.disconnect({ clearQueue: false, clearSubscriptions: false });
        }

        if (this.client && this.isConnected && !identityChanged) {
            return true;
        }

        this.userId = userId;
        this.authToken = token;

        const targetUrl = localDevWsBaseUrl
            ? localDevWsBaseUrl
            : await configService.getWsBaseUrl(CONFIG.WS_BASE_URL);
        const socketUrl = buildSocketUrl(targetUrl, userId, token);

        return new Promise((resolve, reject) => {
            let settled = false;
            this.client = new WebSocket(socketUrl);

            this.client.onopen = () => {
                this.isConnected = true;
                this.flushQueue();
                if (!settled) {
                    settled = true;
                    resolve(true);
                }
            };

            this.client.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    void this.routeIncomingMessage(payload);
                } catch {
                    // Ignore malformed socket frames without breaking the stream.
                }
            };

            this.client.onerror = () => {
                this.isConnected = false;
                if (!settled) {
                    settled = true;
                    reject(new Error('Rider realtime connection failed'));
                }
            };

            this.client.onclose = () => {
                this.isConnected = false;
                this.client = null;
            };
        });
    }

    disconnect({ clearQueue = true, clearSubscriptions = true } = {}) {
        if (this.client) {
            this.client.close();
            this.client = null;
        }

        this.isConnected = false;
        this.userId = null;
        this.authToken = null;

        if (clearQueue) {
            this.offlineQueue = [];
        }

        if (clearSubscriptions) {
            this.subscriptions.clear();
        }
    }

    sendRideRequest({ rideId, pickup, drop, vehicleType, fare }) {
        this.sendEvent('request_ride', {
            ride_id: rideId,
            pickup,
            drop,
            vehicle_type: vehicleType,
            fare,
        });
    }

    publishCommand(subTopic, payload, { queueIfOffline = true } = {}) {
        if (subTopic.includes('/cancel')) {
            const rideId = subTopic.split('/')[1];
            this.sendEvent('cancel_ride', {
                ride_id: rideId,
                reason: payload?.reason || 'Rider cancelled',
            }, { queueIfOffline });
        }
    }

    sendEvent(event, payload, { queueIfOffline = true } = {}) {
        const message = {
            event,
            ...payload,
            timestamp: new Date().toISOString(),
        };

        if (this.isConnected && this.client) {
            this.client.send(JSON.stringify(message));
            return;
        }

        if (!queueIfOffline) {
            throw new Error('Realtime channel unavailable. Please retry.');
        }

        this.offlineQueue.push(message);
    }

    subscribe(topic, callback) {
        if (!this.subscriptions.has(topic)) {
            this.subscriptions.set(topic, new Set());
        }

        if (callback) {
            this.subscriptions.get(topic).add(callback);
        }

        return () => {
            const callbacks = this.subscriptions.get(topic);
            if (!callbacks) return;

            if (callback) {
                callbacks.delete(callback);
            }

            if (callbacks.size === 0) {
                this.subscriptions.delete(topic);
            }
        };
    }

    unsubscribe(topic) {
        this.subscriptions.delete(topic);
    }

    emit(topic, payload) {
        const callbacks = this.subscriptions.get(topic);
        if (!callbacks || callbacks.size === 0) {
            return;
        }

        callbacks.forEach((callback) => {
            try {
                callback(payload);
            } catch {
                // Avoid a single screen callback crashing the socket pump.
            }
        });
    }

    async routeIncomingMessage(payload) {
        const event = payload?.event;
        const type = payload?.type;

        if (event === 'driver_location') {
            const rideId = payload?.ride_id;
            if (!rideId) return;

            this.emit(`status/ride/${rideId}/location`, {
                data: {
                    smoothed: {
                        lat: payload?.lat,
                        lng: payload?.lng,
                    },
                },
            });
            return;
        }

        if (event === 'notification') {
            await this.handleNotification(type, payload);
            return;
        }

        if (event === 'ride_accepted') {
            await this.refreshRideState(payload?.ride_id, 'ACCEPTED');
            return;
        }

        if (event === 'ride_status_changed') {
            await this.refreshRideState(payload?.ride_id, payload?.status);
            return;
        }

        // NEW: Handle ride auto-cancellation
        if (event === 'ride_cancelled') {
            const rideId = payload?.ride_id;
            this.emitRideState(rideId, {
                id: rideId,
                status: 'CANCELLED',
                data: {
                    id: rideId,
                    status: 'CANCELLED',
                    reason: payload?.reason || 'Ride cancelled',
                },
            });
            
            // Show notification to rider
            this.emit('ride/notification', {
                type: 'ride_cancelled',
                title: 'Ride Cancelled',
                message: payload?.reason || 'Your ride has been cancelled',
            });
            return;
        }
    }

    async handleNotification(type, payload) {
        const rideId = payload?.data?.ride_id || payload?.data?.rideId || null;

        switch (type) {
            case 'ride_accepted':
                await this.refreshRideState(rideId, 'ACCEPTED');
                break;
            case 'driver_arriving':
                await this.refreshRideState(rideId, 'ACCEPTED');
                break;
            case 'driver_arrived':
                await this.refreshRideState(rideId, 'DRIVER_ARRIVED');
                break;
            case 'ride_started':
                await this.refreshRideState(rideId, 'IN_PROGRESS');
                break;
            case 'ride_completed':
                this.emitRideState(rideId, {
                    id: rideId,
                    status: 'COMPLETED',
                    data: {
                        id: rideId,
                        status: 'COMPLETED',
                        totalFare: payload?.data?.fare,
                    },
                });
                break;
            case 'ride_cancelled':
                this.emitRideState(rideId, {
                    id: rideId,
                    status: 'CANCELLED',
                    data: {
                        id: rideId,
                        status: 'CANCELLED',
                    },
                });
                break;
            default:
                break;
        }
    }

    async refreshRideState(rideId, fallbackStatus) {
        const normalizedFallbackStatus = mapBackendRideStatusToRider(fallbackStatus) || fallbackStatus;
        const ride = await this.fetchCurrentRide();

        if (!ride) {
            this.emitRideState(rideId, {
                id: rideId,
                status: normalizedFallbackStatus,
                data: {
                    id: rideId,
                    status: normalizedFallbackStatus,
                },
            });
            return;
        }

        this.emitRideState(ride.id, {
            id: ride.id,
            status: ride.status || normalizedFallbackStatus,
            data: ride,
        });

        try {
            const route = await this.fetchRideRoute(ride.id);
            if (route) {
                this.emit(`status/ride/${ride.id}/route`, route);
            }
        } catch {
            // Route refresh is best-effort only.
        }
    }

    emitRideState(rideId, payload) {
        if (rideId) {
            this.emit(`status/ride/${rideId}`, payload);
        }

        if (this.userId) {
            this.emit(`status/user/${this.userId}/active-ride`, payload);
        }
    }

    async fetchCurrentRide() {
        if (!this.authToken) return null;

        try {
            const baseUrl = await this.getApiBaseUrl();
            const response = await fetch(`${baseUrl}/rides/current`, {
                headers: {
                    Authorization: `Bearer ${this.authToken}`,
                },
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json();
            if (!payload?.ride) {
                return null;
            }

            return normalizeRide(payload, {
                driver: payload?.driver,
                vehicle: payload?.vehicle,
            });
        } catch {
            return null;
        }
    }

    async fetchRideRoute(rideId) {
        if (!this.authToken || !rideId) {
            return null;
        }

        try {
            const baseUrl = await this.getApiBaseUrl();
            const response = await fetch(`${baseUrl}/rides/${rideId}/route`, {
                headers: {
                    Authorization: `Bearer ${this.authToken}`,
                },
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json();
            return normalizeRoutePayload(payload);
        } catch {
            return null;
        }
    }

    flushQueue() {
        if (!this.client || !this.isConnected || this.offlineQueue.length === 0) {
            return;
        }

        while (this.offlineQueue.length > 0) {
            const message = this.offlineQueue.shift();
            this.client.send(JSON.stringify(message));
        }
    }
}

export const realtimeService = new RealtimeService();
