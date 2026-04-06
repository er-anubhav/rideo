import apiClient from './apiClient';

class RideService {
    /**
     * Get driver location for active ride (fallback when WebSocket is down)
     */
    async getDriverLocation(rideId) {
        try {
            const response = await apiClient.get(`/rides/${rideId}/driver-location`);
            if (response.data.success) {
                return response.data.location;
            }
            throw new Error('Failed to get driver location');
        } catch (error) {
            console.error('RiderApp: Failed to get driver location', error);
            throw error;
        }
    }

    /**
     * Get ride route/path
     */
    async getRideRoute(rideId) {
        try {
            const response = await apiClient.get(`/rides/${rideId}/route`);
            return response.data;
        } catch (error) {
            console.error('RiderApp: Failed to get ride route', error);
            throw error;
        }
    }
}

export const rideService = new RideService();
export default rideService;
