import apiClient from '@/api/api';
import { API_ENDPOINTS } from '@/constants/api';

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: string;
    isRead: boolean;
    data?: Record<string, unknown> | null;
    createdAt: string;
}

export const notificationService = {
    async getNotifications(): Promise<AppNotification[]> {
        try {
            const response = await apiClient.get<AppNotification[]>(
                API_ENDPOINTS.NOTIFICATIONS.ALL
            );
            return response.data;
        } catch (error) {
            return [];
        }
    },

    async markAsRead(notificationId: string): Promise<void> {
        try {
            await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(notificationId));
        } catch (error) {
            return;
        }
    },

    async markAllAsRead(): Promise<void> {
        try {
            await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ);
        } catch (error) {
            return;
        }
    },
};
