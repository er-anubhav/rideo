import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/config/config';

const toLogPayload = (level, message, context, metadata) => ({
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message),
    context,
    metadata,
});

const sendLog = async (payload) => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        await fetch(`${CONFIG.API_BASE_URL}/client-logs/frontend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
    } catch {
        // Never throw from telemetry path.
    }
};

export const loggingService = {
    info(message, context = 'APP', metadata = {}) {
        return sendLog(toLogPayload('INFO', message, context, metadata));
    },

    warn(message, context = 'APP', metadata = {}) {
        return sendLog(toLogPayload('WARN', message, context, metadata));
    },

    error(message, context = 'APP', metadata = {}) {
        return sendLog(toLogPayload('ERROR', message, context, metadata));
    },

    installGlobalErrorHandler() {
        const errorUtils = global.ErrorUtils;
        if (!errorUtils || typeof errorUtils.getGlobalHandler !== 'function') {
            return () => { };
        }

        const originalHandler = errorUtils.getGlobalHandler();
        errorUtils.setGlobalHandler((error, isFatal) => {
            this.error(error?.message || 'Unhandled error', 'GLOBAL', {
                isFatal: !!isFatal,
                stack: error?.stack || null,
            });

            if (originalHandler) {
                originalHandler(error, isFatal);
            }
        });

        return () => {
            if (originalHandler) {
                errorUtils.setGlobalHandler(originalHandler);
            }
        };
    },
};
