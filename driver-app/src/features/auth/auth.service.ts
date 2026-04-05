import apiClient, { handleApiError } from '@/api/api';
import { API_ENDPOINTS } from '@/constants/api';
import { clearAllStorage, tokenStorage, userStorage } from '@/utils/storage';
import { realtimeService } from '@/api/realtime.service';

export interface OTPRequest {
    phoneNumber: string;
    role: 'DRIVER';
}

export interface OTPVerification {
    phoneNumber: string;
    otp: string;
    role: 'DRIVER';
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        phone: string;
        role: string;
        isVerified: boolean;
        hasRiderProfile: boolean;
        hasDriverProfile: boolean;
    };
}

/**
 * Authentication Service
 */
export const authService = {
    /**
     * Request OTP for phone number
     */
    async requestOTP(phone: string): Promise<{ message: string }> {
        try {
            const response = await apiClient.post(API_ENDPOINTS.AUTH.REQUEST_OTP, {
                phone,
                purpose: 'LOGIN',
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Verify OTP and get JWT token
     */
    async verifyOTP(phone: string, code: string): Promise<AuthResponse> {
        try {
            const response = await apiClient.post<AuthResponse>(
                API_ENDPOINTS.AUTH.VERIFY_OTP,
                {
                    phone,
                    otp: code,
                }
            );

            const token = (response.data as any).token || (response.data as any).access_token;
            const user = (response.data as any).user;

            // Store token and user data
            await tokenStorage.save(token);
            await userStorage.save(user);

            return { ...(response.data as any), token, user };
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Get current authenticated user
     */
    async getCurrentUser(): Promise<any> {
        try {
            const response = await apiClient.get('/users/me');
            const user = (response.data as any)?.user || response.data;
            await userStorage.save(user);
            return user;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Logout - Clear all stored data
     */
    async logout(): Promise<void> {
        try {
            realtimeService.disconnect();
            await clearAllStorage();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    },

    /**
     * Test Driver Register (Bypasses OTP and Verification)
     */
    async testDriverRegister(phone: string, name: string, vehicleType: string): Promise<AuthResponse> {
        try {
            await apiClient.post(API_ENDPOINTS.AUTH.REQUEST_OTP, { phone });

            const response = await apiClient.post<AuthResponse>(
                API_ENDPOINTS.AUTH.VERIFY_OTP,
                { phone, otp: '123456', name }
            );

            const token = (response.data as any).token || (response.data as any).access_token;
            const user = (response.data as any).user;
            await tokenStorage.save(token);
            await userStorage.save(user);

            try {
                await apiClient.post('/users/profile', { name, email: null });
            } catch {
                // Non-blocking for fast test login.
            }

            try {
                await apiClient.post('/drivers/register', {
                    license_number: `TEST${phone.slice(-6)}`,
                    vehicle: {
                        vehicle_type: vehicleType === 'BIKE' ? 'bike' : 'sedan',
                        make: vehicleType === 'BIKE' ? 'Hero' : 'Maruti',
                        model: vehicleType === 'BIKE' ? 'Splendor' : 'Dzire',
                        color: 'Black',
                        number_plate: `TS${phone.slice(-4)}`,
                        year: 2024,
                    },
                });
            } catch {
                // It is fine if the driver profile already exists.
            }

            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const token = await tokenStorage.get();
        return !!token;
    },
};
