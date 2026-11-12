import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { HELP_SECTIONS, HELP_TOPICS } from '../../src/content/helpContent.js';
import { searchHelp, tokenize } from '../../src/lib/helpSearch.js';
import { renderManual } from '../../scripts/build-manual.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const top = (q, audience) => searchHelp(HELP_TOPICS, q, audience)[0]?.id;

describe('help content', () => {
  test('every topic has a unique id, a question and an answer', () => {
    const ids = HELP_TOPICS.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const t of HELP_TOPICS) {
      assert.ok(t.q.length > 5, t.id);
      assert.ok((t.a?.length ?? 0) + (t.steps?.length ?? 0) > 0, t.id);
    }
  });
  test('covers members, trainers and front-desk staff', () => {
    assert.deepEqual(HELP_SECTIONS.map((s) => s.audience), ['everyone', 'member', 'trainer', 'staff']);
  });
  test('prices come from the shared plan rules, not typed by hand', () => {
    const text = JSON.stringify(HELP_SECTIONS);
    assert.match(text, /₦25,000/);
    assert.match(text, /₦500/);
    assert.match(read('src/content/helpContent.js'), /PLANS\.monthly\.amount/);
  });
  test('bold markers are balanced (the page splits on **)', () => {
    for (const t of HELP_TOPICS) for (const line of [...(t.a ?? []), ...(t.steps ?? [])]) {
      assert.equal((line.match(/\*\*/g) ?? []).length % 2, 0, `${t.id}: ${line}`);
    }
  });
  test('does not point readers at things they cannot open, or name a hosting address', () => {
    const text = JSON.stringify(HELP_SECTIONS);
    assert.doesNotMatch(text, /github|docs\/|\.md\b|vercel\.app|claude|anthropic/i);
  });
});

describe('docs/USER-MANUAL.md', () => {
  test('is up to date with the help content (run `npm run manual` after editing)', () => {
    assert.equal(read('docs/USER-MANUAL.md'), renderManual());
  });
});

describe('help search', () => {
  const cases = [
    ['forgot my password', 'forgot-password'],
    ['I cant log in', 'log-in'],
    ["didn't get the email", 'verification-email'],
    ['how much does it cost', 'plans-prices'],
    ['how do i pay', 'how-to-pay'],
    ['qr code not loading', 'qr-not-loading'],
    ['qr code not working', 'qr-not-loading'],
    ['no gym access', 'no-gym-access'],
    ['cancel my booking', 'cancel-booking'],
    ['book a coach', 'book-trainer'],
    ['where is my receipt', 'receipts'],
    ['log a workout', 'workouts'],
    ['sign out', 'log-out'],
    ['trainer not showing', 'trainer-approval'],
    ['pause bookings', 'trainer-availability'],
    ['record payment', 'record-payment'],
    ['wrong payment', 'payment-mistake'],
    ['phone is dead', 'manual-check-in'],
    ['already checked in', 'scanner-messages'],
    ['deactivate member', 'deactivate-account'],
    ['end of day', 'end-of-day'],
  ];
  for (const [q, id] of cases) test(`"${q}" finds ${id}`, () => assert.equal(top(q), id));

  test('empty search returns everything in manual order', () => {
    assert.deepEqual(searchHelp(HELP_TOPICS, '   ').map((t) => t.id), HELP_TOPICS.map((t) => t.id));
  });
  test('nonsense finds nothing', () => assert.deepEqual(searchHelp(HELP_TOPICS, 'xyzzy plugh'), []));
  test('audience filter keeps that audience plus the topics for everyone', () => {
    const member = searchHelp(HELP_TOPICS, '', 'member');
    assert.ok(member.every((t) => ['member', 'everyone'].includes(t.audience)));
    assert.ok(member.some((t) => t.id === 'forgot-password'));
    assert.equal(top('receipt', 'staff'), 'print-receipt');
    assert.equal(top('receipt', 'member'), 'receipts');
  });
  test('handles plurals, endings and punctuation', () => {
    assert.deepEqual(tokenize('Bookings!'), tokenize('booking'));
    assert.deepEqual(tokenize('log in'), tokenize('login'));
    assert.deepEqual(tokenize("can't sign-out?"), tokenize('signout'));
  });
});

describe('help page is wired in', () => {
  test('route, footer and login page link to /help', () => {
    assert.match(read('src/App.jsx'), /path="\/help"/);
    assert.match(read('src/pages/public/components/Footer.jsx'), /to="\/help"/);
    assert.match(read('src/pages/auth/LoginPage.jsx'), /to="\/help"/);
  });
  test('every signed-in layout links to Help, on desktop and on phones', () => {
    for (const f of ['member/layout/MemberLayout', 'trainer/layout/TrainerLayout', 'admin/layout/AdminLayout']) {
      const src = read(`src/pages/${f}.jsx`);
      assert.ok((src.match(/to="\/help"/g) ?? []).length >= 2, f);
      assert.match(src, /aria-label="Help"/, f);
    }
  });
  test('a member on a phone can reach My Profile (and so Sign Out) from the header', () => {
    const src = read('src/pages/member/layout/MemberLayout.jsx');
    assert.ok((src.match(/to="\/member\/profile"/g) ?? []).length >= 2);
    assert.match(src, /aria-label="My profile"/);
  });
});
