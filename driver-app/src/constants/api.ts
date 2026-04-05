import { resolveBackendUrl } from '@/utils/network-config';

const DEFAULT_DEV_API_BASE_URL = 'http://192.168.1.14:8001/api';
const DEFAULT_DEV_WS_BASE_URL = 'ws://192.168.1.14:8001/ws';
const DEFAULT_REQUEST_TIMEOUT = 30000;

const getTrimmedEnv = (value?: string): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const getNumberEnv = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const stripTrailingSlash = (url: string): string =>
    url.endsWith('/') ? url.slice(0, -1) : url;

export const API_BASE_URL =
    stripTrailingSlash(
        resolveBackendUrl(getTrimmedEnv(process.env.EXPO_PUBLIC_API_BASE_URL)) ||
        DEFAULT_DEV_API_BASE_URL
    );

export const WS_BASE_URL =
    stripTrailingSlash(
        resolveBackendUrl(getTrimmedEnv(process.env.EXPO_PUBLIC_WS_BASE_URL)) ||
        DEFAULT_DEV_WS_BASE_URL
    );

export const REQUEST_TIMEOUT = getNumberEnv(
    process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS,
    DEFAULT_REQUEST_TIMEOUT
);

export const ENABLE_REMOTE_LOGGING =
    process.env.EXPO_PUBLIC_ENABLE_REMOTE_LOGGING === 'true' || !__DEV__;

const realtimeEnabledEnv =
    getTrimmedEnv(process.env.EXPO_PUBLIC_ENABLE_REALTIME);

export const ENABLE_REALTIME =
    realtimeEnabledEnv !== 'false';

export const CONFIG_URL =
    getTrimmedEnv(process.env.EXPO_PUBLIC_CONFIG_URL);

export const MAPPLS_NAV_DEEPLINK_TEMPLATE =
    getTrimmedEnv(process.env.EXPO_PUBLIC_MAPPLS_NAV_DEEPLINK_TEMPLATE);

export const MAPPLS_REST_KEY =
    getTrimmedEnv(process.env.EXPO_PUBLIC_MAPPLS_REST_KEY);

export const MAPPLS_CLIENT_ID =
    getTrimmedEnv(process.env.EXPO_PUBLIC_MAPPLS_CLIENT_ID);

export const MAPPLS_CLIENT_SECRET =
    getTrimmedEnv(process.env.EXPO_PUBLIC_MAPPLS_CLIENT_SECRET);

export const MAP_TILE_URL_TEMPLATE =
    getTrimmedEnv(process.env.EXPO_PUBLIC_MAP_TILE_URL_TEMPLATE) ||
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// API Endpoints
export const API_ENDPOINTS = {
    // Authentication
    AUTH: {
        REQUEST_OTP: '/auth/send-otp',
        VERIFY_OTP: '/auth/verify-otp',
        ME: '/users/me',
    },

    // Driver
    DRIVER: {
        PROFILE: '/drivers/profile',
        SUBMIT_DOCUMENTS: '/drivers/submit-documents',
        ADD_VEHICLE: '/drivers/add-vehicle',
        GO_ONLINE: '/drivers/toggle-online',
        GO_OFFLINE: '/drivers/toggle-online',
        STATS: '/earnings/stats',
    },

    // Rides
    RIDES: {
        ACCEPT: (id: string) => `/rides/${id}/accept`,
        ARRIVE: (id: string) => `/rides/${id}/arriving`,
        START: (id: string) => `/rides/${id}/start`,
        COMPLETE: (id: string) => `/rides/${id}/complete`,
        CANCEL: (id: string) => `/rides/${id}/cancel`,
        SOS: (id: string) => `/rides/${id}/sos`,
        ROUTE: (id: string) => `/rides/${id}/route`,
        UPCOMING: '/rides/driver/upcoming',
        COMPLETED: '/rides/driver/completed',
        ALL: '/rides/driver/all',
    },

    // Notifications
    NOTIFICATIONS: {
        ALL: '/notifications',
        MARK_AS_READ: (id: string) => `/notifications/${id}/read`,
        MARK_ALL_AS_READ: '/notifications/read-all',
    },
};
