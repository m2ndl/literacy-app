import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appData, getAchievements } from '../data.js';
import { getDefaultProgress, validateProgress, liveStreak, computeStreak, courseProgress, nextStep, getPossibleActivities } from '../logic.js';

// The stored day key for 1 Oct 2026 plus offset days
const day = (offset) => {
  return computeStreak({ ...getDefaultProgress(), lastLoginDate: null }, new Date(2026, 9, 1 + offset, 15, 0)).lastLoginDate;
};

describe('review group renumbered from 11 to 10', () => {
  it('has groups numbered 1 to 10 with no gaps', () => {
    assert.deepEqual(appData.chunks.map(c => c.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('moves saved progress from group 11 to group 10', () => {
    const p = validateProgress({ unlockedChunk: 11, completedChunks: [9, 11], completedActivities: { 9: ['word-build'], 11: ['word-match'] } });
    assert.equal(p.unlockedChunk, 10);
    assert.deepEqual(p.completedChunks, [9, 10]);
    assert.deepEqual(p.completedActivities, { 9: ['word-build'], 10: ['word-match'] });
  });

  it('combines entries when both 10 and 11 are present', () => {
    const p = validateProgress({ completedChunks: [10, 11], completedActivities: { 10: ['a'], 11: ['b', 'a'] } });
    assert.deepEqual(p.completedChunks, [10]);
    assert.deepEqual(p.completedActivities['10'].sort(), ['a', 'b']);
  });
});

describe('liveStreak', () => {
  const now = new Date(2026, 9, 1, 15, 0);
  it('shows the streak when the learner learned today or yesterday', () => {
    assert.equal(liveStreak({ streak: 4, lastLoginDate: day(0) }, now), 4);
    assert.equal(liveStreak({ streak: 4, lastLoginDate: day(-1) }, now), 4);
  });
  it('shows 0 once a day has been missed', () => {
    assert.equal(liveStreak({ streak: 4, lastLoginDate: day(-2) }, now), 0);
    assert.equal(liveStreak({ streak: 0, lastLoginDate: null }, now), 0);
  });
});

describe('courseProgress and nextStep', () => {
  it('counts every activity in the course', () => {
    const total = appData.chunks.reduce((n, c) => n + getPossibleActivities(c).length, 0);
    assert.deepEqual(courseProgress({}), { done: 0, total });
    assert.equal(courseProgress({ 1: ['sound-match', 'not-real'] }).done, 1);
  });

  it('starts with the first activity of group 1', () => {
    assert.deepEqual(nextStep(getDefaultProgress()), { chunkId: 1, activityId: 'sound-match' });
  });

  it('skips finished activities and moves to the next open group', () => {
    const all1 = getPossibleActivities(appData.chunks[0]);
    assert.deepEqual(nextStep({ ...getDefaultProgress(), completedActivities: { 1: ['sound-match'] } }),
      { chunkId: 1, activityId: 'capital-match' });
    assert.deepEqual(nextStep({ ...getDefaultProgress(), unlockedChunk: 2, completedActivities: { 1: all1 } }),
      { chunkId: 2, activityId: 'sound-match' });
  });

  it("doesn't suggest a locked group", () => {
    const all1 = getPossibleActivities(appData.chunks[0]);
    assert.equal(nextStep({ ...getDefaultProgress(), unlockedChunk: 1, completedActivities: { 1: all1 } }), null);
  });
});

describe('achievements', () => {
  it('gives a first win after one finished activity', () => {
    const first = getAchievements(appData.chunks.length).find(a => a.id === 'first-activity');
    assert.equal(first.condition(getDefaultProgress()), false);
    assert.equal(first.condition({ ...getDefaultProgress(), completedActivities: { 1: ['sound-match'] } }), true);
  });
});
