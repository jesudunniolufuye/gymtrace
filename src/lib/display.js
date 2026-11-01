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
