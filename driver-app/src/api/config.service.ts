import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { resolveBackendUrl } from '@/utils/network-config';

// Guard: do not run storage or network calls during SSR
const isClient = typeof window !== 'undefined';

const REMOTE_CONFIG_KEY = 'remote_application_config';
const CONFIG_FETCH_TIMEOUT = 5000; // 5 seconds
let inFlightConfigRequest: Promise<AppConfig | null> | null = null;

export interface AppConfig {
    apiBaseUrl: string;
    wsBaseUrl: string;
    version?: string;
    message?: string;
}

const CONFIG_URL = process.env.EXPO_PUBLIC_CONFIG_URL;

export const configService = {
    /**
     * Fetch configuration from remote URL and cache it
     */
    async fetchRemoteConfig(): Promise<AppConfig | null> {
        if (!CONFIG_URL || !isClient) return null;

        if (inFlightConfigRequest) {
            return inFlightConfigRequest;
        }

        inFlightConfigRequest = (async () => {
            try {
                const response = await axios.get<AppConfig>(CONFIG_URL, {
                    timeout: CONFIG_FETCH_TIMEOUT,
                });

                if (response.data && response.data.apiBaseUrl) {
                    const normalizedConfig: AppConfig = {
                        ...response.data,
                        apiBaseUrl: resolveBackendUrl(response.data.apiBaseUrl) || response.data.apiBaseUrl,
                        wsBaseUrl: resolveBackendUrl(response.data.wsBaseUrl) || response.data.wsBaseUrl,
                    };
                    await this.cacheConfig(normalizedConfig);
                    return normalizedConfig;
                }
                return null;
            } catch (error) {
                console.warn('Failed to fetch remote config:', error);
                return null;
            } finally {
                inFlightConfigRequest = null;
            }
        })();

        return inFlightConfigRequest;
    },

    /**
     * Cache configuration for offline/startup use
     */
    async cacheConfig(config: AppConfig): Promise<void> {
        if (!isClient) return;
        try {
            await AsyncStorage.setItem(REMOTE_CONFIG_KEY, JSON.stringify(config));
        } catch (error) {
            console.error('Error caching config:', error);
        }
    },

    /**
     * Get cached configuration
     */
    async getCachedConfig(): Promise<AppConfig | null> {
        if (!isClient) return null;
        try {
            const data = await AsyncStorage.getItem(REMOTE_CONFIG_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting cached config:', error);
            return null;
        }
    },

    /**
     * Get the best available API URL (Cached -> Remote -> Environment)
     */
    async getApiBaseUrl(fallback: string): Promise<string> {
        const cached = await this.getCachedConfig();
        if (cached?.apiBaseUrl) {
            // Keep cached config fast for requests, then refresh in background.
            void this.fetchRemoteConfig();
            return resolveBackendUrl(cached.apiBaseUrl) || cached.apiBaseUrl;
        }

        const remote = await this.fetchRemoteConfig();
        return resolveBackendUrl(remote?.apiBaseUrl || fallback) || fallback;
    },

    /**
     * Initialize configuration on startup (Fire and forget remote fetch)
     */
    async initialize(): Promise<void> {
        // Trigger fetch in background, don't block startup
        void this.fetchRemoteConfig();
    }
};
