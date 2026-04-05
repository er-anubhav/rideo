import apiClient from '@/api/apiClient';

export const notificationService = {
    async getNotifications() {
        try {
            const response = await apiClient.get('/notifications');
            return response.data;
        } catch (error) {
            return [];
        }
    },

    async markAsRead(id) {
        try {
            await apiClient.patch(`/notifications/${id}/read`);
        } catch (error) {
            return;
        }
    },

    async markAllAsRead() {
        try {
            await apiClient.post('/notifications/read-all');
        } catch (error) {
            return;
        }
    }
};
