import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { adminDb, call, goodCard, key, makeUser } from './helpers.mjs';
import { DAY_MS } from '../../shared/subscription.js';

const { default: pay } = await import('../../api/pay.js');

const getUser = async (uid) => (await adminDb.doc(`users/${uid}`).get()).data();
const paymentsOf = async (uid) => (await adminDb.collection('payments').where('memberId', '==', uid).get()).docs.map((d) => d.data());

describe('card simulator switch', () => {
  test('off unless PAYMENTS_SIMULATOR=enabled: 403 and nothing written', async () => {
    const m = await makeUser();
    for (const value of [undefined, '', 'true', 'ENABLED', 'off']) {
      if (value === undefined) delete process.env.PAYMENTS_SIMULATOR;
      else process.env.PAYMENTS_SIMULATOR = value;
      const r = await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
      assert.equal(r.status, 403, `PAYMENTS_SIMULATOR=${value}`);
      assert.equal(r.body.code, 'simulator-disabled');
    }
    process.env.PAYMENTS_SIMULATOR = 'enabled';
    assert.equal((await paymentsOf(m.uid)).length, 0);
    assert.equal((await getUser(m.uid)).subscription, undefined);
  });
  test('payment-options reports the switch', async () => {
    const { default: options } = await import('../../api/payment-options.js');
    assert.deepEqual((await call(options, { method: 'GET' })).body, { cardSimulator: true });
    process.env.PAYMENTS_SIMULATOR = 'off';
    assert.deepEqual((await call(options, { method: 'GET' })).body, { cardSimulator: false });
    process.env.PAYMENTS_SIMULATOR = 'enabled';
  });
});

describe('POST /api/pay: who may pay', () => {
  test('no token → 401', async () => {
    const r = await call(pay, { body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
    assert.equal(r.status, 401);
  });
  test('garbage token → 401', async () => {
    const r = await call(pay, { token: 'not-a-token', body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
    assert.equal(r.status, 401);
  });
  test('unverified email → 403', async () => {
    const m = await makeUser({ verified: false });
    const r = await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
    assert.equal(r.status, 403);
  });
  test('trainers and admins cannot buy memberships → 403', async () => {
    for (const role of ['trainer', 'admin']) {
      const u = await makeUser({ role });
      const r = await call(pay, { token: u.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
      assert.equal(r.status, 403, role);
    }
  });
  test('no profile → 403', async () => {
    const u = await makeUser({ withProfile: false });
    const r = await call(pay, { token: u.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
    assert.equal(r.status, 403);
  });
  test('GET is not allowed → 405', async () => {
    const m = await makeUser();
    const r = await call(pay, { method: 'GET', token: m.idToken });
    assert.equal(r.status, 405);
  });
});

describe('POST /api/pay: input validation (NFR3)', () => {
  test('unknown plan → 400', async () => {
    const m = await makeUser();
    const r = await call(pay, { token: m.idToken, body: { plan: 'lifetime', idempotencyKey: key(), card: goodCard } });
    assert.equal(r.status, 400);
  });
  test('plan names that are Object properties → 400, not 409 (QA F4)', async () => {
    const m = await makeUser();
    for (const plan of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const r = await call(pay, { token: m.idToken, body: { plan, idempotencyKey: key(), card: goodCard } });
      assert.equal(r.status, 400, plan);
    }
    assert.equal((await paymentsOf(m.uid)).length, 0);
  });
  test('bad card number → 400 naming the field, nothing written', async () => {
    const m = await makeUser();
    const r = await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: { ...goodCard, number: '4084084084084082' } } });
    assert.equal(r.status, 400);
    assert.equal(r.body.field, 'number');
    assert.equal((await paymentsOf(m.uid)).length, 0);
  });
  test('missing idempotency key → 400', async () => {
    const m = await makeUser();
    const r = await call(pay, { token: m.idToken, body: { plan: 'monthly', card: goodCard } });
    assert.equal(r.status, 400);
  });
  test('body must be an object → 400', async () => {
    const m = await makeUser();
    const r = await call(pay, { token: m.idToken, body: '[1,2]' });
    assert.equal(r.status, 400);
  });
});

describe('POST /api/pay: outcomes', () => {
  test('monthly success: server sets price, payment recorded, subscription active 30 days', async () => {
    const m = await makeUser();
    const before = Date.now();
    // A client-supplied amount must be ignored.
    const r = await call(pay, { token: m.idToken, body: { plan: 'monthly', amount: 1, idempotencyKey: key(), card: goodCard } });
    assert.equal(r.status, 200);
    assert.equal(r.body.payment.amount, 25000);
    assert.equal(r.body.payment.status, 'success');
    assert.equal(r.body.payment.cardLast4, '4081');
    assert.equal(r.body.payment.method, 'card');
    assert.match(r.body.payment.reference, /^GT-\d{8}-[0-9A-F]{6}$/);

    const user = await getUser(m.uid);
    assert.equal(user.subscription.plan, 'monthly');
    const exp = user.subscription.expiresAt.toMillis();
    assert.ok(exp >= before + 30 * DAY_MS && exp <= Date.now() + 30 * DAY_MS);

    const [p] = await paymentsOf(m.uid);
    assert.equal(p.amount, 25000);
    assert.equal(p.status, 'success');
    assert.equal(p.number, undefined, 'full card number must never be stored');
    assert.equal(p.cvc, undefined);
  });

  test('declined card → 402, failed attempt recorded, no subscription', async () => {
    const m = await makeUser();
    const r = await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: { ...goodCard, number: '4000000000000002' } } });
    assert.equal(r.status, 402);
    assert.match(r.body.error, /declined/i);
    assert.equal((await getUser(m.uid)).subscription, undefined);
    const ps = await paymentsOf(m.uid);
    assert.equal(ps.length, 1);
    assert.equal(ps[0].status, 'failed');
  });

  test('insufficient funds → 402', async () => {
    const m = await makeUser();
    const r = await call(pay, { token: m.idToken, body: { plan: 'session', idempotencyKey: key(), card: { ...goodCard, number: '4000000000009995' } } });
    assert.equal(r.status, 402);
    assert.match(r.body.error, /insufficient/i);
  });

  test('retrying with the same key does not charge twice', async () => {
    const m = await makeUser();
    const k = key();
    const first = await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: k, card: goodCard } });
    const expAfterFirst = (await getUser(m.uid)).subscription.expiresAt.toMillis();
    const second = await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: k, card: goodCard } });
    assert.equal(second.status, 200);
    assert.equal(second.body.payment.id, first.body.payment.id);
    assert.equal((await paymentsOf(m.uid)).length, 1);
    assert.equal((await getUser(m.uid)).subscription.expiresAt.toMillis(), expAfterFirst);
  });

  test('same key with a different plan → 409, charged once (QA F14)', async () => {
    const m = await makeUser();
    const k = key();
    assert.equal((await call(pay, { token: m.idToken, body: { plan: 'session', idempotencyKey: k, card: goodCard } })).status, 200);
    const r = await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: k, card: goodCard } });
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'idempotency-conflict');
    assert.equal((await paymentsOf(m.uid)).length, 1);
  });
  test('two members using the same key get separate payments', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const k = key();
    await call(pay, { token: a.idToken, body: { plan: 'session', idempotencyKey: k, card: goodCard } });
    const r = await call(pay, { token: b.idToken, body: { plan: 'session', idempotencyKey: k, card: goodCard } });
    assert.equal(r.status, 200);
    assert.equal((await paymentsOf(b.uid)).length, 1);
  });

  test('renewing monthly early adds 30 days to the current expiry', async () => {
    const m = await makeUser();
    await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
    const exp1 = (await getUser(m.uid)).subscription.expiresAt.toMillis();
    await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
    const exp2 = (await getUser(m.uid)).subscription.expiresAt.toMillis();
    assert.equal(exp2 - exp1, 30 * DAY_MS);
  });

  test('day pass: one entry; second same-day pass adds one', async () => {
    const m = await makeUser();
    const r = await call(pay, { token: m.idToken, body: { plan: 'session', idempotencyKey: key(), card: goodCard } });
    assert.equal(r.status, 200);
    assert.equal(r.body.payment.amount, 500);
    assert.equal((await getUser(m.uid)).subscription.sessionCredits, 1);
    await call(pay, { token: m.idToken, body: { plan: 'session', idempotencyKey: key(), card: goodCard } });
    assert.equal((await getUser(m.uid)).subscription.sessionCredits, 2);
  });

  test('day pass refused (409) while monthly is active, card not charged', async () => {
    const m = await makeUser();
    await call(pay, { token: m.idToken, body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } });
    const r = await call(pay, { token: m.idToken, body: { plan: 'session', idempotencyKey: key(), card: goodCard } });
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'monthly-active');
    assert.equal((await paymentsOf(m.uid)).length, 1);
  });
});
