import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultProgress,
  validateProgress,
  mergeProgress,
  mergeStreak,
  withOwnCounters,
  resetProgress
} from '../logic.js';

const progress = (fields) => ({ ...getDefaultProgress(), ...fields });
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

const phone = withOwnCounters(progress({
  unlockedChunk: 3, completedChunks: [1, 2], completedActivities: { 1: ['word-build', 'sound-match'], 3: ['sound-match'] },
  points: 120, timeSpent: 900, streak: 3, lastLoginDate: '2026-09-28', earnedAchievements: ['chunk1', 'points100']
}), 'phone');
const laptop = withOwnCounters(progress({
  unlockedChunk: 2, completedChunks: [1], completedActivities: { 1: ['capital-match'], 2: ['word-match'] },
  points: 40, timeSpent: 300, streak: 1, lastLoginDate: '2026-09-29', earnedAchievements: ['chunk1']
}), 'laptop');

describe('mergeProgress', () => {
  it('combines completed work from both devices', () => {
    const m = mergeProgress(phone, laptop);
    assert.equal(m.unlockedChunk, 3);
    assert.deepEqual(m.completedChunks, [1, 2]);
    assert.deepEqual(m.completedActivities, { 1: ['capital-match', 'sound-match', 'word-build'], 2: ['word-match'], 3: ['sound-match'] });
    assert.deepEqual(m.earnedAchievements, ['chunk1', 'points100']);
  });

  it('adds up points and learning time per device', () => {
    const m = mergeProgress(phone, laptop);
    assert.equal(m.points, 160);
    assert.equal(m.timeSpent, 1200);
    assert.deepEqual(m.counters.points, { laptop: 40, phone: 120 });
  });

  it("doesn't count the same device's points twice after repeated syncs", () => {
    let server = mergeProgress(phone, laptop);
    // The phone earns 10 more points, then syncs twice
    const phoneLater = withOwnCounters({ ...server, points: server.points + 10 }, 'phone');
    server = mergeProgress(phoneLater, server);
    server = mergeProgress(phoneLater, server);
    assert.equal(server.points, 170);
    assert.equal(server.counters.points.phone, 130);
  });

  it('gives the same result in either order, and merging twice changes nothing', () => {
    const ab = mergeProgress(phone, laptop);
    same(ab, mergeProgress(laptop, phone));
    same(mergeProgress(ab, ab), ab);
    same(mergeProgress(ab, laptop), ab);
  });

  it('a reset on one device replaces older progress everywhere', () => {
    const fresh = resetProgress(phone);
    assert.equal(fresh.epoch, 1);
    assert.equal(fresh.points, 0);
    const m = mergeProgress(laptop, fresh);
    assert.equal(m.epoch, 1);
    assert.equal(m.points, 0);
    assert.deepEqual(m.completedChunks, []);
    // Work done after the reset is kept when the other device catches up
    const afterReset = withOwnCounters({ ...fresh, points: 15, completedChunks: [1] }, 'phone');
    assert.equal(mergeProgress(afterReset, laptop).points, 15);
  });

  it('keeps totals from progress saved before syncing existed', () => {
    const legacy = { unlockedChunk: 2, completedChunks: [1], completedActivities: {}, points: 75, streak: 2, lastLoginDate: '2026-09-01', earnedAchievements: [], timeSpent: 50, version: 2 };
    const m = mergeProgress(legacy, getDefaultProgress());
    assert.equal(m.points, 75);
    assert.equal(m.timeSpent, 50);
  });

  it('ignores malformed input instead of crashing', () => {
    const m = mergeProgress({ completedActivities: { 1: 'oops' }, counters: { points: { x: -5, y: 'a' } } }, null);
    assert.deepEqual(m.completedActivities, { 1: [] });
    assert.deepEqual(m.counters.points, {});
  });
});

describe('withOwnCounters', () => {
  it("records this device's share of the totals", () => {
    const p = withOwnCounters(progress({ points: 50, counters: { points: { other: 20 }, timeSpent: {} } }), 'me');
    assert.deepEqual(p.counters.points, { other: 20, me: 30 });
  });

  it("doesn't add an empty counter for a device that earned nothing", () => {
    const p = withOwnCounters(progress({ points: 20, counters: { points: { other: 20 }, timeSpent: {} } }), 'me');
    assert.deepEqual(p.counters.points, { other: 20 });
  });
});

describe('mergeStreak', () => {
  it('joins runs on consecutive days', () => {
    assert.deepEqual(mergeStreak({ streak: 3, lastLoginDate: '2026-09-28' }, { streak: 1, lastLoginDate: '2026-09-29' }),
      { streak: 4, lastLoginDate: '2026-09-29' });
  });

  it('keeps the later run when there is a gap', () => {
    assert.deepEqual(mergeStreak({ streak: 5, lastLoginDate: '2026-09-20' }, { streak: 1, lastLoginDate: '2026-09-29' }),
      { streak: 1, lastLoginDate: '2026-09-29' });
  });

  it('takes the longer run on the same day', () => {
    assert.deepEqual(mergeStreak({ streak: 2, lastLoginDate: '2026-09-29' }, { streak: 6, lastLoginDate: '2026-09-29' }),
      { streak: 6, lastLoginDate: '2026-09-29' });
  });

  it('handles a device that has never been opened', () => {
    assert.deepEqual(mergeStreak({ streak: 0, lastLoginDate: null }, { streak: 2, lastLoginDate: '2026-09-29' }),
      { streak: 2, lastLoginDate: '2026-09-29' });
  });

  it('works across month ends', () => {
    assert.equal(mergeStreak({ streak: 2, lastLoginDate: '2026-09-30' }, { streak: 1, lastLoginDate: '2026-10-01' }).streak, 3);
  });
});

describe('validateProgress with sync fields', () => {
  it('keeps epoch and counters, dropping bad values', () => {
    const p = validateProgress({ epoch: 3, counters: { points: { a: 5, b: -1 }, timeSpent: { a: 9 } } });
    assert.equal(p.epoch, 3);
    assert.deepEqual(p.counters, { points: { a: 5 }, timeSpent: { a: 9 } });
    assert.equal(validateProgress({ epoch: -2 }).epoch, 0);
    assert.equal(validateProgress({ epoch: 1.5 }).epoch, 0);
  });
});

describe('mergeProgress with placement', () => {
  it('keeps the furthest placement from either device', () => {
    const a = { ...getDefaultProgress(), placedAt: 3 };
    const b = { ...getDefaultProgress(), placedAt: 1 };
    assert.equal(mergeProgress(a, b).placedAt, 3);
    assert.equal(mergeProgress(b, a).placedAt, 3);
  });
});
