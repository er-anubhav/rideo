import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/config/config';
import { realtimeService } from '@/features/ride/realtime.service';
import { configService } from './config.service';

const getTrimmedEnv = (value) => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const envApiBaseUrl = getTrimmedEnv(process.env.EXPO_PUBLIC_API_BASE_URL);
const localDevApiBaseUrl = __DEV__ && envApiBaseUrl
    ? envApiBaseUrl.replace(/\/+$/, '')
    : null;

const getRequestUrl = (config) => {
    if (!config) return undefined;
    if (!config.url) return config.baseURL;
    if (/^https?:\/\//i.test(config.url)) return config.url;
    if (!config.baseURL) return config.url;
    return `${config.baseURL.replace(/\/+$/, '')}/${config.url.replace(/^\/+/, '')}`;
};

const apiClient = axios.create({
    baseURL: CONFIG.API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding JWT token and Dynamic Base URL
apiClient.interceptors.request.use(
    async (config) => {
        try {
            if (localDevApiBaseUrl) {
                // In dev, explicit local env should win over remote config.
                if (config.baseURL !== localDevApiBaseUrl) {
                    config.baseURL = localDevApiBaseUrl;
                }
            } else {
                // Dynamically resolve base URL if remote config is available
                const dynamicBaseUrl = await configService.getApiBaseUrl(CONFIG.API_BASE_URL);
                if (dynamicBaseUrl && config.baseURL !== dynamicBaseUrl) {
                    config.baseURL = dynamicBaseUrl;
                }
            }

            const token = await AsyncStorage.getItem('userToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.warn('RiderApp: Error during request setup', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling 401s
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Clear session state so the app can force a clean re-auth flow.
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            realtimeService.disconnect();
        } else if (error.request) {
            console.warn('RiderApp: Network error - no response received', {
                code: error.code,
                method: error.config?.method?.toUpperCase(),
                requestUrl: getRequestUrl(error.config),
                timeoutMs: error.config?.timeout,
            });
        }
        return Promise.reject(error);
    }
);

export default apiClient;
