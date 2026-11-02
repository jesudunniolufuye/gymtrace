import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// Landing hero layout. There is no browser in the unit suite, so these pin the
// classes that fixed the visual bugs (measured in Chrome at 1920x1080, 1440x900,
// 1024x768, 768x1024 and 375x812 when they were fixed).
const src = readFileSync(new URL('../../src/pages/public/components/HeroSection.jsx', import.meta.url), 'utf8');

describe('landing hero layout', () => {
  test('the phone greeting header takes its height from its content (a fixed h-24 cut off "Demo Member")', () => {
    assert.doesNotMatch(src, /h-24 bg-primary rounded-b/);
    assert.match(src, /shrink-0 bg-primary rounded-b-\[2rem\]/);
  });
  test('the phone screen fills the phone instead of a fixed 272x572 box, so it can follow the screen height', () => {
    assert.doesNotMatch(src, /w-\[272px\] h-\[572px\]/);
    assert.match(src, /lg:h-\[min\(600px,calc\(100svh-16rem\)\)\]/);
  });
  test('on desktop the hero is one screen tall with the content centred, not padded down by 12rem', () => {
    assert.doesNotMatch(src, /lg:pt-48|lg:pb-32/);
    assert.match(src, /lg:min-h-svh lg:flex lg:items-center/);
    assert.match(src, /container mx-auto w-full max-w-6xl/);
  });
  test('the phone and its caption are centred in their column', () => {
    assert.doesNotMatch(src, /lg:items-end|lg:justify-end/);
    assert.match(src, /relative flex flex-col items-center">/);
    assert.match(src, /mt-4 text-center text-xs text-gray-500">Illustration with example data/);
  });
  test('the honesty wording is untouched', () => {
    for (const t of ['Demo project built for Babcock University Fitness Centre', 'Demo Member', 'Illustration with example data', 'Example']) {
      assert.ok(src.includes(t), t);
    }
  });
});
