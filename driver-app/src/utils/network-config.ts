import Constants from 'expo-constants';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const getHostCandidate = (value?: string | null): string | null => {
    if (!value) return null;

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

export const getExpoLanHost = (): string | null => {
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

export const resolveBackendUrl = (value?: string | null): string | null => {
    if (!value) return null;

    const raw = value.trim();
    if (!raw) return null;

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
