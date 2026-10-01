// logic.js - Pure progress logic (no DOM). Extracted for testability.

// Progress v3 lives under a new key so tabs still running the old version can't overwrite it.
// The owner chose a full reset when the new curriculum ships: old (v2) progress is not migrated.
export const STORAGE_KEY = 'literacyAppProgress.v3';
export const LEGACY_KEY = 'literacyAppProgress';
export const PROGRESS_VERSION = 3;
export const PASS_MARK = 0.8;          // share of items right on the first try needed to pass an activity
export const MAX_ATTEMPTS = 1500;      // size of the local answer log (oldest dropped first)

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
    seenNotices: []
  };
}

const isCount = (n) => Number.isFinite(n) && n >= 0;

export function validateProgress(parsed) {
  const d = getDefaultProgress();
  if (typeof parsed !== 'object' || parsed === null || parsed.version !== PROGRESS_VERSION) return d;
  const obj = (v) => (typeof v === 'object' && v !== null && !Array.isArray(v) ? v : null);
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
    attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter(a => obj(a) && typeof a.ok === 'boolean').slice(-MAX_ATTEMPTS) : [],
    stats: { gpc: gpcStats, confusions },
    seenNotices: Array.isArray(parsed.seenNotices) ? parsed.seenNotices.filter(n => typeof n === 'string') : []
  };
}

/**
 * Load progress from a storage-like object ({getItem}).
 * Returns { progress, legacyFound } — legacyFound means old (v2) progress exists and was not migrated.
 */
export function loadProgressFrom(storage) {
  let progress = getDefaultProgress();
  let legacyFound = false;
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) progress = validateProgress(JSON.parse(saved));
    legacyFound = !!storage.getItem(LEGACY_KEY);
  } catch (e) {
    progress = getDefaultProgress();
  }
  return { progress, legacyFound };
}

/**
 * Add one answer to the local log and update per-grapheme stats and confusion counts.
 * attempt = { u: unit, a: activity, i: item, n: try number (0 = first), ok, c: chosen, rt: ms|null,
 *             focus: graphemes practised, confusion: {target, chosen}|null }
 */
export function recordAttempt(progress, attempt, now = Date.now()) {
  const { focus = [], confusion = null, ...entry } = attempt;
  progress.attempts.push({ t: now, ...entry });
  if (progress.attempts.length > MAX_ATTEMPTS) progress.attempts.splice(0, progress.attempts.length - MAX_ATTEMPTS);
  if (attempt.n === 0) {
    focus.forEach(g => {
      const s = progress.stats.gpc[g] || (progress.stats.gpc[g] = { seen: 0, correct: 0 });
      s.seen += 1;
      if (attempt.ok) s.correct += 1;
    });
  }
  if (!attempt.ok && confusion && confusion.target && confusion.chosen && confusion.target !== confusion.chosen) {
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

export function isUnitComplete(unit, completedActivities) {
  if (!unit) return false;
  const done = completedActivities[unit.id] || [];
  return getPossibleActivities(unit).every(a => done.includes(a));
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

export function computeStreak(userProgress) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = today.toISOString().slice(0, 10);

  const last = userProgress.lastLoginDate;
  if (last === todayStr) return { ...userProgress };

  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().slice(0, 10);

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
