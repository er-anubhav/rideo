const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const toWsOrigin = (origin) => {
  if (origin.startsWith('https://')) {
    return origin.replace(/^https:\/\//, 'wss://');
  }

  if (origin.startsWith('http://')) {
    return origin.replace(/^http:\/\//, 'ws://');
  }

  return origin;
};

// Update this origin whenever the backend host changes.
export const BACKEND_ORIGIN = 'http://192.168.1.14:8001';

const normalizedOrigin = stripTrailingSlash(BACKEND_ORIGIN);

export const backendConfig = {
  origin: normalizedOrigin,
  apiBaseUrl: `${normalizedOrigin}/api`,
  wsBaseUrl: `${toWsOrigin(normalizedOrigin)}/ws`,
};

export default backendConfig;
