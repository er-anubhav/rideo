import api from './api';
import { appLogger } from '@/utils/app-logger';

class PaymentService {
    /**
     * Confirm cash payment received after ride completion
     */
    async confirmPayment(rideId: string): Promise<{ success: boolean; amount: number }> {
        try {
            appLogger.info('Confirming payment for ride:', rideId);
            
            const response = await api.post(`/rides/${rideId}/confirm-payment`);
            
            if (response.data.success) {
                appLogger.info('Payment confirmed successfully', response.data);
                return {
                    success: true,
                    amount: response.data.amount
                };
            }
            
            throw new Error('Payment confirmation failed');
        } catch (error) {
            appLogger.error('Failed to confirm payment', error);
            throw error;
        }
    }
}

export const paymentService = new PaymentService();
