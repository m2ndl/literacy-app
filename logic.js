// logic.js - Pure functions extracted for testability
import { appData } from './data.js';

export function getDefaultProgress() {
  return {
    unlockedChunk: 1, completedChunks: [], completedActivities: {},
    points: 0, streak: 0, lastLoginDate: null, earnedAchievements: [],
    timeSpent: 0, version: 2
  };
}

export function validateProgress(parsed) {
  const defaults = getDefaultProgress();
  if (typeof parsed !== 'object' || parsed === null) return defaults;

  return {
    unlockedChunk: Number.isFinite(parsed.unlockedChunk) && parsed.unlockedChunk >= 1
      ? parsed.unlockedChunk : defaults.unlockedChunk,
    completedChunks: Array.isArray(parsed.completedChunks)
      ? parsed.completedChunks.filter(id => Number.isFinite(id)) : defaults.completedChunks,
    completedActivities: typeof parsed.completedActivities === 'object' && parsed.completedActivities !== null
      ? parsed.completedActivities : defaults.completedActivities,
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
    version: 2
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

export function computeStreak(userProgress) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = today.toISOString().slice(0,10);

  const last = userProgress.lastLoginDate;
  if (last === todayStr) return { ...userProgress };

  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().slice(0,10);

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
