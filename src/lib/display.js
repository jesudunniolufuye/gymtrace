// Small display helpers shared by pages.

/** Up to two initials from a name, taking whole characters (emoji and non-Latin names are not split). */
export const initialsOf = (name) => {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return Array.from(words.map((w) => Array.from(w)[0]).join('').toUpperCase()).slice(0, 2).join('');
};

/** "2026-11-04" → "Wed 4 Nov". */
export const formatSessionDate = (dateStr) =>
  new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** Sort comparator: soonest session first (dates are "YYYY-MM-DD", times "HH:MM"). */
export const compareSessionsAsc = (a, b) =>
  `${a.date ?? ''} ${a.time ?? ''}`.localeCompare(`${b.date ?? ''} ${b.time ?? ''}`);

/** Filter options for the trainer list: "All" plus the specialties trainers actually have. */
export const specialtyOptions = (trainers) => [
  'All',
  ...[...new Set(trainers.map((t) => (t.specialty || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
];

/** A Date's own calendar day as "YYYY-MM-DD" (toISOString() would shift it by the UTC offset). */
export const localDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * What to show for a visit. A visit still marked "Active" from an earlier day
 * was simply never checked out; calling it Active would be wrong.
 * `startOfTodayMs` is the start of the gym's current day.
 */
export const visitStatus = (record, startOfTodayMs) => {
  if (record.status !== 'Active') return record.status || 'Completed';
  const checkInMs = record.checkIn?.toMillis?.() ?? record.checkIn?.toDate?.().getTime?.() ?? null;
  return checkInMs !== null && checkInMs < startOfTodayMs ? 'Not checked out' : 'Active';
};

/** The bookings to show in one schedule cell: live ones first, cancelled last. */
export const slotEvents = (events, date, time) =>
  events
    .filter((e) => e.date === date && e.time === time)
    .sort((a, b) => (a.status === 'cancelled') - (b.status === 'cancelled'));

/** True if the member already has an upcoming session at that date and time. */
export const hasSessionAt = (sessions, date, time) => sessions.some((s) => s.status === 'upcoming' && s.date === date && s.time === time);
