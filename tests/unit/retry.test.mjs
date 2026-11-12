import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { retry } from '../../src/lib/retry.js';

const noSleep = () => Promise.resolve();

describe('retry (a single failed profile read stranded people on "Account profile not found")', () => {
  test('returns the first success without retrying', async () => {
    let calls = 0;
    assert.equal(await retry(async () => { calls++; return 'ok'; }, { sleep: noSleep }), 'ok');
    assert.equal(calls, 1);
  });
  test('tries again after a failure', async () => {
    let calls = 0;
    const value = await retry(async () => { if (++calls < 3) throw new Error('blip'); return 'profile'; }, { sleep: noSleep });
    assert.equal(value, 'profile');
    assert.equal(calls, 3);
  });
  test('gives up after the last attempt and reports the error', async () => {
    let calls = 0;
    await assert.rejects(retry(async () => { calls++; throw new Error('down'); }, { attempts: 3, sleep: noSleep }), /down/);
    assert.equal(calls, 3);
  });
  test('a missing profile (null) is an answer, not a failure: no retry', async () => {
    let calls = 0;
    assert.equal(await retry(async () => { calls++; return null; }, { sleep: noSleep }), null);
    assert.equal(calls, 1);
  });
  test('the auth context loads the profile through it', () => {
    assert.match(readFileSync(new URL('../../src/context/AuthContext.jsx', import.meta.url), 'utf8'), /retry\(\(\) => getUserDoc\(firebaseUser\.uid\)\)/);
  });
});
