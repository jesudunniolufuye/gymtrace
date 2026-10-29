// End-to-end smoke test of the daily loop against the LOCAL emulators and
// the local API server, over real HTTP and with the browser Firebase SDK
// (so Firestore rules apply exactly as in the app):
//
//   register → verify email → (no plan: no QR) → admin records cash payment
//   → member sees payment + receipt → admin payments list → member QR
//   → admin check-in → replay refused → repeat scan not charged
//
// Emulator (default). Needs npm run emulators, npm run dev:api, a seeded admin:
//   SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... npm run smoke
//
// Staging (SMOKE_TARGET=staging). Creates a throwaway smoke-*@example.test
// member in the staging project; the admin session uses a one-time custom
// token for the seeded admin (no password needed). Never runs against prod:
//   SMOKE_TARGET=staging SMOKE_PROJECT=gymtrace-staging \
//   GOOGLE_APPLICATION_CREDENTIALS=~/secrets/gymtrace-staging-sa.json \
//   SMOKE_API_URL=https://<staging host> SMOKE_WEB_API_KEY=<public web api key> \
//   SMOKE_ADMIN_EMAIL=<seeded admin> npm run smoke
import { randomUUID } from 'node:crypto';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  applyActionCode, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, sendEmailVerification,
  signInWithCustomToken, signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  Timestamp, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, orderBy, query,
  serverTimestamp, setDoc, where,
} from 'firebase/firestore';

const STAGING = process.env.SMOKE_TARGET === 'staging';
const PROJECT = STAGING ? process.env.SMOKE_PROJECT : 'demo-gymtrace';
const AUTH_HOST = '127.0.0.1:9099';
const API = process.env.SMOKE_API_URL || 'http://127.0.0.1:3001';
const adminEmail = process.env.SMOKE_ADMIN_EMAIL;
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
const fail = (msg) => {
  console.error(msg);
  process.exit(2);
};

let admin$ = null; // firebase-admin, staging only
if (STAGING) {
  if (!PROJECT || /prod/i.test(PROJECT)) fail('SMOKE_PROJECT must be a staging project (never production).');
  if (!/^https:\/\//.test(API)) fail('SMOKE_API_URL must be the https staging URL.');
  if (!process.env.SMOKE_WEB_API_KEY || !adminEmail) fail('Set SMOKE_WEB_API_KEY and SMOKE_ADMIN_EMAIL.');
  admin$ = await import('../api/_lib/firebaseAdmin.js');
  if (admin$.usingEmulator || admin$.adminProjectId !== PROJECT) {
    fail(`Credentials are for "${admin$.adminProjectId}", not SMOKE_PROJECT "${PROJECT}".`);
  }
} else {
  if (!adminEmail || !adminPassword) fail('Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD (a seeded emulator admin).');
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API)) fail('SMOKE_API_URL must be a local address in emulator mode.');
}
console.log(`Smoke test against ${STAGING ? `${PROJECT} via ${API}` : 'the local emulator'}\n`);

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};

function client(name) {
  const config = STAGING
    ? { apiKey: process.env.SMOKE_WEB_API_KEY, projectId: PROJECT, authDomain: `${PROJECT}.firebaseapp.com` }
    : { apiKey: 'demo-key', projectId: PROJECT, authDomain: 'localhost' };
  const app = initializeApp(config, name);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (!STAGING) {
    connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return { app, auth, db };
}

/** Marks the new member's email verified using the real one-time link code. */
async function verifyEmail(auth, user) {
  let oobCode;
  if (STAGING) {
    const link = await admin$.adminAuth.generateEmailVerificationLink(user.email);
    oobCode = new URL(link).searchParams.get('oobCode');
  } else {
    await sendEmailVerification(user);
    const codes = await (await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
    const link = codes.oobCodes.filter((c) => c.email === user.email && c.requestType === 'VERIFY_EMAIL').pop()?.oobLink;
    oobCode = new URL(link).searchParams.get('oobCode');
  }
  await applyActionCode(auth, oobCode);
}

async function signInAdmin(auth) {
  if (!STAGING) return signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  const { uid } = await admin$.adminAuth.getUserByEmail(adminEmail);
  return signInWithCustomToken(auth, await admin$.adminAuth.createCustomToken(uid));
}

async function api(auth, method, path, body) {
  const headers = { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` };
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${API}/api/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const member = client('member');
const admin = client('admin');
const email = `smoke-${randomUUID().slice(0, 8)}@example.test`;
const password = `smoke-${randomUUID()}`;

try {
  // 1. Register (profile written through the rules) and verify the email.
  const cred = await createUserWithEmailAndPassword(member.auth, email, password);
  await setDoc(doc(member.db, 'users', cred.user.uid), {
    name: 'Smoke Member', email: cred.user.email, role: 'member', phone: '', status: 'active', createdAt: serverTimestamp(),
  });
  await verifyEmail(member.auth, cred.user);
  await signInWithEmailAndPassword(member.auth, email, password); // fresh token with email_verified
  check('member registers and verifies email', member.auth.currentUser.emailVerified === true);
  const memberId = cred.user.uid;

  // 2. Card simulator: on for staging/demo; when off, online payment is refused.
  const options = await (await fetch(`${API}/api/payment-options`)).json();
  const simulatorExpected = STAGING ? true : options.cardSimulator;
  check(`card simulator is ${options.cardSimulator ? 'on' : 'off'}`, options.cardSimulator === simulatorExpected);
  if (!options.cardSimulator) {
    const pay = await api(member.auth, 'POST', 'pay', { plan: 'monthly', idempotencyKey: randomUUID(), card: {} });
    check('online card payment refused', pay.status === 403 && pay.body.code === 'simulator-disabled', `HTTP ${pay.status}`);
  }
  const noQr = await api(member.auth, 'POST', 'qr-token');
  check('no QR code without a plan', noQr.status === 403 && noQr.body.code === 'no-active-plan', `HTTP ${noQr.status}`);

  // 3. Admin records a cash payment at the front desk.
  await signInAdmin(admin.auth);
  const base = { memberId, plan: 'monthly', method: 'cash', amount: 25000 };
  const noRef = await api(admin.auth, 'POST', 'admin/record-payment', { ...base, method: 'transfer', idempotencyKey: randomUUID() });
  check('transfer without reference refused', noRef.status === 400 && noRef.body.field === 'externalReference');
  const noNote = await api(admin.auth, 'POST', 'admin/record-payment', { ...base, amount: 20000, idempotencyKey: randomUUID() });
  check('different amount without a note refused', noNote.status === 400 && noNote.body.field === 'note');
  const memberTries = await api(member.auth, 'POST', 'admin/record-payment', { ...base, idempotencyKey: randomUUID() });
  check('member cannot record their own payment', memberTries.status === 403);
  const recorded = await api(admin.auth, 'POST', 'admin/record-payment', { ...base, externalReference: 'RB-001', idempotencyKey: randomUUID() });
  check('admin records cash payment', recorded.status === 200, `${recorded.body.payment?.reference ?? recorded.body.error}`);
  const paymentId = recorded.body.payment?.id;

  // 4. Member sees the plan, the payment and the receipt (through the rules).
  const profile = (await getDoc(doc(member.db, 'users', memberId))).data();
  check('member now has an active monthly plan', profile.subscription?.plan === 'monthly' && profile.subscription.expiresAt.toMillis() > Date.now());
  const history = await getDocs(query(collection(member.db, 'payments'), where('memberId', '==', memberId), orderBy('createdAt', 'desc')));
  check('payment appears in member history', history.size === 1 && history.docs[0].data().method === 'cash');
  const receipt = await getDoc(doc(member.db, 'payments', paymentId));
  check('member can open the receipt', receipt.exists() && receipt.data().recordedBy?.uid === admin.auth.currentUser.uid);

  // 5. Admin payments list (same query as the Payments page).
  const since = Timestamp.fromMillis(Date.now() - 24 * 3600e3);
  const adminList = await getDocs(query(collection(admin.db, 'payments'), where('createdAt', '>=', since), orderBy('createdAt', 'desc')));
  check('payment appears in admin Payments list', adminList.docs.some((d) => d.id === paymentId));

  // 6. QR check-in at the front desk.
  const qr = await api(member.auth, 'POST', 'qr-token');
  check('member gets a QR code', qr.status === 200 && typeof qr.body.token === 'string');
  const entry = await api(admin.auth, 'POST', 'check-in', { token: qr.body.token });
  check('admin scan: access granted', entry.status === 200 && entry.body.duplicate === false, `HTTP ${entry.status} ${entry.body.error ?? ''}`);
  const replay = await api(admin.auth, 'POST', 'check-in', { token: qr.body.token });
  check('same QR again refused', replay.status === 409);
  const repeat = await api(admin.auth, 'POST', 'check-in', { member: email.toUpperCase() });
  check('repeat manual check-in reported, not logged twice', repeat.status === 200 && repeat.body.duplicate === true);
  const visits = await getDocs(query(collection(member.db, 'attendance'), where('memberId', '==', memberId)));
  check('member sees exactly one check-in', visits.size === 1, `${visits.size} record(s)`);

  // 7. Deactivate → locked out everywhere; reactivate → back in.
  await new Promise((r) => setTimeout(r, 1100)); // session revocation compares whole seconds
  const off = await api(admin.auth, 'POST', 'admin/set-account-status', { userId: memberId, action: 'deactivate', reason: 'smoke test' });
  check('admin deactivates the member', off.status === 200 && off.body.status === 'disabled');
  const qrAfter = await api(member.auth, 'POST', 'qr-token');
  check('deactivated member: open session refused by the API', qrAfter.status === 401 || qrAfter.status === 403, `HTTP ${qrAfter.status}`);
  const scanAfter = await api(admin.auth, 'POST', 'check-in', { member: email });
  check('deactivated member: check-in refused', scanAfter.status === 403 && scanAfter.body.code === 'account-disabled');
  let readError = 'none';
  try {
    await getDocs(query(collection(member.db, 'payments'), where('memberId', '==', memberId)));
  } catch (error) {
    readError = error.code;
  }
  check('deactivated member: database reads refused by the rules', readError === 'permission-denied', readError);
  let loginError = 'none';
  try {
    await signInWithEmailAndPassword(member.auth, email, password);
  } catch (error) {
    loginError = error.code;
  }
  check('deactivated member: login refused', loginError === 'auth/user-disabled', loginError);
  const on = await api(admin.auth, 'POST', 'admin/set-account-status', { userId: memberId, action: 'reactivate' });
  check('admin reactivates the member', on.status === 200 && on.body.status === 'active');
  await signInWithEmailAndPassword(member.auth, email, password);
  const qrBack = await api(member.auth, 'POST', 'qr-token');
  check('reactivated member: QR code works again', qrBack.status === 200);
} catch (error) {
  failures += 1;
  console.error('FAIL  unexpected error:', error.message);
} finally {
  await Promise.all([deleteApp(member.app), deleteApp(admin.app)]);
  if (STAGING) console.log(`\nTest member left in ${PROJECT}: ${email}`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
