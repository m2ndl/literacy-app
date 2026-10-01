import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { units, gpc, ALPHABET } from '../data.js';
import { createQuestionBank } from '../questions.js';
import { makeRng, requiredClips, sameSound, contrastOf } from '../phonics.js';

const bank = createQuestionBank({ units, gpc, alphabet: ALPHABET });
const clipKeys = new Set(requiredClips(units, gpc, ALPHABET).map(c => c.key));
const SEEDS = [1, 2, 3, 4, 5];

// Minimum questions per activity (some pools are small by design, e.g. unit 1 has 6 sounds).
const MIN_ITEMS = { 'sound-match': 4, 'capital-match': 4, 'which-word': 3, 'word-build': 6, 'missing-letter': 6,
  meaning: 6, 'first-last-sound': 6, 'complete-sentence': 4, 'read-text': 9 };

describe('question bank', () => {
  for (const u of units) {
    for (const activity of u.activities) {
      it(`unit ${u.id} / ${activity} builds valid questions`, () => {
        for (const seed of SEEDS) {
          const qs = bank.build(u.id, activity, { rng: makeRng(seed) });
          assert.ok(qs.length >= MIN_ITEMS[activity], `only ${qs.length} questions`);
          assert.ok(qs.length <= 12);
          assert.equal(new Set(qs.map(q => q.key)).size, qs.length, 'duplicate question keys');
          for (const q of qs) {
            if (q.prompt.audio) assert.ok(clipKeys.has(q.prompt.audio), `missing clip ${q.prompt.audio}`);
            if (q.feedback.audio) assert.ok(clipKeys.has(q.feedback.audio), `missing clip ${q.feedback.audio}`);
            if (q.type === 'build') {
              const labels = q.tiles.map(t => t.label);
              for (const piece of q.answerTiles) assert.ok(labels.includes(piece), `tile ${piece} missing`);
              assert.ok(q.tiles.length > q.answerTiles.length, 'build needs at least one distractor tile');
              assert.ok(bank.isCorrect(q, q.answerTiles));
              continue;
            }
            const values = q.options.map(o => o.value);
            assert.equal(new Set(values).size, values.length, `duplicate options ${values}`);
            assert.equal(values.filter(v => v === q.answer).length, 1, 'exactly one correct option');
            assert.ok(values.length >= 2 && values.length <= 4);
            if (q.type === 'choice' && q.options[0].lang === 'en' && activity !== 'complete-sentence' && activity !== 'which-word') {
              // grapheme options: never two spellings of the same sound
              for (let i = 0; i < values.length; i++) {
                for (let j = i + 1; j < values.length; j++) {
                  assert.ok(!sameSound(String(values[i]).toLowerCase(), String(values[j]).toLowerCase()) || activity === 'capital-match',
                    `same-sound options ${values[i]} / ${values[j]}`);
                }
              }
            }
          }
        }
      });
    }
  }

  it('sound-match covers every new sound of a unit', () => {
    const qs = bank.build(7, 'sound-match', { rng: makeRng(9) });
    const items = qs.map(q => q.item);
    for (const ph of ['sh', 'ch', 'th', 'dh']) assert.ok(items.includes(ph), `missing ${ph}`);
  });

  it('which-word options are minimal pairs of the target', () => {
    for (const seed of SEEDS) {
      for (const q of bank.build(4, 'which-word', { rng: makeRng(seed) })) {
        for (const o of q.options) if (o.value !== q.answer) assert.ok(contrastOf(q.answer, o.value), `${q.answer}/${o.value}`);
      }
    }
  });

  it('missing-letter blanks vowels most of the time', () => {
    let vowels = 0;
    let total = 0;
    for (const seed of SEEDS) {
      for (const q of bank.build(3, 'missing-letter', { rng: makeRng(seed) })) {
        total++;
        if ('aeiou'.includes(q.answer)) vowels++;
      }
    }
    assert.ok(vowels / total >= 0.5, `vowel share ${vowels / total}`);
  });

  it('meaning distractors never share a near-synonym group with the target', () => {
    for (const seed of SEEDS) {
      for (const q of bank.build(9, 'meaning', { rng: makeRng(seed) })) {
        const target = bank.wordInfo(q.answer);
        for (const o of q.options) {
          if (o.value === q.answer || !target.group) continue;
          assert.notEqual(bank.wordInfo(o.value).group, target.group, `${q.answer} vs ${o.value}`);
        }
      }
    }
  });

  it('complete-sentence keeps the sentence and marks the blank', () => {
    const qs = bank.build(7, 'complete-sentence', { rng: makeRng(3) });
    for (const q of qs) {
      assert.ok(q.prompt.tokens.length > 1);
      assert.ok(q.prompt.blankIndex >= 0 && q.prompt.blankIndex < q.prompt.tokens.length);
    }
    const plural = qs.find(q => q.answer === 'pens');
    if (plural) for (const o of plural.options) assert.ok(o.value.endsWith('s'), `plural distractor ${o.value}`);
  });

  it('isCorrect handles every question type', () => {
    const [choice] = bank.build(1, 'sound-match', { rng: makeRng(1) });
    assert.equal(bank.isCorrect(choice, choice.answer), true);
    assert.equal(bank.isCorrect(choice, '#'), false);
    const [build] = bank.build(1, 'word-build', { rng: makeRng(1) });
    assert.equal(bank.isCorrect(build, [...build.answerTiles].reverse()), build.answerTiles.length === 1 || build.answerTiles.join() === [...build.answerTiles].reverse().join());
    const [yn] = bank.build(10, 'read-text', { rng: makeRng(1) });
    assert.equal(bank.isCorrect(yn, yn.answer), true);
    assert.equal(bank.isCorrect(yn, !yn.answer), false);
  });
});
