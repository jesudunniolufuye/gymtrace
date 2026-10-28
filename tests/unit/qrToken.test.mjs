import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, test } from 'node:test';
import { QR_TTL_MS, getQrSecret, signQrToken, verifyQrToken } from '../../api/_lib/qrToken.js';

const SECRET = 'unit-test-secret-0123456789abcdefghij';
const NOW = Date.UTC(2026, 9, 29, 10, 0);
const sign = (opts = {}) => signQrToken({ uid: 'member123', nowMs: NOW, secret: SECRET, ...opts });

describe('QR tokens', () => {
  test('a fresh token verifies and carries the member id', () => {
    const { token, expiresAt } = sign();
    const v = verifyQrToken(token, { nowMs: NOW + 1000, secret: SECRET });
    assert.equal(v.ok, true);
    assert.equal(v.uid, 'member123');
    assert.equal(v.expiresAt, NOW + QR_TTL_MS);
    assert.equal(expiresAt, NOW + QR_TTL_MS);
    assert.match(token, /^GT1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });
  test('expires after 60 seconds (TC2 step 3: old screenshot)', () => {
    const { token } = sign();
    assert.equal(verifyQrToken(token, { nowMs: NOW + QR_TTL_MS - 1, secret: SECRET }).ok, true);
    assert.deepEqual(verifyQrToken(token, { nowMs: NOW + QR_TTL_MS, secret: SECRET }), { ok: false, reason: 'expired' });
    assert.equal(verifyQrToken(token, { nowMs: NOW + 24 * 3600e3, secret: SECRET }).reason, 'expired');
  });
  test('every token has a different nonce', () => {
    const a = verifyQrToken(sign().token, { nowMs: NOW, secret: SECRET });
    const b = verifyQrToken(sign().token, { nowMs: NOW, secret: SECRET });
    assert.notEqual(a.nonce, b.nonce);
  });
  test('changing the member id or expiry breaks the signature', () => {
    const { token } = sign();
    const [v, payload, sig] = token.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    for (const forged of [{ ...data, u: 'someoneElse' }, { ...data, e: data.e + 3600e3 }]) {
      const p2 = Buffer.from(JSON.stringify(forged)).toString('base64url');
      assert.equal(verifyQrToken(`${v}.${p2}.${sig}`, { nowMs: NOW, secret: SECRET }).reason, 'bad-signature');
    }
  });
  test('a token signed with another secret is rejected', () => {
    const { token } = sign({ secret: 'attacker-secret-0123456789abcdefghijkl' });
    assert.equal(verifyQrToken(token, { nowMs: NOW, secret: SECRET }).reason, 'bad-signature');
  });
  test('old-style unsigned JSON QR and junk are rejected', () => {
    for (const junk of ['{"userId":"member123","timestamp":1}', 'member123', '', 'GT1..', 'GT2.a.b', 'GT1.a.b.c', null, 42, 'x'.repeat(600)]) {
      assert.equal(verifyQrToken(junk, { nowMs: NOW, secret: SECRET }).ok, false, String(junk).slice(0, 30));
    }
  });
  test('a signed but malformed payload is rejected', () => {
    // Craft a correctly signed payload missing fields.
    const payload = Buffer.from(JSON.stringify({ u: 'x' })).toString('base64url');
    const sig = createHmac('sha256', SECRET).update(`GT1.${payload}`).digest('base64url');
    assert.equal(verifyQrToken(`GT1.${payload}.${sig}`, { nowMs: NOW, secret: SECRET }).reason, 'malformed');
  });
  test('secret must be configured and at least 32 characters', () => {
    const saved = process.env.QR_SIGNING_SECRET;
    process.env.QR_SIGNING_SECRET = 'short';
    assert.throws(() => getQrSecret(), /QR_SIGNING_SECRET/);
    delete process.env.QR_SIGNING_SECRET;
    assert.throws(() => getQrSecret(), /QR_SIGNING_SECRET/);
    if (saved !== undefined) process.env.QR_SIGNING_SECRET = saved;
  });
});
