import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// The scanner result card showed long emails and names off the edge of a
// 375px phone, and the result panel overflowed its fixed 16:9 box. There is no
// browser in the unit tests, so this guards the classes that fixed it.
const src = readFileSync(new URL('../../src/pages/admin/ScannerPage.jsx', import.meta.url), 'utf8');

describe('admin scanner page layout on a phone', () => {
  test('long emails and names wrap', () => {
    assert.match(src, /break-all">\{result\.member\.email\}/);
    assert.match(src, /break-words">\{result\.member\.name\}/);
  });
  test('grid columns and the card text can shrink (min-w-0)', () => {
    assert.ok((src.match(/min-w-0/g) ?? []).length >= 5);
  });
  test('the 16:9 ratio applies to the camera only, not to the result panel', () => {
    assert.match(src, /\$\{result \? '' : 'aspect-video'\}/);
    assert.doesNotMatch(src, /relative aspect-video/);
  });
});
