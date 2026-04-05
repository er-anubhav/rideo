import { resolveBackendUrl } from '@/utils/networkConfig';

const DEFAULT_DEV_API_BASE_URL = 'http://192.168.1.14:8001/api';
const DEFAULT_DEV_WS_BASE_URL = 'ws://192.168.1.14:8001/ws';

const normalizeBaseUrl = (value, fallback) => {
  const raw = (value || fallback || '').trim();
  return resolveBackendUrl(raw);
};

const appEnv = (process.env.EXPO_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development').trim();
const wsEnvValue = process.env.EXPO_PUBLIC_WS_BASE_URL;

const apiBaseUrl = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
  DEFAULT_DEV_API_BASE_URL
);

const wsBaseUrl = resolveBackendUrl(wsEnvValue || DEFAULT_DEV_WS_BASE_URL);

export const CONFIG = {
  APP_ENV: appEnv,
  API_BASE_URL: apiBaseUrl,
  WS_BASE_URL: wsBaseUrl,
  MAPPLS_REST_KEY: (process.env.EXPO_PUBLIC_MAPPLS_REST_KEY || '').trim(),
  MAP_TILE_URL_TEMPLATE: (
    process.env.EXPO_PUBLIC_MAP_TILE_URL_TEMPLATE || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  ).trim(),
  DEFAULT_CURRENCY: 'INR',
  OTP_LENGTH: 6,
  CONFIG_URL: process.env.EXPO_PUBLIC_CONFIG_URL,
};
