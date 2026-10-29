// QA probe (Phase 1 of the adversarial QA pass): hostile/clumsy-user probes against the LOCAL emulators only.
// Run from the repo root:  npx firebase emulators:exec --only auth,firestore --project demo-gymtrace "node scripts/qa-probe.mjs"
// Prints one line per probe; findings are written up in docs/QA-FINDINGS.md.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
const R = process.cwd();
const { adminAuth, adminDb, call, makeUser, goodCard, key } = await import(`${R}/tests/api/helpers.mjs`);
const { signQrToken } = await import(`${R}/api/_lib/qrToken.js`);
const S = await import(`${R}/shared/subscription.js`);
const pay = (await import(`${R}/api/pay.js`)).default;
const rec = (await import(`${R}/api/admin/record-payment.js`)).default;
const qr = (await import(`${R}/api/qr-token.js`)).default;
const chk = (await import(`${R}/api/check-in.js`)).default;
const st = (await import(`${R}/api/admin/set-account-status.js`)).default;
const opts = (await import(`${R}/api/payment-options.js`)).default;
const DAY = 86400e3;
const out = (id, label, v) => console.log(`[${id}] ${label}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
const short = (r) => `${r.status} ${JSON.stringify(r.body).slice(0, 140)}`;
const monthly = (ms = 10 * DAY) => ({ plan: 'monthly', expiresAt: new Date(Date.now() + ms), sessionCredits: 0 });
const attendanceOf = async (uid) => (await adminDb.collection('attendance').where('memberId', '==', uid).get()).size;

const admin = await makeUser({ role: 'admin', profile: { name: 'QA Admin' } });
const member = await makeUser({ profile: { subscription: monthly() } });
const rp = (b, t = admin.idToken) => call(rec, { token: t, body: { idempotencyKey: key(), memberId: member.uid, plan: 'monthly', method: 'cash', amount: 25000, ...b } });

// ---- A. plan names that are properties of Object ----
for (const plan of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
  const m = await makeUser();
  out('A', `record-payment plan=${plan}`, short(await call(rec, { token: admin.idToken, body: { idempotencyKey: key(), memberId: m.uid, plan, method: 'cash', amount: 25000, note: 'qa' } })));
  const m2 = await makeUser();
  out('A', `pay plan=${plan}`, short(await call(pay, { token: m2.idToken, body: { plan, idempotencyKey: key(), card: goodCard } })));
  out('A', `  payments written for that member`, (await adminDb.collection('payments').where('memberId', '==', m.uid).get()).size);
}
// ---- B. amounts ----
for (const amount of [-5, 0, 1e7 + 1, 25000.5, '25000', null, 9007199254740993, 1]) {
  const m = await makeUser();
  out('B', `amount=${String(amount)}`, short(await call(rec, { token: admin.idToken, body: { idempotencyKey: key(), memberId: m.uid, plan: 'monthly', method: 'cash', amount, note: 'qa test' } })));
}
// ---- C. text fields ----
out('C', 'note 100 emoji (200 UTF-16 units)', short(await rp({ plan: 'session', amount: 500, note: '😀'.repeat(100) })).slice(0, 60));
const mm = await makeUser(); // fresh member for session
out('C', 'reference with RTL/HTML chars', short(await call(rec, { token: admin.idToken, body: { idempotencyKey: key(), memberId: mm.uid, plan: 'session', method: 'transfer', amount: 500, externalReference: '<img src=x onerror=1>‮' } })).slice(0, 80));
// ---- D. idempotency key reuse with different body ----
{ const m = await makeUser(); const k = key();
  const a = await call(rec, { token: admin.idToken, body: { idempotencyKey: k, memberId: m.uid, plan: 'monthly', method: 'cash', amount: 25000 } });
  const b = await call(rec, { token: admin.idToken, body: { idempotencyKey: k, memberId: m.uid, plan: 'session', method: 'cash', amount: 500 } });
  out('D', 'same key, different plan/amount', `first=${a.status} ${a.body.payment?.planLabel}; second=${b.status} returned ${b.body.payment?.planLabel} ₦${b.body.payment?.amount}`); }
// ---- E. buy day pass then monthly (credit lost?) ----
{ const m = await makeUser();
  await call(rec, { token: admin.idToken, body: { idempotencyKey: key(), memberId: m.uid, plan: 'session', method: 'cash', amount: 500 } });
  await call(rec, { token: admin.idToken, body: { idempotencyKey: key(), memberId: m.uid, plan: 'monthly', method: 'cash', amount: 25000 } });
  const sub = (await adminDb.doc(`users/${m.uid}`).get()).data().subscription;
  out('E', 'day pass then monthly', `plan=${sub.plan} credits=${sub.sessionCredits} (a paid day-pass entry is replaced, not kept)`); }
// ---- F. check-in input fuzz ----
const scan = (body, t = admin.idToken) => call(chk, { token: t, body });
for (const body of [{ token: {} }, { token: 123 }, { token: ['a'] }, { member: {} }, { member: 123 }, { member: '   ' }, { member: 'x'.repeat(10000) }, { member: "' OR 1=1 --" }, { member: '../users/' + member.uid }, { member: member.email.toUpperCase() + ' ' }, { member: 'a@b@c' }, { token: 'GT1.' + 'A'.repeat(600) + '.x' }, { member: member.uid, token: '' }]) {
  out('F', JSON.stringify(body).slice(0, 60), short(await scan(body)).slice(0, 110));
}
// ---- G. role matrix ----
const trainer = await makeUser({ role: 'trainer' });
const unverified = await makeUser({ verified: false });
const disabled = await makeUser({ profile: { status: 'disabled' } });
const disabledAdmin = await makeUser({ role: 'admin', profile: { status: 'disabled' } });
const actors = { none: null, member: member.idToken, trainer: trainer.idToken, admin: admin.idToken, unverified: unverified.idToken, disabledMember: disabled.idToken, disabledAdmin: disabledAdmin.idToken, garbage: 'abc.def.ghi' };
const target = await makeUser();
const endpoints = { qr: (t) => call(qr, { token: t }), pay: (t) => call(pay, { token: t, body: { plan: 'monthly', idempotencyKey: key(), card: goodCard } }), rec: (t) => call(rec, { token: t, body: { idempotencyKey: key(), memberId: target.uid, plan: 'session', method: 'cash', amount: 500 } }), chk: (t) => call(chk, { token: t, body: { member: target.uid } }), st: (t) => call(st, { token: t, body: { userId: target.uid, action: 'reactivate' } }), opts: (t) => call(opts, { token: t, method: 'GET' }) };
const matrix = {};
for (const [en, fn] of Object.entries(endpoints)) { matrix[en] = {}; for (const [an, tok] of Object.entries(actors)) matrix[en][an] = (await fn(tok)).status; }
console.log('[G] status matrix (rows=endpoint, cols=actor)'); console.table(matrix);
// ---- H. races ----
{ const m = await makeUser({ profile: { subscription: monthly() } });
  const { token } = signQrToken({ uid: m.uid });
  const rs = await Promise.all(Array.from({ length: 6 }, () => scan({ token })));
  out('H', '6 parallel scans, same QR', `statuses=${rs.map((r) => r.status).join(',')} attendance=${await attendanceOf(m.uid)}`); }
{ const m = await makeUser({ profile: { subscription: { plan: 'session', expiresAt: new Date(Date.now() + 3600e3), sessionCredits: 1 } } });
  const rs = await Promise.all(Array.from({ length: 6 }, () => scan({ token: signQrToken({ uid: m.uid }).token })));
  const credits = (await adminDb.doc(`users/${m.uid}`).get()).data().subscription.sessionCredits;
  out('H', '6 parallel scans, different QRs, 1 day-pass entry', `statuses=${rs.map((r) => r.status + (r.body.duplicate ? 'D' : '')).join(',')} attendance=${await attendanceOf(m.uid)} credits=${credits}`); }
{ const m = await makeUser(); const k = key(); const body = { idempotencyKey: k, memberId: m.uid, plan: 'monthly', method: 'cash', amount: 25000 };
  const rs = await Promise.all(Array.from({ length: 6 }, () => call(rec, { token: admin.idToken, body })));
  out('H', '6 parallel payments, same key', `statuses=${rs.map((r) => r.status).join(',')} payments=${(await adminDb.collection('payments').where('memberId', '==', m.uid).get()).size}`); }
{ const m = await makeUser();
  const rs = await Promise.all(Array.from({ length: 4 }, () => call(rec, { token: admin.idToken, body: { idempotencyKey: key(), memberId: m.uid, plan: 'monthly', method: 'cash', amount: 25000 } })));
  const sub = (await adminDb.doc(`users/${m.uid}`).get()).data().subscription;
  out('H', '4 parallel payments, different keys (double-click with new keys)', `statuses=${rs.map((r) => r.status).join(',')} daysOfPlan=${Math.round((sub.expiresAt.toMillis() - Date.now()) / DAY)}`); }
{ const a1 = await makeUser({ role: 'admin' }); const a2 = await makeUser({ role: 'admin' });
  const rs = await Promise.all([call(st, { token: a1.idToken, body: { userId: a2.uid, action: 'deactivate' } }), call(st, { token: a2.idToken, body: { userId: a1.uid, action: 'deactivate' } })]);
  out('H', 'two admins deactivate each other simultaneously', `statuses=${rs.map((r) => r.status).join(',')} profiles=${(await adminDb.doc(`users/${a1.uid}`).get()).data().status}/${(await adminDb.doc(`users/${a2.uid}`).get()).data().status}`); }
// ---- I. expiry boundaries ----
{ const mid = Date.UTC(2026, 9, 29, 23, 0); // 00:00 Lagos 30 Oct
  const p1 = S.applyPurchase(null, 'session', mid - 1); const p2 = S.applyPurchase(null, 'session', mid);
  out('I', 'day pass bought 1ms before Lagos midnight', `valid for ${p1.subscription.expiresAt - (mid - 1)} ms`);
  out('I', 'day pass bought exactly at Lagos midnight', `valid for ${(p2.subscription.expiresAt - mid) / 3600e3} h`);
  const m30 = S.applyPurchase(null, 'monthly', mid).subscription;
  out('I', 'monthly active at day30-1ms / at day30', `${S.getSubscriptionStatus(m30, m30.expiresAt - 1).active}/${S.getSubscriptionStatus(m30, m30.expiresAt).active}`); }
{ const m = await makeUser({ profile: { subscription: monthly(2500) } });
  const t0 = signQrToken({ uid: m.uid }).token; const r1 = await scan({ token: t0 });
  await new Promise((r) => setTimeout(r, 2800));
  const r2 = await scan({ member: m.uid });
  out('I', 'monthly expiring in 2.5s: scan before / after', `${r1.status} / ${r2.status} ${r2.body.error ?? ''}`); }
// ---- J. deactivate semantics ----
{ const m = await makeUser({ profile: { subscription: monthly() } });
  await call(st, { token: admin.idToken, body: { userId: m.uid, action: 'deactivate' } });
  out('J', 'record-payment for deactivated member', short(await rp({ memberId: m.uid })).slice(0, 100));
  out('J', 'deactivate an already-deactivated', short(await call(st, { token: admin.idToken, body: { userId: m.uid, action: 'deactivate' } })));
  out('J', 'reactivate an active member', short(await call(st, { token: admin.idToken, body: { userId: member.uid, action: 'reactivate' } })));
  out('J', 'deactivate self', short(await call(st, { token: admin.idToken, body: { userId: admin.uid, action: 'deactivate' } }))); }

// ---- K. Firestore rules probes ----
const { initializeTestEnvironment } = await import(`${R}/node_modules/@firebase/rules-unit-testing/dist/index.cjs.js`).catch(() => import('@firebase/rules-unit-testing'));
const fs = await import(`${R}/node_modules/firebase/firestore/dist/index.cjs.js`).catch(() => import('firebase/firestore'));
const env = await initializeTestEnvironment({ projectId: 'demo-gymtrace', firestore: { rules: readFileSync(`${R}/firestore.rules`, 'utf8') } });
const ctx = (u, extra = {}) => env.authenticatedContext(u.uid, { email: u.email, email_verified: true, ...extra }).firestore();
const tryIt = async (label, p) => { try { await p; out('K', label, 'ALLOWED'); } catch (e) { out('K', label, `denied (${e.code})`); } };
const tr = await makeUser({ role: 'trainer', profile: { status: 'active' } });
const m1 = await makeUser({ profile: { name: 'Member One' } });
const m2 = await makeUser({ profile: { name: 'Member Two' } });
const bk = (over = {}) => ({ memberId: m1.uid, memberName: 'Member One', trainerId: tr.uid, trainerName: 'Trainer', date: '2099-01-01', time: '09:00', sessionType: 'Personal Training', status: 'upcoming', createdAt: fs.serverTimestamp(), ...over });
await tryIt('booking with garbage date "AAAAAAAAAA"', fs.addDoc(fs.collection(ctx(m1), 'bookings'), bk({ date: 'AAAAAAAAAA' })));
await tryIt('booking dated in the past (2001-01-01)', fs.addDoc(fs.collection(ctx(m1), 'bookings'), bk({ date: '2001-01-01' })));
await tryIt('booking with 100 KB sessionType', fs.addDoc(fs.collection(ctx(m1), 'bookings'), bk({ sessionType: 'x'.repeat(100000) })));
await tryIt('booking with spoofed memberName/trainerName', fs.addDoc(fs.collection(ctx(m1), 'bookings'), bk({ memberName: 'Gym Owner', trainerName: 'Famous Trainer' })));
await tryIt('booking with time "not a time"', fs.addDoc(fs.collection(ctx(m1), 'bookings'), bk({ time: 'not a time' })));
const bref = await fs.addDoc(fs.collection(ctx(m1), 'bookings'), bk());
await tryIt('member reads other booking', fs.getDoc(fs.doc(ctx(m2), 'bookings', bref.id)));
await tryIt('cancel own booking (1st)', fs.updateDoc(fs.doc(ctx(m1), 'bookings', bref.id), { status: 'cancelled' }));
await tryIt('cancel own booking again (2nd)', fs.updateDoc(fs.doc(ctx(m1), 'bookings', bref.id), { status: 'cancelled' }));
await tryIt('trainer completes a cancelled booking', fs.updateDoc(fs.doc(ctx(tr), 'bookings', bref.id), { status: 'completed' }));
const huge = Array.from({ length: 50 }, () => ({ name: 'x'.repeat(15000), sets: '1', reps: '1', weight: '1' }));
await tryIt('workout with 50 x 15 KB exercises (~750 KB)', fs.addDoc(fs.collection(ctx(m1), 'workouts'), { memberId: m1.uid, title: 'big', duration: 'x', calories: 'x', difficulty: 'x', date: '2026-10-29', exercises: huge, createdAt: new Date() }));
await tryIt('workout dated 1900-01-01 / junk fields', fs.addDoc(fs.collection(ctx(m1), 'workouts'), { memberId: m1.uid, title: 'old', duration: {}, calories: [], difficulty: 5, date: '1900-01-01', exercises: [], createdAt: new Date(1) }));
await tryIt('profile name = <script> + 80 chars emoji', fs.updateDoc(fs.doc(ctx(m1), 'users', m1.uid), { name: '<script>alert(1)</script>' + '😀'.repeat(50) }));
await tryIt('profile name newline only / 2 spaces', fs.updateDoc(fs.doc(ctx(m1), 'users', m1.uid), { name: '  ' }));
await tryIt('member lists trainers (reads email/phone of ALL trainers incl. disabled)', fs.getDocs(fs.query(fs.collection(ctx(m1), 'users'), fs.where('role', '==', 'trainer'))));
await tryIt('unverified user reads settings', fs.getDoc(fs.doc(env.authenticatedContext(unverified.uid, { email: unverified.email, email_verified: false }).firestore(), 'settings', 'global')));
const ad = await makeUser({ role: 'admin' });
await tryIt('admin sets a member subscription directly (bypasses payments)', fs.updateDoc(fs.doc(ctx(ad), 'users', m2.uid), { subscription: { plan: 'monthly', expiresAt: new Date(Date.now() + 99 * DAY), sessionCredits: 0 } }));
await tryIt('admin re-activates a disabled user directly (auth login stays disabled)', fs.updateDoc(fs.doc(ctx(ad), 'users', disabled.uid), { status: 'active' }));
await tryIt('admin promotes a member to admin directly', fs.updateDoc(fs.doc(ctx(ad), 'users', m2.uid), { role: 'admin' }));
await tryIt('admin deletes a payment', fs.deleteDoc(fs.doc(ctx(ad), 'payments', 'whatever')));
await tryIt('admin edits attendance record', fs.setDoc(fs.doc(ctx(ad), 'attendance', 'zz1'), { memberId: m2.uid, status: 'Active' }));
await env.cleanup();
console.log('DONE');
process.exit(0);
