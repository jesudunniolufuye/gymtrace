import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('reviewer guide: /guide page, docs/REVIEWER-GUIDE.md and footer stay in step', () => {
  const page = read('src/pages/public/GuidePage.jsx');
  const doc = read('docs/REVIEWER-GUIDE.md');
  const emails = ['molufuye420+reviewer@gmail.com', 'molufuye420+demomember@gmail.com', 'molufuye420+demotrainer@gmail.com'];

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

describe('reviewer emails and mailbox independence', () => {
  const guideFiles = ['docs/REVIEWER-GUIDE.md', 'src/pages/public/GuidePage.jsx'];
  test('docs, guide page and seed notes name the molufuye420 addresses, not the jolufuye mailbox', () => {
    for (const f of [...guideFiles, 'docs/DEMO-SCRIPT.md', 'scripts/seed-demo.mjs']) {
      assert.doesNotMatch(read(f), /jolufuye/, f);
    }
  });
  test('the reviewer guide never needs the developer\'s mailbox: no Forgot password, no reset emails', () => {
    for (const f of guideFiles) {
      const src = read(f).replace(/^\s*\/\/.*$/gm, '');
      assert.doesNotMatch(src, /forgot|password reset|reset (email|link)|set a password/i, f);
      assert.match(src, /credentials you were sent/, f);
    }
  });
  test('the register step says the verification email goes to the tester\'s own address', () => {
    for (const f of guideFiles) assert.match(read(f), /your own email address/, f);
    for (const f of guideFiles) assert.match(read(f), /not to the developer/, f);
  });
  test('the landing page tells visitors to do nothing that needs the developer\'s mailbox', () => {
    const landing = ['HeroSection', 'FeaturesSection', 'CTASection', 'Navbar'].map((c) => read(`src/pages/public/components/${c}.jsx`)).join('\n');
    assert.doesNotMatch(landing, /forgot password|check your inbox|spam/i);
  });
});

describe('landing page stays honest about being a demo project', () => {
  const files = [
    'src/pages/public/components/HeroSection.jsx',
    'src/pages/public/components/FeaturesSection.jsx',
    'src/pages/public/components/CTASection.jsx',
    'src/pages/public/components/Footer.jsx',
    'src/pages/public/components/Navbar.jsx',
  ];
  const text = files.map(read).join('\n');

  test('no claims of adoption, ratings, partners or features that do not exist', () => {
    for (const bad of [/thousands/i, /trusted by/i, /testimonial/i, /\d[\d,]*\+? (members|users|gyms)/i, /live occupancy/i,
      /real-time/i, /pravatar/i, /Alex Johnson/, /Yoga Flow/, /award/i, /rated|rating/i]) {
      assert.doesNotMatch(text, bad, String(bad));
    }
  });
  test('no dead # links, and no links to pages that do not exist', () => {
    assert.doesNotMatch(text, /(href|to)="#"/);
    for (const dead of ['Careers', 'Testimonials', 'Pricing', 'Blog', 'Contact', 'About Us']) assert.ok(!text.includes(dead), dead);
  });
  test('says it is a demo, and links to the guide, register and log in', () => {
    assert.match(text, /Demo project built for Babcock University Fitness Centre/);
    for (const to of ['/guide', '/register', '/login']) assert.ok(text.includes(`to="${to}"`), to);
  });
  test('nothing public refers to files or repositories a visitor cannot open', () => {
    const publicSrc = [...files, 'src/pages/public/GuidePage.jsx', 'src/pages/public/PrivacyPage.jsx'].map(read).join('\n');
    assert.doesNotMatch(publicSrc.replace(/^\s*\/\/.*$/gm, ''), /github\.com|docs\/|PROJECT-REPORT|\.md\b|claude|anthropic/i);
  });
});
