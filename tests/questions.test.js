import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { units, gpc, ALPHABET, PERCEPTION, STAGES, ACTIVITY_META } from '../data.js';
import { SENSE, BENCHMARK_TEXTS, PICTURES, BENCH_PSEUDO } from '../data-assess.js';
import { createQuestionBank, PERCEPTION_VOICES, SHORT_PLACEMENT_FROM, CHECK_SIZE } from '../questions.js';
import { makeRng, requiredClips, sameSound, contrastOf, segment } from '../phonics.js';

const bank = createQuestionBank({ units, gpc, alphabet: ALPHABET, perception: PERCEPTION, sense: SENSE, benchTexts: BENCHMARK_TEXTS, stages: STAGES, pictures: PICTURES, benchPseudo: BENCH_PSEUDO });
const allClips = requiredClips(units, gpc, ALPHABET, PERCEPTION, BENCH_PSEUDO.flatMap(s => s.items));
const clipKeys = new Set(allClips.map(c => c.key));
const slowVoices = new Map(allClips.map(c => [c.key, c.voices]));
const SEEDS = [1, 2, 3, 4, 5];

// Minimum questions per activity (some pools are small by design, e.g. unit 1 has 4 sounds and 5 words).
const MIN_ITEMS = { 'sound-match': 4, 'capital-match': 4, 'which-word': 3, 'word-build': 6, 'missing-letter': 6,
  meaning: 6, 'first-last-sound': 6, 'complete-sentence': 4, 'read-text': 3, dictation: 6,
  'sentence-build': 4, tracing: 2, signs: 6, forms: 6, 'read-aloud': 4, 'unit-check': CHECK_SIZE, blend: 5 };

/** Checks shared by every question, whatever builds it. */
function checkQuestion(q, activity) {
  if (q.prompt.audio) assert.ok(clipKeys.has(q.prompt.audio), `missing clip ${q.prompt.audio}`);
  // Questions play real words, never a sound cut out of a word.
  if (q.prompt.audio) assert.ok(!q.prompt.audio.startsWith('ph:'), `${activity} prompt plays a single sound`);
  if (activity === 'sound-match') {
    assert.equal(q.prompt.audio, `w:${q.prompt.kw}`);
    assert.ok(['first', 'middle', 'last'].includes(q.prompt.position) && q.instruction.includes('الكلمة'));
  }
  if (q.feedback.audio) assert.ok(clipKeys.has(q.feedback.audio), `missing clip ${q.feedback.audio}`);
  assert.ok(Array.isArray(q.memory) && Array.isArray(q.focus));
  if (q.type === 'build') {
    const labels = q.tiles.map(t => t.label);
    for (const piece of q.answerTiles) assert.ok(labels.includes(piece), `tile ${piece} missing`);
    if (activity === 'word-build') assert.ok(q.tiles.length > q.answerTiles.length, 'build needs at least one distractor tile');
    if (activity === 'sentence-build') {
      assert.deepEqual([...labels].sort(), [...q.answerTiles].sort());
      assert.notEqual(labels.join(' '), q.answerTiles.join(' '), 'tiles start in order');
      assert.ok(q.answerTiles.length >= 3 && q.answerTiles.length <= 7);
    }
    assert.ok(bank.isCorrect(q, q.answerTiles));
    return;
  }
  if (q.type === 'spell') {
    for (const ch of q.answer) assert.ok(q.keys.includes(ch), `key ${ch} not on the keyboard for ${q.answer}`);
    assert.equal(q.graphemes.join(''), q.answer);
    assert.ok(bank.isCorrect(q, q.answer.toUpperCase()));
    assert.ok(!bank.isCorrect(q, `${q.answer}x`));
    return;
  }
  if (q.type === 'blend') {
    assert.ok(q.prompt.tiles.every(t => !t.audio), 'blending tiles play no cut sounds');
    assert.equal(q.prompt.slow, `w:${q.answer}`);
    assert.ok(slowVoices.get(q.prompt.slow)?.includes('fs'), `no slow recording for ${q.prompt.slow}`);
    q.options.forEach(o => assert.ok(clipKeys.has(o.audio), `missing clip ${o.audio}`));
    assert.equal(q.prompt.tiles.map(t => t.text).join(''), q.answer);
    assert.equal(q.options.length, 3);
    assert.equal(q.options.filter(o => o.value === q.answer).length, 1);
    return;
  }
  if (q.type === 'record') {
    assert.ok(q.prompt.text && q.prompt.audio);
    return;
  }
  if (q.type === 'trace') {
    assert.match(q.answer, /^[a-z]$/);
    return;
  }
  if (q.type === 'audio-choice') {
    assert.equal(q.options.length, 3);
    for (const o of q.options) assert.ok(clipKeys.has(o.audio), `missing clip ${o.audio}`);
    assert.equal(q.options.filter(o => o.value === q.answer).length, 1);
    return;
  }
  const values = q.options.map(o => o.value);
  assert.equal(new Set(values).size, values.length, `duplicate options ${values}`);
  assert.equal(values.filter(v => v === q.answer).length, 1, 'exactly one correct option');
  assert.ok(values.length >= 2 && values.length <= 4);
  if (q.type === 'choice' && q.options[0].lang === 'en' && !['complete-sentence', 'which-word', 'perception'].includes(activity)) {
    // grapheme options: never two spellings of the same sound
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        assert.ok(!sameSound(String(values[i]).toLowerCase(), String(values[j]).toLowerCase()) || activity === 'capital-match',
          `same-sound options ${values[i]} / ${values[j]}`);
      }
    }
  }
}

describe('question bank', () => {
  for (const u of units) {
    for (const activity of u.activities) {
      it(`unit ${u.id} / ${activity} builds valid questions`, () => {
        for (const seed of SEEDS) {
          const qs = bank.build(u.id, activity, { rng: makeRng(seed) });
          const min = u.id === 1 ? Math.min(MIN_ITEMS[activity], u.words.length) : MIN_ITEMS[activity];
          assert.ok(qs.length >= min, `only ${qs.length} questions`);
          assert.ok(qs.length <= 12 || activity === 'read-text');
          assert.equal(new Set(qs.map(q => q.key)).size, qs.length, 'duplicate question keys');
          for (const q of qs) checkQuestion(q, activity === 'unit-check' ? q.activity : activity);
        }
      });
    }
  }

  it('unit checks mix twelve items: pairs, meanings, dictation, made-up words and a reading item last', () => {
    for (const u of units) {
      for (const seed of SEEDS) {
        const qs = bank.unitCheck(u, makeRng(seed));
        const acts = qs.map(q => q.activity);
        assert.equal(qs.length, CHECK_SIZE, `unit ${u.id}: ${acts}`);
        assert.ok(qs.every(q => q.key.startsWith('check:')));
        assert.ok(acts.filter(a => a === 'dictation').length >= 2, `unit ${u.id}: ${acts}`);
        assert.ok(acts.filter(a => a === 'pseudo').length === ((u.pseudo || []).length === 1 ? 1 : 2), `unit ${u.id}: ${acts}`);
        assert.ok(acts.includes('meaning'));
        if ((u.sentences || []).length || (u.texts || []).length) {
          assert.ok(['read-text', 'complete-sentence'].includes(acts[acts.length - 1]), `unit ${u.id}: last is ${acts[acts.length - 1]}`);
        }
        if ((u.signs || []).length) assert.ok(acts.includes('signs'));
      }
    }
  });

  it('builds timed drills and stage benchmarks', () => {
    const flash = bank.wordFlash(5, makeRng(1));
    assert.ok(flash.length >= 40);
    flash.forEach(q => {
      assert.equal(q.options.length, 2);
      assert.notEqual(q.options[0].label, q.options[1].label);
      assert.ok(bank.isCorrect(q, q.item));
    });
    STAGES.forEach((st, i) => {
      const b = bank.benchmark(i, makeRng(i + 1));
      assert.ok(b.words.length >= 40, `stage ${i}: ${b.words.length} words`);
      assert.ok(b.sentences.length >= 20, `stage ${i}: ${b.sentences.length} sentences`);
      assert.ok(b.sentences.slice(0, 5).every(q => SENSE.find(x => x.text === q.item).unit >= st.from || st.from === 1), 'the stage comes first');
      assert.equal(b.decoding.length, 6);
      const reserved = BENCH_PSEUDO[i].items.map(x => x.w);
      assert.ok(b.decoding.every(q => reserved.includes(q.item)), 'benchmark made-up words are the reserved ones');
      assert.equal(b.spelling.length, 6);
      assert.equal(b.reading.length, 4);
      [...b.decoding, ...b.spelling].forEach(q => checkQuestion(q, q.activity));
      b.reading.forEach(q => assert.equal(q.prompt.audio, ''));
      const keys = [...b.decoding, ...b.spelling, ...b.reading].map(q => q.key);
      assert.equal(new Set(keys).size, keys.length);
    });
    assert.equal(bank.benchmark(9), null);
  });

  it('asks for the first, last and middle sound, the middle always a vowel', () => {
    const qs = [1, 4, 7].flatMap(u => SEEDS.flatMap(seed => bank.build(u, 'first-last-sound', { rng: makeRng(seed) })));
    const middle = qs.filter(q => q.prompt.position === 'middle');
    assert.ok(middle.length >= 5 && qs.some(q => q.prompt.position === 'first') && qs.some(q => q.prompt.position === 'last'));
    middle.forEach(q => {
      assert.match(q.answer, /^[aeiou]$/, q.item);
      q.options.forEach(o => assert.match(String(o.value), /^[aeiou]$/));
    });
  });

  it('places a sentence-and-picture item in units 3, 6 and 9', () => {
    for (const unitId of [3, 6, 9]) {
      for (const seed of SEEDS) {
        const qs = bank.placementItems(unitId, makeRng(seed));
        const pic = qs.find(q => q.activity === 'sentence-picture');
        assert.ok(pic && qs.length === 5, `unit ${unitId}`);
        assert.equal(pic.options.length, 3);
        assert.ok(pic.options.every(o => o.lang === 'pic'));
      }
    }
    assert.ok(!bank.placementItems(4, makeRng(1)).some(q => q.activity === 'sentence-picture'));
  });

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

  it('builds a review question for every item the learner can meet', () => {
    const rng = makeRng(4);
    const keys = [
      ...units.flatMap(u => (u.graphemes || []).map(g => `ph:${gpc[g].ph}`)),
      ...units.flatMap(u => (u.words || []).map(w => `w:${w.w}`))
    ];
    for (const key of new Set(keys)) {
      const unit = bank.itemUnit(key);
      assert.ok(unit, `no unit for ${key}`);
      for (const box of [0, 2, 4, 6]) {
        for (const ctx of [unit, units.length]) {
          const q = bank.buildItem(key, ctx, rng, { box });
          assert.ok(q, `no question for ${key}`);
          if (key !== 'ph:dh') assert.ok(q.memory.includes(key), `${key} not in ${q.memory}`);
          checkQuestion(q, q.activity);
        }
      }
    }
  });

  it('never asks about frequent irregular words on their own (heart words were removed)', () => {
    assert.ok(!('heart-words' in ACTIVITY_META));
    for (const u of units) {
      assert.ok(!u.activities.includes('heart-words'), `unit ${u.id} lists heart-words`);
      for (const seed of [1, 2, 3]) {
        const qs = [...bank.unitCheck(u, makeRng(seed)), ...(u.review ? [] : bank.placementItems(u.id, makeRng(seed)))];
        assert.ok(!qs.some(q => q.activity === 'heart-words'), `unit ${u.id}: heart-word item`);
      }
    }
    // Items left in old progress get no review question.
    assert.equal(bank.itemUnit('h:the'), null);
    assert.equal(bank.buildItem('h:the', 5, makeRng(1)), null);
  });

  it('checks every letter once, in course order, by its example word', () => {
    const items = bank.letterCheck(makeRng(1));
    assert.deepEqual(items.map(q => q.answer).sort(), ALPHABET);
    assert.equal(items[0].answer, units[0].graphemes[0]);
    for (const q of items) {
      checkQuestion(q, q.activity);
      assert.equal(q.options.length, 4);
      assert.ok(q.options.every(o => /^[a-z]$/.test(o.value)), `${q.answer}: single letters only`);
      assert.deepEqual(q.memory, []);
    }
  });

  it('teaches unknown letters one at a time: shown, asked only among letters met, then mixed', () => {
    const fresh = bank.alphabetLesson(['s', 'a', 't'], [], makeRng(2));
    assert.deepEqual(fresh.map(q => q.type), ['intro', 'choice', 'intro', 'choice', 'intro', 'choice', 'choice', 'choice', 'choice']);
    assert.equal(fresh[1].options.length, 2, 'the very first question has two choices');
    assert.deepEqual(fresh[3].options.map(o => o.value).sort(), ['a', 's']);
    assert.deepEqual(fresh[5].options.map(o => o.value).sort(), ['a', 's', 't']);
    const known = ['s', 'a', 't', 'i', 'n', 'p'];
    for (const q of bank.alphabetLesson(['e', 'x', 'q'], known, makeRng(3))) {
      if (q.type === 'intro') { assert.ok(!q.options.length && !q.prompt.audio); continue; }
      checkQuestion(q, q.activity);
      assert.ok(q.options.every(o => [...known, 'e', 'x', 'q'].includes(o.value)), `${q.answer}: ${q.options.map(o => o.value)}`);
      assert.ok(q.options.length <= 4 && q.memory[0].startsWith('ph:'));
    }
  });

  it('makes recall questions (dictation) for secure items', () => {
    const types = new Set(Array.from({ length: 20 }, (_, i) => bank.buildItem('w:pin', 5, makeRng(i), { box: 5 }).activity));
    assert.deepEqual([...types], ['dictation']);
  });

  it('builds placement items for every unit (5, or 3 from unit 11), with made-up words', () => {
    assert.deepEqual(bank.placementUnits(), units.filter(u => !u.review).map(u => u.id));
    let longest = 0;
    for (const unitId of bank.placementUnits()) {
      const n = unitId >= SHORT_PLACEMENT_FROM ? 3 : 5;
      longest += n;
      for (const seed of SEEDS) {
        const qs = bank.placementItems(unitId, makeRng(seed));
        assert.equal(qs.length, n, `unit ${unitId}: ${qs.map(q => q.activity)}`);
        assert.equal(new Set(qs.map(q => q.key)).size, n);
        if (n === 3) assert.deepEqual(qs.map(q => q.activity), ['which-word', 'pseudo', 'dictation']);
        assert.ok(qs.some(q => q.activity === 'pseudo'));
        qs.forEach(q => { assert.ok(q.key.startsWith('place:')); checkQuestion(q, q.activity); });
      }
    }
    assert.ok(longest <= 90, `a strong reader answers ${longest} items`);
  });

  it('opens ear-training sets once both letters are taught', () => {
    assert.deepEqual(bank.perceptionSets(2).map(s => s.id), []);
    assert.ok(bank.perceptionSets(3).some(s => s.id === 'a-o'));
    assert.ok(!bank.perceptionSets(3).some(s => s.id === 'i-e'));
    assert.ok(bank.perceptionSets(4).some(s => s.id === 'i-e'));
    assert.ok(!bank.perceptionSets(3).some(s => s.id === 'p-b'));
    assert.equal(bank.perceptionSets(units.length).length, PERCEPTION.length);
  });

  it('builds balanced ear-training blocks in several voices', () => {
    for (const set of PERCEPTION) {
      const qs = bank.perceptionBlock(set, { rng: makeRng(2) });
      assert.equal(qs.length, 16);
      assert.equal(qs.filter(q => q.answer === set.a).length, 8);
      assert.deepEqual(qs[0].options.map(o => o.value), [set.a, set.b]);
      assert.ok(new Set(qs.map(q => q.prompt.voice)).size >= 3);
      for (let i = 1; i < qs.length; i++) assert.notEqual(qs[i].item, qs[i - 1].item, `${set.id}: same word twice in a row`);
      qs.forEach(q => { assert.ok(PERCEPTION_VOICES.includes(q.prompt.voice)); checkQuestion(q, 'perception'); });
    }
    const set = PERCEPTION.find(s => s.id === 'i-e');
    const onlyF = bank.perceptionBlock(set, { rng: makeRng(1), usable: (k, v) => v === 'f' });
    assert.ok(onlyF.every(q => q.prompt.voice === 'f'));
    assert.deepEqual(bank.perceptionBlock(set, { usable: () => false }), []);
  });

  it('builds weak-sound practice around the confused pair', () => {
    const qs = bank.weakPractice([{ target: 'i', partner: 'e' }], 5, { rng: makeRng(1) });
    assert.ok(qs.length >= 5 && qs.length <= 10);
    assert.equal(new Set(qs.map(q => q.key)).size, qs.length);
    for (const q of qs) {
      checkQuestion(q, q.activity);
      if (q.activity === 'sound-match') assert.ok(q.options.some(o => o.value === 'e'));
      if (q.activity === 'missing-letter') assert.equal(q.answer, 'i');
    }
    assert.ok(qs.some(q => q.activity === 'perception'));
    assert.deepEqual(bank.weakPractice([{ target: 'sh', partner: 'ch' }], 2, { rng: makeRng(1) }), [], 'sh is not taught by unit 2');
  });

  it('dictation keys are the letters taught so far', () => {
    const [q] = bank.build(1, 'dictation', { rng: makeRng(1) });
    assert.deepEqual(q.keys, ['a', 'p', 's', 't']);
    assert.deepEqual(segment('sit'), ['s', 'i', 't']);
  });
});
