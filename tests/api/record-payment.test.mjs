import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { adminDb, call, key, makeUser } from './helpers.mjs';
import { DAY_MS } from '../../shared/subscription.js';

const { default: recordPayment } = await import('../../api/admin/record-payment.js');

const getUser = async (uid) => (await adminDb.doc(`users/${uid}`).get()).data();
const paymentsOf = async (uid) =>
  (await adminDb.collection('payments').where('memberId', '==', uid).get()).docs.map((d) => d.data());

let adminUser;
const admin = async () => (adminUser ??= await makeUser({ role: 'admin', profile: { name: 'Front Desk Ada' } }));
const record = async (body, token) =>
  call(recordPayment, { token: token ?? (await admin()).idToken, body: { idempotencyKey: key(), ...body } });
const cashMonthly = (memberId) => ({ memberId, plan: 'monthly', method: 'cash', amount: 25000 });

describe('POST /api/admin/record-payment: who may record', () => {
  test('members and trainers → 403, nothing written', async () => {
    const target = await makeUser();
    for (const role of ['member', 'trainer']) {
      const u = await makeUser({ role });
      const r = await record(cashMonthly(target.uid), u.idToken);
      assert.equal(r.status, 403, role);
    }
    // A member also cannot record a payment for themselves.
    const r = await record(cashMonthly(target.uid), target.idToken);
    assert.equal(r.status, 403);
    assert.equal((await paymentsOf(target.uid)).length, 0);
  });
  test('works with the card simulator switched off (production)', async () => {
    const m = await makeUser();
    process.env.PAYMENTS_SIMULATOR = 'off';
    try {
      const r = await record(cashMonthly(m.uid));
      assert.equal(r.status, 200);
    } finally {
      process.env.PAYMENTS_SIMULATOR = 'enabled';
    }
  });
});

describe('POST /api/admin/record-payment: form validation', () => {
  test('field errors name the field', async () => {
    const m = await makeUser();
    const cases = [
      [{ plan: 'gold' }, 'plan'],
      [{ method: 'card' }, 'method'],
      [{ method: 'cheque' }, 'method'],
      [{ amount: 0 }, 'amount'],
      [{ amount: 250.5 }, 'amount'],
      [{ amount: '25000' }, 'amount'],
      [{ method: 'transfer' }, 'externalReference'],
      [{ method: 'transfer', externalReference: 'x' }, 'externalReference'],
      [{ externalReference: 'x'.repeat(61) }, 'externalReference'],
      [{ amount: 20000 }, 'note'],
      [{ note: 'x'.repeat(201) }, 'note'],
    ];
    for (const [change, field] of cases) {
      const r = await record({ ...cashMonthly(m.uid), ...change });
      assert.equal(r.status, 400, JSON.stringify(change));
      assert.equal(r.body.field, field, JSON.stringify(change));
    }
    assert.equal((await paymentsOf(m.uid)).length, 0);
  });
  test('unknown member, junk id → 404; trainer → 400; deactivated → 403', async () => {
    assert.equal((await record(cashMonthly('abcdefghij0123456789'))).status, 404);
    assert.equal((await record(cashMonthly('../users/x'))).status, 404);
    const t = await makeUser({ role: 'trainer' });
    assert.equal((await record(cashMonthly(t.uid))).body.code, 'not-a-member');
    const d = await makeUser({ profile: { status: 'disabled' } });
    assert.equal((await record(cashMonthly(d.uid))).body.code, 'account-disabled');
  });
});

describe('POST /api/admin/record-payment: outcomes', () => {
  test('cash monthly: subscription for 30 days, payment with recordedBy and a receipt number', async () => {
    const m = await makeUser();
    const before = Date.now();
    const r = await record({ ...cashMonthly(m.uid), externalReference: 'RB-0042' });
    assert.equal(r.status, 200);
    assert.equal(r.body.payment.method, 'cash');
    assert.equal(r.body.payment.amount, 25000);
    assert.equal(r.body.payment.recordedBy.name, 'Front Desk Ada');
    assert.match(r.body.payment.reference, /^GT-\d{8}-[0-9A-F]{6}$/);

    const sub = (await getUser(m.uid)).subscription;
    assert.equal(sub.plan, 'monthly');
    assert.ok(sub.expiresAt.toMillis() >= before + 30 * DAY_MS);

    const [p] = await paymentsOf(m.uid);
    assert.equal(p.status, 'success');
    assert.equal(p.externalReference, 'RB-0042');
    assert.equal(p.recordedBy.uid, (await admin()).uid);
    assert.equal(p.listPrice, 25000);
  });
  test('bank transfer day pass with reference', async () => {
    const m = await makeUser();
    const r = await record({ memberId: m.uid, plan: 'session', method: 'transfer', amount: 500, externalReference: 'FT26302XYZ' });
    assert.equal(r.status, 200);
    assert.equal((await getUser(m.uid)).subscription.sessionCredits, 1);
    assert.equal((await paymentsOf(m.uid))[0].method, 'transfer');
  });
  test('a different amount is accepted with a note, and both amounts are kept', async () => {
    const m = await makeUser();
    const r = await record({ ...cashMonthly(m.uid), amount: 20000, note: 'Staff discount approved by manager' });
    assert.equal(r.status, 200);
    const [p] = await paymentsOf(m.uid);
    assert.equal(p.amount, 20000);
    assert.equal(p.listPrice, 25000);
    assert.equal(p.note, 'Staff discount approved by manager');
  });
  test('submitting the same form twice records it once', async () => {
    const m = await makeUser();
    const body = { ...cashMonthly(m.uid), idempotencyKey: key() };
    const first = await record(body);
    const exp1 = (await getUser(m.uid)).subscription.expiresAt.toMillis();
    const second = await record(body);
    assert.equal(second.status, 200);
    assert.equal(second.body.payment.id, first.body.payment.id);
    assert.equal((await paymentsOf(m.uid)).length, 1);
    assert.equal((await getUser(m.uid)).subscription.expiresAt.toMillis(), exp1);
  });
  test('same rules as online payments: renewal extends, day pass refused during monthly', async () => {
    const m = await makeUser();
    await record(cashMonthly(m.uid));
    const exp1 = (await getUser(m.uid)).subscription.expiresAt.toMillis();
    await record(cashMonthly(m.uid));
    assert.equal((await getUser(m.uid)).subscription.expiresAt.toMillis() - exp1, 30 * DAY_MS);
    const r = await record({ memberId: m.uid, plan: 'session', method: 'cash', amount: 500 });
    assert.equal(r.status, 409);
    assert.equal(r.body.code, 'monthly-active');
    assert.equal((await paymentsOf(m.uid)).length, 2);
  });
});
