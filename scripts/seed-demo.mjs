// Seeds realistic DEMO data so the dashboards, analytics and member/trainer
// pages look like a gym in use: ~15 members across every plan state, three
// trainers, five weeks of payments recorded by an admin, attendance,
// bookings and workout logs. Everything written is tagged `demo: true`.
//
//   - Every account gets a long random password nobody knows. Demo member
//     emails use the reserved example.edu domain, so no email can reach a
//     real person.
//   - Optional DEMO_MEMBER_EMAIL / DEMO_TRAINER_EMAIL create one member and
//     one trainer you can log in as (set their password with Forgot password).
//     Accounts are matched by email, so always pass the SAME emails the
//     existing demo log-ins use (production: molufuye420+demomember@gmail.com and
//     molufuye420+demotrainer@gmail.com); a different email creates a duplicate.
//   - Plan expiry is computed with the app's own purchase rules
//     (shared/subscription.js), so demo data obeys the same logic.
//   - Document ids are fixed, so re-running overwrites instead of duplicating.
//     Dates are relative to "now", so re-run on the demo day for fresh data.
//
// Usage (real projects need SEED_PROJECT matching the credentials):
//   GOOGLE_APPLICATION_CREDENTIALS=~/secrets/gymtrace-staging-sa.json SEED_PROJECT=gymtrace-staging \
//   DEMO_ADMIN_EMAIL=<existing admin> [DEMO_MEMBER_EMAIL=...] [DEMO_TRAINER_EMAIL=...] \
//   npm run seed:demo
import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb, adminProjectId, usingEmulator } from '../api/_lib/firebaseAdmin.js';
import { DAY_MS, GYM_UTC_OFFSET_MS, PLANS, applyPurchase, startOfGymDay } from '../shared/subscription.js';

// ---------- guards ----------
if (!usingEmulator && process.env.SEED_PROJECT !== adminProjectId) {
  console.error(`Refusing: credentials are for "${adminProjectId}" but SEED_PROJECT is "${process.env.SEED_PROJECT ?? ''}".`);
  process.exit(2);
}
const adminEmail = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
if (!adminEmail) {
  console.error('Set DEMO_ADMIN_EMAIL to an existing admin account (payments are recorded by it).');
  process.exit(2);
}

// ---------- time helpers (gym time = Africa/Lagos) ----------
const NOW = Date.now();
const TODAY0 = startOfGymDay(NOW);
const MIN = 60 * 1000;
/** UTC millis for hh:mm Lagos time, `daysAgo` days before today (negative = future). */
const at = (daysAgo, hh, mm = 0) => TODAY0 - daysAgo * DAY_MS + (hh * 60 + mm) * MIN;
/** Like at(), but never later than a few minutes ago (for things that happened "today"). */
const before = (ms) => Math.min(ms, NOW - 5 * MIN);
const lagosDate = (ms) => new Date(ms + GYM_UTC_OFFSET_MS).toISOString().slice(0, 10);
const hex = (s, n = 6) => createHash('sha256').update(s).digest('hex').slice(0, n).toUpperCase();
const ts = (ms) => Timestamp.fromMillis(ms);

/** Small deterministic random generator, so every run produces the same pattern. */
function rng(seed) {
  let a = parseInt(createHash('sha256').update(seed).digest('hex').slice(0, 8), 16);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- the cast ----------
// p: payments as [daysAgo, hour, minute, plan, method, extra?]
const MEMBERS = [
  { key: 'chiamaka', name: 'Chiamaka Okafor', phone: '0803 412 7781', joined: 150, p: [[40, 9, 0, 'monthly', 'transfer'], [10, 8, 30, 'monthly', 'transfer']], today: true },
  { key: 'emeka', name: 'Emeka Nwosu', phone: '0805 219 4402', joined: 140, p: [[3, 17, 10, 'monthly', 'cash']], today: true },
  { key: 'aisha', name: 'Aisha Bello', phone: '', joined: 120, p: [[0, 7, 30, 'session', 'cash']] },
  { key: 'seun', name: 'Oluwaseun Adebayo', phone: '0816 330 9925', joined: 110, p: [[55, 18, 0, 'monthly', 'cash'], [25, 18, 20, 'monthly', 'cash']] },
  { key: 'funmi', name: 'Funmilayo Ogunleye', phone: '0809 774 1203', joined: 95, p: [[8, 16, 45, 'monthly', 'transfer']] },
  { key: 'ibrahim', name: 'Ibrahim Musa', phone: '', joined: 80, p: [[0, 6, 45, 'session', 'cash']], usedDayPassToday: true },
  { key: 'ngozi', name: 'Ngozi Chukwu', phone: '0702 556 1180', joined: 75, p: [[15, 12, 5, 'monthly', 'cash', { amount: 20000, note: 'Student athlete discount approved by the manager (demo)' }]] },
  { key: 'daniel', name: 'Daniel Okoro', phone: '0813 908 6627', joined: 60, p: [[50, 10, 0, 'monthly', 'cash']] },
  { key: 'blessing', name: 'Blessing Eze', phone: '', joined: 55, p: [[4, 16, 0, 'session', 'cash']], usedDayPassOnPaymentDay: true },
  { key: 'yusuf', name: 'Yusuf Abdullahi', phone: '0806 442 3319', joined: 40, p: [[22, 7, 15, 'monthly', 'transfer']], today: true },
  { key: 'temitope', name: 'Temitope Bankole', phone: '0817 225 6094', joined: 38, p: [[36, 15, 30, 'monthly', 'transfer']] },
  { key: 'chinedu', name: 'Chinedu Obi', phone: '', joined: 20, p: [] },
  { key: 'halima', name: 'Halima Sani', phone: '0708 661 2043', joined: 12, p: [[12, 9, 40, 'monthly', 'cash']],
    deactivated: { daysAgo: 2, reason: 'Membership card was used by a non-member (demo)' } },
  { key: 'kelechi', name: 'Kelechi Nnamdi', phone: '', joined: 7, p: [] },
  { key: 'grace', name: 'Grace Akande', phone: '0814 870 3356', joined: 3, p: [[0, 9, 15, 'monthly', 'transfer']] },
];

const TRAINERS = [
  { key: 'tunde', name: 'Tunde Bakare', specialty: 'Strength & Conditioning', phone: '0802 117 4490', joined: 160, status: 'active', available: true },
  { key: 'ngozie', name: 'Ngozi Eze', specialty: 'Yoga & Mobility', phone: '0811 643 2287', joined: 150, status: 'active', available: false },
  { key: 'femi', name: 'Femi Adeyemi', specialty: 'HIIT & Cardio', phone: '', joined: 2, status: 'inactive', available: true },
];

// Your two demo log-ins (optional).
if (process.env.DEMO_MEMBER_EMAIL) {
  MEMBERS.push({
    key: 'demo-member', email: process.env.DEMO_MEMBER_EMAIL, name: process.env.DEMO_MEMBER_NAME || 'Tolu Martins',
    phone: '0810 555 0142', joined: 90, p: [[35, 8, 0, 'monthly', 'transfer'], [5, 7, 50, 'monthly', 'cash']], today: true, login: true,
  });
}
if (process.env.DEMO_TRAINER_EMAIL) {
  TRAINERS.push({
    key: 'demo-trainer', email: process.env.DEMO_TRAINER_EMAIL, name: process.env.DEMO_TRAINER_NAME || 'Bisi Lawal',
    specialty: 'Personal Training', phone: '0812 555 0198', joined: 100, status: 'active', available: true, login: true,
  });
}

const emailFor = (person) => (person.email ?? `${person.key}.${person.name.split(' ')[1].toLowerCase()}@example.edu`).trim().toLowerCase();

// ---------- auth accounts ----------
async function ensureAuthUser(person, disabled = false) {
  const email = emailFor(person);
  try {
    const existing = await adminAuth.getUserByEmail(email);
    // Never change the password of an existing account (e.g. your demo log-ins).
    await adminAuth.updateUser(existing.uid, { emailVerified: true, disabled });
    return { uid: existing.uid, email, created: false };
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    const user = await adminAuth.createUser({
      email,
      password: randomBytes(32).toString('base64url'), // never shown, never stored
      emailVerified: true,
      displayName: person.name,
      disabled,
    });
    return { uid: user.uid, email, created: true };
  }
}

// ---------- main ----------
const adminUser = await adminAuth.getUserByEmail(adminEmail);
const adminProfile = (await adminDb.doc(`users/${adminUser.uid}`).get()).data();
if (adminProfile?.role !== 'admin') {
  console.error(`${adminEmail} is not an admin in ${adminProjectId}.`);
  process.exit(2);
}
const recordedBy = { uid: adminUser.uid, name: adminProfile.name ?? 'Admin' };
console.log(`Seeding demo data into ${usingEmulator ? 'the local emulator' : adminProjectId}; payments recorded by ${recordedBy.name}`);

const writer = adminDb.bulkWriter();
const counts = { members: 0, trainers: 0, payments: 0, attendance: 0, bookings: 0, workouts: 0, newAccounts: 0 };
const ids = {}; // key -> { uid, name }

// Trainers
for (const t of TRAINERS) {
  const account = await ensureAuthUser(t);
  counts.newAccounts += account.created ? 1 : 0;
  ids[t.key] = { uid: account.uid, name: t.name };
  writer.set(adminDb.doc(`users/${account.uid}`), {
    name: t.name, email: account.email, role: 'trainer', phone: t.phone, status: t.status, available: t.available,
    specialty: t.specialty, createdAt: ts(at(t.joined, 10)), demo: true,
  });
  counts.trainers += 1;
}

// Members, their payments, subscription and attendance
const WORKOUTS = [
  { title: 'Upper body strength', difficulty: 'Intermediate', exercises: [['Bench press', 4, 8, 50], ['Seated row', 3, 10, 40], ['Shoulder press', 3, 10, 20]] },
  { title: 'Leg day', difficulty: 'Advanced', exercises: [['Back squat', 5, 5, 70], ['Romanian deadlift', 3, 8, 60], ['Walking lunges', 3, 12, 10]] },
  { title: 'Cardio and core', difficulty: 'Beginner', exercises: [['Treadmill (minutes)', 1, 20, 0], ['Plank (seconds)', 3, 45, 0], ['Crunches', 3, 20, 0]] },
  { title: 'Full body circuit', difficulty: 'Intermediate', exercises: [['Kettlebell swings', 4, 15, 16], ['Push-ups', 4, 12, 0], ['Box jumps', 3, 10, 0]] },
];
const WORKOUT_KEYS = new Set(['chiamaka', 'emeka', 'seun', 'funmi', 'ngozi', 'demo-member']);

for (const m of MEMBERS) {
  const deactivated = Boolean(m.deactivated);
  const account = await ensureAuthUser(m, deactivated);
  counts.newAccounts += account.created ? 1 : 0;
  const uid = account.uid;
  ids[m.key] = { uid, name: m.name };
  const random = rng(`gymtrace-demo-${m.key}`);

  // Payments, applied in order with the app's own rules.
  let subscription = null;
  const periods = []; // [startMs, endMs, plan]
  m.p.forEach(([daysAgo, hh, mm, planId, method, extra = {}], n) => {
    const plan = PLANS[planId];
    const paidAt = daysAgo === 0 ? before(at(0, hh, mm)) : at(daysAgo, hh, mm);
    const purchase = applyPurchase(subscription, planId, paidAt);
    subscription = { ...purchase.subscription, lastPaymentId: `${uid}_demo-${n}` };
    periods.push([purchase.periodStart, purchase.periodEnd, planId]);
    const paymentId = `${uid}_demo-${n}`;
    writer.set(adminDb.doc(`payments/${paymentId}`), {
      memberId: uid, memberName: m.name, memberEmail: account.email,
      plan: planId, planLabel: plan.label, amount: extra.amount ?? plan.amount, listPrice: plan.amount, currency: plan.currency,
      reference: `GT-${lagosDate(paidAt).replace(/-/g, '')}-${hex(paymentId)}`,
      idempotencyKey: `demo-${n}`, method,
      externalReference: method === 'transfer' ? `FT${lagosDate(paidAt).replace(/-/g, '').slice(2)}${hex(`${paymentId}ft`, 4)}` : `RB-${100 + counts.payments}`,
      note: extra.note ?? null, recordedBy, status: 'success',
      periodStart: ts(purchase.periodStart), periodEnd: ts(purchase.periodEnd), createdAt: ts(paidAt), demo: true,
    });
    counts.payments += 1;
  });

  // Attendance: only while a plan was valid, over the last 3 weeks.
  const visits = [];
  const validAt = (ms) => periods.some(([s, e]) => ms >= s && ms < e);
  const deactivatedAt = deactivated ? at(m.deactivated.daysAgo, 11) : Infinity;
  for (let d = 21; d >= 1; d -= 1) {
    const slot = 12 + Math.floor(random() * 27); // 06:00 .. 19:30
    const checkIn = at(d, Math.floor(slot / 2), (slot % 2) * 30);
    const monthly = periods.some(([s, e, plan]) => plan === 'monthly' && checkIn >= s && checkIn < e);
    if (monthly && random() < 0.45 && checkIn < deactivatedAt) visits.push(checkIn);
  }
  if (m.usedDayPassOnPaymentDay) visits.push(periods[0][0] + 20 * MIN);
  if (m.usedDayPassToday) visits.push(before(periods[0][0] + 15 * MIN));
  if (m.today && NOW - TODAY0 > 2 * 60 * MIN) visits.push(NOW - (25 + Math.floor(random() * 90)) * MIN);

  visits.filter(validAt).forEach((checkIn, i) => {
    const length = (60 + Math.floor(random() * 60)) * MIN;
    const stillIn = checkIn + length > NOW;
    writer.set(adminDb.doc(`attendance/demo-${m.key}-${i}`), {
      memberId: uid, memberName: m.name, checkIn: ts(checkIn),
      checkOut: stillIn ? null : ts(checkIn + length), status: stillIn ? 'Active' : 'Completed',
      method: random() < 0.8 ? 'qr' : 'manual', plan: periods.find(([s, e]) => checkIn >= s && checkIn < e)[2],
      checkedInBy: recordedBy, demo: true,
    });
    counts.attendance += 1;
  });

  // A day pass used for an entry has no entries left.
  if (subscription?.plan === 'session' && (m.usedDayPassToday || m.usedDayPassOnPaymentDay)) subscription.sessionCredits = 0;

  // Workout logs on some visit days.
  if (WORKOUT_KEYS.has(m.key)) {
    visits.filter((v) => v > NOW - 14 * DAY_MS).forEach((v, i) => {
      if (random() < 0.3) return;
      const w = WORKOUTS[Math.floor(random() * WORKOUTS.length)];
      writer.set(adminDb.doc(`workouts/demo-${m.key}-${i}`), {
        memberId: uid, title: w.title, difficulty: w.difficulty,
        duration: `${40 + Math.floor(random() * 4) * 10} mins`, calories: `${250 + Math.floor(random() * 30) * 10} kcal`,
        date: lagosDate(v), exercises: w.exercises.map(([name, sets, reps, weight]) => ({ name, sets: String(sets), reps: String(reps), weight: String(weight) })),
        createdAt: ts(v + 70 * MIN), demo: true,
      });
      counts.workouts += 1;
    });
  }

  writer.set(adminDb.doc(`users/${uid}`), {
    name: m.name, email: account.email, role: 'member', phone: m.phone,
    status: deactivated ? 'disabled' : 'active',
    createdAt: ts(at(m.joined, 11)),
    ...(subscription
      ? { subscription: { plan: subscription.plan, expiresAt: ts(subscription.expiresAt), sessionCredits: subscription.sessionCredits, lastPaymentId: subscription.lastPaymentId, updatedAt: ts(NOW) } }
      : {}),
    ...(deactivated
      ? { statusBeforeDeactivation: 'active', deactivatedAt: ts(at(m.deactivated.daysAgo, 11)), deactivatedBy: recordedBy, deactivationReason: m.deactivated.reason }
      : {}),
    demo: true,
  });
  counts.members += 1;
}

// Bookings: [member, trainer, daysAgo (negative = future), time, status]
const BOOKINGS = [
  ['chiamaka', 'tunde', 12, '07:00', 'completed'], ['emeka', 'tunde', 9, '17:00', 'completed'],
  ['seun', 'demo-trainer', 14, '08:00', 'completed'], ['funmi', 'tunde', 6, '18:00', 'completed'],
  ['ngozi', 'demo-trainer', 4, '07:00', 'completed'], ['yusuf', 'ngozie', 10, '16:00', 'completed'],
  ['demo-member', 'demo-trainer', 7, '08:00', 'completed'],
  ['daniel', 'tunde', 18, '09:00', 'cancelled'], ['funmi', 'demo-trainer', 2, '10:00', 'cancelled'],
  ['chiamaka', 'tunde', -1, '07:00', 'upcoming'], ['emeka', 'demo-trainer', -2, '17:00', 'upcoming'],
  ['aisha', 'tunde', -1, '18:00', 'upcoming'], ['seun', 'ngozie', -3, '09:00', 'upcoming'],
  ['grace', 'demo-trainer', -4, '08:00', 'upcoming'], ['demo-member', 'demo-trainer', -2, '08:00', 'upcoming'],
  ['demo-member', 'tunde', -5, '07:00', 'upcoming'],
];
BOOKINGS.forEach(([mk, tk, daysAgo, time, status], i) => {
  if (!ids[mk] || !ids[tk]) return; // demo log-ins not requested
  const sessionDay = at(daysAgo, 12);
  writer.set(adminDb.doc(`bookings/demo-${i}`), {
    memberId: ids[mk].uid, memberName: ids[mk].name, trainerId: ids[tk].uid, trainerName: ids[tk].name,
    date: lagosDate(sessionDay), time, sessionType: 'Personal Training', status,
    createdAt: ts(Math.min(sessionDay - 3 * DAY_MS, NOW - 60 * MIN)), demo: true,
  });
  counts.bookings += 1;
});

await writer.close();
console.log(
  `✓ ${counts.members} members, ${counts.trainers} trainers (${counts.newAccounts} new log-ins, random passwords), ` +
    `${counts.payments} payments, ${counts.attendance} check-ins, ${counts.bookings} bookings, ${counts.workouts} workouts`,
);
for (const person of [...MEMBERS, ...TRAINERS].filter((p) => p.login)) {
  console.log(`  log in as ${person.name}: ${emailFor(person)} (set the password with Forgot password)`);
}
process.exit(0);
