import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { validateName } from '../../shared/name.js';

describe('validateName (QA F7)', () => {
  test('normal names pass, and are trimmed', () => {
    assert.deepEqual(validateName('  Tolu Martins '), { ok: true, value: 'Tolu Martins', message: '' });
  });
  test('whitespace-only and one-character names are refused with a message', () => {
    for (const bad of ['', '  ', 'A', ' A ', null, undefined]) {
      const r = validateName(bad);
      assert.equal(r.ok, false, String(bad));
      assert.match(r.message, /at least 2/);
    }
  });
  test('81+ characters refused with a message; exactly 80 passes', () => {
    assert.equal(validateName('x'.repeat(80)).ok, true);
    const r = validateName('x'.repeat(81));
    assert.equal(r.ok, false);
    assert.match(r.message, /80 characters or fewer/);
  });
  test('agrees with the 2..80 limits in firestore.rules', async () => {
    const { readFileSync } = await import('node:fs');
    const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
    assert.match(rules, /v\.size\(\) >= 2 && v\.size\(\) <= 80/);
  });
});
