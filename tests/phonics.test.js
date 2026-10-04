import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  segment, cleanToken, tokenize, slugify, clipKey, buildLexicon, decodeWord, analyzeToken,
  checkSentence, contrastOf, classifyError, errorFocus, sameSound, makeRng, shuffle,
  pickGraphemeDistractors, pickWordDistractors, pickBlank, toPhonemes, compareSpelling, soundPosition
} from '../phonics.js';

// A small synthetic curriculum so these tests don't depend on the real content.
const gpc = Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map(l => [l, { ph: l }])
  .concat(['ck', 'sh', 'ch', 'th', 'ng', 'nk', 'wh', 'qu', 'ff', 'll', 'ss', 'zz'].map(g => [g, { ph: g }])));
const units = [
  { id: 1, graphemes: ['s', 'a', 't', 'i', 'n', 'p'], heart: [{ w: 'I' }, { w: 'a' }, { w: 'is' }] },
  { id: 2, graphemes: ['m', 'd', 'o', 'g'], heart: [{ w: 'the' }], names: [{ w: 'Sam' }] },
  { id: 3, graphemes: ['c', 'k', 'ck', 'e'] },
  { id: 4, graphemes: ['u', 'r', 'h', 'b'] },
  { id: 5, graphemes: ['f', 'l', 'ff', 'll', 'ss'], rules: ['doubles'] },
  { id: 6, graphemes: ['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu'] },
  { id: 7, graphemes: ['sh', 'ch', 'th'], rules: ['plural-s'] },
  { id: 8, graphemes: ['ng', 'nk', 'wh'], rules: ['plural-es'] },
  { id: 9, rules: ['two-syllable'], words: [{ w: 'laptop', split: 'lap|top' }, { w: 'sunset', split: 'sun|set' }] }
];
const lex = buildLexicon(units, gpc);

describe('segment', () => {
  it('uses longest-match graphemes', () => {
    assert.deepEqual(segment('ship'), ['sh', 'i', 'p']);
    assert.deepEqual(segment('duck'), ['d', 'u', 'ck']);
    assert.deepEqual(segment('quit'), ['qu', 'i', 't']);
    assert.deepEqual(segment('box'), ['b', 'o', 'x']);
    assert.deepEqual(segment('bell'), ['b', 'e', 'll']);
    assert.deepEqual(segment('king'), ['k', 'i', 'ng']);
    assert.deepEqual(segment('bank'), ['b', 'a', 'nk']);
    assert.deepEqual(segment('when'), ['wh', 'e', 'n']);
  });
  it('recognises patterns that are not taught yet', () => {
    assert.deepEqual(segment('feet'), ['f', 'ee', 't']);
    assert.deepEqual(segment('car'), ['c', 'ar']);
    assert.deepEqual(segment('ball'), ['b', 'all']);
    assert.deepEqual(segment('catch'), ['c', 'a', 'tch']);
  });
});

describe('tokens and slugs', () => {
  it('cleans punctuation and curly quotes', () => {
    assert.equal(cleanToken('sat.'), 'sat');
    assert.equal(cleanToken('"Thank'), 'Thank');
    assert.equal(cleanToken('it’s'), "it's");
    assert.deepEqual(tokenize('Yes, I can fix it!'), ['Yes', 'I', 'can', 'fix', 'it']);
  });
  it('makes stable slugs and clip keys', () => {
    assert.equal(slugify('It is a pin.'), 'it-is-a-pin');
    assert.equal(slugify('Do not miss the bus!'), 'do-not-miss-the-bus');
    assert.equal(clipKey('w', 'Pin'), 'w:pin');
    assert.equal(clipKey('s', 'Get up!'), 's:get-up');
    assert.equal(clipKey('ph', 'ae'), 'ph:ae');
    assert.equal(clipKey('ln', 'b'), 'ln:b');
  });
});

describe('decodeWord', () => {
  it('accepts closed syllables built from taught graphemes', () => {
    assert.equal(decodeWord('sat', 1, lex).ok, true);
    assert.equal(decodeWord('pin', 1, lex).ok, true);
    assert.equal(decodeWord('at', 1, lex).ok, true);
  });
  it('rejects untaught graphemes', () => {
    assert.equal(decodeWord('mat', 1, lex).ok, false);
    assert.equal(decodeWord('mat', 2, lex).ok, true);
  });
  it('treats digraphs as single graphemes that must be taught', () => {
    assert.equal(decodeWord('ship', 4, lex).ok, false); // s, h, i, p are taught by unit 4, sh is not
    assert.equal(decodeWord('ship', 7, lex).ok, true);
  });
  it('rejects vowel teams, r-controlled vowels, silent e and open syllables', () => {
    for (const w of ['feet', 'car', 'made', 'go', 'he', 'my', 'the']) {
      assert.equal(decodeWord(w, 9, lex).ok, false, w);
    }
  });
  it('rejects consonant clusters in Stage 0-2', () => {
    assert.equal(decodeWord('and', 9, lex).ok, false);
    assert.equal(decodeWord('stop', 9, lex).ok, false);
    assert.equal(decodeWord('pins', 1, lex).ok, false);
  });
  it('applies spelling rules', () => {
    assert.equal(decodeWord('cent', 9, lex).ok, false);    // soft c
    assert.equal(decodeWord('gin', 9, lex).ok, false);     // soft g
    assert.equal(decodeWord('get', 9, lex).ok, true);      // allowlisted hard g
    assert.equal(decodeWord('was', 9, lex).ok, false);     // w + a / irregular
    assert.equal(decodeWord('put', 9, lex).ok, false);     // u = /ʊ/
    assert.equal(decodeWord('is', 9, lex).ok, false);      // s = /z/
  });
  it('handles position rules', () => {
    assert.equal(decodeWord('ckat', 9, lex).ok, false);
    assert.equal(decodeWord('box', 6, lex).ok, true);
    assert.equal(decodeWord('xob', 6, lex).ok, false);
  });
  it('accepts doubled letters only after the doubles rule', () => {
    assert.equal(decodeWord('miss', 5, lex).ok, true);
    assert.equal(decodeWord('app', 4, lex).ok, false);
    assert.equal(decodeWord('app', 5, lex).ok, true);
  });
  it('needs a known split for two-syllable words', () => {
    assert.equal(decodeWord('laptop', 8, lex).ok, false);
    const r = decodeWord('laptop', 9, lex);
    assert.equal(r.ok, true);
    assert.deepEqual(r.syllables, ['lap', 'top']);
    assert.equal(decodeWord('tennis', 9, lex).ok, false); // not in the lexicon
  });
});

describe('analyzeToken and checkSentence', () => {
  it('accepts heart words and names once introduced', () => {
    assert.equal(analyzeToken('the', 1, lex).ok, false);
    assert.equal(analyzeToken('the', 2, lex).ok, true);
    assert.equal(analyzeToken('The', 2, lex, true).ok, true);
    assert.equal(analyzeToken('Sam', 2, lex).ok, true);
    assert.equal(analyzeToken('Sam', 1, lex).ok, false);
    assert.equal(analyzeToken('I', 1, lex).ok, true);
  });
  it('rejects capitals that are not names or sentence starts', () => {
    assert.equal(analyzeToken('Pin', 1, lex, false).ok, false);
    assert.equal(analyzeToken('Pin', 1, lex, true).ok, true);
  });
  it('rejects digits, apostrophes and hyphens', () => {
    assert.equal(analyzeToken('6', 9, lex).ok, false);
    assert.equal(analyzeToken("it's", 9, lex).ok, false);
    assert.equal(analyzeToken('lap-top', 9, lex).ok, false);
  });
  it('handles plural -s and -es by unit', () => {
    assert.equal(analyzeToken('cats', 3, lex).ok, false);
    assert.equal(analyzeToken('cats', 7, lex).ok, true);
    assert.equal(analyzeToken('boxes', 7, lex).ok, false);
    assert.equal(analyzeToken('boxes', 8, lex).ok, true);
    assert.equal(analyzeToken('boxs', 8, lex).ok, false); // -s after x needs -es
    assert.equal(analyzeToken('gets', 7, lex).ok, true);
    assert.equal(analyzeToken('bus', 4, lex).ok, true);   // not a plural
  });
  it('checks whole sentences, including quotes', () => {
    assert.deepEqual(checkSentence('It is a pin.', 1, lex), []);
    assert.deepEqual(checkSentence('Sam sat.', 2, lex), []);
    const fails = checkSentence('The cat sat.', 1, lex).map(f => f.token);
    assert.deepEqual(fails, ['The', 'cat']);
    assert.deepEqual(checkSentence('Sam said, "Tap it!"', 2, lex).map(f => f.token), ['said']);
  });
});

describe('contrasts and errors', () => {
  it('finds one-grapheme contrasts', () => {
    assert.deepEqual(contrastOf('pin', 'pen'), { pos: 1, from: 'i', to: 'e' });
    assert.deepEqual(contrastOf('ship', 'chip'), { pos: 0, from: 'sh', to: 'ch' });
    assert.equal(contrastOf('pin', 'pet'), null);
    assert.equal(contrastOf('pin', 'pins'), null);
  });
  it('classifies errors', () => {
    assert.equal(classifyError('i', 'e'), 'vowel');
    assert.equal(classifyError('p', 'b'), 'visual-voicing');
    assert.equal(classifyError('f', 'v'), 'voicing');
    assert.equal(classifyError('b', 'd'), 'visual');
    assert.equal(classifyError('sh', 'ch'), 'sound');
    assert.equal(classifyError('m', 'x'), 'other');
  });
  it('reduces word errors to the grapheme that differs', () => {
    assert.deepEqual(errorFocus('pin', 'pen'), { target: 'i', chosen: 'e', type: 'vowel' });
    assert.equal(errorFocus('pin', 'pin'), null);
  });
  it('knows which spellings share a sound', () => {
    assert.equal(sameSound('c', 'ck'), true);
    assert.equal(sameSound('k', 'c'), true);
    assert.equal(sameSound('f', 'v'), false);
  });
});

describe('random helpers', () => {
  it('is deterministic with a seed', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], makeRng(42));
    const b = shuffle([1, 2, 3, 4, 5, 6], makeRng(42));
    assert.deepEqual(a, b);
  });
  it('picks confusable grapheme distractors first, never same-sound spellings', () => {
    const pool = ['b', 'p', 'd', 'c', 'k', 'ck', 's', 'm'];
    for (let seed = 1; seed < 30; seed++) {
      const d = pickGraphemeDistractors('p', pool, 3, makeRng(seed));
      assert.equal(d[0], 'b');
      assert.equal(new Set(d).size, d.length);
      assert.ok(!d.includes('p'));
      const k = pickGraphemeDistractors('k', pool, 3, makeRng(seed));
      assert.ok(!k.includes('c') && !k.includes('ck'), `same-sound spelling offered: ${k}`);
    }
  });
  it('keeps only one spelling per sound among distractors', () => {
    const d = pickGraphemeDistractors('t', ['c', 'k', 'ck', 'd'], 3, makeRng(3));
    assert.ok(d.filter(g => ['c', 'k', 'ck'].includes(g)).length <= 1);
  });
  it('picks minimal-pair word distractors first', () => {
    const pool = ['pen', 'pan', 'pin', 'bus', 'map', 'sock'];
    for (let seed = 1; seed < 20; seed++) {
      const d = pickWordDistractors('pin', pool, 2, makeRng(seed));
      assert.deepEqual([...d].sort(), ['pan', 'pen']);
    }
  });
  it('biases blanks toward vowels and never splits a digraph', () => {
    const gs = ['sh', 'i', 'p'];
    let vowels = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const i = pickBlank(gs, makeRng(seed));
      assert.ok(i >= 0 && i < gs.length);
      if (gs[i] === 'i') vowels++;
    }
    assert.ok(vowels / 200 >= 0.5, `vowel share ${vowels / 200}`);
  });
});

describe('toPhonemes (made-up words)', () => {
  const ipa = { t: { ipa: 't' }, o: { ipa: 'ɑ' }, b: { ipa: 'b' }, n: { ipa: 'n' }, a: { ipa: 'æ' }, p: { ipa: 'p' }, j: { ipa: 'dʒ' }, u: { ipa: 'ʌ' }, ch: { ipa: 'tʃ' }, i: { ipa: 'ɪ' }, m: { ipa: 'm' } };
  it('maps graphemes to Kokoro phonemes with stress', () => {
    assert.equal(toPhonemes('jub', ipa), 'ʤˈʌb');
    assert.equal(toPhonemes('chim', ipa), 'ʧˈɪm');
    assert.equal(toPhonemes('tobnap', ipa, 'tob|nap'), 'tˈɑbnˌæp');
    assert.throws(() => toPhonemes('t3', ipa));
  });
});

describe('soundPosition (word-first sound questions)', () => {
  it('finds where a spelling sits in its keyword', () => {
    assert.equal(soundPosition('s', 'sun'), 'first');
    assert.equal(soundPosition('sh', 'ship'), 'first');
    assert.equal(soundPosition('c2', 'city'), 'first');
    assert.equal(soundPosition('ck', 'sock'), 'last');
    assert.equal(soundPosition('ff', 'off'), 'last');
    assert.equal(soundPosition('y3', 'baby'), 'last');
    assert.equal(soundPosition('g2', 'page'), 'last');
    assert.equal(soundPosition('a_e', 'cake'), 'middle');
    assert.equal(soundPosition('oa', 'boat'), 'middle');
  });
});

describe('compareSpelling (dictation)', () => {
  it('accepts the right spelling', () => {
    const r = compareSpelling('ship', 'ship');
    assert.equal(r.ok, true);
    assert.equal(r.correct, 3);
  });

  it('finds a swapped grapheme', () => {
    const r = compareSpelling('pen', 'pin');
    assert.equal(r.ok, false);
    assert.deepEqual(r.confusion, { target: 'e', chosen: 'i' });
    assert.deepEqual(r.ops.map(o => o.op), ['ok', 'sub', 'ok']);
    assert.deepEqual(compareSpelling('ship', 'sip').confusion, { target: 'sh', chosen: 's' });
  });

  it('marks missing and extra letters (no single confusion)', () => {
    const miss = compareSpelling('pen', 'pn');
    assert.deepEqual(miss.ops.map(o => o.op), ['ok', 'miss', 'ok']);
    assert.equal(miss.confusion, null);
    const extra = compareSpelling('pen', 'pena');
    assert.equal(extra.ops[3].op, 'extra');
    assert.equal(compareSpelling('pen', '').correct, 0);
  });

  it('uses the given graphemes for two-syllable words', () => {
    const r = compareSpelling('laptop', 'lapdop', ['l', 'a', 'p', 't', 'o', 'p']);
    assert.deepEqual(r.confusion, { target: 't', chosen: 'd' });
  });
});

describe('Stage 3-5 decoding', () => {
  const g = (k, extra = {}) => [k, { ph: k, ...extra }];
  const gpc5 = Object.fromEntries([
    ...'abcdefghijklmnopqrstuvwxyz'.split('').map(l => g(l)),
    ...['ck', 'sh', 'ch', 'th', 'ng', 'nk', 'wh', 'qu', 'ff', 'll', 'ss', 'zz', 'a_e', 'i_e', 'o_e', 'u_e', 'ai', 'ay', 'ee', 'ea',
      'oa', 'ow', 'igh', 'ie', 'oo', 'ew', 'ue', 'ar', 'or', 'er', 'ir', 'ur', 'ou', 'oi', 'oy', 'aw', 'all', 'y2', 'y3', 'tion'].map(k => g(k))
  ]);
  const u5 = [
    { id: 1, graphemes: ['s', 'a', 't', 'i', 'n', 'p', 'm', 'd', 'o', 'g', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f', 'l', 'ff', 'll', 'ss', 'j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'sh', 'ch', 'th', 'ng', 'nk', 'wh'], rules: ['doubles', 'plural-s', 'plural-es'], heart: [{ w: 'the' }] },
    { id: 9, rules: ['two-syllable'], words: [{ w: 'laptop', split: 'lap|top' }, { w: 'student', split: 'stu|dent' }, { w: 'baby', split: 'ba|by' }, { w: 'table', split: 'ta|ble' }, { w: 'station', split: 'sta|tion' }] },
    { id: 11, rules: ['blends-s'] },
    { id: 12, rules: ['blends-lr'] },
    { id: 13, rules: ['blends-final', 'blends-3'] },
    { id: 14, rules: ['suffix-ed', 'suffix-ing'] },
    { id: 15, graphemes: ['a_e', 'i_e', 'o_e', 'u_e'], rules: ['silent-e'] },
    { id: 16, graphemes: ['ee', 'ea', 'ai', 'ay'] },
    { id: 17, graphemes: ['oa', 'ow', 'igh', 'y2', 'ie'] },
    { id: 19, graphemes: ['ar', 'or', 'er', 'ir', 'ur'] },
    { id: 22, graphemes: ['y3'], rules: ['open-syllable', 'soft-cg', 'consonant-le'] },
    { id: 23, graphemes: ['tion'], rules: ['suffix-er', 'suffixes', 'prefixes', 'digits'] }
  ];
  const lex5 = buildLexicon(u5, gpc5);
  const ok = (w, unit) => decodeWord(w, unit, lex5).ok;
  const tok = (w, unit) => analyzeToken(w, unit, lex5).ok;

  it('opens consonant clusters only after they are taught', () => {
    assert.equal(ok('stop', 1), false);
    assert.equal(ok('stop', 11), true);
    assert.equal(ok('flag', 11), false);
    assert.equal(ok('flag', 12), true);
    assert.equal(ok('hand', 12), false);
    assert.equal(ok('hand', 13), true);
    assert.equal(ok('strap', 13), true);
    assert.equal(ok('tsap', 13), false, 'not an English cluster');
  });

  it('reads magic e, vowel teams, r-vowels and y', () => {
    assert.equal(ok('make', 14), false);
    assert.deepEqual(decodeWord('make', 15, lex5).graphemes, ['m', 'a_e', 'k']);
    assert.deepEqual(decodeWord('make', 15, lex5).pieces, ['m', 'a', 'k', 'e']);
    assert.equal(ok('five', 15), true);
    assert.equal(ok('give', 15), false, 'give is irregular');
    assert.equal(ok('rain', 15), false);
    assert.equal(ok('rain', 16), true);
    assert.equal(ok('paint', 16), true);
    assert.equal(ok('night', 17), true);
    assert.equal(ok('my', 16), false);
    assert.equal(ok('fly', 17), true);
    assert.equal(ok('start', 19), true);
    assert.equal(ok('more', 19), true, 'or + silent e');
    assert.equal(ok('cold', 19), false, 'cold is a heart word');
    assert.equal(ok('want', 19), false, 'w + a');
    assert.equal(ok('word', 19), false, 'w + or');
  });

  it('reads open syllables, y = /i/, consonant-le, soft c/g and -tion in later stages', () => {
    assert.equal(ok('student', 19), false);
    assert.equal(ok('student', 22), true);
    assert.equal(ok('baby', 22), true);
    assert.deepEqual(decodeWord('baby', 22, lex5).graphemes, ['b', 'a', 'b', 'y3']);
    assert.equal(ok('table', 22), true);
    assert.equal(ok('face', 19), false);
    assert.equal(ok('face', 22), true);
    assert.equal(ok('station', 22), false);
    assert.equal(ok('station', 23), true);
  });

  it('reads word endings and beginnings once taught', () => {
    assert.equal(tok('jumped', 13), false);
    assert.equal(tok('jumped', 14), true);
    assert.equal(tok('stopped', 14), true);
    assert.equal(tok('running', 14), true);
    assert.equal(tok('liked', 15), true);
    assert.equal(tok('making', 15), true);
    assert.equal(tok('teacher', 22), false);
    assert.equal(tok('teacher', 23), true);
    assert.equal(tok('quickly', 23), true);
    assert.equal(tok('unlock', 23), true);
    assert.equal(tok('babies', 22), true);
    assert.equal(tok('makes', 15), true);
    assert.equal(tok('10:30', 22), false);
    assert.equal(tok('10:30', 23), true);
  });

  it('finds magic-e contrasts and same sounds', () => {
    assert.deepEqual(contrastOf('cap', 'cape'), { pos: 1, from: 'a', to: 'a_e' });
    assert.deepEqual(contrastOf('ship', 'sheep'), { pos: 1, from: 'i', to: 'ee' });
    assert.equal(sameSound('ai', 'a_e'), true);
    assert.equal(sameSound('ow', 'ow2'), true);
    assert.equal(sameSound('ar', 'or'), false);
    assert.equal(classifyError('a', 'a_e'), 'vowel');
  });
});
