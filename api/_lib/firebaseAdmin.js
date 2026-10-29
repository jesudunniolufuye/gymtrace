// Server-side Firebase (firebase-admin). Used by the Vercel API functions
// and by scripts/seed.mjs. Never import this from src/ (browser code).
//
// Credentials, in order of preference:
//   1. FIREBASE_SERVICE_ACCOUNT  - the service-account JSON pasted as one env var (Vercel)
//   2. GOOGLE_APPLICATION_CREDENTIALS - path to the JSON file (local scripts)
// With FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST set, the SDK
// talks to the local emulators instead and needs no credentials.
import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function init() {
  if (getApps().length) return getApps()[0];

  const usingEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (usingEmulator) {
    return initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-gymtrace' });
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
  }

  throw new Error('No Firebase admin credentials: set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.');
}

const app = init();
/** Which project we are talking to (never a secret). */
export const adminProjectId = app.options.projectId;
export const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
