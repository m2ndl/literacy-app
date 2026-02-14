import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultProgress,
  validateProgress,
  shuffleArray,
  formatTime,
  getLearnedContent,
  computeStreak,
  pickDistractors,
  getPossibleActivities,
  isChunkComplete
} from '../logic.js';
import { getAchievements } from '../data.js';

// ---------- getDefaultProgress ----------
describe('getDefaultProgress', () => {
  it('returns a fresh default object', () => {
    const p = getDefaultProgress();
    assert.equal(p.unlockedChunk, 1);
    assert.deepEqual(p.completedChunks, []);
    assert.deepEqual(p.completedActivities, {});
    assert.equal(p.points, 0);
    assert.equal(p.streak, 0);
    assert.equal(p.lastLoginDate, null);
    assert.deepEqual(p.earnedAchievements, []);
    assert.equal(p.timeSpent, 0);
    assert.equal(p.version, 2);
  });

  it('returns independent objects on each call', () => {
    const a = getDefaultProgress();
    const b = getDefaultProgress();
    a.points = 999;
    assert.equal(b.points, 0);
  });
});

// ---------- validateProgress ----------
describe('validateProgress', () => {
  it('returns defaults for null input', () => {
    const p = validateProgress(null);
    assert.deepEqual(p, getDefaultProgress());
  });

  it('returns defaults for non-object input', () => {
    assert.deepEqual(validateProgress('hello'), getDefaultProgress());
    assert.deepEqual(validateProgress(42), getDefaultProgress());
    assert.deepEqual(validateProgress(undefined), getDefaultProgress());
  });

  it('preserves valid fields', () => {
    const input = {
      unlockedChunk: 5,
      completedChunks: [1, 2, 3],
      completedActivities: { 1: ['sound-match'] },
      points: 150,
      streak: 3,
      lastLoginDate: '2026-01-15',
      earnedAchievements: ['chunk1', 'points100'],
      timeSpent: 3600,
      version: 2
    };
    const p = validateProgress(input);
    assert.equal(p.unlockedChunk, 5);
    assert.deepEqual(p.completedChunks, [1, 2, 3]);
    assert.deepEqual(p.completedActivities, { 1: ['sound-match'] });
    assert.equal(p.points, 150);
    assert.equal(p.streak, 3);
    assert.equal(p.lastLoginDate, '2026-01-15');
    assert.deepEqual(p.earnedAchievements, ['chunk1', 'points100']);
    assert.equal(p.timeSpent, 3600);
  });

  it('resets invalid unlockedChunk', () => {
    assert.equal(validateProgress({ unlockedChunk: -1 }).unlockedChunk, 1);
    assert.equal(validateProgress({ unlockedChunk: 'abc' }).unlockedChunk, 1);
    assert.equal(validateProgress({ unlockedChunk: NaN }).unlockedChunk, 1);
    assert.equal(validateProgress({ unlockedChunk: Infinity }).unlockedChunk, 1);
  });

  it('resets negative points', () => {
    assert.equal(validateProgress({ points: -10 }).points, 0);
  });

  it('resets negative streak', () => {
    assert.equal(validateProgress({ streak: -1 }).streak, 0);
  });

  it('resets negative timeSpent', () => {
    assert.equal(validateProgress({ timeSpent: -100 }).timeSpent, 0);
  });

  it('filters non-numeric completedChunks', () => {
    const p = validateProgress({ completedChunks: [1, 'bad', null, 3] });
    assert.deepEqual(p.completedChunks, [1, 3]);
  });

  it('filters non-string earnedAchievements', () => {
    const p = validateProgress({ earnedAchievements: ['chunk1', 42, null, 'streak3'] });
    assert.deepEqual(p.earnedAchievements, ['chunk1', 'streak3']);
  });

  it('resets completedActivities if not an object', () => {
    assert.deepEqual(validateProgress({ completedActivities: 'bad' }).completedActivities, {});
    assert.deepEqual(validateProgress({ completedActivities: null }).completedActivities, {});
  });

  it('resets lastLoginDate if not string or null', () => {
    assert.equal(validateProgress({ lastLoginDate: 42 }).lastLoginDate, null);
    assert.equal(validateProgress({ lastLoginDate: null }).lastLoginDate, null);
    assert.equal(validateProgress({ lastLoginDate: '2026-01-01' }).lastLoginDate, '2026-01-01');
  });

  it('always sets version to 2', () => {
    assert.equal(validateProgress({ version: 1 }).version, 2);
    assert.equal(validateProgress({}).version, 2);
  });
});

// ---------- shuffleArray ----------
describe('shuffleArray', () => {
  it('returns an array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    assert.equal(result.length, input.length);
    assert.deepEqual(result.sort(), [...input].sort());
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3];
    shuffleArray(input);
    assert.deepEqual(input, [1, 2, 3]);
  });

  it('handles empty array', () => {
    assert.deepEqual(shuffleArray([]), []);
  });

  it('handles single element', () => {
    assert.deepEqual(shuffleArray([42]), [42]);
  });
});

// ---------- formatTime ----------
describe('formatTime', () => {
  it('formats seconds only', () => {
    assert.equal(formatTime(30), '30ث');
  });

  it('formats minutes and seconds', () => {
    assert.equal(formatTime(90), '1د 30ث');
  });

  it('formats hours, minutes, and seconds', () => {
    assert.equal(formatTime(3661), '1س 1د 1ث');
  });

  it('formats zero', () => {
    assert.equal(formatTime(0), '0ث');
  });

  it('shows 0 minutes when hours present but minutes are 0', () => {
    assert.equal(formatTime(3600), '1س 0د 0ث');
  });
});

// ---------- getLearnedContent ----------
describe('getLearnedContent', () => {
  it('returns letters for chunk 1', () => {
    const letters = getLearnedContent(1, 'letters');
    assert.deepEqual(letters.sort(), ['a', 'b', 't']);
  });

  it('accumulates letters across chunks', () => {
    const letters = getLearnedContent(2, 'letters');
    assert.ok(letters.includes('b'));  // from chunk 1
    assert.ok(letters.includes('n'));  // from chunk 2
    assert.equal(letters.length, 6);  // b,t,a + p,i,n
  });

  it('returns words for chunk 1', () => {
    const words = getLearnedContent(1, 'words');
    assert.deepEqual(words.sort(), ['at', 'bat', 'tab']);
  });

  it('returns empty array for non-existent content type', () => {
    const result = getLearnedContent(1, 'sentences');
    assert.deepEqual(result, []);
  });

  it('handles non-existent chunk IDs gracefully', () => {
    // Chunk 10 does not exist, but the function iterates up to chunkId
    const letters = getLearnedContent(11, 'letters');
    assert.ok(letters.length > 0);  // should still have letters from chunks 1-9
  });
});

// ---------- computeStreak ----------
describe('computeStreak', () => {
  it('starts streak at 1 for first login', () => {
    const progress = { ...getDefaultProgress(), lastLoginDate: null };
    const result = computeStreak(progress);
    assert.equal(result.streak, 1);
    assert.ok(result.lastLoginDate !== null);
  });

  it('does not change if already logged in today', () => {
    const today = new Date();
    const todayStr = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);
    const progress = { ...getDefaultProgress(), streak: 5, lastLoginDate: todayStr };
    const result = computeStreak(progress);
    assert.equal(result.streak, 5);
    assert.equal(result.lastLoginDate, todayStr);
  });

  it('increments streak when last login was yesterday', () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const progress = { ...getDefaultProgress(), streak: 3, lastLoginDate: yStr };
    const result = computeStreak(progress);
    assert.equal(result.streak, 4);
  });

  it('resets streak to 1 when last login was more than a day ago', () => {
    const progress = { ...getDefaultProgress(), streak: 10, lastLoginDate: '2020-01-01' };
    const result = computeStreak(progress);
    assert.equal(result.streak, 1);
  });
});

// ---------- pickDistractors ----------
describe('pickDistractors', () => {
  it('returns correct item plus distractors', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const result = pickDistractors(pool, 'a', 4);
    assert.equal(result.length, 4);
    assert.ok(result.includes('a'));
  });

  it('always includes the correct item', () => {
    for (let i = 0; i < 20; i++) {
      const result = pickDistractors(['x', 'y', 'z'], 'x', 3);
      assert.ok(result.includes('x'));
    }
  });

  it('does not exceed pool size', () => {
    const result = pickDistractors(['a', 'b'], 'a', 4);
    assert.equal(result.length, 2);
  });

  it('handles single-item pool', () => {
    const result = pickDistractors(['a'], 'a', 4);
    assert.deepEqual(result, ['a']);
  });

  it('terminates even with duplicate pool items', () => {
    // This was the infinite loop bug - duplicates in pool should not hang
    const pool = ['a', 'a', 'a', 'b'];
    const result = pickDistractors(pool, 'b', 4);
    assert.ok(result.includes('b'));
    assert.ok(result.length <= 4);
    // Should terminate quickly, not hang
  });

  it('never produces duplicate options', () => {
    for (let i = 0; i < 50; i++) {
      const pool = ['a', 'b', 'c', 'd', 'e'];
      const result = pickDistractors(pool, 'a', 4);
      const unique = new Set(result);
      assert.equal(unique.size, result.length, `Duplicate found: ${result}`);
    }
  });

  it('handles pool where correct item appears multiple times', () => {
    const pool = ['a', 'a', 'b', 'c'];
    const result = pickDistractors(pool, 'a', 3);
    assert.ok(result.includes('a'));
    const aCount = result.filter(x => x === 'a').length;
    assert.equal(aCount, 1);
  });
});

// ---------- getPossibleActivities ----------
describe('getPossibleActivities', () => {
  it('returns sound-match and capital-match for chunks with letters', () => {
    const chunk = { letters: ['a', 'b'], words: [], letterPairs: [] };
    const activities = getPossibleActivities(chunk);
    assert.ok(activities.includes('sound-match'));
    assert.ok(activities.includes('capital-match'));
  });

  it('returns word activities for chunks with words', () => {
    const chunk = { letters: [], words: ['cat', 'bat'], letterPairs: [] };
    const activities = getPossibleActivities(chunk);
    assert.ok(activities.includes('word-build'));
    assert.ok(activities.includes('fill-in-the-blank'));
    assert.ok(activities.includes('word-match'));
    assert.ok(activities.includes('initial-sound'));
  });

  it('returns combined-sound-match for chunks with words or letter pairs', () => {
    const chunk = { letters: [], words: ['cat'], letterPairs: ['ca'] };
    const activities = getPossibleActivities(chunk);
    assert.ok(activities.includes('combined-sound-match'));
  });

  it('returns sentence-build for chunks with sentences', () => {
    const chunk = { letters: [], words: [], sentences: [{ text: 'a cat', missing: 'cat' }] };
    const activities = getPossibleActivities(chunk);
    assert.ok(activities.includes('sentence-build'));
  });

  it('returns empty for empty chunk', () => {
    const chunk = { letters: [], words: [], letterPairs: [] };
    const activities = getPossibleActivities(chunk);
    assert.equal(activities.length, 0);
  });

  it('returns all activity types for a full chunk', () => {
    const chunk = {
      letters: ['a', 'b'],
      words: ['bat'],
      letterPairs: ['ba'],
      sentences: [{ text: 'a bat', missing: 'bat' }]
    };
    const activities = getPossibleActivities(chunk);
    assert.equal(activities.length, 8);
  });
});

// ---------- isChunkComplete ----------
describe('isChunkComplete', () => {
  it('returns false when no activities completed', () => {
    assert.equal(isChunkComplete(1, {}), false);
  });

  it('returns false when only some activities completed', () => {
    // Chunk 1 has letters and words, so it needs: sound-match, capital-match,
    // combined-sound-match, word-build, fill-in-the-blank, word-match, initial-sound
    const completed = { 1: ['sound-match'] };
    assert.equal(isChunkComplete(1, completed), false);
  });

  it('returns true when all activities completed for chunk 1', () => {
    const completed = {
      1: ['sound-match', 'capital-match', 'combined-sound-match',
          'word-build', 'fill-in-the-blank', 'word-match', 'initial-sound']
    };
    assert.equal(isChunkComplete(1, completed), true);
  });

  it('returns true when all activities completed for a chunk with sentences', () => {
    // Chunk 4 has letters, words, letterPairs, and sentences
    const completed = {
      4: ['sound-match', 'capital-match', 'combined-sound-match',
          'word-build', 'fill-in-the-blank', 'word-match', 'initial-sound', 'sentence-build']
    };
    assert.equal(isChunkComplete(4, completed), true);
  });

  it('returns false for non-existent chunk', () => {
    assert.equal(isChunkComplete(999, {}), false);
  });
});

// ---------- data.js: getAchievements ----------
describe('achievement conditions', () => {
  const achievements = getAchievements(10);

  it('chunk1 triggers on completing chunk 1', () => {
    const ach = achievements.find(a => a.id === 'chunk1');
    assert.equal(ach.condition({ completedChunks: [1] }), true);
    assert.equal(ach.condition({ completedChunks: [] }), false);
  });

  it('chunk5 triggers on completing 5 chunks', () => {
    const ach = achievements.find(a => a.id === 'chunk5');
    assert.equal(ach.condition({ completedChunks: [1, 2, 3, 4, 5] }), true);
    assert.equal(ach.condition({ completedChunks: [1, 2, 3] }), false);
  });

  it('chunkAll triggers on completing all chunks', () => {
    const ach = achievements.find(a => a.id === 'chunkAll');
    assert.equal(ach.condition({ completedChunks: Array.from({ length: 10 }, (_, i) => i + 1) }), true);
    assert.equal(ach.condition({ completedChunks: [1] }), false);
  });

  it('points100 triggers at 100 points', () => {
    const ach = achievements.find(a => a.id === 'points100');
    assert.equal(ach.condition({ points: 100 }), true);
    assert.equal(ach.condition({ points: 99 }), false);
  });

  it('streak3 triggers at 3-day streak', () => {
    const ach = achievements.find(a => a.id === 'streak3');
    assert.equal(ach.condition({ streak: 3 }), true);
    assert.equal(ach.condition({ streak: 2 }), false);
  });

  it('streak7 triggers at 7-day streak', () => {
    const ach = achievements.find(a => a.id === 'streak7');
    assert.equal(ach.condition({ streak: 7 }), true);
    assert.equal(ach.condition({ streak: 6 }), false);
  });
});
