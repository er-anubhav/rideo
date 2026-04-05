import axios from 'axios';
import { API_BASE_URL, ENABLE_REMOTE_LOGGING } from '@/constants/api';
import { appLogger } from './app-logger';

const LOG_ENDPOINT = `${API_BASE_URL}/admin/logs/frontend`;
const LOG_THROTTLE_MS = 10000;
const lastSentAtByKey = new Map<string, number>();

const normalizeError = (error: unknown): { message: string; stack?: string } => {
    if (error instanceof Error) {
        return { message: error.message, stack: error.stack };
    }

    try {
        return { message: JSON.stringify(error) };
    } catch {
        return { message: 'Unknown frontend error' };
    }
};

export const remoteLogger = {
    logError: async (error: unknown, context: string = 'App') => {
        if (!ENABLE_REMOTE_LOGGING) return;

        const normalizedError = normalizeError(error);
        const dedupeKey = `${context}:${normalizedError.message}`;
        const now = Date.now();
        const lastSentAt = lastSentAtByKey.get(dedupeKey) ?? 0;

        if (now - lastSentAt < LOG_THROTTLE_MS) {
            return;
        }

        lastSentAtByKey.set(dedupeKey, now);

        try {
            await axios.post(LOG_ENDPOINT, {
                message: normalizedError.message,
                stack: normalizedError.stack,
                context,
                timestamp: new Date().toISOString(),
            });
        } catch {
            appLogger.warn('Failed to send log to backend');
        }
    },
};
