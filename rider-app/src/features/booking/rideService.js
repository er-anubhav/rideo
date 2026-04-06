import apiClient from '@/api/apiClient';
import { realtimeService } from '@/features/ride/realtime.service';
import {
    mapRiderVehicleTypeToBackend,
    normalizeRide,
    normalizeRoutePayload,
} from '@/features/ride/rideAdapter';

const fetchCurrentRide = async () => {
    const response = await apiClient.get('/rides/current');
    if (!response.data?.ride) {
        return null;
    }

    return normalizeRide(response.data, {
        driver: response.data?.driver,
        vehicle: response.data?.vehicle,
    });
};

export const rideService = {
    /**
     * Create a ride request through REST API
     * Backend automatically broadcasts to drivers via WebSocket
     */
    async requestRide(rideData) {
        const requestPayload = {
            pickup_lat: rideData.pickupLat,
            pickup_lng: rideData.pickupLng,
            pickup_address: rideData.pickupAddress,
            drop_lat: rideData.dropLat,
            drop_lng: rideData.dropLng,
            drop_address: rideData.dropAddress,
            vehicle_type: mapRiderVehicleTypeToBackend(rideData.vehicleType),
        };

        const response = await apiClient.post('/rides/request', requestPayload);
        const ride = normalizeRide(response.data?.ride || response.data);

        // FIX: Remove duplicate WebSocket request
        // Backend already broadcasts to all drivers via WebSocket (P0 Fix #3)
        // The realtimeService.sendRideRequest() was creating duplicate rides
        
        // Just ensure WebSocket is connected for receiving updates
        try {
            await realtimeService.connect();
        } catch (error) {
            console.warn('RiderApp: WebSocket connection failed, will retry', error);
        }

        return ride;
    },

    async cancelRide(rideId, reason) {
        const response = await apiClient.post(`/rides/${rideId}/cancel`, { reason });
        return response.data;
    },

    async getMyActiveRide() {
        return fetchCurrentRide();
    },

    async getInvoice(rideId) {
        const response = await apiClient.get(`/rides/${rideId}/invoice`);
        return response.data;
    },

    async getRoutePreview(origin, destination) {
        const response = await apiClient.post('/maps/route', {
            origin_lat: origin.lat,
            origin_lng: origin.lng,
            dest_lat: destination.lat,
            dest_lng: destination.lng,
        });
        return normalizeRoutePayload(response.data?.route || response.data);
    },

    async getRideRoute(rideId) {
        const response = await apiClient.get(`/rides/${rideId}/route`);
        return normalizeRoutePayload(response.data);
    },

    publishRealtimeCommand(subTopic, payload, options = {}) {
        realtimeService.publishCommand(subTopic, payload, options);
    },

    subscribeToRide(rideId, callback) {
        return realtimeService.subscribe(`status/ride/${rideId}`, callback);
    },

    subscribeToActiveRide(userId, callback) {
        return realtimeService.subscribe(`status/user/${userId}/active-ride`, callback);
    },

    subscribeToRideRoute(rideId, callback) {
        return realtimeService.subscribe(`status/ride/${rideId}/route`, callback);
    },

    subscribeToRideLocation(rideId, callback) {
        return realtimeService.subscribe(`status/ride/${rideId}/location`, callback);
    },
};
