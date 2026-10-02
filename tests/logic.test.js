import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY, V4_KEY, V3_KEY, LEGACY_KEY, PASS_MARK, MAX_ATTEMPTS,
  getDefaultProgress, validateProgress, loadProgressFrom, recordAttempt, topConfusions, graphemeAccuracy,
  hasPassed, getPossibleActivities, isUnitComplete, nextUnitId,
  shuffleArray, formatTime, computeStreak, pickDistractors
} from '../logic.js';
import { units, getAchievements } from '../data.js';

const memoryStorage = (items = {}) => ({ getItem: (k) => (k in items ? items[k] : null) });

// ---------- defaults & validation ----------
describe('getDefaultProgress', () => {
  it('returns a fresh v5 object', () => {
    const p = getDefaultProgress();
    assert.equal(p.version, 5);
    assert.deepEqual(p.fluency, { words: [], sentences: [], texts: [] });
    assert.deepEqual(p.checks, {});
    assert.deepEqual(p.benchmarks, []);
    assert.deepEqual(p.selfAssess, {});
    assert.deepEqual(p.items, {});
    assert.equal(p.placement, null);
    assert.deepEqual(p.perception, {});
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

  it('keeps valid v5 fields and drops invalid ones', () => {
    const input = {
      ...getDefaultProgress(),
      fluency: { words: [{ day: 20000, n: 18, x: 2, s: 60 }], sentences: [{ day: 20000, n: 7, x: 1, s: 90 }], texts: [{ day: 20000, id: '11:0', wpm: 62 }] },
      checks: { 3: { best: 0.92, n: 2, last: 20000, passed: true } },
      benchmarks: [{ stage: 0, day: 20000, done: true, parts: { words: { n: 20, x: 1, s: 60 }, decoding: { r: 5, t: 6 } }, items: [['decoding', 'nis', 1, 1200]], can: { 'read-words': 2 } }],
      selfAssess: { 0: { day: 20000, r: { 'read-words': 2 } } }
    };
    assert.deepEqual(validateProgress(input), input);
    const bad = validateProgress({
      ...input,
      fluency: { words: [{ day: 1, n: -1, x: 0, s: 60 }, 'x'], sentences: 'bad', texts: [{ day: 1, id: 3, wpm: 1 }] },
      checks: { a: { best: 1, n: 1, last: 1 }, 2: { best: 2, n: 1, last: 1 } },
      benchmarks: [{ stage: 'x', day: 1, parts: {} }, { stage: 1, day: 2, parts: { decoding: { r: 7, t: 6 } } }],
      selfAssess: { 1: { day: 3, r: { a: 3, b: 1 } } }
    });
    assert.deepEqual(bad.fluency, { words: [], sentences: [], texts: [] });
    assert.deepEqual(bad.checks, {});
    assert.deepEqual(bad.benchmarks, []);
    assert.deepEqual(bad.selfAssess, { 1: { day: 3, r: { b: 1 } } });
  });

  it('migrates v4 progress: keeps it, with empty Phase 4 records', () => {
    const v4 = { ...getDefaultProgress(), version: 4, points: 70, completedUnits: [1, 2], items: { 'w:pin': { b: 2, due: 20000, h: '11', rt: null, days: 2, last: 19998 } } };
    delete v4.fluency; delete v4.checks; delete v4.benchmarks; delete v4.selfAssess;
    const p = validateProgress(v4);
    assert.equal(p.version, 5);
    assert.equal(p.points, 70);
    assert.deepEqual(p.completedUnits, [1, 2]);
    assert.equal(p.items['w:pin'].b, 2);
    assert.deepEqual(p.benchmarks, []);
  });

  it('keeps valid v4 fields', () => {
    const input = {
      ...getDefaultProgress(),
      items: { 'w:pin': { b: 2, due: 20000, h: '101', rt: 1500, days: 2, last: 19998 } },
      placement: { day: 19990, start: 4, passed: [1, 2, 3] },
      perception: { 'i-e': { n: 32, k: 25, blocks: [70, 86] } },
      lastBackupDay: 19995,
      unlockedUnit: 4, completedUnits: [1, 2, 3], completedActivities: { 1: ['sound-match'] },
      points: 120, streak: 3, lastLoginDate: '2026-01-15', earnedAchievements: ['unit1'], timeSpent: 600,
      attempts: [{ t: 1, u: 1, a: 'sound-match', i: 's', n: 0, ok: true, c: 's', rt: 900 }],
      stats: { gpc: { s: { seen: 3, correct: 2 } }, confusions: { 'e>i': 2 } },
      seenNotices: ['new-course']
    };
    assert.deepEqual(validateProgress(input), input);
  });

  it('migrates v3 progress: keeps it and rebuilds item memory from the log', () => {
    const t = new Date(2026, 0, 15, 10).getTime();
    const v3 = {
      version: 3, unlockedUnit: 3, completedUnits: [1, 2], completedActivities: { 1: ['sound-match'] }, points: 80,
      attempts: [
        { t, u: 1, a: 'which-word', i: 'pin', n: 0, ok: true, c: 'pin', rt: 1400 },
        { t, u: 1, a: 'sound-match', i: 'ae', n: 0, ok: false, c: 'e', rt: 2000 },
        { t, u: 1, a: 'sound-match', i: 'ae', n: 1, ok: true, c: 'a', rt: 900 },
        { t, u: 1, a: 'complete-sentence', i: 'It is a pin.', n: 0, ok: true, c: 'pin', rt: 900 }
      ]
    };
    const p = validateProgress(v3);
    assert.equal(p.version, 5);
    assert.equal(p.unlockedUnit, 3);
    assert.equal(p.points, 80);
    assert.equal(p.attempts.length, 4);
    assert.deepEqual(Object.keys(p.items).sort(), ['ph:ae', 'w:pin']);
    assert.equal(p.items['w:pin'].b, 1);
    assert.equal(p.items['ph:ae'].h, '0');
  });

  it('drops invalid item records', () => {
    const p = validateProgress({ ...getDefaultProgress(), items: { 'w:a': { b: 9, due: 1, h: '1', rt: null, days: 1, last: 1 }, 'x:b': { b: 1, due: 1, h: '', rt: null, days: 0, last: null }, 'w:ok': { b: 1, due: 5, h: '1', rt: null, days: 1, last: 4 } } });
    assert.deepEqual(Object.keys(p.items), ['w:ok']);
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
  it('loads v5 progress, or migrates v4 progress when there is no v5 yet', () => {
    const v4 = { ...getDefaultProgress(), version: 4, points: 33 };
    assert.equal(loadProgressFrom(memoryStorage({ [V4_KEY]: JSON.stringify(v4) })).progress.points, 33);
    const both = loadProgressFrom(memoryStorage({ [V4_KEY]: JSON.stringify(v4), [STORAGE_KEY]: JSON.stringify({ ...getDefaultProgress(), points: 8 }) }));
    assert.equal(both.progress.points, 8);
  });

  it('loads current progress', () => {
    const saved = { ...getDefaultProgress(), points: 40 };
    const { progress, legacyFound } = loadProgressFrom(memoryStorage({ [STORAGE_KEY]: JSON.stringify(saved) }));
    assert.equal(progress.points, 40);
    assert.equal(legacyFound, false);
  });

  it('migrates v3 progress when there is no newer progress yet', () => {
    const v3 = { ...getDefaultProgress(), version: 3, points: 55 };
    delete v3.items;
    const { progress } = loadProgressFrom(memoryStorage({ [V3_KEY]: JSON.stringify(v3) }));
    assert.equal(progress.version, 5);
    assert.equal(progress.points, 55);
    const both = loadProgressFrom(memoryStorage({ [V3_KEY]: JSON.stringify(v3), [STORAGE_KEY]: JSON.stringify({ ...getDefaultProgress(), points: 9 }) }));
    assert.equal(both.progress.points, 9);
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
    assert.deepEqual(p.attempts[0], { t: 10, u: 1, a: 'sound-match', i: 'p', n: 0, ok: false, c: 'b', rt: 1200, f: ['p'], x: 'p>b' });
    assert.deepEqual(p.attempts[1], { t: 11, u: 1, a: 'sound-match', i: 'p', n: 1, ok: true, c: 'p', rt: 800 });
    assert.deepEqual(p.stats.gpc.p, { seen: 2, correct: 1 });
    assert.deepEqual(p.stats.confusions, { 'p>b': 1 });
  });

  it('does not count the delayed re-test as a first try', () => {
    const p = getDefaultProgress();
    recordAttempt(p, { u: 1, a: 'sound-match', i: 'p', n: 0, d: true, ok: true, c: 'p', rt: 700, focus: ['p'] }, 12);
    assert.deepEqual(p.stats.gpc, {});
    assert.equal(p.attempts[0].d, true);
    assert.equal(p.attempts[0].f, undefined);
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

  it('knows when a unit is complete (optional activities are not needed)', () => {
    const u = units[0];
    const required = u.activities.filter(a => a !== 'tracing');
    assert.equal(isUnitComplete(u, {}), false);
    assert.equal(isUnitComplete(u, { 1: required.slice(1) }), false);
    assert.equal(isUnitComplete(u, { 1: [...required] }), true);
    assert.equal(isUnitComplete(u, { 1: [...u.activities] }), true);
    assert.equal(isUnitComplete(undefined, {}), false);
  });

  it('finds the next unit', () => {
    assert.equal(nextUnitId(units, 1), 2);
    assert.equal(nextUnitId(units, 10), 11);
    assert.equal(nextUnitId(units, 24), null);
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
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  it('starts at 1, keeps today, increments after yesterday, resets after a gap', () => {
    assert.equal(computeStreak({ ...getDefaultProgress() }).streak, 1);
    assert.equal(computeStreak({ ...getDefaultProgress(), streak: 5, lastLoginDate: dayStr(0) }).streak, 5);
    assert.equal(computeStreak({ ...getDefaultProgress(), streak: 3, lastLoginDate: dayStr(-1) }).streak, 4);
    assert.equal(computeStreak({ ...getDefaultProgress(), streak: 10, lastLoginDate: '2020-01-01' }).streak, 1);
  });

  it('uses the local date, not the UTC date', () => {
    // 1 am local time: in UTC+3 the UTC date is still the previous day.
    const now = new Date(2026, 2, 10, 1, 0);
    assert.equal(computeStreak({ ...getDefaultProgress() }, now).lastLoginDate, '2026-03-10');
    assert.equal(computeStreak({ ...getDefaultProgress(), streak: 2, lastLoginDate: '2026-03-09' }, now).streak, 3);
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
