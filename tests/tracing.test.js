import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LETTERS, BOX, scoreTrace } from '../tracing.js';
import { units } from '../data.js';

const mirror = (strokes) => strokes.map(s => s.map(([x, y]) => [BOX.w - x, y]));
const reverse = (strokes) => strokes.map(s => [...s].reverse()).reverse();
const jitter = (strokes, amount = 4) => strokes.map(s => s.map(([x, y], i) => [x + Math.sin(i) * amount, y + Math.cos(i * 1.3) * amount]));
const shift = (strokes, dx, dy) => strokes.map(s => s.map(([x, y]) => [x + dx, y + dy]));

describe('letter templates', () => {
  it('cover a–z and stay inside the writing box', () => {
    assert.deepEqual(Object.keys(LETTERS).sort().join(''), 'abcdefghijklmnopqrstuvwxyz');
    for (const [l, strokes] of Object.entries(LETTERS)) {
      assert.ok(strokes.length >= 1 && strokes.length <= 3, l);
      for (const s of strokes) {
        for (const [x, y] of s) {
          assert.ok(x >= 0 && x <= BOX.w && y >= 0 && y <= BOX.h, `${l}: point ${x},${y} outside the box`);
        }
      }
    }
  });

  it('sit on the guide lines: tall letters reach the top line, the rest stay under it', () => {
    const top = (l) => Math.min(...LETTERS[l].flat().map(p => p[1]));
    const bottom = (l) => Math.max(...LETTERS[l].flat().map(p => p[1]));
    for (const l of 'bdhkl') assert.ok(top(l) <= BOX.ascender + 1, `${l} should be tall`);
    for (const l of 'acemnorsuvwxz') assert.ok(top(l) >= BOX.xHeight - 1, `${l} should be small`);
    for (const l of 'gjpqy') assert.ok(bottom(l) > BOX.baseline + 15, `${l} should go below the line`);
    for (const l of 'abcdehklmnorstuvwxz') assert.ok(bottom(l) <= BOX.baseline + 1, `${l} should sit on the line`);
  });

  it('include every letter taught in the course', () => {
    for (const u of units) for (const g of u.graphemes) if (g.length === 1) assert.ok(LETTERS[g], g);
  });
});

describe('scoreTrace', () => {
  it('accepts the template and careful handwriting', () => {
    for (const l of Object.keys(LETTERS)) {
      assert.equal(scoreTrace(l, LETTERS[l]).ok, true, l);
      assert.equal(scoreTrace(l, jitter(LETTERS[l])).ok, true, `${l} (jitter)`);
    }
  });

  it('rejects mirrored letters (b/d, p/q)', () => {
    for (const [a, b] of [['b', 'd'], ['d', 'b'], ['p', 'q'], ['q', 'p']]) {
      assert.equal(scoreTrace(a, LETTERS[b]).ok, false, `${b} written for ${a}`);
    }
    assert.equal(scoreTrace('b', mirror(LETTERS.b)).ok, false);
  });

  it('rejects letters started from the wrong end', () => {
    for (const l of 'lbdhkt') assert.equal(scoreTrace(l, reverse(LETTERS[l])).ok, false, `${l} reversed`);
  });

  it('rejects other letters, scribbles and empty input', () => {
    assert.equal(scoreTrace('a', LETTERS.o).ok, false);
    assert.equal(scoreTrace('n', LETTERS.h).ok, false);
    assert.equal(scoreTrace('s', [[[10, 10], [110, 130], [10, 130], [110, 10]]]).ok, false);
    assert.equal(scoreTrace('s', []).ok, false);
  });

  it('is more lenient for free writing than for tracing', () => {
    const off = shift(LETTERS.o, 16, 0);
    assert.equal(scoreTrace('o', off).ok, false);
    assert.equal(scoreTrace('o', off, { tol: 18, startTol: 28 }).ok, true);
  });
});
