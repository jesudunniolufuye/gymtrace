import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  DAY_MS, PLANS, PurchaseError, applyPurchase, endOfGymDay, getSubscriptionStatus, startOfGymDay, startOfGymMonth, toMillis,
} from '../../shared/subscription.js';

// 29 Oct 2026, 10:00 UTC = 11:00 in Lagos.
const NOW = Date.UTC(2026, 9, 29, 10, 0);
// Midnight Lagos at the end of 29 Oct = 23:00 UTC on 29 Oct.
const LAGOS_MIDNIGHT = Date.UTC(2026, 9, 29, 23, 0);

describe('endOfGymDay (Lagos time)', () => {
  test('mid-morning → midnight Lagos the same day', () => {
    assert.equal(endOfGymDay(NOW), LAGOS_MIDNIGHT);
  });
  test('23:30 UTC is already the next day in Lagos', () => {
    assert.equal(endOfGymDay(Date.UTC(2026, 9, 29, 23, 30)), LAGOS_MIDNIGHT + DAY_MS);
  });
  test('exactly midnight Lagos starts a new day', () => {
    assert.equal(endOfGymDay(LAGOS_MIDNIGHT), LAGOS_MIDNIGHT + DAY_MS);
  });
});

describe('startOfGymDay / startOfGymMonth (Lagos time)', () => {
  test('day starts at 23:00 UTC the previous evening', () => {
    assert.equal(startOfGymDay(NOW), Date.UTC(2026, 9, 28, 23, 0));
  });
  test('month starts at 23:00 UTC on the last day of the previous month', () => {
    assert.equal(startOfGymMonth(NOW), Date.UTC(2026, 8, 30, 23, 0));
  });
  test('23:30 UTC on 31 Oct is already November in Lagos', () => {
    assert.equal(startOfGymMonth(Date.UTC(2026, 9, 31, 23, 30)), Date.UTC(2026, 9, 31, 23, 0));
  });
});

describe('getSubscriptionStatus', () => {
  test('no subscription', () => {
    const s = getSubscriptionStatus(undefined, NOW);
    assert.equal(s.active, false);
    assert.equal(s.reason, 'none');
  });
  test('monthly active until expiry, then expired', () => {
    const sub = { plan: 'monthly', expiresAt: NOW + 1000 };
    assert.equal(getSubscriptionStatus(sub, NOW).active, true);
    const later = getSubscriptionStatus(sub, NOW + 1000);
    assert.equal(later.active, false);
    assert.equal(later.reason, 'expired');
  });
  test('day pass needs credits and time', () => {
    assert.equal(getSubscriptionStatus({ plan: 'session', expiresAt: LAGOS_MIDNIGHT, sessionCredits: 1 }, NOW).active, true);
    const used = getSubscriptionStatus({ plan: 'session', expiresAt: LAGOS_MIDNIGHT, sessionCredits: 0 }, NOW);
    assert.equal(used.active, false);
    assert.equal(used.reason, 'used');
    const expired = getSubscriptionStatus({ plan: 'session', expiresAt: LAGOS_MIDNIGHT, sessionCredits: 1 }, LAGOS_MIDNIGHT);
    assert.equal(expired.active, false);
    assert.equal(expired.reason, 'expired');
    assert.equal(expired.credits, 0);
  });
  test('accepts Firestore-style timestamps', () => {
    const ts = { toMillis: () => NOW + 5000 };
    assert.equal(getSubscriptionStatus({ plan: 'monthly', expiresAt: ts }, NOW).active, true);
    assert.equal(toMillis({ seconds: 10, nanoseconds: 5e6 }), 10005);
    assert.equal(toMillis({ _seconds: 10, _nanoseconds: 0 }), 10000);
  });
  test('unknown plan is treated as none', () => {
    assert.equal(getSubscriptionStatus({ plan: 'gold', expiresAt: NOW + DAY_MS }, NOW).active, false);
  });
});

describe('applyPurchase', () => {
  test('first monthly purchase runs 30 days from now', () => {
    const r = applyPurchase(null, 'monthly', NOW);
    assert.equal(r.periodStart, NOW);
    assert.equal(r.subscription.expiresAt, NOW + 30 * DAY_MS);
    assert.equal(r.subscription.plan, 'monthly');
  });
  test('early renewal extends from the current expiry (no lost days)', () => {
    const current = { plan: 'monthly', expiresAt: NOW + 5 * DAY_MS };
    const r = applyPurchase(current, 'monthly', NOW);
    assert.equal(r.periodStart, NOW + 5 * DAY_MS);
    assert.equal(r.subscription.expiresAt, NOW + 35 * DAY_MS);
  });
  test('renewal after expiry starts from now', () => {
    const current = { plan: 'monthly', expiresAt: NOW - DAY_MS };
    assert.equal(applyPurchase(current, 'monthly', NOW).subscription.expiresAt, NOW + 30 * DAY_MS);
  });
  test('day pass gives one entry until midnight Lagos', () => {
    const r = applyPurchase(null, 'session', NOW);
    assert.deepEqual(r.subscription, { plan: 'session', expiresAt: LAGOS_MIDNIGHT, sessionCredits: 1 });
  });
  test('second day pass on the same day adds an entry', () => {
    const current = { plan: 'session', expiresAt: LAGOS_MIDNIGHT, sessionCredits: 1 };
    assert.equal(applyPurchase(current, 'session', NOW).subscription.sessionCredits, 2);
  });
  test("yesterday's unused entry does not carry over", () => {
    const current = { plan: 'session', expiresAt: LAGOS_MIDNIGHT - DAY_MS, sessionCredits: 1 };
    assert.equal(applyPurchase(current, 'session', NOW).subscription.sessionCredits, 1);
  });
  test('day pass is refused while a monthly plan is active', () => {
    const current = { plan: 'monthly', expiresAt: NOW + DAY_MS };
    assert.throws(() => applyPurchase(current, 'session', NOW), (e) => e instanceof PurchaseError && e.code === 'monthly-active');
  });
  test('monthly can be bought on top of a day pass', () => {
    const current = { plan: 'session', expiresAt: LAGOS_MIDNIGHT, sessionCredits: 1 };
    assert.equal(applyPurchase(current, 'monthly', NOW).subscription.plan, 'monthly');
  });
  test('unknown plan is rejected', () => {
    assert.throws(() => applyPurchase(null, 'lifetime', NOW), PurchaseError);
  });
  test('prices are fixed server-side constants', () => {
    assert.equal(PLANS.monthly.amount, 25000);
    assert.equal(PLANS.session.amount, 500);
  });
});
