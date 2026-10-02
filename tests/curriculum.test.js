// Curriculum linter: checks the content in data.js against the teaching sequence.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { units, gpc, ACTIVITY_META, PERCEPTION } from '../data.js';
import { buildLexicon, decodeWord, checkSentence, contrastOf, sameSound, tokenize } from '../phonics.js';

const lex = buildLexicon(units, gpc);
const ARABIC = /[؀-ۿ]/;

function cumulativeWords(unitIndex) {
  return units.slice(0, unitIndex + 1).flatMap(u => u.words || []);
}

describe('curriculum structure', () => {
  it('has ten units with unique sequential ids', () => {
    assert.equal(units.length, 10);
    units.forEach((u, i) => assert.equal(u.id, i + 1));
  });

  it('introduces every grapheme in the table exactly once', () => {
    const introduced = units.flatMap(u => u.graphemes || []);
    assert.equal(new Set(introduced).size, introduced.length, 'a grapheme is introduced twice');
    for (const g of introduced) assert.ok(gpc[g], `grapheme "${g}" missing from gpc`);
    for (const g of Object.keys(gpc)) assert.ok(introduced.includes(g), `gpc entry "${g}" is never taught`);
  });

  it('gives every grapheme a sound key, keyword and picture', () => {
    for (const [g, info] of Object.entries(gpc)) {
      assert.ok(info.ph && info.ipa && info.kw && info.emoji, `incomplete gpc entry "${g}"`);
      if (info.variantOf) assert.equal(gpc[info.variantOf].ph, info.ph, `${g} should share a sound with ${info.variantOf}`);
    }
  });

  it('lists only known activities', () => {
    for (const u of units) {
      assert.ok(u.activities.length >= 4, `unit ${u.id} has too few activities`);
      for (const a of u.activities) assert.ok(ACTIVITY_META[a], `unknown activity "${a}" in unit ${u.id}`);
    }
  });

  it('has Arabic tips for every unit', () => {
    for (const u of units) {
      assert.ok(u.tips && u.tips.length >= 2, `unit ${u.id} needs tips`);
      u.tips.forEach(t => assert.match(t, ARABIC));
    }
  });
});

describe('words', () => {
  it('are decodable when introduced', () => {
    for (const u of units) {
      for (const w of u.words || []) {
        const r = decodeWord(w.w, u.id, lex);
        assert.ok(r.ok, `unit ${u.id}: "${w.w}" is not decodable (${r.reason})`);
      }
    }
  });

  it('are not repeated across units', () => {
    const seen = new Map();
    for (const u of units) {
      for (const w of u.words || []) {
        assert.ok(!seen.has(w.w), `"${w.w}" appears in unit ${seen.get(w.w)} and unit ${u.id}`);
        seen.set(w.w, u.id);
      }
    }
  });

  it('have a unique Arabic meaning', () => {
    const seen = new Map();
    for (const u of units) {
      for (const w of u.words || []) {
        assert.match(w.ar || '', ARABIC, `"${w.w}" needs an Arabic meaning`);
        assert.ok(!seen.has(w.ar), `"${w.w}" and "${seen.get(w.ar)}" share the meaning "${w.ar}"`);
        seen.set(w.ar, w.w);
      }
    }
  });

  it('split two-syllable words correctly', () => {
    for (const u of units) {
      for (const w of u.words || []) {
        if (w.split) assert.equal(w.split.replace('|', ''), w.w, `bad split for "${w.w}"`);
      }
    }
  });

  it('meet the minimum count per unit', () => {
    for (const u of units) {
      if (u.review) continue;
      const min = u.id === 1 ? 10 : 14;
      assert.ok(u.words.length >= min, `unit ${u.id} has ${u.words.length} words (min ${min})`);
    }
  });
});

describe('heart words and names', () => {
  it('heart words are genuinely not decodable when taught, and marks match the word', () => {
    for (const u of units) {
      for (const h of u.heart || []) {
        assert.equal(h.mark.replace(/[[\]]/g, ''), h.w, `mark for "${h.w}"`);
        assert.match(h.ar, ARABIC);
        if (h.w !== 'I' && h.w !== 'a') {
          assert.equal(decodeWord(h.w, u.id, lex).ok, false, `"${h.w}" is decodable in unit ${u.id}; it should not be a heart word`);
        }
      }
    }
  });

  it('names are capitalised and have Arabic', () => {
    for (const u of units) {
      for (const n of u.names || []) {
        assert.match(n.w, /^[A-Z][a-z]+$/);
        assert.match(n.ar, ARABIC);
      }
    }
  });
});

describe('contrasts', () => {
  it('use decodable words already in the word pool, one grapheme apart, different sounds', () => {
    units.forEach((u, idx) => {
      const pool = new Set(cumulativeWords(idx).map(w => w.w));
      const sets = u.contrasts || [];
      const min = u.id === 1 ? 2 : 3;
      assert.ok(sets.length >= min, `unit ${u.id} has ${sets.length} contrast sets (min ${min})`);
      for (const set of sets) {
        assert.ok(set.length >= 2);
        for (const w of set) assert.ok(pool.has(w), `unit ${u.id}: contrast word "${w}" is not in the word pool yet`);
        for (let i = 0; i < set.length; i++) {
          for (let j = i + 1; j < set.length; j++) {
            const c = contrastOf(set[i], set[j]);
            assert.ok(c, `unit ${u.id}: "${set[i]}" / "${set[j]}" differ in more than one grapheme`);
            assert.ok(!sameSound(c.from, c.to), `unit ${u.id}: "${set[i]}" / "${set[j]}" sound the same`);
          }
        }
      }
    });
  });
});

describe('sentences and texts', () => {
  it('sentences are decodable and contain their missing word as a whole token', () => {
    for (const u of units) {
      const min = u.id === 1 ? 4 : 6;
      assert.ok(u.sentences.length >= min, `unit ${u.id} has ${u.sentences.length} sentences (min ${min})`);
      for (const s of u.sentences) {
        const fails = checkSentence(s.text, u.id, lex);
        assert.deepEqual(fails, [], `unit ${u.id}: "${s.text}" -> ${JSON.stringify(fails)}`);
        assert.ok(tokenize(s.text).some(t => t.toLowerCase() === s.missing), `unit ${u.id}: "${s.missing}" not found in "${s.text}"`);
        assert.match(s.ar, ARABIC);
      }
    }
  });

  it('texts and their questions are decodable', () => {
    for (const u of units) {
      for (const t of u.texts || []) {
        for (const s of [...t.sentences, ...t.questions]) {
          const fails = checkSentence(s.text, u.id, lex);
          assert.deepEqual(fails, [], `unit ${u.id} text "${t.id}": "${s.text}" -> ${JSON.stringify(fails)}`);
          assert.match(s.ar, ARABIC);
        }
        assert.ok(t.questions.length >= 3);
        t.questions.forEach(q => assert.equal(typeof q.answer, 'boolean'));
        assert.ok(t.questions.some(q => q.answer) && t.questions.some(q => !q.answer), `text "${t.id}" needs yes and no answers`);
      }
    }
  });

  it('the review unit has texts', () => {
    const review = units.find(u => u.review);
    assert.ok(review && review.texts.length >= 3);
  });
});

describe('made-up words (placement test)', () => {
  const real = new Set(units.flatMap(u => [...(u.words || []), ...(u.heart || []), ...(u.names || [])].map(w => w.w.toLowerCase())));
  it('every teaching unit has made-up words that are decodable there and are not curriculum words', () => {
    for (const u of units.filter(x => !x.review)) {
      assert.ok((u.pseudo || []).length >= 3, `unit ${u.id} needs made-up words`);
      for (const pw of u.pseudo) {
        const r = decodeWord(pw.w, u.id, lex, pw.split || null);
        assert.ok(r.ok, `unit ${u.id}: "${pw.w}" is not decodable (${r.reason})`);
        assert.ok(!real.has(pw.w), `"${pw.w}" is a curriculum word`);
        assert.equal(pw.foils.length, 2);
        assert.equal(new Set([pw.w, ...pw.foils]).size, 3, `"${pw.w}": foils must differ`);
        for (const f of pw.foils) assert.equal(f.length >= pw.w.length - 1 && f.length <= pw.w.length + 1, true);
      }
    }
  });

  it('are unique across units', () => {
    const all = units.flatMap(u => (u.pseudo || []).map(p => p.w));
    assert.equal(new Set(all).size, all.length);
  });
});

describe('ear-training sets', () => {
  const taughtIn = (g) => units.find(u => (u.graphemes || []).includes(g))?.id;
  it('use taught letters and real minimal pairs', () => {
    const ids = new Set();
    for (const set of PERCEPTION) {
      assert.ok(!ids.has(set.id), `duplicate set ${set.id}`);
      ids.add(set.id);
      assert.ok(taughtIn(set.a) && taughtIn(set.b), `${set.id}: letters must be taught`);
      assert.ok(set.pairs.length >= 7, `${set.id}: needs at least 7 pairs`);
      const seen = new Set();
      for (const [a, b] of set.pairs) {
        assert.notEqual(a, b);
        assert.ok(!seen.has(`${a}|${b}`), `${set.id}: duplicate pair ${a}/${b}`);
        seen.add(`${a}|${b}`);
        assert.match(a + b, /^[a-z]+$/, 'lowercase words only');
        // Pairs that split into graphemes must differ exactly in the two sounds of the set (w = wh).
        const c = contrastOf(a, b);
        if (c) assert.ok((c.from === set.a || sameSound(c.from, set.a)) && (c.to === set.b || sameSound(c.to, set.b)), `${set.id}: ${a}/${b}`);
      }
    }
  });

  it('vowel sets use only short-vowel words', () => {
    for (const set of PERCEPTION.filter(s => 'aeiou'.includes(s.a) && 'aeiou'.includes(s.b))) {
      for (const [a, b] of set.pairs) assert.ok(contrastOf(a, b), `${set.id}: ${a}/${b} is not a one-letter contrast`);
    }
  });
});

describe('activity metadata', () => {
  it('marks tracing as optional and only tracing', () => {
    const optional = Object.entries(ACTIVITY_META).filter(([, m]) => m.optional).map(([k]) => k);
    assert.deepEqual(optional, ['tracing']);
  });
});
