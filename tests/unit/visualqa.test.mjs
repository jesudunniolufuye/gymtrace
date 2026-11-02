import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

// Source-level guards for the visual QA pass (docs/VISUAL-QA.md). There is no browser in the unit
// suite, so these pin the classes that fixed each bug (each was measured in Chrome at 375, 768,
// 1024, 1440 and 1920 px before and after).
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

describe('visual QA fixes', () => {
  test('V1: the opaque logo is never run through brightness-0/invert (it turned into a white square)', () => {
    for (const f of walk(new URL('../../src', import.meta.url).pathname).filter((x) => x.endsWith('.jsx'))) {
      assert.doesNotMatch(readFileSync(f, 'utf8'), /brightness-0[^"]*invert|invert[^"]*brightness-0/, f);
    }
  });
  test('V2: member profile stays single-column until desktop width', () => {
    const src = read('src/pages/member/ProfilePage.jsx');
    assert.match(src, /grid-cols-1 lg:grid-cols-3/);
    assert.doesNotMatch(src, /md:grid-cols-3|md:col-span-2/);
  });
  test('V3: admin dashboard four-up cards and the chart/activity split start at xl, not lg', () => {
    const src = read('src/pages/admin/AdminDashboard.jsx');
    assert.match(src, /md:grid-cols-2 xl:grid-cols-4/);
    assert.match(src, /grid-cols-1 xl:grid-cols-3/);
    assert.doesNotMatch(src, /lg:grid-cols-4|lg:grid-cols-3/);
  });
  test('V4: member dashboard has three stat cards, so a three-column grid', () => {
    const src = read('src/pages/member/MemberDashboard.jsx');
    assert.match(src, /md:grid-cols-2 lg:grid-cols-3 gap-6/);
    assert.doesNotMatch(src, /lg:grid-cols-4/);
  });
  test('V5: the log-workout modal fits a phone (exercise row wraps; fields stack)', () => {
    const src = read('src/pages/member/WorkoutsPage.jsx');
    assert.match(src, /flex flex-wrap items-center gap-2/);
    assert.match(src, /w-full sm:w-auto sm:flex-1 min-w-0/);
    assert.match(src, /grid grid-cols-2 sm:grid-cols-3 gap-3/);
    assert.match(src, /col-span-2 sm:col-span-1/);
  });
  test('V6: on short desktop screens the hero mock drops its third card instead of cutting it in half', () => {
    assert.match(read('src/pages/public/components/HeroSection.jsx'), /lg:\[@media\(max-height:820px\)\]:hidden/);
  });
  test('V7: register checkbox lines up with the first line of its text', () => {
    assert.match(read('src/pages/auth/RegisterPage.jsx'), /flex items-start space-x-3">\s*<input[^>]*\s*type="checkbox"[\s\S]*?shrink-0/);
  });
  test('V8: admin mobile bottom nav shares the width evenly so labels are not truncated', () => {
    const src = read('src/pages/admin/layout/AdminLayout.jsx');
    assert.match(src, /px-0 py-1 rounded-xl flex-1 min-w-0/);
    assert.doesNotMatch(src, /min-w-\[50px\]/);
  });
});

describe('visual QA: empty messages inside wide tables stay visible on a phone (V9)', () => {
  for (const f of ['src/pages/trainer/SessionsPage.jsx', 'src/pages/member/PaymentPage.jsx', 'src/pages/member/AttendancePage.jsx']) {
    test(f, () => assert.match(read(f), /sticky left-4 w-\[min\(20rem,calc\(100vw-5rem\)\)\] md:static md:w-auto/));
  }
});
