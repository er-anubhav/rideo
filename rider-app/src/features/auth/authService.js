import apiClient from '@/api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { realtimeService } from '@/features/ride/realtime.service';
import { normalizeIndianPhone } from '@/utils/phone';

const mergeAndStoreUser = async (incomingUser) => {
    const existingRaw = await AsyncStorage.getItem('userData');
    const existing = existingRaw ? JSON.parse(existingRaw) : {};
    const merged = { ...existing, ...(incomingUser || {}) };
    await AsyncStorage.setItem('userData', JSON.stringify(merged));
    return merged;
};

export const authService = {
    async sendOtp(phone) {
        const normalizedPhone = normalizeIndianPhone(phone);
        const response = await apiClient.post('/auth/send-otp', { phone: normalizedPhone });
        return response.data;
    },

    async verifyOtp(phone, code) {
        const normalizedPhone = normalizeIndianPhone(phone);
        const response = await apiClient.post('/auth/verify-otp', { phone: normalizedPhone, otp: code });
        const token = response.data?.token || response.data?.access_token;
        const user = response.data?.user;

        await AsyncStorage.setItem('userToken', token);
        await mergeAndStoreUser(user);

        try {
            await realtimeService.connect();
        } catch (error) {
            console.warn('RiderApp: Login succeeded but realtime connection failed. Continuing without blocking auth.', error);
        }

        return { ...response.data, token, user };
    },

    async getMe() {
        const response = await apiClient.get('/users/me');
        const payload = response.data?.user || response.data;
        const user = await mergeAndStoreUser(payload);
        return user;
    },

    async updateProfile(payload) {
        const fullName = [payload?.firstName, payload?.lastName].filter(Boolean).join(' ').trim();
        const response = await apiClient.put('/users/profile', {
            name: fullName || undefined,
            email: payload?.email || undefined,
        });
        const user = await mergeAndStoreUser(response.data?.user || response.data);
        return user;
    },

    async logout() {
        realtimeService.disconnect();
        await AsyncStorage.multiRemove(['userToken', 'userData']);
    },

    async isAuthenticated() {
        const token = await AsyncStorage.getItem('userToken');
        return !!token;
    },
};

export { normalizeIndianPhone };
