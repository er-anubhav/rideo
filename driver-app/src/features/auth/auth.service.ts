import apiClient, { handleApiError } from '@/api/api';
import { API_ENDPOINTS } from '@/constants/api';
import { clearAllStorage, tokenStorage, userStorage } from '@/utils/storage';
import { realtimeService } from '@/api/realtime.service';
import { normalizeIndianPhone } from '@/utils/phone';

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

export const authService = {
    async requestOTP(phone: string): Promise<{ message: string }> {
        try {
            const normalizedPhone = normalizeIndianPhone(phone);
            const response = await apiClient.post(API_ENDPOINTS.AUTH.REQUEST_OTP, {
                phone: normalizedPhone,
                purpose: 'LOGIN',
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

    async verifyOTP(phone: string, code: string): Promise<AuthResponse> {
        try {
            const normalizedPhone = normalizeIndianPhone(phone);
            const response = await apiClient.post<AuthResponse>(
                API_ENDPOINTS.AUTH.VERIFY_OTP,
                {
                    phone: normalizedPhone,
                    otp: code,
                }
            );

            const token = (response.data as any).token || (response.data as any).access_token;
            const user = (response.data as any).user;

            await tokenStorage.save(token);
            await userStorage.save(user);

            return { ...(response.data as any), token, user };
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    },

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

    async logout(): Promise<void> {
        try {
            realtimeService.disconnect();
            await clearAllStorage();
        } catch (error) {
            console.error('Error during logout:', error);
        }
    },

    async testDriverRegister(phone: string, name: string, vehicleType: string): Promise<AuthResponse> {
        try {
            const normalizedPhone = normalizeIndianPhone(phone);
            await apiClient.post(API_ENDPOINTS.AUTH.REQUEST_OTP, { phone: normalizedPhone });

            const response = await apiClient.post<AuthResponse>(
                API_ENDPOINTS.AUTH.VERIFY_OTP,
                { phone: normalizedPhone, otp: '123456', name }
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
                    license_number: `TEST${normalizedPhone.slice(-6)}`,
                    vehicle: {
                        vehicle_type: vehicleType === 'BIKE' ? 'bike' : 'sedan',
                        make: vehicleType === 'BIKE' ? 'Hero' : 'Maruti',
                        model: vehicleType === 'BIKE' ? 'Splendor' : 'Dzire',
                        color: 'Black',
                        number_plate: `TS${normalizedPhone.slice(-4)}`,
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

    async isAuthenticated(): Promise<boolean> {
        const token = await tokenStorage.get();
        return !!token;
    },
};
