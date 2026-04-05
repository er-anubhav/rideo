import apiClient from '@/api/apiClient';
import { realtimeService } from '@/features/ride/realtime.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const walletService = {
    async getBalance() {
        try {
            const response = await apiClient.get('/wallet/balance');
            return response.data;
        } catch (error) {
            return { balance: 0 };
        }
    },

    async topUp(amount) {
        return {
            success: false,
            balance: 0,
            message: 'Wallet top-up is not available on the current backend',
            amount,
        };
    },

    async getTransactions(page = 1, limit = 10) {
        try {
            const response = await apiClient.get(`/wallet/transactions?page=${page}&limit=${limit}`);
            return response.data;
        } catch (error) {
            return { transactions: [] };
        }
    },

    /**
     * Listen for real-time balance updates via the backend WebSocket bridge.
     * @param {function} callback - Function called with new balance data
     * @returns {function} - Unsubscribe function
     */
    async subscribeToBalance(callback) {
        const userData = await AsyncStorage.getItem('userData');
        if (!userData) {
            return () => { };
        }

        const { id } = JSON.parse(userData);
        return realtimeService.subscribe(`status/wallet/${id}`, callback);
    }
};
