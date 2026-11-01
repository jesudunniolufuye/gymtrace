import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('reviewer guide: /guide page, docs/REVIEWER-GUIDE.md and footer stay in step', () => {
  const page = read('src/pages/public/GuidePage.jsx');
  const doc = read('docs/REVIEWER-GUIDE.md');
  const emails = ['jolufuye@gmail.com', 'jolufuye+demomember@gmail.com', 'jolufuye+demotrainer@gmail.com'];

  test('the three logins appear in both the page and the markdown guide', () => {
    for (const e of emails) {
      assert.ok(page.includes(e), `page: ${e}`);
      assert.ok(doc.includes(e), `doc: ${e}`);
    }
  });
  test('guide does not include any password', () => {
    assert.doesNotMatch(doc, /password\s*[:=]\s*\S/i);
    assert.doesNotMatch(page, /password\s*[:=]\s*['"]/i);
  });
  test('route /guide is registered and linked from the footer', () => {
    assert.match(read('src/App.jsx'), /path="\/guide"/);
    assert.match(read('src/pages/public/components/Footer.jsx'), /to="\/guide"/);
  });
  test('the tour has the six steps (a) to (f) in both places', () => {
    for (const step of ['(a)', '(b)', '(c)', '(d)', '(e)', '(f)']) {
      assert.ok(page.includes(step), `page ${step}`);
      assert.ok(doc.includes(step), `doc ${step}`);
    }
  });
});

describe('no stale reviewer emails (the old +alias addresses were replaced)', () => {
  test('docs, guide page and seed notes name the current reviewer mailbox only', () => {
    for (const f of ['docs/REVIEWER-GUIDE.md', 'docs/DEMO-SCRIPT.md', 'src/pages/public/GuidePage.jsx', 'scripts/seed-demo.mjs']) {
      assert.doesNotMatch(read(f), /molufuye420\+(reviewer|demomember|demotrainer)@/, f);
    }
  });
});
