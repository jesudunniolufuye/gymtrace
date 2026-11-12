import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { compareSessionsAsc, formatSessionDate, initialsOf, specialtyOptions } from '../../src/lib/display.js';

describe('initialsOf (QA F8: emoji initials were a broken character)', () => {
  test('normal names', () => {
    assert.equal(initialsOf('Tolu Martins'), 'TM');
    assert.equal(initialsOf('  bisi   lawal  adeyemi '), 'BL');
    assert.equal(initialsOf('Madonna'), 'M');
  });
  test('whole characters, never half an emoji', () => {
    assert.equal(initialsOf('😀 Smile'), '😀S');
    assert.equal(initialsOf('😀'), '😀');
    assert.equal(initialsOf('ñandú Ürümqi'), 'ÑÜ');
  });
  test('empty and missing names', () => {
    for (const v of ['', '   ', null, undefined]) assert.equal(initialsOf(v), '?');
  });
});

describe('formatSessionDate', () => {
  test('reads like the rest of the app, not as an ISO date', () => {
    assert.equal(formatSessionDate('2026-11-04'), 'Wed 4 Nov');
  });
});

describe('compareSessionsAsc (trainer "Upcoming" lists were in creation order)', () => {
  test('soonest first, by date then time', () => {
    const list = [
      { id: 'a', date: '2026-11-06', time: '08:00' },
      { id: 'b', date: '2026-11-04', time: '17:00' },
      { id: 'c', date: '2026-11-04', time: '08:00' },
    ];
    assert.deepEqual(list.sort(compareSessionsAsc).map((s) => s.id), ['c', 'b', 'a']);
  });
  test('tolerates missing fields', () => {
    assert.doesNotThrow(() => [{ date: '2026-11-04' }, {}].sort(compareSessionsAsc));
  });
});

describe('specialtyOptions (booking filter chips matched no real trainer)', () => {
  test('All first, then the real specialties once each, sorted', () => {
    const trainers = [
      { specialty: 'Yoga & Mobility' }, { specialty: 'HIIT & Cardio' }, { specialty: 'Yoga & Mobility' },
      { specialty: '' }, {}, { specialty: ' Personal Training ' },
    ];
    assert.deepEqual(specialtyOptions(trainers), ['All', 'HIIT & Cardio', 'Personal Training', 'Yoga & Mobility']);
  });
  test('no trainers → just All', () => assert.deepEqual(specialtyOptions([]), ['All']));
});

describe('localDateString (trainer schedule showed sessions under the wrong day east of UTC)', async () => {
  const { localDateString } = await import('../../src/lib/display.js');
  test('uses the date as the person sees it, not the UTC date', () => {
    assert.equal(localDateString(new Date(2026, 10, 2, 0, 0, 0)), '2026-11-02'); // local midnight
    assert.equal(localDateString(new Date(2026, 0, 1, 0, 30)), '2026-01-01');
    assert.equal(localDateString(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  });
  test('the schedule and dashboards no longer derive days from toISOString()', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['src/pages/trainer/SchedulePage.jsx', 'src/pages/member/MemberDashboard.jsx']) {
      assert.doesNotMatch(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'), /toISOString\(\)\.slice\(0, 10\)/, f);
    }
  });
});

describe('visitStatus (QA F12: visits stayed "Active" for ever)', async () => {
  const { visitStatus } = await import('../../src/lib/display.js');
  const START = Date.UTC(2026, 10, 12, 23, 0);
  const at = (ms) => ({ toMillis: () => ms });
  test('active today stays Active', () => assert.equal(visitStatus({ status: 'Active', checkIn: at(START + 3600_000) }, START), 'Active'));
  test('active from an earlier day reads "Not checked out"', () => assert.equal(visitStatus({ status: 'Active', checkIn: at(START - 1) }, START), 'Not checked out'));
  test('completed is untouched', () => assert.equal(visitStatus({ status: 'Completed', checkIn: at(START - 1e9) }, START), 'Completed'));
});

describe('slotEvents and hasSessionAt', async () => {
  const { slotEvents, hasSessionAt } = await import('../../src/lib/display.js');
  const events = [
    { id: 'c', date: '2026-11-04', time: '08:00', status: 'cancelled' },
    { id: 'u', date: '2026-11-04', time: '08:00', status: 'upcoming' },
    { id: 'x', date: '2026-11-04', time: '09:00', status: 'upcoming' },
  ];
  test('a cell lists every booking for that slot, live ones before cancelled', () => {
    assert.deepEqual(slotEvents(events, '2026-11-04', '08:00').map((e) => e.id), ['u', 'c']);
    assert.deepEqual(slotEvents(events, '2026-11-05', '08:00'), []);
  });
  test('a member cannot book a second session at a time they already hold', () => {
    assert.equal(hasSessionAt(events, '2026-11-04', '09:00'), true);
    assert.equal(hasSessionAt(events, '2026-11-04', '10:00'), false);
    assert.equal(hasSessionAt([events[0]], '2026-11-04', '08:00'), false); // cancelled does not block
  });
});
