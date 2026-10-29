import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { planSummary } from '../../src/lib/subscription.js';

const NOW = Date.UTC(2026, 9, 29, 10, 0);
const DAY = 24 * 60 * 60 * 1000;

describe('planSummary (QA F1: profile and sidebar showed "Premium" for everyone)', () => {
  test('no subscription → No active plan', () => {
    const s = planSummary(undefined, NOW);
    assert.equal(s.active, false);
    assert.equal(s.label, 'No active plan');
    assert.equal(s.detail, 'No active plan');
  });
  test('active monthly → plan name and the real expiry', () => {
    const s = planSummary({ plan: 'monthly', expiresAt: NOW + 10 * DAY }, NOW);
    assert.equal(s.active, true);
    assert.equal(s.label, 'Monthly Membership');
    assert.match(s.detail, /valid until/);
    assert.match(s.detail, /2026/);
  });
  test('expired monthly → not active, says expired', () => {
    const s = planSummary({ plan: 'monthly', expiresAt: NOW - DAY }, NOW);
    assert.equal(s.active, false);
    assert.equal(s.label, 'No active plan');
    assert.match(s.detail, /expired/);
  });
  test('day pass with an entry left', () => {
    const s = planSummary({ plan: 'session', expiresAt: NOW + 3600_000, sessionCredits: 1 }, NOW);
    assert.equal(s.label, 'Day Pass');
  });
});

describe('member screens carry no hardcoded plan text (QA F1)', () => {
  for (const file of ['src/pages/member/ProfilePage.jsx', 'src/pages/member/layout/MemberLayout.jsx']) {
    test(file, () => {
      const src = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
      assert.doesNotMatch(src, /Premium/);
      assert.doesNotMatch(src, /Dec 31, 2024/);
    });
  }
});
