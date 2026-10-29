// Creates (or updates) the demo/first accounts: admin, member, trainer.
// Accounts are marked email-verified so they can log in straight away.
//
// Self-registration can never create an admin (see firestore.rules), so this
// script is how the first admin of each project is made.
//
// Passwords:
//   SEED_<ROLE>_PASSWORD=<password>  use this password
//   SEED_<ROLE>_PASSWORD=random      long random password that is never shown;
//                                    the person sets their own with "Forgot
//                                    password". An existing account's password
//                                    is left unchanged in this mode.
//
// Real projects (not the emulator) also need SEED_PROJECT=<project id>, which
// must match the service account, so the wrong key can't be used by mistake:
//   GOOGLE_APPLICATION_CREDENTIALS=~/secrets/gymtrace-staging-sa.json \
//   SEED_PROJECT=gymtrace-staging SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=random \
//   npm run seed
//
// Any role whose email/password pair is missing is skipped.
import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, adminProjectId, usingEmulator } from '../api/_lib/firebaseAdmin.js';

if (!usingEmulator && process.env.SEED_PROJECT !== adminProjectId) {
  console.error(
    `Refusing to seed: credentials are for "${adminProjectId}" but SEED_PROJECT is "${process.env.SEED_PROJECT ?? ''}".`,
  );
  process.exit(2);
}
console.log(`Seeding ${usingEmulator ? 'the local emulator' : `project ${adminProjectId}`}`);

const accounts = [
  { key: 'ADMIN', role: 'admin', name: 'Gym Administrator' },
  { key: 'MEMBER', role: 'member', name: 'Demo Member' },
  { key: 'TRAINER', role: 'trainer', name: 'Demo Trainer', specialty: 'Strength & Conditioning' },
];

async function upsertAccount({ key, role, name, specialty }) {
  const email = process.env[`SEED_${key}_EMAIL`]?.trim().toLowerCase();
  const passwordSetting = process.env[`SEED_${key}_PASSWORD`];
  if (!email || !passwordSetting) {
    console.log(`- skip ${role}: SEED_${key}_EMAIL / SEED_${key}_PASSWORD not set`);
    return;
  }
  const randomMode = passwordSetting === 'random';

  let user;
  let created = false;
  try {
    user = await adminAuth.getUserByEmail(email);
    user = await adminAuth.updateUser(user.uid, {
      emailVerified: true,
      displayName: user.displayName || name,
      ...(randomMode ? {} : { password: passwordSetting }),
    });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    const password = randomMode ? randomBytes(32).toString('base64url') : passwordSetting;
    user = await adminAuth.createUser({ email, password, emailVerified: true, displayName: name });
    created = true;
  }

  const ref = adminDb.doc(`users/${user.uid}`);
  const existing = await ref.get();
  await ref.set(
    {
      name: existing.get('name') ?? name,
      email: user.email,
      role,
      status: 'active',
      phone: existing.get('phone') ?? '',
      ...(specialty ? { specialty } : {}),
      ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const passwordNote = randomMode
    ? created ? 'random password (use Forgot password to set one)' : 'password unchanged'
    : 'password set';
  console.log(`✓ ${role.padEnd(7)} ${user.email} (${created ? 'created' : 'updated'}, ${passwordNote})`);
}

for (const account of accounts) {
  await upsertAccount(account);
}
process.exit(0);
