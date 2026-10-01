import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, LEGACY_KEY, PASS_MARK, MAX_ATTEMPTS,
  getDefaultProgress, validateProgress, loadProgressFrom, recordAttempt, topConfusions, graphemeAccuracy,
  hasPassed, getPossibleActivities, isUnitComplete, nextUnitId,
  shuffleArray, formatTime, computeStreak, pickDistractors
} from '../logic.js';
import { units, getAchievements } from '../data.js';

const memoryStorage = (items = {}) => ({ getItem: (k) => (k in items ? items[k] : null) });

// ---------- defaults & validation ----------
describe('getDefaultProgress', () => {
  it('returns a fresh v3 object', () => {
    const p = getDefaultProgress();
    assert.equal(p.version, 3);
    assert.equal(p.unlockedUnit, 1);
    assert.deepEqual(p.completedUnits, []);
    assert.deepEqual(p.completedActivities, {});
    assert.deepEqual(p.attempts, []);
    assert.deepEqual(p.stats, { gpc: {}, confusions: {} });
    assert.equal(p.points, 0);
  });

  it('returns independent objects on each call', () => {
    const a = getDefaultProgress();
    a.points = 999;
    a.attempts.push({ ok: true });
    const b = getDefaultProgress();
    assert.equal(b.points, 0);
    assert.equal(b.attempts.length, 0);
  });
});

describe('validateProgress', () => {
  it('returns defaults for non-objects and old versions', () => {
    for (const bad of [null, 'x', 42, undefined, { version: 2, points: 50 }]) {
      assert.deepEqual(validateProgress(bad), getDefaultProgress());
    }
  });

  it('keeps valid v3 fields', () => {
    const input = {
      ...getDefaultProgress(),
      unlockedUnit: 4, completedUnits: [1, 2, 3], completedActivities: { 1: ['sound-match'] },
      points: 120, streak: 3, lastLoginDate: '2026-01-15', earnedAchievements: ['unit1'], timeSpent: 600,
      attempts: [{ t: 1, u: 1, a: 'sound-match', i: 's', n: 0, ok: true, c: 's', rt: 900 }],
      stats: { gpc: { s: { seen: 3, correct: 2 } }, confusions: { 'e>i': 2 } },
      seenNotices: ['new-course']
    };
    assert.deepEqual(validateProgress(input), input);
  });

  it('cleans invalid values', () => {
    const p = validateProgress({
      version: 3, unlockedUnit: -1, completedUnits: [1, 'x'], completedActivities: { 1: ['a', 3], 2: 'bad' },
      points: -5, streak: 'x', timeSpent: -1, attempts: [{ ok: true }, 'bad', null],
      stats: { gpc: { s: { seen: 2, correct: 5 }, t: 'bad' }, confusions: { 'a>b': -1, 'c>d': 2 } }
    });
    assert.equal(p.unlockedUnit, 1);
    assert.deepEqual(p.completedUnits, [1]);
    assert.deepEqual(p.completedActivities, { 1: ['a'] });
    assert.equal(p.points, 0);
    assert.equal(p.streak, 0);
    assert.equal(p.timeSpent, 0);
    assert.equal(p.attempts.length, 1);
    assert.deepEqual(p.stats.gpc, { s: { seen: 2, correct: 2 } });
    assert.deepEqual(p.stats.confusions, { 'c>d': 2 });
  });
});

describe('loadProgressFrom', () => {
  it('loads v3 progress', () => {
    const saved = { ...getDefaultProgress(), points: 40 };
    const { progress, legacyFound } = loadProgressFrom(memoryStorage({ [STORAGE_KEY]: JSON.stringify(saved) }));
    assert.equal(progress.points, 40);
    assert.equal(legacyFound, false);
  });

  it('does not migrate old progress (full reset) but reports it', () => {
    const old = { unlockedChunk: 5, completedChunks: [1, 2, 3, 4], points: 300, version: 2 };
    const { progress, legacyFound } = loadProgressFrom(memoryStorage({ [LEGACY_KEY]: JSON.stringify(old) }));
    assert.deepEqual(progress, getDefaultProgress());
    assert.equal(legacyFound, true);
  });

  it('survives corrupt JSON', () => {
    const { progress } = loadProgressFrom(memoryStorage({ [STORAGE_KEY]: '{oops' }));
    assert.deepEqual(progress, getDefaultProgress());
  });
});

// ---------- attempts & stats ----------
describe('recordAttempt', () => {
  it('logs answers and counts first tries per grapheme', () => {
    const p = getDefaultProgress();
    recordAttempt(p, { u: 1, a: 'sound-match', i: 'p', n: 0, ok: false, c: 'b', rt: 1200, focus: ['p'], confusion: { target: 'p', chosen: 'b' } }, 10);
    recordAttempt(p, { u: 1, a: 'sound-match', i: 'p', n: 1, ok: true, c: 'p', rt: 800, focus: ['p'] }, 11);
    recordAttempt(p, { u: 1, a: 'sound-match', i: 'p', n: 0, ok: true, c: 'p', rt: 700, focus: ['p'] }, 12);
    assert.equal(p.attempts.length, 3);
    assert.deepEqual(p.attempts[0], { t: 10, u: 1, a: 'sound-match', i: 'p', n: 0, ok: false, c: 'b', rt: 1200 });
    assert.deepEqual(p.stats.gpc.p, { seen: 2, correct: 1 });
    assert.deepEqual(p.stats.confusions, { 'p>b': 1 });
  });

  it('keeps only the newest attempts', () => {
    const p = getDefaultProgress();
    for (let i = 0; i < MAX_ATTEMPTS + 20; i++) recordAttempt(p, { u: 1, a: 'x', i: String(i), n: 0, ok: true }, i);
    assert.equal(p.attempts.length, MAX_ATTEMPTS);
    assert.equal(p.attempts[0].t, 20);
  });

  it('ranks confusions and weak graphemes', () => {
    const p = getDefaultProgress();
    p.stats.confusions = { 'i>e': 4, 'p>b': 2, 'u>o': 7 };
    assert.deepEqual(topConfusions(p, 2), [{ target: 'u', chosen: 'o', count: 7 }, { target: 'i', chosen: 'e', count: 4 }]);
    p.stats.gpc = { a: { seen: 4, correct: 4 }, e: { seen: 5, correct: 2 }, x: { seen: 1, correct: 0 } };
    assert.deepEqual(graphemeAccuracy(p).map(r => r.g), ['e', 'a']);
  });
});

// ---------- units & passing ----------
describe('units and passing', () => {
  it('passes at 80% first-try accuracy', () => {
    assert.equal(PASS_MARK, 0.8);
    assert.equal(hasPassed(8, 10), true);
    assert.equal(hasPassed(7, 10), false);
    assert.equal(hasPassed(0, 0), false);
  });

  it('reads each unit\'s activity list', () => {
    assert.deepEqual(getPossibleActivities(units[0]), units[0].activities);
    assert.deepEqual(getPossibleActivities(null), []);
  });

  it('knows when a unit is complete', () => {
    const u = units[0];
    assert.equal(isUnitComplete(u, {}), false);
    assert.equal(isUnitComplete(u, { 1: u.activities.slice(1) }), false);
    assert.equal(isUnitComplete(u, { 1: [...u.activities] }), true);
    assert.equal(isUnitComplete(undefined, {}), false);
  });

  it('finds the next unit', () => {
    assert.equal(nextUnitId(units, 1), 2);
    assert.equal(nextUnitId(units, 10), null);
    assert.equal(nextUnitId(units, 99), null);
  });
});

// ---------- utilities kept from v2 ----------
describe('shuffleArray', () => {
  it('returns the same elements without mutating', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    assert.deepEqual([...result].sort(), [...input].sort());
    assert.deepEqual(input, [1, 2, 3, 4, 5]);
    assert.deepEqual(shuffleArray([]), []);
  });
});

describe('formatTime', () => {
  it('formats seconds, minutes and hours', () => {
    assert.equal(formatTime(30), '30ث');
    assert.equal(formatTime(90), '1د 30ث');
    assert.equal(formatTime(3661), '1س 1د 1ث');
    assert.equal(formatTime(0), '0ث');
    assert.equal(formatTime(3600), '1س 0د 0ث');
  });
});

describe('computeStreak', () => {
  const dayStr = (offset) => {
    const t = new Date();
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  it('starts at 1, keeps today, increments after yesterday, resets after a gap', () => {
    assert.equal(computeStreak({ ...getDefaultProgress() }).streak, 1);
    assert.equal(computeStreak({ ...getDefaultProgress(), streak: 5, lastLoginDate: dayStr(0) }).streak, 5);
    assert.equal(computeStreak({ ...getDefaultProgress(), streak: 3, lastLoginDate: dayStr(-1) }).streak, 4);
    assert.equal(computeStreak({ ...getDefaultProgress(), streak: 10, lastLoginDate: '2020-01-01' }).streak, 1);
  });
});

describe('pickDistractors', () => {
  it('includes the answer, never duplicates and terminates with duplicate pools', () => {
    for (let i = 0; i < 30; i++) {
      const r = pickDistractors(['a', 'b', 'c', 'd', 'e'], 'a', 4);
      assert.ok(r.includes('a'));
      assert.equal(new Set(r).size, r.length);
    }
    const r = pickDistractors(['a', 'a', 'a', 'b'], 'b', 4);
    assert.ok(r.includes('b') && r.length <= 4);
  });
});

describe('achievement conditions', () => {
  const achievements = getAchievements(units.length);
  const byId = (id) => achievements.find(a => a.id === id);
  it('unlock on units, points and streaks', () => {
    assert.equal(byId('unit1').condition({ completedUnits: [1] }), true);
    assert.equal(byId('unit1').condition({ completedUnits: [] }), false);
    assert.equal(byId('unit5').condition({ completedUnits: [1, 2, 3, 4, 5] }), true);
    assert.equal(byId('unit5').condition({ completedUnits: [1, 2] }), false);
    assert.equal(byId('unitAll').condition({ completedUnits: units.map(u => u.id) }), true);
    assert.equal(byId('points100').condition({ points: 100 }), true);
    assert.equal(byId('points100').condition({ points: 99 }), false);
    assert.equal(byId('streak3').condition({ streak: 3 }), true);
    assert.equal(byId('streak7').condition({ streak: 6 }), false);
  });
});
