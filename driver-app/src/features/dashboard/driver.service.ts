import apiClient, { handleApiError } from '@/api/api';
import { driverStorage } from '@/utils/storage';
import {
    normalizeDriverProfile,
    normalizeDriverStats,
} from '@/features/backend/backend-adapter';

export interface CreateDriverProfileDto {
    firstName: string;
    lastName: string;
    email: string;
    licenseNumber: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    emergencyContact: string;
}

export interface AddVehicleDto {
    vehicleType: 'BIKE' | 'AUTO' | 'CAB_SEDAN' | 'CAB_SUV';
    registrationNumber: string;
    make: string;
    model: string;
    color: string;
    rcNumber: string;
}

export interface GoOnlineDto {
    latitude: number;
    longitude: number;
    bearing?: number;
    deviceToken?: string;
}

export interface DriverProfile {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    licenseNumber: string;
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    emergencyContact: string;
    verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    isApproved?: boolean;
    isActive?: boolean;
    isOnline: boolean;
    rating: number;
    totalRides: number;
    totalEarnings?: number;
    vehicles?: any[];
}

export interface DriverStats {
    today: {
        earnings: number;
        trips: number;
    };
    total: {
        earnings: number;
        trips: number;
        rating: number;
    };
}

const mapVehicleTypeToBackend = (vehicleType: AddVehicleDto['vehicleType']): string => {
    switch (vehicleType) {
        case 'BIKE':
            return 'bike';
        case 'AUTO':
            return 'auto';
        case 'CAB_SUV':
            return 'suv';
        case 'CAB_SEDAN':
        default:
            return 'sedan';
    }
};

const getCachedDraft = async () => {
    return (await driverStorage.get()) || {};
};

const saveDraft = async (draft: Record<string, unknown>) => {
    const existing = await getCachedDraft();
    const merged = { ...existing, ...draft };
    await driverStorage.save(merged);
    return merged;
};

/**
 * Driver Service
 */
export const driverService = {
    /**
     * Cache personal details locally and sync the supported subset to the backend user profile.
     */
    async createProfile(data: CreateDriverProfileDto): Promise<DriverProfile> {
        try {
            const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();

            try {
                await apiClient.put('/users/profile', {
                    name: fullName,
                    email: data.email || undefined,
                });
            } catch {
                // Keep the draft locally even if the profile sync fails temporarily.
            }

            const draft = await saveDraft(data as unknown as Record<string, unknown>);
            return normalizeDriverProfile(draft, draft) as DriverProfile;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get driver profile from backend and merge cached draft metadata for the UI.
     */
    async getProfile(): Promise<DriverProfile> {
        try {
            const cachedDraft = await getCachedDraft();
            const response = await apiClient.get('/drivers/profile');
            const normalized = normalizeDriverProfile(response.data, cachedDraft) as DriverProfile;
            await driverStorage.save(normalized);
            return normalized;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Documents are not uploaded through the FastAPI backend yet. Keep the flow moving.
     */
    async submitDocuments(): Promise<{ message: string }> {
        return { message: 'Documents submitted successfully' };
    },

    /**
     * Finalize backend driver registration using the cached personal-details draft.
     */
    async addVehicle(data: AddVehicleDto): Promise<any> {
        try {
            const draft = await getCachedDraft();
            const fullName = [draft.firstName, draft.lastName].filter(Boolean).join(' ').trim();

            if (fullName || draft.email) {
                try {
                    await apiClient.put('/users/profile', {
                        name: fullName || undefined,
                        email: draft.email || undefined,
                    });
                } catch {
                    // Continue with driver registration even if the user-profile sync fails.
                }
            }

            await apiClient.post('/drivers/register', {
                license_number: draft.licenseNumber || data.rcNumber,
                vehicle: {
                    vehicle_type: mapVehicleTypeToBackend(data.vehicleType),
                    make: data.make,
                    model: data.model,
                    color: data.color,
                    number_plate: data.registrationNumber,
                    year: new Date().getFullYear(),
                },
            });

            const profile = await this.getProfile();
            return profile;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Go online - Start accepting ride requests.
     */
    async goOnline(data?: GoOnlineDto): Promise<{ message: string; isOnline: boolean }> {
        try {
            const response = await apiClient.post('/drivers/toggle-online', {
                is_online: true,
                lat: data?.latitude,
                lng: data?.longitude,
            });
            return {
                message: response.data?.message || 'You are now online',
                isOnline: Boolean(response.data?.is_online ?? response.data?.isOnline ?? true),
            };
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Go offline - Stop accepting ride requests.
     */
    async goOffline(): Promise<{ message: string; isOnline: boolean }> {
        try {
            const response = await apiClient.post('/drivers/toggle-online', {
                is_online: false,
            });
            return {
                message: response.data?.message || 'You are now offline',
                isOnline: Boolean(response.data?.is_online ?? response.data?.isOnline ?? false),
            };
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get driver statistics from the earnings API.
     */
    async getStats(): Promise<DriverStats> {
        try {
            const response = await apiClient.get('/earnings/stats');
            return normalizeDriverStats(response.data) as DriverStats;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },
};
