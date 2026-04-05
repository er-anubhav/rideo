import Constants from 'expo-constants';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const getHostCandidate = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes('://')) {
    try {
      return new URL(trimmed).hostname || null;
    } catch {
      return null;
    }
  }

  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, '');
  return withoutProtocol.split('/')[0]?.split(':')[0] || null;
};

export const getExpoLanHost = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.linkingUri,
  ];

  for (const candidate of candidates) {
    const host = getHostCandidate(candidate);
    if (host && !LOCAL_HOSTS.has(host)) {
      return host;
    }
  }

  return null;
};

export const resolveBackendUrl = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return raw;

  try {
    const parsed = new URL(raw);
    if (!LOCAL_HOSTS.has(parsed.hostname)) {
      return raw.replace(/\/+$/, '');
    }

    const lanHost = getExpoLanHost();
    if (!lanHost) {
      return raw.replace(/\/+$/, '');
    }

    parsed.hostname = lanHost;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return raw.replace(/\/+$/, '');
  }
};
