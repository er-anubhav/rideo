import assert from 'node:assert/strict';
import test from 'node:test';

(globalThis as any).__DEV__ = false;

test('ride endpoints include SOS path', async () => {
    const { API_ENDPOINTS } = await import('../src/constants/api');
    assert.equal(API_ENDPOINTS.RIDES.SOS('ride-123'), '/rides/ride-123/sos');
});

test('notification endpoints are configured', async () => {
    const { API_ENDPOINTS } = await import('../src/constants/api');
    assert.equal(API_ENDPOINTS.NOTIFICATIONS.ALL, '/notifications');
    assert.equal(
        API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ('notif-1'),
        '/notifications/notif-1/read',
    );
    assert.equal(
        API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ,
        '/notifications/read-all',
    );
});
