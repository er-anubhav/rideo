import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { resolveBackendUrl } from '@/utils/networkConfig';

const REMOTE_CONFIG_KEY = 'remote_application_config';
const CONFIG_FETCH_TIMEOUT = 5000; // 5 seconds
let inFlightConfigRequest = null;

/**
 * Service to handle remote configuration fetching and caching
 */
export const configService = {
    /**
     * Fetch configuration from remote URL and cache it
     */
    async fetchRemoteConfig() {
        // Fallback to EXPO_PUBLIC_CONFIG_URL from env if available
        const configUrl = process.env.EXPO_PUBLIC_CONFIG_URL;
        if (!configUrl) return null;

        if (inFlightConfigRequest) {
            return inFlightConfigRequest;
        }

        inFlightConfigRequest = (async () => {
            try {
                const response = await axios.get(configUrl, {
                    timeout: CONFIG_FETCH_TIMEOUT,
                });

                if (response.data && response.data.apiBaseUrl) {
                    const normalizedConfig = {
                        ...response.data,
                        apiBaseUrl: resolveBackendUrl(response.data.apiBaseUrl),
                        wsBaseUrl: resolveBackendUrl(response.data.wsBaseUrl),
                    };
                    await this.cacheConfig(normalizedConfig);
                    return normalizedConfig;
                }
                return null;
            } catch (error) {
                console.warn('RiderApp: Failed to fetch remote config:', error);
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
    async cacheConfig(config) {
        try {
            await AsyncStorage.setItem(REMOTE_CONFIG_KEY, JSON.stringify(config));
        } catch (error) {
            console.error('RiderApp: Error caching config:', error);
        }
    },

    /**
     * Get cached configuration
     */
    async getCachedConfig() {
        try {
            const data = await AsyncStorage.getItem(REMOTE_CONFIG_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('RiderApp: Error getting cached config:', error);
            return null;
        }
    },

    /**
     * Get the best available API URL (Cached -> Remote -> Environment)
     */
    async getApiBaseUrl(fallback) {
        const cached = await this.getCachedConfig();
        if (cached?.apiBaseUrl) {
            // Keep requests fast, then refresh in background.
            void this.fetchRemoteConfig();
            return resolveBackendUrl(cached.apiBaseUrl);
        }

        const remote = await this.fetchRemoteConfig();
        return resolveBackendUrl(remote?.apiBaseUrl || fallback);
    },

    /**
     * Get the best available WebSocket URL
     */
    async getWsBaseUrl(fallback) {
        const cached = await this.getCachedConfig();
        return resolveBackendUrl(cached?.wsBaseUrl || fallback);
    },

    /**
     * Initialize configuration on startup
     */
    async initialize() {
        // Trigger fetch in background
        void this.fetchRemoteConfig();
    }
};
