import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

// Source-level guards for the refinement pass (docs/REFINEMENT-FINDINGS.md).
// There is no browser in the unit suite, so these pin the things that were
// fixed: dead buttons, misleading wording and missing accessible names.
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

describe('dead UI removed', () => {
  test('member profile has no do-nothing camera button (R2)', () => {
    assert.doesNotMatch(read('src/pages/member/ProfilePage.jsx'), /Camera/);
  });
  test('attendance has no permanently disabled Previous/Next (R3)', () => {
    assert.doesNotMatch(read('src/pages/member/AttendancePage.jsx'), />Previous<|>Next</);
  });
  test('booking filter chips are no longer a hard-coded list (R4)', () => {
    const src = read('src/pages/member/BookingPage.jsx');
    assert.doesNotMatch(src, /Bodybuilding|CrossFit|Powerlifting/);
    assert.match(src, /specialtyOptions\(trainers\)/);
  });
});

describe('wording no longer promises things the app does not do', () => {
  const cases = [
    ['src/pages/trainer/SchedulePage.jsx', /classes/i, 'R11'],
    ['src/pages/trainer/ClientsPage.jsx', /assigned/i, 'R12'],
    ['src/pages/admin/TrainersPage.jsx', /their schedules/i, 'R14'],
    ['src/pages/member/WorkoutsPage.jsx', /streak/i, 'R10'],
    ['src/pages/member/MemberDashboard.jsx', /Target Plan|Generate Qr/, 'R6/R8'],
  ];
  for (const [file, bad, id] of cases) {
    test(`${file} (${id})`, () => assert.doesNotMatch(read(file), bad));
  }
  test('the staff guide and demo script use the on-screen label "Generate QR"', () => {
    assert.doesNotMatch(read('docs/staff-guide.md') + read('docs/DEMO-SCRIPT.md'), /Generate Qr/);
  });
  test('admin settings say the general details are not shown anywhere yet (R5)', () => {
    assert.match(read('src/pages/admin/SettingsPage.jsx'), /doesn't show them anywhere else yet/);
  });
});

describe('accessibility basics', () => {
  test('every layout has a sign-out control that is a real button or has role=button and a name (R17)', () => {
    for (const f of ['member', 'trainer', 'admin']) {
      const src = read(`src/pages/${f}/layout/${f[0].toUpperCase()}${f.slice(1)}Layout.jsx`);
      assert.match(src, /aria-label="Sign out"/, f);
      assert.doesNotMatch(src, /<LogOut[^>]*onClick/, `${f}: icon with a bare click handler`);
    }
  });
  test('a trainer on a phone can sign out: the mobile header has the button (R26)', () => {
    const src = read('src/pages/trainer/layout/TrainerLayout.jsx');
    assert.ok((src.match(/aria-label="Sign out"/g) ?? []).length >= 2);
  });
  test('profile form labels are linked to their inputs (R18)', () => {
    const src = read('src/pages/member/ProfilePage.jsx');
    for (const id of ['profile-name', 'profile-email', 'profile-phone']) {
      assert.ok(src.includes(`htmlFor="${id}"`) && src.includes(`id="${id}"`), id);
    }
  });
  test('schedule week buttons are named (R17)', () => {
    const src = read('src/pages/trainer/SchedulePage.jsx');
    assert.match(src, /aria-label="Previous week"/);
    assert.match(src, /aria-label="Next week"/);
  });
  test('every auth form label is linked to its input (R18)', () => {
    for (const f of ['auth/LoginPage', 'auth/RegisterPage', 'auth/ForgotPasswordPage', 'admin/AdminLoginPage']) {
      const src = read(`src/pages/${f}.jsx`);
      const labels = (src.match(/<label htmlFor="auth-/g) ?? []).length;
      const ids = (src.match(/id="auth-/g) ?? []).length;
      assert.ok(labels > 0 && labels === ids, `${f}: ${labels} labels, ${ids} ids`);
    }
  });
});

describe('layout fixes', () => {
  test('reports tabs fit a phone (R1)', () => {
    const src = read('src/pages/admin/ReportsPage.jsx');
    assert.match(src, /px-2 sm:px-6/);
    assert.match(src, /overflow-x-auto/);
  });
  test('long names wrap in the members table, initials use whole characters (R16)', () => {
    const src = read('src/pages/admin/MembersPage.jsx');
    assert.match(src, /break-words">\{member\.name\}/);
    assert.match(src, /initialsOf\(member\.name\)/);
  });
  test('trainer upcoming lists are sorted soonest first (R13)', () => {
    assert.match(read('src/pages/trainer/SessionsPage.jsx'), /sort\(compareSessionsAsc\)/);
    assert.match(read('src/pages/trainer/TrainerDashboard.jsx'), /sort\(compareSessionsAsc\)/);
  });
  test('the dashboard shows the next booking as "Wed 4 Nov", not an ISO date (R7)', () => {
    assert.match(read('src/pages/member/MemberDashboard.jsx'), /formatSessionDate\(nextBooking\.date\)/);
  });
});

describe('actions are not hidden behind mouse hover (invisible on phones and tablets)', () => {
  test('no button in the app is opacity-0 until hover', () => {
    for (const f of ['src/pages/trainer/SessionsPage.jsx', 'src/pages/member/WorkoutsPage.jsx', 'src/pages/trainer/SchedulePage.jsx']) {
      assert.doesNotMatch(read(f), /opacity-0 group-hover:opacity-100/, f);
    }
  });
  test('trainer Cancel asks once more before cancelling', () => {
    const src = read('src/pages/trainer/SessionsPage.jsx');
    assert.match(src, /Yes, cancel/);
    assert.match(src, /setConfirmCancelId\(session\.id\)/);
  });
  test('empty schedule slots do not pretend to be clickable', () => {
    assert.doesNotMatch(read('src/pages/trainer/SchedulePage.jsx'), /cursor-pointer/);
  });
});
