import apiClient from '@/api/apiClient';

export const supportService = {
    async getConversation() {
        const response = await apiClient.get('/support/chat');
        return response.data;
    },

    async sendMessage(message) {
        const response = await apiClient.post('/support/chat/message', { message });
        return response.data;
    },

    async closeTicket() {
        const response = await apiClient.post('/support/chat/close');
        return response.data;
    },
};
