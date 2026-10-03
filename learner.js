// learner.js - Item-level learner model (pure; no DOM). See PEDAGOGY_PLAN.md, section 9.
//
// Each item the learner practises has a small memory record:
//   { b: Leitner box 0-6, due: day number, h: last results '1'/'0', rt: response time (ms, moving average),
//     days: number of different days practised, last: last day practised }
// Item keys: 'ph:<sound>' (sound <-> letter), 'w:<word>' (decodable word), 'h:<word>' (heart word; no longer reviewed).

export const INTERVALS = [0, 1, 2, 4, 8, 16, 32];   // days until the next review, by box
export const MAX_BOX = INTERVALS.length - 1;
export const HISTORY = 10;                           // results kept per item
// Mastery: >= 90% right over the last >= 8 first tries, on >= 2 different days, and fluent.
// The time limit counts from when the item appears, so it includes ~1 s of audio.
export const MASTERY = { minResults: 8, accuracy: 0.9, minDays: 2, maxRt: 3000 };

/** Day number of the learner's local calendar date (not UTC: learners in UTC+3 practise around midnight UTC). */
export function dayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

/** Local calendar date as YYYY-MM-DD. */
export function localDateString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function newItem() {
  return { b: 0, due: 0, h: '', rt: null, days: 0, last: null };
}

/**
 * Update an item after a first try. Leitner rules: a right answer moves the item up one box only
 * when it was due (or new), so several right answers on the same day don't skip the spacing;
 * a wrong answer sends it back to box 1 (due tomorrow).
 * `rt` is recorded for timed recognition tasks only.
 */
export function updateItem(mem, ok, { day, rt = null } = {}) {
  const m = { ...newItem(), ...(mem || {}) };
  m.h = (m.h + (ok ? '1' : '0')).slice(-HISTORY);
  if (m.last !== day) { m.days += 1; m.last = day; }
  if (!ok) {
    m.b = 1;
    m.due = day + INTERVALS[1];
  } else if (m.b === 0 || day >= m.due) {
    m.b = Math.min(MAX_BOX, m.b + 1);
    m.due = day + INTERVALS[m.b];
  }
  if (ok && Number.isFinite(rt) && rt > 0) m.rt = m.rt == null ? Math.round(rt) : Math.round(m.rt * 0.7 + rt * 0.3);
  return m;
}

/** Record a first try for several items at once (e.g. a placement item seeds two keys). */
export function learnItems(items, keys, ok, opts) {
  (keys || []).forEach(k => { items[k] = updateItem(items[k], ok, opts); });
  return items;
}

export function recentAccuracy(mem) {
  if (!mem || !mem.h) return null;
  return [...mem.h].filter(c => c === '1').length / mem.h.length;
}

export function isMastered(mem) {
  if (!mem || mem.h.length < MASTERY.minResults) return false;
  return recentAccuracy(mem) >= MASTERY.accuracy && mem.days >= MASTERY.minDays
    && (mem.rt == null || mem.rt <= MASTERY.maxRt);
}

export function itemStatus(mem) {
  if (!mem || !mem.h) return 'new';
  return isMastered(mem) ? 'mastered' : 'learning';
}

/** Keys due for review today: most overdue first, then the least secure. */
export function dueItems(items, today, { limit = Infinity, filter = () => true } = {}) {
  return Object.entries(items)
    .filter(([k, m]) => m.b > 0 && m.due <= today && filter(k))
    .sort(([, a], [, b]) => (a.due - b.due) || (a.b - b.b))
    .slice(0, limit)
    .map(([k]) => k);
}

// ---------------------------------------------------------------------------
// Weak sounds, from the recent answer log (so they fade once the learner improves)
// ---------------------------------------------------------------------------

/**
 * Graphemes the learner gets wrong recently, weakest first: [{ target, partner, seen, accuracy, confusions }].
 * Uses log entries with f (graphemes practised on a first try) and x ('target>chosen').
 */
export function weakTargets(attempts, { window = 300, minSeen = 4, maxAccuracy = 0.8, minConfusions = 2, n = 3 } = {}) {
  const recent = attempts.slice(-window);
  const g = {};
  const stat = (k) => g[k] || (g[k] = { seen: 0, correct: 0, chosen: {} });
  recent.forEach(a => {
    if (a.n === 0 && !a.d && Array.isArray(a.f)) a.f.forEach(k => { const s = stat(k); s.seen++; if (a.ok) s.correct++; });
    if (typeof a.x === 'string' && a.x.includes('>')) {
      const [t, c] = a.x.split('>');
      const s = stat(t);
      s.chosen[c] = (s.chosen[c] || 0) + 1;
    }
  });
  return Object.entries(g)
    .map(([target, s]) => {
      const confusions = Object.values(s.chosen).reduce((x, y) => x + y, 0);
      const partner = Object.entries(s.chosen).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const accuracy = s.seen ? s.correct / s.seen : null;
      return { target, partner, seen: s.seen, accuracy, confusions };
    })
    .filter(t => (t.seen >= minSeen && t.accuracy < maxAccuracy) || t.confusions >= minConfusions)
    .sort((a, b) => (b.confusions - a.confusions) || ((a.accuracy ?? 1) - (b.accuracy ?? 1)))
    .slice(0, n);
}

/** Most frequent recent confusions: [{ target, chosen, count }]. */
export function recentConfusions(attempts, { window = 300, n = 5 } = {}) {
  const counts = {};
  attempts.slice(-window).forEach(a => { if (typeof a.x === 'string' && a.x.includes('>')) counts[a.x] = (counts[a.x] || 0) + 1; });
  return Object.entries(counts)
    .map(([k, count]) => { const [target, chosen] = k.split('>'); return { target, chosen, count }; })
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

// ---------------------------------------------------------------------------
// Rebuilding item memory from an older answer log (progress v3 -> v4)
// ---------------------------------------------------------------------------
const WORD_ACTIVITIES = new Set(['which-word', 'word-build', 'missing-letter', 'meaning', 'first-last-sound', 'dictation']);

/** The memory key an old log entry practised, or null. */
export function keyForAttempt(a) {
  if (a.a === 'sound-match' && typeof a.i === 'string') return `ph:${a.i}`;
  if (WORD_ACTIVITIES.has(a.a) && typeof a.i === 'string') return `w:${a.i}`;
  if (a.a === 'heart-words' && typeof a.i === 'string') return `h:${a.i}`;
  return null;
}

export function replayAttempts(attempts) {
  const items = {};
  attempts
    .filter(a => a.n === 0 && !a.d && Number.isFinite(a.t))
    .sort((x, y) => x.t - y.t)
    .forEach(a => {
      const key = keyForAttempt(a);
      if (key) items[key] = updateItem(items[key], a.ok, { day: dayNumber(new Date(a.t)), rt: a.rt });
    });
  return items;
}

// ---------------------------------------------------------------------------
// Placement
// ---------------------------------------------------------------------------
export const PLACEMENT_PASS = 0.8;   // 4 of 5 items per unit

/**
 * results: [{ unit, right, total }] in course order (the test stops at the first unit not passed).
 * Returns { passed: [unit ids], start: unit id to start from }.
 */
export function placementOutcome(results, unitIds) {
  const passed = [];
  for (const r of results) {
    if (r.total > 0 && r.right / r.total >= PLACEMENT_PASS) passed.push(r.unit);
    else break;
  }
  const next = unitIds.find(id => !passed.includes(id));
  return { passed, start: next ?? unitIds[unitIds.length - 1] };
}

// ---------------------------------------------------------------------------
// Perception (ear-training) blocks
// ---------------------------------------------------------------------------
export const PERCEPTION_HISTORY = 10;

export function recordPerceptionBlock(stats, contrastId, right, total) {
  const s = stats[contrastId] || { n: 0, k: 0, blocks: [] };
  const next = {
    n: s.n + total,
    k: s.k + right,
    blocks: [...s.blocks, Math.round((right / Math.max(1, total)) * 100)].slice(-PERCEPTION_HISTORY)
  };
  return { ...stats, [contrastId]: next };
}
