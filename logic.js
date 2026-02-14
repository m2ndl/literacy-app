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
