const normalizeBaseUrl = (value, fallback) => {
  const raw = (value || fallback || '').trim();
  return raw.replace(/\/+$/, '');
};

const getRequiredEnv = (key) => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const appEnv = (process.env.EXPO_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development').trim();
const isProduction = appEnv === 'production';
const wsEnvValue = process.env.EXPO_PUBLIC_WS_BASE_URL || process.env.EXPO_PUBLIC_MQTT_BROKER_URL;

const apiBaseUrl = isProduction
  ? normalizeBaseUrl(getRequiredEnv('EXPO_PUBLIC_API_BASE_URL'))
  : normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL, 'http://localhost:8001/api');

const wsBaseUrl = isProduction
  ? (wsEnvValue || getRequiredEnv('EXPO_PUBLIC_MQTT_BROKER_URL')).trim()
  : (wsEnvValue || 'ws://localhost:8001/ws').trim();

export const CONFIG = {
  APP_ENV: appEnv,
  API_BASE_URL: apiBaseUrl,
  WS_BASE_URL: wsBaseUrl,
  MQTT_BROKER_URL: wsBaseUrl,
  MAP_TILE_URL_TEMPLATE: (
    process.env.EXPO_PUBLIC_MAP_TILE_URL_TEMPLATE || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  ).trim(),
  DEFAULT_CURRENCY: 'INR',
  OTP_LENGTH: 6,
  CONFIG_URL: process.env.EXPO_PUBLIC_CONFIG_URL,
};
