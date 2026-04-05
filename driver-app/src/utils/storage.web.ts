import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for storage (same keys as native)
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';
const DRIVER_KEY = 'driver_data';

/**
 * Token Storage - Web uses AsyncStorage (which maps to localStorage on web)
 */
export const tokenStorage = {
    async save(token: string): Promise<void> {
        try {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        } catch (error) {
            console.error('Error saving token:', error);
            throw error;
        }
    },

    async get(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(TOKEN_KEY);
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    },

    async remove(): Promise<void> {
        try {
            await AsyncStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            console.error('Error removing token:', error);
        }
    },
};

/**
 * User Data Storage
 */
export const userStorage = {
    async save(userData: any): Promise<void> {
        try {
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        } catch (error) {
            console.error('Error saving user data:', error);
            throw error;
        }
    },

    async get(): Promise<any | null> {
        try {
            const data = await AsyncStorage.getItem(USER_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    },

    async remove(): Promise<void> {
        try {
            await AsyncStorage.removeItem(USER_KEY);
        } catch (error) {
            console.error('Error removing user data:', error);
        }
    },
};

/**
 * Driver Data Storage
 */
export const driverStorage = {
    async save(driverData: any): Promise<void> {
        try {
            await AsyncStorage.setItem(DRIVER_KEY, JSON.stringify(driverData));
        } catch (error) {
            console.error('Error saving driver data:', error);
            throw error;
        }
    },

    async get(): Promise<any | null> {
        try {
            const data = await AsyncStorage.getItem(DRIVER_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting driver data:', error);
            return null;
        }
    },

    async remove(): Promise<void> {
        try {
            await AsyncStorage.removeItem(DRIVER_KEY);
        } catch (error) {
            console.error('Error removing driver data:', error);
        }
    },
};

/**
 * Clear all stored data
 */
export const clearAllStorage = async (): Promise<void> => {
    await Promise.all([
        tokenStorage.remove(),
        userStorage.remove(),
        driverStorage.remove(),
    ]);
};
