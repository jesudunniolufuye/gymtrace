// Shared helpers for the API functions. Handlers use plain Node req/res so
// the same code runs on Vercel and in scripts/dev-api.mjs.
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './firebaseAdmin.js';

/** An error whose message is safe to show the user. */
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

const MAX_BODY_BYTES = 16 * 1024;

/** Vercel pre-parses JSON bodies; the local dev server does not. */
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return parse(req.body);
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large.');
  }
  return parse(raw);
}

function parse(raw) {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {
    // fall through
  }
  throw new HttpError(400, 'Request body must be a JSON object.');
}

/**
 * Verifies the Firebase ID token in "Authorization: Bearer <token>", requires
 * a verified email and an existing profile, and optionally a role.
 * Roles come from Firestore on the server, never from the request.
 */
export async function requireUser(req, { roles } = {}) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) throw new HttpError(401, 'You need to be signed in.');

  let token;
  try {
    token = await adminAuth.verifyIdToken(match[1]);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
  if (!token.email_verified) throw new HttpError(403, 'Please verify your email first.');

  const snap = await adminDb.doc(`users/${token.uid}`).get();
  if (!snap.exists) throw new HttpError(403, 'Account profile not found.');
  const profile = snap.data();
  if (roles && !roles.includes(profile.role)) {
    throw new HttpError(403, 'You are not allowed to do this.');
  }
  return { uid: token.uid, token, profile };
}

/** Records unexpected server errors with a timestamp (NFR11). */
export async function logError(route, error, context = {}) {
  console.error(`[api${route}]`, error);
  try {
    await adminDb.collection('errorLogs').add({
      at: FieldValue.serverTimestamp(),
      route,
      message: String(error?.message || error).slice(0, 500),
      stack: String(error?.stack || '').slice(0, 2000),
      ...context,
    });
  } catch (logFailure) {
    console.error('Failed to write errorLogs entry', logFailure);
  }
}

/** Wraps a handler: method check, HttpError → JSON, anything else → logged 500. */
export function apiHandler(route, methods, fn) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        throw new HttpError(405, 'Method not allowed.');
      }
      await fn(req, res);
    } catch (error) {
      if (error instanceof HttpError) {
        send(res, error.status, { error: error.message, ...error.extra });
      } else {
        await logError(route, error);
        send(res, 500, { error: 'Something went wrong on our side. Please try again.' });
      }
    }
  };
}
