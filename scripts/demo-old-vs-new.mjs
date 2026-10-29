// Live security demo: the same requests a member could send from the browser
// console, run against TODAY's Firestore rules and against the ORIGINAL rules
// (commit 8e4d85d), side by side. Runs entirely on the local emulator.
//
//   npm run demo:old-vs-new
//
// (That npm script wraps this file in `firebase emulators:exec`, which starts
// and stops the Auth + Firestore emulators.)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { FieldValue } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Run this with: npm run demo:old-vs-new (it needs the emulators).');
  process.exit(2);
}
process.env.GCLOUD_PROJECT ||= 'demo-gymtrace';
const { adminAuth, adminDb } = await import('../api/_lib/firebaseAdmin.js');

const PROJECT = process.env.GCLOUD_PROJECT;
const FS = `http://${process.env.FIRESTORE_EMULATOR_HOST}`;
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;
const DOCS = `${FS}/v1/projects/${PROJECT}/databases/(default)/documents`;

const RULES = {
  today: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
  original: execFileSync('git', ['show', '8e4d85d:firestore.rules'], { encoding: 'utf8' }),
};

async function loadRules(content) {
  const r = await fetch(`${FS}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } }),
  });
  if (!r.ok) throw new Error(`could not load rules: ${r.status}`);
}

// A normal, verified member with no plan: exactly what a new student would be.
const email = 'curious.student@example.edu';
const password = 'demo-only-password';
let user;
try {
  user = await adminAuth.getUserByEmail(email);
} catch {
  user = await adminAuth.createUser({ email, password, emailVerified: true });
}
const resetProfile = () =>
  adminDb.doc(`users/${user.uid}`).set({
    name: 'Curious Student', email, role: 'member', phone: '', status: 'active', createdAt: FieldValue.serverTimestamp(),
  });

const signIn = await (
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  })
).json();
const headers = { Authorization: `Bearer ${signIn.idToken}`, 'Content-Type': 'application/json' };

// The same REST calls the browser-console snippet in docs/DEMO-SCRIPT.md makes.
const patch = (field, value) =>
  fetch(`${DOCS}/users/${user.uid}?updateMask.fieldPaths=${field}`, {
    method: 'PATCH', headers, body: JSON.stringify({ fields: { [field]: value } }),
  }).then((r) => r.status);
const create = (collection, fields) =>
  fetch(`${DOCS}/${collection}`, { method: 'POST', headers, body: JSON.stringify({ fields }) }).then((r) => r.status);

const ATTEMPTS = [
  ['Make myself an admin', () => patch('role', { stringValue: 'admin' })],
  ['Mark myself as paid (old app: isPremium flag)', () => patch('isPremium', { booleanValue: true })],
  ['Give myself a plan until 2030 (new app: subscription)', () =>
    patch('subscription', { mapValue: { fields: { plan: { stringValue: 'monthly' }, expiresAt: { timestampValue: '2030-01-01T00:00:00Z' } } } })],
  ['Check myself in without paying', () =>
    create('attendance', { memberId: { stringValue: user.uid }, status: { stringValue: 'Active' }, checkIn: { timestampValue: new Date().toISOString() } })],
  ['Read every member\'s profile (emails, phones)', () =>
    fetch(`${DOCS}:runQuery`, {
      method: 'POST', headers,
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'users' }], where: { fieldFilter: { field: { fieldPath: 'role' }, op: 'EQUAL', value: { stringValue: 'member' } } } } }),
    }).then((r) => r.status)],
  ['Change my own name (should be allowed)', () => patch('name', { stringValue: 'Curious Student' })],
];

const results = {};
for (const [label, rules] of [['ORIGINAL rules', RULES.original], ['TODAY\'s rules', RULES.today]]) {
  await loadRules(rules);
  for (const [attempt, run] of ATTEMPTS) {
    await resetProfile();
    results[attempt] ??= {};
    results[attempt][label] = await run();
  }
}
await loadRules(RULES.today);

const verdict = (s) => (s === 200 ? `${s} allowed` : `${s} refused`);
console.log(`\nSame member, same requests, two versions of firestore.rules:\n`);
console.table(
  Object.fromEntries(
    Object.entries(results).map(([attempt, r]) => [attempt, { 'ORIGINAL rules': verdict(r['ORIGINAL rules']), "TODAY's rules": verdict(r["TODAY's rules"]) }]),
  ),
);
process.exit(0);
