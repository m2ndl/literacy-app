// logic.js - Pure progress logic (no DOM). Extracted for testability.
import { replayAttempts, localDateString, MAX_BOX } from './learner.js';

// Each progress version lives under its own key so tabs still running an older version can't overwrite it.
// v3 (Phase 1) is migrated to v4. The owner chose a full reset for the old v2 curriculum: it is not migrated.
export const STORAGE_KEY = 'literacyAppProgress.v4';
export const V3_KEY = 'literacyAppProgress.v3';
export const LEGACY_KEY = 'literacyAppProgress';
export const PROGRESS_VERSION = 4;
export const PASS_MARK = 0.8;          // share of items right on the first try needed to pass an activity
export const MAX_ATTEMPTS = 1500;      // size of the local answer log (oldest dropped first)
export const OPTIONAL_ACTIVITIES = new Set(['tracing']);  // recommended, not needed to complete a unit

export function getDefaultProgress() {
  return {
    version: PROGRESS_VERSION,
    unlockedUnit: 1,
    completedUnits: [],
    completedActivities: {},
    points: 0,
    streak: 0,
    lastLoginDate: null,
    earnedAchievements: [],
    timeSpent: 0,
    attempts: [],
    stats: { gpc: {}, confusions: {} },
    seenNotices: [],
    items: {},            // item memory for spaced review (learner.js)
    placement: null,      // { day, start, passed: [unit ids] }
    perception: {},       // ear training: { contrastId: { n, k, blocks: [% per block] } }
    lastBackupDay: null
  };
}

const isCount = (n) => Number.isFinite(n) && n >= 0;
const isDay = (n) => Number.isInteger(n) && n >= 0;
const obj = (v) => (typeof v === 'object' && v !== null && !Array.isArray(v) ? v : null);

function validItem(m) {
  return obj(m) && Number.isInteger(m.b) && m.b >= 0 && m.b <= MAX_BOX && isDay(m.due)
    && typeof m.h === 'string' && /^[01]{0,10}$/.test(m.h) && (m.rt === null || isCount(m.rt))
    && isCount(m.days) && (m.last === null || isDay(m.last));
}

function validateV4Fields(parsed) {
  const items = {};
  Object.entries(obj(parsed.items) || {}).forEach(([k, m]) => {
    if (/^(ph|w|h):./.test(k) && validItem(m)) items[k] = { b: m.b, due: m.due, h: m.h, rt: m.rt, days: m.days, last: m.last };
  });
  const pl = obj(parsed.placement);
  const placement = pl && isDay(pl.day) && Number.isInteger(pl.start) && Array.isArray(pl.passed)
    ? { day: pl.day, start: pl.start, passed: pl.passed.filter(Number.isInteger) } : null;
  const perception = {};
  Object.entries(obj(parsed.perception) || {}).forEach(([k, v]) => {
    if (obj(v) && isCount(v.n) && isCount(v.k) && Array.isArray(v.blocks)) {
      perception[k] = { n: v.n, k: Math.min(v.k, v.n), blocks: v.blocks.filter(isCount).slice(-10) };
    }
  });
  return { items, placement, perception, lastBackupDay: isDay(parsed.lastBackupDay) ? parsed.lastBackupDay : null };
}

export function validateProgress(parsed) {
  const d = getDefaultProgress();
  if (typeof parsed !== 'object' || parsed === null || ![3, PROGRESS_VERSION].includes(parsed.version)) return d;
  const completedActivities = {};
  Object.entries(obj(parsed.completedActivities) || {}).forEach(([k, v]) => {
    if (Array.isArray(v)) completedActivities[k] = v.filter(a => typeof a === 'string');
  });
  const stats = obj(parsed.stats) || {};
  const gpcStats = {};
  Object.entries(obj(stats.gpc) || {}).forEach(([g, s]) => {
    if (obj(s) && isCount(s.seen) && isCount(s.correct)) gpcStats[g] = { seen: s.seen, correct: Math.min(s.correct, s.seen) };
  });
  const confusions = {};
  Object.entries(obj(stats.confusions) || {}).forEach(([k, n]) => { if (isCount(n)) confusions[k] = n; });
  const attempts = Array.isArray(parsed.attempts) ? parsed.attempts.filter(a => obj(a) && typeof a.ok === 'boolean').slice(-MAX_ATTEMPTS) : [];
  // v3 -> v4: keep everything and rebuild item memory from the answer log.
  const v4 = parsed.version === 3
    ? { items: replayAttempts(attempts), placement: null, perception: {}, lastBackupDay: null }
    : validateV4Fields(parsed);
  return {
    version: PROGRESS_VERSION,
    unlockedUnit: Number.isInteger(parsed.unlockedUnit) && parsed.unlockedUnit >= 1 ? parsed.unlockedUnit : d.unlockedUnit,
    completedUnits: Array.isArray(parsed.completedUnits) ? parsed.completedUnits.filter(Number.isInteger) : d.completedUnits,
    completedActivities,
    points: isCount(parsed.points) ? parsed.points : d.points,
    streak: isCount(parsed.streak) ? parsed.streak : d.streak,
    lastLoginDate: typeof parsed.lastLoginDate === 'string' ? parsed.lastLoginDate : null,
    earnedAchievements: Array.isArray(parsed.earnedAchievements) ? parsed.earnedAchievements.filter(a => typeof a === 'string') : [],
    timeSpent: isCount(parsed.timeSpent) ? parsed.timeSpent : d.timeSpent,
    attempts,
    stats: { gpc: gpcStats, confusions },
    seenNotices: Array.isArray(parsed.seenNotices) ? parsed.seenNotices.filter(n => typeof n === 'string') : [],
    ...v4
  };
}

/**
 * Load progress from a storage-like object ({getItem}).
 * Returns { progress, legacyFound } — legacyFound means old (v2) progress exists and was not migrated.
 * Phase 1 (v3) progress is migrated when there is no v4 progress yet.
 */
export function loadProgressFrom(storage) {
  let progress = getDefaultProgress();
  let legacyFound = false;
  try {
    const saved = storage.getItem(STORAGE_KEY) || storage.getItem(V3_KEY);
    if (saved) progress = validateProgress(JSON.parse(saved));
    legacyFound = !!storage.getItem(LEGACY_KEY);
  } catch (e) {
    progress = getDefaultProgress();
  }
  return { progress, legacyFound };
}

/**
 * Add one answer to the local log and update per-grapheme stats and confusion counts.
 * attempt = { u: unit, a: activity, i: item, n: try number (0 = first), d: true for the delayed re-test,
 *             ok, c: chosen, rt: ms|null, focus: graphemes practised, confusion: {target, chosen}|null }
 * The log keeps f (graphemes, on first tries) and x ('target>chosen') so weak sounds can be found
 * from recent answers.
 */
export function isFirstTry(attempt) {
  return attempt.n === 0 && !attempt.d;
}

export function recordAttempt(progress, attempt, now = Date.now()) {
  const { focus = [], confusion = null, ...entry } = attempt;
  if (!entry.d) delete entry.d;
  const hasConfusion = !attempt.ok && confusion && confusion.target && confusion.chosen && confusion.target !== confusion.chosen;
  progress.attempts.push({
    t: now, ...entry,
    ...(isFirstTry(attempt) && focus.length ? { f: focus } : {}),
    ...(hasConfusion ? { x: `${confusion.target}>${confusion.chosen}` } : {})
  });
  if (progress.attempts.length > MAX_ATTEMPTS) progress.attempts.splice(0, progress.attempts.length - MAX_ATTEMPTS);
  if (isFirstTry(attempt)) {
    focus.forEach(g => {
      const s = progress.stats.gpc[g] || (progress.stats.gpc[g] = { seen: 0, correct: 0 });
      s.seen += 1;
      if (attempt.ok) s.correct += 1;
    });
  }
  if (hasConfusion) {
    const k = `${confusion.target}>${confusion.chosen}`;
    progress.stats.confusions[k] = (progress.stats.confusions[k] || 0) + 1;
  }
  return progress;
}

/** Most frequent confusions, e.g. [{target:'i', chosen:'e', count:4}]. */
export function topConfusions(progress, n = 3) {
  return Object.entries(progress.stats.confusions)
    .map(([k, count]) => { const [target, chosen] = k.split('>'); return { target, chosen, count }; })
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** Graphemes answered with at least `minSeen` first tries, sorted weakest first. */
export function graphemeAccuracy(progress, minSeen = 3) {
  return Object.entries(progress.stats.gpc)
    .filter(([, s]) => s.seen >= minSeen)
    .map(([g, s]) => ({ g, seen: s.seen, accuracy: s.correct / s.seen }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

export function hasPassed(firstTryCorrect, total) {
  return total > 0 && firstTryCorrect / total >= PASS_MARK;
}

export function getPossibleActivities(unit) {
  return unit && Array.isArray(unit.activities) ? unit.activities : [];
}

export function requiredActivities(unit) {
  return getPossibleActivities(unit).filter(a => !OPTIONAL_ACTIVITIES.has(a));
}

export function isUnitComplete(unit, completedActivities) {
  if (!unit) return false;
  const done = completedActivities[unit.id] || [];
  return requiredActivities(unit).every(a => done.includes(a));
}

export function nextUnitId(units, unitId) {
  const i = units.findIndex(u => u.id === unitId);
  return i >= 0 && i + 1 < units.length ? units[i + 1].id : null;
}

export function shuffleArray(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  let str = '';
  if (h > 0) str += `${h}س `;
  if (m > 0 || h > 0) str += `${m}د `;
  str += `${s}ث`;
  return str;
}

export function computeStreak(userProgress, now = new Date()) {
  // Local calendar dates (toISOString would give the UTC date, a day behind in UTC+3 before 3 am).
  const todayStr = localDateString(now);

  const last = userProgress.lastLoginDate;
  if (last === todayStr) return { ...userProgress };

  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yStr = localDateString(y);

  const newStreak = (last === yStr) ? userProgress.streak + 1 : 1;

  return {
    ...userProgress,
    streak: newStreak,
    lastLoginDate: todayStr
  };
}

export function pickDistractors(pool, correctItem, maxTotal) {
  const distractors = pool.filter(item => item !== correctItem);
  const options = [correctItem];
  const available = [...distractors];
  const maxOptions = Math.min(maxTotal, pool.length);
  while (options.length < maxOptions && available.length > 0) {
    const randomIndex = Math.floor(Math.random() * available.length);
    const picked = available.splice(randomIndex, 1)[0];
    if (!options.includes(picked)) options.push(picked);
  }
  return options;
}
