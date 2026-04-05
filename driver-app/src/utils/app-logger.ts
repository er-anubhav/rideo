const DEBUG_LOGS_ENABLED =
    __DEV__ || process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === 'true';

const LOG_PREFIX = '[DriverApp]';

export const appLogger = {
    debug: (...args: unknown[]) => {
        if (DEBUG_LOGS_ENABLED) {
            console.log(LOG_PREFIX, ...args);
        }
    },
    info: (...args: unknown[]) => {
        if (DEBUG_LOGS_ENABLED) {
            console.info(LOG_PREFIX, ...args);
        }
    },
    warn: (...args: unknown[]) => {
        if (DEBUG_LOGS_ENABLED) {
            console.warn(LOG_PREFIX, ...args);
        }
    },
    error: (...args: unknown[]) => {
        console.error(LOG_PREFIX, ...args);
    },
};

