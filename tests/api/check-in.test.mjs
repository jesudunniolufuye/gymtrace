import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { adminAuth, adminDb, call, makeUser } from './helpers.mjs';
import { DAY_MS } from '../../shared/subscription.js';
import { signQrToken, verifyQrToken } from '../../api/_lib/qrToken.js';

const { default: qrToken } = await import('../../api/qr-token.js');
const { default: checkIn } = await import('../../api/check-in.js');

const monthly = (days = 10) => ({ plan: 'monthly', expiresAt: new Date(Date.now() + days * DAY_MS), sessionCredits: 0 });
const dayPass = (credits = 1) => ({ plan: 'session', expiresAt: new Date(Date.now() + 3600e3), sessionCredits: credits });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const attendanceOf = async (uid) =>
  (await adminDb.collection('attendance').where('memberId', '==', uid).get()).docs.map((d) => d.data());
const userDoc = async (uid) => (await adminDb.doc(`users/${uid}`).get()).data();

let adminUser;
const admin = async () => (adminUser ??= await makeUser({ role: 'admin' }));
const scan = async (body) => call(checkIn, { token: (await admin()).idToken, body });

describe('POST /api/qr-token (member)', () => {
  test('no token → 401; trainer → 403', async () => {
    assert.equal((await call(qrToken, {})).status, 401);
    const t = await makeUser({ role: 'trainer' });
    assert.equal((await call(qrToken, { token: t.idToken })).status, 403);
  });
  test('member without a plan → 403 no-active-plan', async () => {
    const m = await makeUser();
    const r = await call(qrToken, { token: m.idToken });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'no-active-plan');
  });
  test('expired monthly and used day pass → 403 with the reason', async () => {
    const a = await makeUser({ profile: { subscription: monthly(-1) } });
    assert.equal((await call(qrToken, { token: a.idToken })).body.reason, 'expired');
    const b = await makeUser({ profile: { subscription: dayPass(0) } });
    assert.equal((await call(qrToken, { token: b.idToken })).body.reason, 'used');
  });
  test('member with an active plan gets a signed 60 s token for themselves', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    const r = await call(qrToken, { token: m.idToken });
    assert.equal(r.status, 200);
    const v = verifyQrToken(r.body.token);
    assert.equal(v.ok, true);
    assert.equal(v.uid, m.uid);
    assert.ok(r.body.expiresAt - Date.now() <= 60_000);
  });
  test('deactivated profile → 403 account-disabled', async () => {
    const m = await makeUser({ profile: { subscription: monthly(), status: 'disabled' } });
    const r = await call(qrToken, { token: m.idToken });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'account-disabled');
  });
});

describe('POST /api/check-in: who may admit members', () => {
  test('members and trainers cannot check people in', async () => {
    const target = await makeUser({ profile: { subscription: monthly() } });
    for (const role of ['member', 'trainer']) {
      const u = await makeUser({ role });
      const r = await call(checkIn, { token: u.idToken, body: { member: target.uid } });
      assert.equal(r.status, 403, role);
    }
    assert.equal((await attendanceOf(target.uid)).length, 0);
  });
  test('empty request → 400', async () => {
    assert.equal((await scan({})).status, 400);
  });
});

describe('POST /api/check-in: QR codes (TC2)', () => {
  test('valid QR → 200, attendance logged with server time, staff and method', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    const { token } = signQrToken({ uid: m.uid });
    const r = await scan({ token });
    assert.equal(r.status, 200);
    assert.equal(r.body.duplicate, false);
    assert.equal(r.body.member.id, m.uid);
    const [a] = await attendanceOf(m.uid);
    assert.equal(a.method, 'qr');
    assert.equal(a.status, 'Active');
    assert.equal(a.checkedInBy.uid, (await admin()).uid);
    assert.ok(Math.abs(a.checkIn.toMillis() - Date.now()) < 10_000);
  });
  test('the same QR cannot be used twice', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    const { token } = signQrToken({ uid: m.uid });
    assert.equal((await scan({ token })).status, 200);
    const again = await scan({ token });
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'qr-used');
  });
  test('expired QR (old screenshot) → "Invalid or Expired QR Code", nothing logged', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    const { token } = signQrToken({ uid: m.uid, nowMs: Date.now() - 24 * 3600e3 });
    const r = await scan({ token });
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'Invalid or Expired QR Code');
    assert.equal(r.body.reason, 'expired');
    assert.equal((await attendanceOf(m.uid)).length, 0);
  });
  test('forged QR (wrong secret) and old unsigned JSON QR are rejected', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    const forged = signQrToken({ uid: m.uid, secret: 'attacker-secret-0123456789abcdefghij' }).token;
    assert.equal((await scan({ token: forged })).body.reason, 'bad-signature');
    const legacy = JSON.stringify({ userId: m.uid, timestamp: Date.now(), validity: '60s' });
    assert.equal((await scan({ token: legacy })).status, 400);
    assert.equal((await attendanceOf(m.uid)).length, 0);
  });
});

describe('POST /api/check-in: manual entry (TC2 steps 4–5)', () => {
  test('by member ID and by email (any case)', async () => {
    const a = await makeUser({ profile: { subscription: monthly() } });
    const r1 = await scan({ member: a.uid });
    assert.equal(r1.status, 200);
    assert.equal((await attendanceOf(a.uid))[0].method, 'manual');
    const b = await makeUser({ profile: { subscription: monthly() } });
    assert.equal((await scan({ member: `  ${b.email.toUpperCase()} ` })).status, 200);
  });
  test('unknown ID, unknown email or junk → 404 "Member Not Found"', async () => {
    for (const member of ['abcdefghij1234567890XYZ', 'nobody@example.test', 'abc', '../users/x']) {
      const r = await scan({ member });
      assert.equal(r.status, 404, member);
      assert.equal(r.body.error, 'Member Not Found');
    }
  });
  test('a trainer or admin account is not admitted as a member', async () => {
    const t = await makeUser({ role: 'trainer' });
    const r = await scan({ member: t.uid });
    assert.equal(r.status, 400);
    assert.equal(r.body.code, 'not-a-member');
  });
});

describe('POST /api/check-in: payment status (FR10, FR12)', () => {
  test('no plan, expired monthly, used day pass → 403 and no attendance', async () => {
    const cases = [
      [await makeUser(), 'none'],
      [await makeUser({ profile: { subscription: monthly(-1) } }), 'expired'],
      [await makeUser({ profile: { subscription: dayPass(0) } }), 'used'],
    ];
    for (const [m, reason] of cases) {
      const r = await scan({ token: signQrToken({ uid: m.uid }).token });
      assert.equal(r.status, 403, reason);
      assert.equal(r.body.code, 'no-active-plan');
      assert.equal(r.body.reason, reason);
      assert.equal((await attendanceOf(m.uid)).length, 0);
    }
  });
  test('deactivated member → 403 even with a valid QR', async () => {
    const m = await makeUser({ profile: { subscription: monthly(), status: 'disabled' } });
    const r = await scan({ token: signQrToken({ uid: m.uid }).token });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'account-disabled');
  });
  test('day pass: entry uses it up; a repeat scan right after is "already checked in", not charged', async () => {
    const m = await makeUser({ profile: { subscription: dayPass(1) } });
    const first = await scan({ token: signQrToken({ uid: m.uid }).token });
    assert.equal(first.status, 200);
    assert.equal(first.body.member.subscription.sessionCredits, 0);
    assert.equal((await userDoc(m.uid)).subscription.sessionCredits, 0);

    const repeat = await scan({ member: m.uid });
    assert.equal(repeat.status, 200);
    assert.equal(repeat.body.duplicate, true);
    assert.equal((await attendanceOf(m.uid)).length, 1);
    assert.equal((await userDoc(m.uid)).subscription.sessionCredits, 0);
  });
  test('monthly member can come back later the same day (outside the repeat window)', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    await adminDb.collection('attendance').add({
      memberId: m.uid, memberName: 'x', checkIn: new Date(Date.now() - 10 * 60e3), status: 'Active', checkOut: null,
    });
    const r = await scan({ member: m.uid });
    assert.equal(r.status, 200);
    assert.equal(r.body.duplicate, false);
    assert.equal((await attendanceOf(m.uid)).length, 2);
  });
});

describe('sessions end when an account is disabled or revoked', () => {
  test('revoked session → 401', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    await sleep(1100); // revocation compares whole seconds
    await adminAuth.revokeRefreshTokens(m.uid);
    assert.equal((await call(qrToken, { token: m.idToken })).status, 401);
  });
  test('disabled login → 403 account-disabled', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    await adminAuth.updateUser(m.uid, { disabled: true });
    const r = await call(qrToken, { token: m.idToken });
    assert.equal(r.status, 403);
    assert.equal(r.body.code, 'account-disabled');
  });
});
