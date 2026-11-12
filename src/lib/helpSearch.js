// Search for the Help page. Runs entirely in the browser: no service, no cost.
// Words are matched against each topic's question, keywords and answer, with
// light handling of plurals/endings and a few everyday synonyms.

const STOP = new Set(['a', 'an', 'the', 'i', 'my', 'me', 'to', 'do', 'does', 'did', 'is', 'are', 'it', 'its', 'of', 'in', 'on', 'for',
  'how', 'what', 'where', 'when', 'why', 'can', 'cant', 'and', 'or', 'with', 'be', 'am', 'was', 'have', 'has', 'get', 'got', 'that',
  'this', 'you', 'your', 'we', 'at', 'so', 'if', 'not', 'no', 'will', 'wont', 'dont', 'please', 'help', 'need', 'want', 'there', 'up']);

// Each group is treated as the same word.
const SYNONYM_GROUPS = [
  ['login', 'signin'],
  ['logout', 'signout'],
  ['password', 'passcode', 'pin'],
  ['pay', 'payment', 'paid', 'fee', 'fees', 'money', 'subscribe', 'subscription'],
  ['price', 'cost', 'much', 'amount', 'charge'],
  ['qr', 'code', 'barcode'],
  ['book', 'booking', 'appointment', 'reserve', 'reservation'],
  ['trainer', 'coach', 'instructor'],
  ['email', 'mail', 'inbox'],
  ['register', 'signup', 'join', 'enrol', 'enroll'],
  ['cancel', 'remove', 'delete'],
  ['receipt', 'invoice'],
  ['deactivate', 'block', 'ban', 'disable', 'suspend'],
  ['visit', 'attendance', 'checkin'],
  ['phone', 'mobile'],
];
const CANON = new Map();
for (const group of SYNONYM_GROUPS) for (const w of group) CANON.set(w, group[0]);

/** "Bookings" -> "book", "paying" -> "pay": crude, but enough for a help search. */
const stem = (w) => {
  let s = w;
  if (s.length > 5 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
  if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  return s;
};

export const tokenize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/log[\s-]+in\b/g, 'login').replace(/sign[\s-]+in\b/g, 'signin').replace(/sign[\s-]+up\b/g, 'signup')
    .replace(/log[\s-]+out\b/g, 'logout').replace(/sign[\s-]+out\b/g, 'signout').replace(/check[\s-]*in\b/g, 'checkin')
    .split(/[^a-z0-9₦]+/)
    .filter((w) => w && !STOP.has(w))
    .map((w) => { const s = stem(w); return CANON.get(w) ?? CANON.get(s) ?? s; });

const topicIndex = new WeakMap();
const indexOf = (topic) => {
  let idx = topicIndex.get(topic);
  if (!idx) {
    idx = {
      q: new Set(tokenize(topic.q)),
      k: new Set(tokenize(topic.keywords)),
      a: new Set(tokenize([...(topic.a ?? []), ...(topic.steps ?? [])].join(' '))),
    };
    topicIndex.set(topic, idx);
  }
  return idx;
};

const hit = (set, word) => {
  if (set.has(word)) return 1;
  // A typed word may be the start of an indexed word ("verif" finds "verification"), or a slightly longer form of it.
  if (word.length >= 4) for (const w of set) if (w.startsWith(word) || (w.length >= 4 && word.startsWith(w) && word.length - w.length <= 2)) return 0.6;
  return 0;
};

/**
 * Topics matching `query`, best first. An empty query returns every topic in
 * its original order. `audience` ('member' | 'trainer' | 'staff') keeps that
 * audience's topics plus the ones for everyone.
 */
export function searchHelp(topics, query, audience = 'all') {
  const pool = audience === 'all' ? topics : topics.filter((t) => t.audience === audience || t.audience === 'everyone');
  const words = [...new Set(tokenize(query))];
  if (words.length === 0) return pool;
  return pool
    .map((topic, order) => {
      const idx = indexOf(topic);
      let score = 0, matched = 0;
      for (const w of words) {
        const s = 3 * hit(idx.q, w) + 3 * hit(idx.k, w) + hit(idx.a, w);
        if (s > 0) matched++;
        score += s;
      }
      // Prefer topics that match more of the words the person typed.
      return { topic, order, score: score * (matched / words.length) };
    })
    .filter((r) => r.score > 0)
    .sort((x, y) => y.score - x.score || x.order - y.order)
    // Drop weak matches that are far behind the best one.
    .filter((r, _i, all) => r.score >= all[0].score * 0.3)
    .map((r) => r.topic);
}
