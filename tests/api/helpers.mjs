// Test helpers for API handlers. Requires the Auth + Firestore emulators
// (run through `npm test`, which wraps everything in emulators:exec).
import { randomUUID } from 'node:crypto';

process.env.GCLOUD_PROJECT ||= 'demo-gymtrace';
process.env.PAY_SIM_DELAY_MS = '0';

const { adminAuth, adminDb } = await import('../../api/_lib/firebaseAdmin.js');
export { adminAuth, adminDb };

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

/** Creates an auth user + profile and returns { uid, idToken, email }. */
export async function makeUser({ role = 'member', verified = true, profile = {}, withProfile = true } = {}) {
  const email = `${role}-${randomUUID().slice(0, 8)}@example.test`;
  const password = 'emu-only-pw';
  const user = await adminAuth.createUser({ email, password, emailVerified: verified });
  if (withProfile) {
    await adminDb.doc(`users/${user.uid}`).set({
      name: `Test ${role}`, email, role, phone: '', status: 'active', createdAt: new Date(), ...profile,
    });
  }
  const r = await fetch(
    `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) },
  );
  const { idToken } = await r.json();
  return { uid: user.uid, idToken, email };
}

/** Calls a Vercel-style (req, res) handler and returns { status, body }. */
export async function call(handler, { method = 'POST', token, body } = {}) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const req = { method, headers, body };
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(payload) { resolve({ status: this.statusCode, headers: this.headers, body: payload ? JSON.parse(payload) : null }); },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

export const goodCard = { name: 'Test Member', number: '4084 0840 8408 4081', expiry: '12/30', cvc: '123' };
export const key = () => randomUUID();
