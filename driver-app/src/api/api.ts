import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT } from '@/constants/api';
import { clearAllStorage, tokenStorage } from '@/utils/storage';
import { appLogger } from '@/utils/app-logger';
import { remoteLogger } from '@/utils/logger';

import { configService } from './config.service';

const getTrimmedEnv = (value?: string): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const envApiBaseUrl = getTrimmedEnv(process.env.EXPO_PUBLIC_API_BASE_URL);
const localDevApiBaseUrl = __DEV__ && envApiBaseUrl
    ? envApiBaseUrl.replace(/\/+$/, '')
    : null;

const getRequestUrl = (config?: AxiosRequestConfig): string | undefined => {
    if (!config) return undefined;
    if (!config.url) return config.baseURL;
    if (/^https?:\/\//i.test(config.url)) return config.url;
    if (!config.baseURL) return config.url;

    return `${config.baseURL.replace(/\/+$/, '')}/${config.url.replace(/^\/+/, '')}`;
};

/**
 * Create axios instance with base configuration
 */
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request Interceptor - Attach JWT token and Dynamic Base URL
 */
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            if (localDevApiBaseUrl) {
                // In dev, explicit local env should win over remote config.
                if (config.baseURL !== localDevApiBaseUrl) {
                    config.baseURL = localDevApiBaseUrl;
                }
            } else {
                // Dynamically resolve base URL if remote config is available
                const dynamicBaseUrl = await configService.getApiBaseUrl(API_BASE_URL);
                if (dynamicBaseUrl && config.baseURL !== dynamicBaseUrl) {
                    config.baseURL = dynamicBaseUrl;
                }
            }

            const token = await tokenStorage.get();
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            appLogger.warn('Error during request setup (token/config)', error);
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

/**
 * Response Interceptor - Handle errors globally
 */
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        if (error.response) {
            const { status, data } = error.response;

            // Handle specific error codes
            switch (status) {
                case 401:
                    // Unauthorized - Token expired or invalid
                    appLogger.warn('Unauthorized response. Clearing local auth state.');
                    await clearAllStorage();
                    break;

                case 403:
                    // Forbidden - User doesn't have permission
                    appLogger.warn('Forbidden response', data);
                    break;

                case 404:
                    // Not found - using console.log instead of error because 404 is often a valid checked state
                    appLogger.debug('Resource not found (404)', data);
                    break;

                case 500:
                    // Server error
                    appLogger.error('Server error response', data);
                    break;

                default:
                    appLogger.warn('API error response', { status, data });
            }
        } else if (error.request) {
            // Request was made but no response received
            appLogger.warn('Network error - no response received', {
                code: error.code,
                method: error.config?.method?.toUpperCase(),
                requestUrl: getRequestUrl(error.config),
                timeoutMs: error.config?.timeout,
            });
        } else {
            // Something else happened
            appLogger.error('Request setup error', error.message);
        }

        return Promise.reject(error);
    }
);

/**
 * API Error Handler - Extract meaningful error messages
 */
export const handleApiError = (error: unknown): string => {
    remoteLogger.logError(error, 'API_ERROR');
    if (axios.isAxiosError(error)) {
        const message = (error.response?.data as { message?: string | string[] } | undefined)?.message;

        if (message) {
            return Array.isArray(message) ? message[0] : message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'An unexpected error occurred. Please try again.';
};

export default apiClient;
