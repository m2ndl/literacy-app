import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appData } from '../data.js';
import {
  buildQuestionSet,
  activityAccuracy,
  QUESTIONS_PER_ACTIVITY,
  PASS_ACCURACY,
  clipKeyFor,
  slugify,
  neededClips
} from '../logic.js';

// The pool each activity draws from, as in startActivity (app.js)
function poolsFor(chunk) {
  const pools = {};
  if (chunk.letters.length) { pools['sound-match'] = chunk.letters; pools['capital-match'] = chunk.letters; }
  if (chunk.words.length || chunk.letterPairs.length) pools['combined-sound-match'] = [...chunk.words, ...chunk.letterPairs];
  if (chunk.words.length) ['word-build', 'fill-in-the-blank', 'word-match', 'initial-sound'].forEach(a => { pools[a] = chunk.words; });
  if (chunk.sentences?.length) pools['sentence-build'] = chunk.sentences;
  return pools;
}

describe('buildQuestionSet', () => {
  it('returns an empty set for an empty pool', () => {
    assert.deepEqual(buildQuestionSet([]), []);
    assert.deepEqual(buildQuestionSet(undefined), []);
  });

  it('repeats items from a small pool to reach the full length', () => {
    for (let run = 0; run < 50; run++) {
      const set = buildQuestionSet(['b', 't', 'a']);
      assert.equal(set.length, QUESTIONS_PER_ACTIVITY);
      ['b', 't', 'a'].forEach(l => assert.equal(set.filter(x => x === l).length, 2));
    }
  });

  it('never asks the same item twice in a row', () => {
    for (let run = 0; run < 200; run++) {
      for (const pool of [['q', 'x'], ['b', 't', 'a'], ['a', 'b', 'c', 'd']]) {
        const set = buildQuestionSet(pool);
        for (let i = 1; i < set.length; i++) assert.notEqual(set[i], set[i - 1], `${set.join(',')}`);
      }
    }
  });

  it('uses distinct items when the pool is big enough', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const set = buildQuestionSet(pool);
    assert.equal(set.length, QUESTIONS_PER_ACTIVITY);
    assert.equal(new Set(set).size, QUESTIONS_PER_ACTIVITY);
  });
});

describe('passing an activity', () => {
  it('computes accuracy as a whole percentage', () => {
    assert.equal(activityAccuracy(6, 0), 100);
    assert.equal(activityAccuracy(6, 1), 83);
    assert.equal(activityAccuracy(6, 2), 67);
    assert.equal(activityAccuracy(0, 0), 0);
  });

  it('one mistake never fails any activity in the course', () => {
    appData.chunks.forEach(chunk => {
      Object.entries(poolsFor(chunk)).forEach(([activity, pool]) => {
        const total = buildQuestionSet(pool).length;
        assert.ok(activityAccuracy(total, 1) >= PASS_ACCURACY,
          `group ${chunk.id} ${activity}: ${total} questions, one miss gives ${activityAccuracy(total, 1)}%`);
      });
    });
  });

  it('two mistakes out of six still fail', () => {
    assert.ok(activityAccuracy(QUESTIONS_PER_ACTIVITY, 2) < PASS_ACCURACY);
  });
});

describe('audio clip keys', () => {
  it('infers the kind of clip from the text', () => {
    assert.equal(clipKeyFor('b'), 'letters/b');
    assert.equal(clipKeyFor('B'), 'letters/b');
    assert.equal(clipKeyFor('bat'), 'words/bat');
    assert.equal(clipKeyFor('Hamad'), 'words/hamad');
    assert.equal(clipKeyFor('ba'), 'pairs/ba');
    assert.equal(clipKeyFor('a mad dad'), 'sentences/a-mad-dad');
  });

  it('lets the caller say which kind it means', () => {
    assert.equal(clipKeyFor('a', 'word'), 'words/a');
    assert.equal(clipKeyFor('do', 'pair'), 'pairs/do');
    assert.equal(clipKeyFor('do'), 'words/do');
  });

  it('slugifies sentences into file names', () => {
    assert.equal(slugify('Ali can run'), 'ali-can-run');
    assert.equal(slugify('  yes, it is! '), 'yes-it-is');
  });

  it('lists every letter, word, pair and sentence once', () => {
    const clips = neededClips();
    const keys = clips.map(c => c.key);
    assert.equal(new Set(keys).size, keys.length);
    appData.chunks.forEach(chunk => {
      chunk.letters.forEach(l => assert.ok(keys.includes(`letters/${l}`), l));
      chunk.words.forEach(w => assert.ok(keys.includes(`words/${w.toLowerCase()}`), w));
      (chunk.sightWords || []).forEach(w => assert.ok(keys.includes(`words/${w.toLowerCase()}`), w));
      (chunk.sentences || []).forEach(s => assert.ok(keys.includes(`sentences/${slugify(s.text)}`), s.text));
    });
    assert.ok(keys.includes('pairs/do'), 'the pair "do" has its own clip');
  });
});
