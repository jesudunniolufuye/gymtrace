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
