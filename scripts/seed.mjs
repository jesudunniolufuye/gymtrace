// Creates (or updates) the demo accounts: one admin, one member, one trainer.
// Accounts are marked email-verified so they can log in straight away.
//
// Self-registration can never create an admin (see firestore.rules), so this
// script is the only way the first admin is made.
//
// Usage (real project; ask before running against it):
//   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... \
//   SEED_MEMBER_EMAIL=... SEED_MEMBER_PASSWORD=... \
//   SEED_TRAINER_EMAIL=... SEED_TRAINER_PASSWORD=... \
//   npm run seed
//
// Any account whose email/password pair is missing is skipped.
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../api/_lib/firebaseAdmin.js';

const accounts = [
  { key: 'ADMIN', role: 'admin', name: 'Gym Administrator' },
  { key: 'MEMBER', role: 'member', name: 'Demo Member' },
  { key: 'TRAINER', role: 'trainer', name: 'Demo Trainer', specialty: 'Strength & Conditioning' },
];

async function upsertAccount({ key, role, name, specialty }) {
  const email = process.env[`SEED_${key}_EMAIL`];
  const password = process.env[`SEED_${key}_PASSWORD`];
  if (!email || !password) {
    console.log(`- skip ${role}: SEED_${key}_EMAIL / SEED_${key}_PASSWORD not set`);
    return;
  }

  let user;
  try {
    user = await adminAuth.getUserByEmail(email);
    user = await adminAuth.updateUser(user.uid, { password, emailVerified: true, displayName: name });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    user = await adminAuth.createUser({ email, password, emailVerified: true, displayName: name });
  }

  const ref = adminDb.doc(`users/${user.uid}`);
  const existing = await ref.get();
  await ref.set(
    {
      name,
      email: user.email,
      role,
      status: 'active',
      phone: existing.get('phone') ?? '',
      ...(specialty ? { specialty } : {}),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  console.log(`✓ ${role.padEnd(7)} ${user.email} (uid ${user.uid})`);
}

for (const account of accounts) {
  await upsertAccount(account);
}
process.exit(0);
