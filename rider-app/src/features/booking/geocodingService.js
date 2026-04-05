import apiClient from '@/api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    normalizeAutocompleteResults,
    normalizeGeocodeResult,
    normalizeReverseGeocode,
} from '@/features/ride/rideAdapter';

const RECENT_DESTINATIONS_KEY = 'recent_destinations';
const MAX_RECENT = 5;

class GeocodingService {
    constructor() {
        this.cache = new Map();
        this.MAX_CACHE_SIZE = 50;
    }

    async searchPlaces(query, lat, lon) {
        // Check cache first
        let cacheKey = `search:${query.toLowerCase()}`;
        if (lat && lon) {
            cacheKey += `:${lat.toFixed(2)},${lon.toFixed(2)}`;
        }

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const params = { query };
            if (lat && lon) {
                params.lat = lat;
                params.lng = lon;
            }

            const response = await apiClient.get('/maps/autocomplete', {
                params
            });
            const results = normalizeAutocompleteResults(response.data?.suggestions || response.data || []);
            this.setCache(cacheKey, results);
            return results;
        } catch (error) {
            console.error('[GeocodingService] searchPlaces error:', error);
            throw error;
        }
    }

    async reverseGeocode(lat, lon) {
        const cacheKey = `reverse:${lat},${lon}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const response = await apiClient.get('/maps/reverse-geocode', {
                params: { lat, lng: lon }
            });
            const result = normalizeReverseGeocode(response.data?.data || response.data);
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('[GeocodingService] reverseGeocode error:', error);
            throw error;
        }
    }

    async getPlaceDetails(address) {
        const cacheKey = `details:${address}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        try {
            const response = await apiClient.get('/maps/geocode', {
                params: { address }
            });
            const result = normalizeGeocodeResult(response.data?.data || response.data);
            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('[GeocodingService] getPlaceDetails error:', error);
            throw error;
        }
    }

    async getRecentDestinations() {
        try {
            const stored = await AsyncStorage.getItem(RECENT_DESTINATIONS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('[GeocodingService] getRecentDestinations error:', error);
            return [];
        }
    }

    async saveRecentDestination(destination) {
        try {
            const recent = await this.getRecentDestinations();
            const filtered = recent.filter(d => d.id !== destination.id);
            const updated = [destination, ...filtered].slice(0, MAX_RECENT);
            await AsyncStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('[GeocodingService] saveRecentDestination error:', error);
        }
    }

    setCache(key, data) {
        // Simple LRU: if cache is full, delete oldest (first) entry
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, data);
    }
}

export const geocodingService = new GeocodingService();
