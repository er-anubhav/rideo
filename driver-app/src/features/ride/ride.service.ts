import apiClient, { handleApiError } from '@/api/api';
import { normalizeDriverRide } from '@/features/backend/backend-adapter';

export interface Ride {
    id: string;
    riderId: string;
    driverId?: string | null;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    dropLat: number;
    dropLng: number;
    dropAddress: string;
    status: 'MATCHED' | 'ACCEPTED' | 'DRIVER_ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_DRIVERS_AVAILABLE';
    fare: number;
    totalFare?: number;
    distance: number;
    estimatedDistance?: number;
    estimatedDuration: number;
    actualDistance?: number;
    actualDuration?: number;
    otp?: string;
    rider?: {
        id: string;
        phone: string;
        rating?: number;
        name?: string;
    };
    vehicleType?: string;
    vehicle?: any;
    createdAt: string;
    acceptedAt?: string;
    arrivedAt?: string;
    startedAt?: string;
    completedAt?: string;
}

export interface CompleteRideDto {
    actualFare?: number;
    actualDistance?: number;
    actualDuration?: number;
}

export interface RideSosDto {
    message?: string;
    latitude?: number;
    longitude?: number;
}

export interface RideRouteSnapshot {
    rideId: string;
    phase: 'preview' | 'to_pickup' | 'to_drop';
    provider: 'mappls' | 'fallback';
    source: 'live' | 'cache';
    cached: boolean;
    costInr: number;
    distanceMeters: number;
    durationSeconds: number;
    etaIso: string | null;
    coordinates: Array<{ latitude: number; longitude: number }>;
    timestamp: string;
}

const normalizeRideList = (items: any[]): Ride[] => items.map((item) => normalizeDriverRide(item) as Ride);

const getCurrentRide = async (): Promise<Ride | null> => {
    const response = await apiClient.get('/rides/current');
    const ride = response.data?.ride;

    if (!ride) {
        return null;
    }

    return normalizeDriverRide(response.data, {
        rider: response.data?.rider,
        vehicle: response.data?.vehicle,
    }) as Ride;
};

/**
 * Ride Service
 */
export const rideService = {
    async acceptRide(rideId: string): Promise<Ride> {
        try {
            const response = await apiClient.post(`/rides/${rideId}/accept`, {});
            return normalizeDriverRide(response.data) as Ride;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async markArriving(rideId: string): Promise<Ride> {
        try {
            await apiClient.post(`/rides/${rideId}/arriving`);
            const ride = await getCurrentRide();
            return (ride || { id: rideId, status: 'ARRIVING' }) as Ride;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async markArrived(rideId: string): Promise<Ride> {
        try {
            await apiClient.post(`/rides/${rideId}/arrived`);
            const ride = await getCurrentRide();
            return (ride || { id: rideId, status: 'DRIVER_ARRIVED' }) as Ride;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    // DEPRECATED: Use markArriving() and markArrived() separately
    async arriveAtPickup(rideId: string): Promise<Ride> {
        try {
            await apiClient.post(`/rides/${rideId}/arriving`);
            // NOTE: Don't call arrived here - let driver manually confirm when at pickup
            const ride = await getCurrentRide();
            return (ride || { id: rideId, status: 'ARRIVING' }) as Ride;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async startRide(rideId: string, otp?: string): Promise<Ride> {
        try {
            // FIX: Backend expects otp in request body, not as optional param
            await apiClient.post(`/rides/${rideId}/start`, { otp: otp || '' });
            const ride = await getCurrentRide();
            return (ride || { id: rideId, status: 'IN_PROGRESS' }) as Ride;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async completeRide(rideId: string, data?: CompleteRideDto): Promise<Ride> {
        try {
            await apiClient.post(`/rides/${rideId}/complete`, data || {});
            return { id: rideId, status: 'COMPLETED' } as Ride;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async cancelRide(rideId: string, reason?: string): Promise<Ride> {
        try {
            await apiClient.post(`/rides/${rideId}/cancel`, { reason });
            return { id: rideId, status: 'CANCELLED' } as Ride;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async sendSos(rideId: string, data?: RideSosDto): Promise<{ success: boolean; notifiedAdmins: number }> {
        try {
            const response = await apiClient.post<{ success: boolean; notifiedAdmins: number }>(
                `/rides/${rideId}/sos`,
                data || {},
            );
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async getRideRoute(rideId: string): Promise<RideRouteSnapshot> {
        try {
            const response = await apiClient.get<RideRouteSnapshot>(`/rides/${rideId}/route`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async getUpcomingRides(): Promise<Ride[]> {
        try {
            const [currentResponse, requestsResponse] = await Promise.allSettled([
                apiClient.get('/rides/current'),
                apiClient.get('/rides/requests'),
            ]);

            const rides: Ride[] = [];

            if (currentResponse.status === 'fulfilled' && currentResponse.value.data?.ride) {
                rides.push(
                    normalizeDriverRide(currentResponse.value.data, {
                        rider: currentResponse.value.data?.rider,
                        vehicle: currentResponse.value.data?.vehicle,
                    }) as Ride,
                );
            }

            if (requestsResponse.status === 'fulfilled') {
                const requests = requestsResponse.value.data?.requests || [];
                requests.forEach((request: any) => {
                    rides.push(
                        normalizeDriverRide(request.ride, {
                            rider: request.rider,
                            pickupEtaMins: request.pickup_eta_mins,
                            overrideStatus: 'MATCHED',
                        }) as Ride,
                    );
                });
            }

            return rides;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async getCompletedRides(): Promise<Ride[]> {
        try {
            const response = await apiClient.get('/rides/history', {
                params: { page: 1, limit: 50 },
            });
            const rides = response.data?.rides || [];
            return normalizeRideList(rides).filter((ride) => ride.status === 'COMPLETED');
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async getAllRides(params?: { page?: number; limit?: number; from?: string; to?: string }): Promise<Ride[]> {
        try {
            const response = await apiClient.get('/rides/history', {
                params: {
                    page: params?.page || 1,
                    limit: params?.limit || 50,
                },
            });
            return normalizeRideList(response.data?.rides || []);
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
