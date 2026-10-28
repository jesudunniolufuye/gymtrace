// Signed, short-lived QR tokens for gym entry (FR8, FR9, FR12).
//
// Format: GT1.<payload>.<signature>
//   payload   = base64url JSON { u: member uid, n: one-time nonce, i: issued ms, e: expires ms }
//   signature = base64url HMAC-SHA256("GT1.<payload>") with QR_SIGNING_SECRET
//
// Only the server knows the secret, so a member cannot forge a code or
// extend its expiry. Each nonce is accepted once (see api/check-in.js).
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const VERSION = 'GT1';
export const QR_TTL_MS = 60 * 1000;
const MAX_TOKEN_LENGTH = 512;

export function getQrSecret() {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('QR_SIGNING_SECRET is missing or shorter than 32 characters.');
  }
  return secret;
}

const hmac = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

export function signQrToken({
  uid,
  nowMs = Date.now(),
  ttlMs = QR_TTL_MS,
  secret = getQrSecret(),
  nonce = randomBytes(12).toString('base64url'),
}) {
  const payload = Buffer.from(JSON.stringify({ u: uid, n: nonce, i: nowMs, e: nowMs + ttlMs })).toString('base64url');
  const data = `${VERSION}.${payload}`;
  return { token: `${data}.${hmac(data, secret)}`, expiresAt: nowMs + ttlMs, nonce };
}

/**
 * Returns { ok: true, uid, nonce, issuedAt, expiresAt } or
 * { ok: false, reason: 'malformed' | 'bad-signature' | 'expired' }.
 */
export function verifyQrToken(token, { nowMs = Date.now(), secret = getQrSecret() } = {}) {
  const fail = (reason) => ({ ok: false, reason });
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) return fail('malformed');

  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== VERSION || !parts[1] || !parts[2]) return fail('malformed');

  // Check the signature before trusting anything in the payload.
  const expected = Buffer.from(hmac(`${parts[0]}.${parts[1]}`, secret));
  const given = Buffer.from(parts[2]);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return fail('bad-signature');

  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return fail('malformed');
  }
  const { u, n, i, e } = payload ?? {};
  if (typeof u !== 'string' || !u || typeof n !== 'string' || !n || !Number.isFinite(i) || !Number.isFinite(e)) {
    return fail('malformed');
  }
  if (e <= nowMs) return fail('expired');
  return { ok: true, uid: u, nonce: n, issuedAt: i, expiresAt: e };
}
