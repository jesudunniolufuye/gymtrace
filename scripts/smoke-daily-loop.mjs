// End-to-end smoke test of the daily loop against the LOCAL emulators and
// the local API server, over real HTTP and with the browser Firebase SDK
// (so Firestore rules apply exactly as in the app):
//
//   register → verify email → (no plan: no QR) → admin records cash payment
//   → member sees payment + receipt → admin payments list → member QR
//   → admin check-in → replay refused → repeat scan not charged
//
// Needs: npm run emulators, npm run dev:api, and a seeded admin:
//   SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... node scripts/smoke-daily-loop.mjs
// Emulator only: refuses to run against anything else.
import { randomUUID } from 'node:crypto';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator, createUserWithEmailAndPassword, getAuth, sendEmailVerification, signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  Timestamp, collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, orderBy, query,
  serverTimestamp, setDoc, where,
} from 'firebase/firestore';

const PROJECT = 'demo-gymtrace';
const AUTH_HOST = '127.0.0.1:9099';
const API = process.env.SMOKE_API_URL || 'http://127.0.0.1:3001';
const adminEmail = process.env.SMOKE_ADMIN_EMAIL;
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) {
  console.error('Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD (a seeded emulator admin).');
  process.exit(2);
}
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API)) {
  console.error('SMOKE_API_URL must be a local address. This script is for the emulator only.');
  process.exit(2);
}

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
};

function client(name) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT, authDomain: 'localhost' }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { app, auth, db };
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
  await sendEmailVerification(cred.user);
  const codes = await (await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
  const link = codes.oobCodes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').pop()?.oobLink;
  await fetch(link);
  await signInWithEmailAndPassword(member.auth, email, password); // fresh token with email_verified
  check('member registers and verifies email', member.auth.currentUser.emailVerified === true);
  const memberId = cred.user.uid;

  // 2. Production mode: no online card payments, no QR without a plan.
  const options = await (await fetch(`${API}/api/payment-options`)).json();
  check('card simulator is off', options.cardSimulator === false);
  const pay = await api(member.auth, 'POST', 'pay', { plan: 'monthly', idempotencyKey: randomUUID(), card: {} });
  check('online card payment refused', pay.status === 403 && pay.body.code === 'simulator-disabled', `HTTP ${pay.status}`);
  const noQr = await api(member.auth, 'POST', 'qr-token');
  check('no QR code without a plan', noQr.status === 403 && noQr.body.code === 'no-active-plan', `HTTP ${noQr.status}`);

  // 3. Admin records a cash payment at the front desk.
  await signInWithEmailAndPassword(admin.auth, adminEmail, adminPassword);
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
} catch (error) {
  failures += 1;
  console.error('FAIL  unexpected error:', error.message);
} finally {
  await Promise.all([deleteApp(member.app), deleteApp(admin.app)]);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
