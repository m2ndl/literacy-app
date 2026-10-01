// logic.js - Pure functions extracted for testability
import { appData } from './data.js';

export function getDefaultProgress() {
  return {
    unlockedChunk: 1, completedChunks: [], completedActivities: {},
    points: 0, streak: 0, lastLoginDate: null, earnedAchievements: [],
    timeSpent: 0, version: 2,
    // For syncing across devices: epoch goes up on every reset, and counters hold how many
    // points and seconds each device contributed (see mergeProgress)
    epoch: 0, counters: { points: {}, timeSpent: {} }
  };
}

const COUNTED = ['points', 'timeSpent'];

function validateCounters(c) {
  const out = { points: {}, timeSpent: {} };
  if (typeof c !== 'object' || c === null) return out;
  COUNTED.forEach(name => {
    const src = c[name];
    if (typeof src !== 'object' || src === null) return;
    Object.entries(src).forEach(([device, n]) => {
      if (Number.isFinite(n) && n >= 0) out[name][device] = n;
    });
  });
  return out;
}

// The review group used to be number 11 (there was no 10); saved progress is moved to 10
const RENUMBERED_CHUNKS = { 11: 10 };
const chunkIdNow = id => RENUMBERED_CHUNKS[id] || id;

function migrateCompletedActivities(activities) {
  const out = {};
  Object.entries(activities).forEach(([key, list]) => {
    const id = String(chunkIdNow(Number(key)));
    out[id] = Array.isArray(list) ? [...new Set([...(out[id] || []), ...list])] : (out[id] || list);
  });
  return out;
}

export function validateProgress(parsed) {
  const defaults = getDefaultProgress();
  if (typeof parsed !== 'object' || parsed === null) return defaults;

  return {
    unlockedChunk: Number.isFinite(parsed.unlockedChunk) && parsed.unlockedChunk >= 1
      ? chunkIdNow(parsed.unlockedChunk) : defaults.unlockedChunk,
    completedChunks: Array.isArray(parsed.completedChunks)
      ? [...new Set(parsed.completedChunks.filter(id => Number.isFinite(id)).map(chunkIdNow))] : defaults.completedChunks,
    completedActivities: typeof parsed.completedActivities === 'object' && parsed.completedActivities !== null
      ? migrateCompletedActivities(parsed.completedActivities) : defaults.completedActivities,
    points: Number.isFinite(parsed.points) && parsed.points >= 0
      ? parsed.points : defaults.points,
    streak: Number.isFinite(parsed.streak) && parsed.streak >= 0
      ? parsed.streak : defaults.streak,
    lastLoginDate: typeof parsed.lastLoginDate === 'string' || parsed.lastLoginDate === null
      ? parsed.lastLoginDate : defaults.lastLoginDate,
    earnedAchievements: Array.isArray(parsed.earnedAchievements)
      ? parsed.earnedAchievements.filter(id => typeof id === 'string') : defaults.earnedAchievements,
    timeSpent: Number.isFinite(parsed.timeSpent) && parsed.timeSpent >= 0
      ? parsed.timeSpent : defaults.timeSpent,
    version: 2,
    epoch: Number.isInteger(parsed.epoch) && parsed.epoch >= 0 ? parsed.epoch : defaults.epoch,
    counters: validateCounters(parsed.counters)
  };
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

export function getLearnedContent(chunkId, contentType) {
  const content = new Set();
  for (let i = 1; i <= chunkId; i++) {
    const chunk = appData.chunks.find(c => c.id === i);
    if (chunk && chunk[contentType]) chunk[contentType].forEach(item => content.add(item));
  }
  return Array.from(content);
}

// Day keys as the app has always stored them (local midnight written as a UTC date). Keep this
// format so streaks saved by earlier versions keep counting.
function dayKey(now, daysBack = 0) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

// Records a day of learning: the streak grows on consecutive days and restarts after a gap
export function computeStreak(userProgress, now = new Date()) {
  const todayStr = dayKey(now);

  const last = userProgress.lastLoginDate;
  if (last === todayStr) return { ...userProgress };

  const yStr = dayKey(now, 1);

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

export function getPossibleActivities(chunk) {
  const possible = [];
  if (chunk.letters && chunk.letters.length > 0) {
    possible.push('sound-match', 'capital-match');
  }
  if ((chunk.words && chunk.words.length > 0) || (chunk.letterPairs && chunk.letterPairs.length > 0)) {
    possible.push('combined-sound-match');
  }
  if (chunk.words && chunk.words.length > 0) {
    possible.push('word-build', 'fill-in-the-blank', 'word-match', 'initial-sound');
  }
  if (chunk.sentences && chunk.sentences.length > 0) {
    possible.push('sentence-build');
  }
  return possible;
}

export function isChunkComplete(chunkId, completedActivities) {
  const chunk = appData.chunks.find(c => c.id === chunkId);
  if (!chunk) return false;
  const possible = getPossibleActivities(chunk);
  const completed = completedActivities[chunkId] || [];
  return possible.every(act => completed.includes(act));
}

// -------------------- Activity length & passing --------------------
// Every activity asks at least this many questions, repeating items when a group has fewer,
// so a single slip never drops the score below the pass mark.
export const QUESTIONS_PER_ACTIVITY = 6;
export const PASS_ACCURACY = 70;

export function buildQuestionSet(pool, count = QUESTIONS_PER_ACTIVITY) {
  if (!pool || pool.length === 0) return [];
  const result = [];
  while (result.length < count) {
    const round = shuffleArray(pool);
    // Don't ask the same item twice in a row where one round meets the next
    if (result.length > 0 && round.length > 1 && round[0] === result[result.length - 1]) {
      [round[0], round[1]] = [round[1], round[0]];
    }
    result.push(...round);
  }
  return result.slice(0, count);
}

export function activityAccuracy(total, missed) {
  if (!total) return 0;
  return Math.round(((total - missed) / total) * 100);
}

// -------------------- Audio clips --------------------
// Recorded clips live in audio/<kind>/<name>.<ext>; the key is the path without the extension.
const allWordsLower = new Set(
  appData.chunks.flatMap(c => [...(c.words || []), ...(c.sightWords || [])]).map(w => w.toLowerCase())
);

export function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// kind ('letter' | 'word' | 'pair' | 'sentence') can be passed when the text alone is ambiguous,
// e.g. the sight word "a" versus the letter sound a.
export function clipKeyFor(text, kind) {
  const t = String(text).trim();
  const lower = t.toLowerCase();
  const inferred = /\s/.test(t) ? 'sentence'
    : lower.length === 1 ? 'letter'
    : allWordsLower.has(lower) ? 'word'
    : 'pair';
  const k = kind || inferred;
  if (k === 'sentence') return `sentences/${slugify(t)}`;
  if (k === 'letter') return `letters/${lower}`;
  if (k === 'word') return `words/${lower}`;
  return `pairs/${lower}`;
}

// Every clip the app can play, in teaching order.
export function neededClips() {
  const clips = [];
  const seen = new Set();
  const add = (text, kind) => {
    const key = clipKeyFor(text, kind);
    if (seen.has(key)) return;
    seen.add(key);
    clips.push({ key, text, kind });
  };
  appData.chunks.forEach(c => (c.letters || []).forEach(l => add(l, 'letter')));
  appData.chunks.forEach(c => [...(c.words || []), ...(c.sightWords || [])].forEach(w => add(w, 'word')));
  // A pair that is also one of the group's words ("at") is played as that word; otherwise it
  // is its own clip, even when it matches a word elsewhere (the pair "do" isn't the word "do").
  appData.chunks.forEach(c => (c.letterPairs || []).forEach(p => add(p, (c.words || []).includes(p) ? 'word' : 'pair')));
  appData.chunks.forEach(c => (c.sentences || []).forEach(s => add(s.text, 'sentence')));
  return clips;
}

// -------------------- Decodability --------------------
// Spelling patterns the course does not teach yet. A word that uses one, or a letter that
// hasn't been taught, must be introduced as a sight word first.
const UNTAUGHT_PATTERNS = [
  { name: 'digraph', re: /sh|ch|th|wh|ph|ck|ng/ },
  { name: 'vowel team', re: /ee|ea|oa|ai|ay|oo|ou|ow|oi|oy|ie|ue/ },
  { name: 'r-controlled vowel', re: /ar|er|ir|or|ur/ },
  { name: 'double letter', re: /([b-df-hj-np-tv-z])\1/ },
  { name: 'silent e', re: /[aeiou][b-df-hj-np-tv-z]e$/ }
];

export function findDecodingProblems(word, taughtLetters) {
  const w = word.toLowerCase();
  const problems = [];
  const untaught = [...new Set(w.replace(/[^a-z]/g, '').split(''))].filter(ch => !taughtLetters.has(ch));
  if (untaught.length) problems.push(`untaught letter ${untaught.join(', ')}`);
  // "qu" is taught as one unit, so its u isn't part of a vowel team (queen → ee, not ue)
  const spelling = w.replace(/qu/g, 'q');
  UNTAUGHT_PATTERNS.forEach(({ name, re }) => {
    const m = spelling.match(re);
    if (m) problems.push(`${name} "${m[0]}"`);
  });
  return problems;
}

// -------------------- Sync across devices --------------------
// Progress from two devices is merged without conflicts: completed work is combined, points and
// learning time are added up per device, and a reset (higher epoch) replaces older progress.
// The merge gives the same result in either order, and merging a progress with itself changes nothing.

// Starting over: a fresh progress that also wins over the old one on other devices
export function resetProgress(progress) {
  return { ...getDefaultProgress(), epoch: validateProgress(progress).epoch + 1 };
}

// Records this device's share of the point and time totals, so another device can add them up
export function withOwnCounters(progress, deviceId) {
  const p = validateProgress(progress);
  COUNTED.forEach(name => {
    const others = Object.entries(p.counters[name])
      .filter(([device]) => device !== deviceId)
      .reduce((sum, [, n]) => sum + n, 0);
    const own = Math.max(0, p[name] - others);
    if (own > 0 || deviceId in p.counters[name]) p.counters[name][deviceId] = own;
  });
  return p;
}

function dayNumber(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return Math.round(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 864e5);
}

// A streak is a run of consecutive days ending on lastLoginDate; two runs that touch become one
export function mergeStreak(a, b) {
  const da = dayNumber(a.lastLoginDate);
  const db = dayNumber(b.lastLoginDate);
  if (da === null) return { streak: b.streak, lastLoginDate: b.lastLoginDate };
  if (db === null) return { streak: a.streak, lastLoginDate: a.lastLoginDate };
  if (da === db) return { streak: Math.max(a.streak, b.streak), lastLoginDate: a.lastLoginDate };
  const [early, late, dEarly, dLate] = da < db ? [a, b, da, db] : [b, a, db, da];
  const lateStart = dLate - late.streak + 1;
  const earlyStart = dEarly - early.streak + 1;
  const streak = lateStart <= dEarly + 1 ? dLate - Math.min(earlyStart, lateStart) + 1 : late.streak;
  return { streak, lastLoginDate: late.lastLoginDate };
}

const sortedUnion = (x, y, compare) => [...new Set([...x, ...y])].sort(compare);
const byNumber = (x, y) => x - y;

export function mergeProgress(local, remote) {
  const a = validateProgress(local);
  const b = validateProgress(remote);
  if (a.epoch !== b.epoch) return mergeProgress(...(a.epoch > b.epoch ? [a, a] : [b, b]));

  const completedActivities = {};
  const chunkKeys = [...new Set([...Object.keys(a.completedActivities), ...Object.keys(b.completedActivities)])];
  chunkKeys.sort((x, y) => Number(x) - Number(y)).forEach(key => {
    const x = Array.isArray(a.completedActivities[key]) ? a.completedActivities[key] : [];
    const y = Array.isArray(b.completedActivities[key]) ? b.completedActivities[key] : [];
    completedActivities[key] = sortedUnion(x, y);
  });

  const counters = {};
  const totals = {};
  COUNTED.forEach(name => {
    const merged = {};
    [...new Set([...Object.keys(a.counters[name]), ...Object.keys(b.counters[name])])].sort().forEach(device => {
      merged[device] = Math.max(a.counters[name][device] || 0, b.counters[name][device] || 0);
    });
    counters[name] = merged;
    const sum = Object.values(merged).reduce((s, n) => s + n, 0);
    // Never report less than either side had, even if one side has no counters yet
    totals[name] = Math.max(sum, a[name], b[name]);
  });

  return {
    unlockedChunk: Math.max(a.unlockedChunk, b.unlockedChunk),
    completedChunks: sortedUnion(a.completedChunks, b.completedChunks, byNumber),
    completedActivities,
    points: totals.points,
    ...mergeStreak(a, b),
    earnedAchievements: sortedUnion(a.earnedAchievements, b.earnedAchievements),
    timeSpent: totals.timeSpent,
    version: 2,
    epoch: a.epoch,
    counters
  };
}

// The streak to show: still alive if the learner learned today or yesterday, otherwise 0
export function liveStreak(progress, now = new Date()) {
  const last = progress.lastLoginDate;
  return last === dayKey(now) || last === dayKey(now, 1) ? progress.streak : 0;
}

// -------------------- Course progress --------------------
export function courseProgress(completedActivities) {
  let done = 0;
  let total = 0;
  appData.chunks.forEach(chunk => {
    const possible = getPossibleActivities(chunk);
    const completed = completedActivities[chunk.id] || [];
    total += possible.length;
    done += possible.filter(a => completed.includes(a)).length;
  });
  return { done, total };
}

// The next activity to do: the first unfinished one in the first open group that isn't complete.
// null when everything open is done.
export function nextStep(progress, afterChunkId = null) {
  const completedChunks = progress.completedChunks || [];
  // Look forward from afterChunkId first (the group just finished), then from the start
  const start = afterChunkId === null ? 0 : appData.chunks.findIndex(c => c.id === afterChunkId) + 1;
  const ordered = [...appData.chunks.slice(start), ...appData.chunks.slice(0, start)];
  for (const chunk of ordered) {
    if (chunk.id > progress.unlockedChunk || completedChunks.includes(chunk.id)) continue;
    const completed = progress.completedActivities[chunk.id] || [];
    const activityId = getPossibleActivities(chunk).find(a => !completed.includes(a));
    if (activityId) return { chunkId: chunk.id, activityId };
  }
  return null;
}

// -------------------- Answer options --------------------
// The right answer plus up to max-1 others: first from `preferred` (e.g. this group's letters),
// then from `fallback` (e.g. every letter learned so far). Order is random.
export function pickOptions(correct, preferred, fallback = [], max = 4) {
  const options = [correct];
  const add = (pool) => {
    shuffleArray([...new Set(pool)]).forEach(item => {
      if (options.length < max && !options.includes(item)) options.push(item);
    });
  };
  add(preferred);
  add(fallback);
  return shuffleArray(options);
}
