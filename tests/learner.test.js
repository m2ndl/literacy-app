import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERVALS, MASTERY, dayNumber, localDateString, newItem, updateItem, learnItems, isMastered, itemStatus,
  dueItems, weakTargets, recentConfusions, replayAttempts, keyForAttempt, placementOutcome, recordPerceptionBlock
} from '../learner.js';

describe('days', () => {
  it('counts local calendar days', () => {
    const a = new Date(2026, 0, 1, 0, 30);
    const b = new Date(2026, 0, 1, 23, 50);
    const c = new Date(2026, 0, 2, 0, 5);
    assert.equal(dayNumber(a), dayNumber(b));
    assert.equal(dayNumber(c), dayNumber(a) + 1);
    assert.equal(localDateString(a), '2026-01-01');
  });
});

describe('updateItem (Leitner)', () => {
  it('moves up one box when due, and back to box 1 when wrong', () => {
    let m = updateItem(null, true, { day: 100, rt: 1500 });
    assert.deepEqual(m, { b: 1, due: 100 + INTERVALS[1], h: '1', rt: 1500, days: 1, last: 100 });
    m = updateItem(m, true, { day: 101 });
    assert.equal(m.b, 2);
    assert.equal(m.due, 101 + INTERVALS[2]);
    m = updateItem(m, false, { day: 103 });
    assert.equal(m.b, 1);
    assert.equal(m.due, 104);
    assert.equal(m.h, '110');
    assert.equal(m.days, 3);
  });

  it('does not skip the spacing when answered again before it is due', () => {
    let m = updateItem(null, true, { day: 100 });
    m = updateItem(m, true, { day: 100 });
    m = updateItem(m, true, { day: 100 });
    assert.equal(m.b, 1);
    assert.equal(m.days, 1);
    assert.equal(m.h, '111');
  });

  it('caps the box and the history', () => {
    let m = newItem();
    for (let d = 0; d < 400; d += 40) m = updateItem(m, true, { day: d });
    assert.equal(m.b, INTERVALS.length - 1);
    assert.equal(m.h.length, 10);
  });

  it('averages response times of right answers only', () => {
    let m = updateItem(null, true, { day: 1, rt: 1000 });
    m = updateItem(m, false, { day: 2, rt: 9000 });
    assert.equal(m.rt, 1000);
    m = updateItem(m, true, { day: 3, rt: 2000 });
    assert.equal(m.rt, 1300);
  });

  it('learnItems updates several keys', () => {
    const items = learnItems({}, ['w:pin', 'ph:ih'], true, { day: 5 });
    assert.deepEqual(Object.keys(items), ['w:pin', 'ph:ih']);
  });
});

describe('mastery', () => {
  const item = (h, days, rt = 1500) => ({ b: 3, due: 0, h, rt, days, last: 1 });
  it('needs 8+ results at 90%, on 2+ days, and fluent answers', () => {
    assert.equal(isMastered(item('11111111', 2)), true);
    assert.equal(isMastered(item('1111111', 2)), false);                 // too few
    assert.equal(isMastered(item('1111111101', 3)), true);               // 9 of 10
    assert.equal(isMastered(item('1111111001', 3)), false);              // 8 of 10
    assert.equal(isMastered(item('11111111', 1)), false);                // one day only
    assert.equal(isMastered(item('11111111', 2, MASTERY.maxRt + 1)), false); // slow
    assert.equal(isMastered(item('11111111', 2, null)), true);           // untimed tasks
    assert.equal(itemStatus(undefined), 'new');
    assert.equal(itemStatus(item('10', 1)), 'learning');
  });
});

describe('dueItems', () => {
  it('lists due items, most overdue and least secure first', () => {
    const items = {
      'w:a': { b: 2, due: 10, h: '1', rt: null, days: 1, last: 8 },
      'w:b': { b: 1, due: 8, h: '0', rt: null, days: 1, last: 7 },
      'w:c': { b: 3, due: 8, h: '1', rt: null, days: 1, last: 4 },
      'w:d': { b: 1, due: 11, h: '1', rt: null, days: 1, last: 10 },
      'w:e': { b: 0, due: 0, h: '', rt: null, days: 0, last: null }
    };
    assert.deepEqual(dueItems(items, 10), ['w:b', 'w:c', 'w:a']);
    assert.deepEqual(dueItems(items, 10, { limit: 1 }), ['w:b']);
    assert.deepEqual(dueItems(items, 10, { filter: k => k !== 'w:b' }), ['w:c', 'w:a']);
  });
});

describe('weak sounds', () => {
  const a = (f, ok, x) => ({ t: 1, n: 0, ok, f, ...(x ? { x } : {}) });
  it('finds graphemes with low recent accuracy or repeated confusions', () => {
    const log = [
      a(['i'], false, 'i>e'), a(['i'], false, 'i>e'), a(['i'], true), a(['i'], true),
      a(['p'], false, 'p>b'), a(['p'], true), a(['p'], true), a(['p'], true), a(['p'], true),
      a(['s'], true), a(['s'], true), a(['s'], true), a(['s'], true)
    ];
    const weak = weakTargets(log);
    assert.equal(weak[0].target, 'i');
    assert.equal(weak[0].partner, 'e');
    assert.ok(!weak.some(w => w.target === 's'));
    assert.ok(!weak.some(w => w.target === 'p'));   // one confusion, 80% right
    assert.deepEqual(recentConfusions(log, { n: 1 }), [{ target: 'i', chosen: 'e', count: 2 }]);
  });

  it('forgets old mistakes outside the window', () => {
    const log = [a(['i'], false, 'i>e'), a(['i'], false, 'i>e'), ...Array.from({ length: 20 }, () => a(['i'], true))];
    assert.equal(weakTargets(log, { window: 20 }).length, 0);
  });

  it('ignores delayed re-tests', () => {
    const log = Array.from({ length: 5 }, () => ({ t: 1, n: 0, d: true, ok: false, f: ['e'] }));
    assert.equal(weakTargets(log).length, 0);
  });
});

describe('replayAttempts', () => {
  it('rebuilds item memory from first tries in time order', () => {
    const day = (d) => new Date(2026, 0, d, 12).getTime();
    const log = [
      { t: day(2), a: 'meaning', i: 'pin', n: 0, ok: true },
      { t: day(1), a: 'which-word', i: 'pin', n: 0, ok: true },
      { t: day(1), a: 'sound-match', i: 'ae', n: 0, ok: false },
      { t: day(1), a: 'sound-match', i: 'ae', n: 1, ok: true },
      { t: day(1), a: 'read-text', i: 'x:0', n: 0, ok: true }
    ];
    const items = replayAttempts(log);
    assert.equal(items['w:pin'].b, 2);
    assert.equal(items['w:pin'].days, 2);
    assert.equal(items['ph:ae'].h, '0');
    assert.equal(Object.keys(items).length, 2);
    assert.equal(keyForAttempt({ a: 'heart-words', i: 'the' }), 'h:the');
  });
});

describe('placementOutcome', () => {
  const ids = [1, 2, 3, 4, 5];
  it('passes units in order until the first one below 80%', () => {
    assert.deepEqual(placementOutcome([{ unit: 1, right: 5, total: 5 }, { unit: 2, right: 4, total: 5 }, { unit: 3, right: 3, total: 5 }], ids), { passed: [1, 2], start: 3 });
    assert.deepEqual(placementOutcome([{ unit: 1, right: 2, total: 5 }], ids), { passed: [], start: 1 });
    assert.deepEqual(placementOutcome(ids.map(unit => ({ unit, right: 5, total: 5 })), ids), { passed: ids, start: 5 });
  });
});

describe('recordPerceptionBlock', () => {
  it('keeps totals and the last blocks', () => {
    let s = {};
    for (let i = 0; i < 12; i++) s = recordPerceptionBlock(s, 'i-e', 12, 16);
    assert.equal(s['i-e'].n, 192);
    assert.equal(s['i-e'].k, 144);
    assert.equal(s['i-e'].blocks.length, 10);
    assert.equal(s['i-e'].blocks[0], 75);
  });
});
