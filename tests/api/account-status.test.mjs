import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { adminAuth, adminDb, call, makeUser } from './helpers.mjs';
import { DAY_MS } from '../../shared/subscription.js';
import { signQrToken } from '../../api/_lib/qrToken.js';

const { default: setStatus } = await import('../../api/admin/set-account-status.js');
const { default: qrToken } = await import('../../api/qr-token.js');
const { default: checkIn } = await import('../../api/check-in.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const monthly = () => ({ plan: 'monthly', expiresAt: new Date(Date.now() + 10 * DAY_MS), sessionCredits: 0 });
const profileOf = async (uid) => (await adminDb.doc(`users/${uid}`).get()).data();

let adminUser;
const admin = async () => (adminUser ??= await makeUser({ role: 'admin', profile: { name: 'Desk Admin' } }));
const act = async (body, token) => call(setStatus, { token: token ?? (await admin()).idToken, body });

/** Password sign-in through the Auth emulator; returns the error code or 'ok'. */
async function signIn(email) {
  const r = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'emu-only-pw', returnSecureToken: true }) },
  );
  const j = await r.json();
  return j.error?.message ?? 'ok';
}

describe('POST /api/admin/set-account-status', () => {
  test('only admins; not yourself; unknown user 404; bad action 400', async () => {
    const target = await makeUser();
    const member = await makeUser();
    assert.equal((await act({ userId: target.uid, action: 'deactivate' }, member.idToken)).status, 403);
    const a = await admin();
    assert.equal((await act({ userId: a.uid, action: 'deactivate' })).body.code, 'self');
    assert.equal((await act({ userId: 'abcdefghij0123456789', action: 'deactivate' })).status, 404);
    assert.equal((await act({ userId: target.uid, action: 'delete' })).status, 400);
    assert.equal((await profileOf(target.uid)).status, 'active');
  });

  test('deactivate: login disabled, session ended, profile marked, QR and check-in refused', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    await sleep(1100); // token revocation compares whole seconds
    const r = await act({ userId: m.uid, action: 'deactivate', reason: 'Left the university' });
    assert.equal(r.status, 200);

    const p = await profileOf(m.uid);
    assert.equal(p.status, 'disabled');
    assert.equal(p.statusBeforeDeactivation, 'active');
    assert.equal(p.deactivatedBy.uid, (await admin()).uid);
    assert.equal(p.deactivationReason, 'Left the university');
    assert.equal((await adminAuth.getUser(m.uid)).disabled, true);

    assert.equal(await signIn(m.email), 'USER_DISABLED');
    assert.notEqual((await call(qrToken, { token: m.idToken })).status, 200);
    const scan = await call(checkIn, { token: (await admin()).idToken, body: { token: signQrToken({ uid: m.uid }).token } });
    assert.equal(scan.status, 403);
    assert.equal(scan.body.code, 'account-disabled');
  });

  test('deactivating twice is harmless', async () => {
    const m = await makeUser();
    await act({ userId: m.uid, action: 'deactivate' });
    const again = await act({ userId: m.uid, action: 'deactivate' });
    assert.equal(again.status, 200);
    assert.equal((await profileOf(m.uid)).statusBeforeDeactivation, 'active');
  });

  test('reactivate restores the login and the previous status (trainer stays unapproved)', async () => {
    const m = await makeUser({ profile: { subscription: monthly() } });
    const t = await makeUser({ role: 'trainer', profile: { status: 'inactive' } });
    for (const u of [m, t]) await act({ userId: u.uid, action: 'deactivate' });

    assert.equal((await act({ userId: m.uid, action: 'reactivate' })).body.status, 'active');
    assert.equal((await act({ userId: t.uid, action: 'reactivate' })).body.status, 'inactive');
    assert.equal((await adminAuth.getUser(m.uid)).disabled, false);
    assert.equal(await signIn(m.email), 'ok');
    const p = await profileOf(m.uid);
    assert.equal(p.status, 'active');
    assert.equal(p.statusBeforeDeactivation, undefined);
    assert.equal(p.reactivatedBy.uid, (await admin()).uid);
  });
});
