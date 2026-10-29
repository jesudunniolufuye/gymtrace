import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { RETRY_AFTER_MS, afterRefreshFailure, shouldRefresh } from '../../src/lib/qrRefresh.js';

const NOW = 1_000_000;

describe('afterRefreshFailure (QA F2: a failed refresh wiped a still-valid code)', () => {
  test('network error with a code that still has time left → keep it', () => {
    assert.equal(afterRefreshFailure({ qr: { expiresAt: NOW + 40_000 }, now: NOW, status: undefined }), 'keep');
    assert.equal(afterRefreshFailure({ qr: { expiresAt: NOW + 1 }, now: NOW, status: 500 }), 'keep');
  });
  test('code already expired, or none yet → show the error', () => {
    assert.equal(afterRefreshFailure({ qr: { expiresAt: NOW - 1 }, now: NOW }), 'error');
    assert.equal(afterRefreshFailure({ qr: null, now: NOW }), 'error');
  });
  test('403 (plan ended, account deactivated) always drops the code', () => {
    assert.equal(afterRefreshFailure({ qr: { expiresAt: NOW + 40_000 }, now: NOW, status: 403 }), 'no-access');
  });
});

describe('shouldRefresh', () => {
  const base = { expiresAt: NOW + 4000, now: NOW, fetching: false, lastAttemptAt: 0 };
  test('refreshes in the last 5 seconds', () => assert.equal(shouldRefresh(base), true));
  test('not earlier than that', () => assert.equal(shouldRefresh({ ...base, expiresAt: NOW + 30_000 }), false));
  test('not while a request is running, or with no code', () => {
    assert.equal(shouldRefresh({ ...base, fetching: true }), false);
    assert.equal(shouldRefresh({ ...base, expiresAt: null }), false);
  });
  test('after a failed attempt it retries by itself, but not every tick', () => {
    assert.equal(shouldRefresh({ ...base, lastAttemptAt: NOW - 1000 }), false);
    assert.equal(shouldRefresh({ ...base, lastAttemptAt: NOW - RETRY_AFTER_MS }), true);
  });
  test('keeps retrying once the code has expired (until the error screen takes over)', () => {
    assert.equal(shouldRefresh({ ...base, expiresAt: NOW - 2000, lastAttemptAt: NOW - 5000 }), true);
  });
});
