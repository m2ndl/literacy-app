// Curriculum linter: checks the content in data.js against the teaching sequence.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { units, gpc, ACTIVITY_META, PERCEPTION, STAGES } from '../data.js';
import { SENSE, BENCHMARK_TEXTS, CAN_DO_STAGES, PICTURES, BENCH_PSEUDO } from '../data-assess.js';
import { buildLexicon, decodeWord, analyzeToken, checkSentence, contrastOf, sameSound, tokenize, segment } from '../phonics.js';
import { OPTIONAL_ACTIVITIES, unitSteps, requiredActivities } from '../logic.js';

const lex = buildLexicon(units, gpc);
const ARABIC = /[؀-ۿ]/;

function cumulativeWords(unitIndex) {
  return units.slice(0, unitIndex + 1).flatMap(u => u.words || []);
}

describe('curriculum structure', () => {
  it('has 24 units with unique sequential ids', () => {
    assert.equal(units.length, 24);
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
  it('are decodable when introduced (word endings count from Stage 3)', () => {
    for (const u of units) {
      for (const w of u.words || []) {
        const r = analyzeToken(w.w, u.id, lex);
        assert.ok(r.ok && r.via !== 'heart', `unit ${u.id}: "${w.w}" is not decodable (${r.reason})`);
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
        if (w.split) assert.equal(w.split.replace(/\|/g, ''), w.w, `bad split for "${w.w}"`);
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

/** True if one word is the other with one consonant letter added (top / stop, ask / mask, ten / tent). */
function insertion(a, b) {
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  if (l.length !== s.length + 1) return false;
  for (let i = 0; i < l.length; i++) {
    if (l.slice(0, i) + l.slice(i + 1) === s) return !'aeiou'.includes(l[i]);
  }
  return false;
}

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
            if (!c && insertion(set[i], set[j])) continue;   // top / stop: a consonant added to make a cluster
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
        for (const s of [...t.sentences, ...t.questions, ...t.questions.flatMap(q => (q.options || []).map(o => ({ text: o, ar: q.ar })))]) {
          const fails = checkSentence(s.text, u.id, lex);
          assert.deepEqual(fails, [], `unit ${u.id} text "${t.id}": "${s.text}" -> ${JSON.stringify(fails)}`);
          assert.match(s.ar, ARABIC);
        }
        assert.ok(t.questions.length >= 3);
        const yesNo = t.questions.filter(q => !q.options);
        yesNo.forEach(q => assert.equal(typeof q.answer, 'boolean'));
        t.questions.filter(q => q.options).forEach(q => {
          assert.ok(q.options.includes(q.answer), `text "${t.id}": answer "${q.answer}" not in the options`);
          assert.equal(new Set(q.options).size, q.options.length);
        });
        assert.ok(yesNo.some(q => q.answer) && yesNo.some(q => !q.answer), `text "${t.id}" needs yes and no answers`);
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
        const r = pw.split ? decodeWord(pw.w, u.id, lex, pw.split) : analyzeToken(pw.w, u.id, lex);
        assert.ok(r.ok, `unit ${u.id}: "${pw.w}" is not decodable (${r.reason})`);
        assert.ok(!real.has(pw.w), `"${pw.w}" is a curriculum word`);
        assert.equal(pw.foils.length, 2);
        const foils = pw.foils.map(f => (typeof f === 'string' ? f.replace(/\|/g, '') : f.w));
        assert.equal(new Set([pw.w, ...foils]).size, 3, `"${pw.w}": foils must differ`);
        for (const f of foils) assert.ok(f.length >= pw.w.length - 2 && f.length <= pw.w.length + 2, `"${pw.w}": foil "${f}"`);
      }
    }
  });

  it('are unique across units', () => {
    const all = units.flatMap(u => (u.pseudo || []).map(p => p.w));
    assert.equal(new Set(all).size, all.length);
    assert.ok(segment('snep'));
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
  it('marks the extra-practice activities as optional, the same ones logic.js leaves out of a unit', () => {
    const optional = Object.entries(ACTIVITY_META).filter(([, m]) => m.optional).map(([k]) => k);
    assert.deepEqual(new Set(optional), OPTIONAL_ACTIVITIES);
    for (const a of ['sound-match', 'blend', 'which-word', 'meaning', 'dictation', 'complete-sentence', 'read-text']) {
      assert.ok(!OPTIONAL_ACTIVITIES.has(a), `${a} should be required`);
    }
  });

  it('keeps every unit to at most eight required steps, in teaching order, with the check last', () => {
    for (const u of units) {
      const steps = unitSteps(u);
      assert.ok(steps.length >= 5 && steps.length <= 8, `unit ${u.id}: ${steps}`);
      assert.equal(steps[steps.length - 1], 'unit-check');
      assert.deepEqual(new Set(steps), new Set(requiredActivities(u)));
      if (steps.includes('sound-match')) assert.equal(steps[0], 'sound-match', `unit ${u.id}: ${steps}`);
      if (steps.includes('dictation') && steps.includes('meaning')) assert.ok(steps.indexOf('meaning') < steps.indexOf('dictation'));
    }
  });

  it('ends every unit with reading aloud and the unit check', () => {
    for (const u of units) assert.deepEqual(u.activities.slice(-2), ['read-aloud', 'unit-check'], `unit ${u.id}`);
  });
});

describe('Stage 3-5 additions', () => {
  const pool = new Set(units.flatMap(u => (u.words || []).map(w => w.w)));
  it('patterns have an example word from the course', () => {
    for (const u of units) {
      for (const p of u.patterns || []) assert.ok(pool.has(p.ex), `unit ${u.id}: pattern example "${p.ex}" is not a course word`);
    }
  });

  it('signs can be read with what has been taught, and have unique meanings', () => {
    const meanings = new Set();
    for (const u of units) {
      for (const s of u.signs || []) {
        assert.match(s.text, /^[A-Z ]+$/);
        assert.equal(s.say.toUpperCase(), s.text);
        assert.match(s.ar, ARABIC);
        assert.ok(['stop', 'go', 'info'].includes(s.kind));
        assert.ok(!meanings.has(s.ar), `sign meaning "${s.ar}" is used twice`);
        meanings.add(s.ar);
        const fails = checkSentence(s.say, u.id, lex);
        assert.deepEqual(fails, [], `unit ${u.id}: sign "${s.text}" -> ${JSON.stringify(fails)}`);
      }
    }
  });

  it('forms have readable labels, Arabic questions and decodable statements', () => {
    for (const u of units) {
      for (const f of u.forms || []) {
        assert.ok(f.fields.length >= 4);
        assert.equal(new Set(f.fields.map(x => x.label)).size, f.fields.length);
        for (const field of f.fields) {
          assert.match(field.ar, ARABIC);
          assert.match(field.ask, ARABIC);
          const fails = checkSentence(field.label, u.id, lex);
          assert.deepEqual(fails, [], `unit ${u.id}: form label "${field.label}" -> ${JSON.stringify(fails)}`);
        }
        assert.ok(f.statements.some(x => x.answer) && f.statements.some(x => !x.answer));
        for (const st of f.statements) {
          assert.deepEqual(checkSentence(st.text, u.id, lex), [], `unit ${u.id}: "${st.text}"`);
          assert.match(st.ar, ARABIC);
        }
      }
    }
  });

  it('every unit after the first ten has a campus text', () => {
    for (const u of units.filter(x => x.id > 10)) assert.ok((u.texts || []).length >= 1, `unit ${u.id} has no text`);
  });

  it('the heart-word strand reaches about 100 words', () => {
    const heart = units.flatMap(u => u.heart || []);
    assert.equal(new Set(heart.map(h => h.w)).size, heart.length, 'a heart word is taught twice');
    assert.ok(heart.length >= 95, `only ${heart.length} heart words`);
  });
});

describe('Phase 4 assessment content', () => {
  it('true/false sentences are decodable at their unit, unique, and balanced in each stage', () => {
    const seen = new Set();
    for (const x of SENSE) {
      assert.deepEqual(checkSentence(x.text, x.unit, lex), [], `"${x.text}" at unit ${x.unit}`);
      assert.equal(typeof x.answer, 'boolean');
      assert.match(x.ar, ARABIC);
      assert.ok(!seen.has(x.text), `"${x.text}" twice`);
      seen.add(x.text);
    }
    STAGES.forEach((st, i) => {
      const pool = SENSE.filter(x => x.unit <= st.to);
      const trues = pool.filter(x => x.answer).length;
      assert.ok(pool.length >= 20 + 10 * i, `stage ${i + 1}: only ${pool.length} sentences`);
      assert.ok(trues / pool.length >= 0.4 && trues / pool.length <= 0.6, `stage ${i + 1}: ${trues}/${pool.length} true`);
    });
  });

  it('benchmark texts are unseen and decodable at the end of their stage', () => {
    const taught = new Set(units.flatMap(u => [...(u.sentences || []).map(s => s.text), ...(u.texts || []).flatMap(t => t.sentences.map(s => s.text))]));
    assert.equal(BENCHMARK_TEXTS.length, STAGES.length);
    BENCHMARK_TEXTS.forEach((t, i) => {
      assert.equal(t.stage, i);
      const end = STAGES[i].to;
      for (const text of [...t.sentences, ...t.questions.map(q => q.text), ...t.questions.flatMap(q => q.options || [])]) {
        assert.deepEqual(checkSentence(text, end, lex), [], `${t.id}: "${text}"`);
      }
      t.sentences.forEach(x => assert.ok(!taught.has(x), `${t.id}: "${x}" is also a course sentence`));
      assert.ok(t.questions.length >= 4);
      t.questions.forEach(q => {
        assert.match(q.ar, ARABIC);
        if (q.options) assert.ok(q.options.includes(q.answer));
        else assert.equal(typeof q.answer, 'boolean');
      });
      const yn = t.questions.filter(q => !q.options);
      assert.ok(yn.some(q => q.answer) && yn.some(q => !q.answer));
    });
  });

  it('sentence-and-picture items are decodable at their unit and have three different pictures', () => {
    assert.deepEqual([...new Set(PICTURES.map(x => x.unit))], [3, 6, 9]);
    for (const x of PICTURES) {
      assert.deepEqual(checkSentence(x.text, x.unit, lex), [], x.text);
      assert.equal(new Set(x.pics).size, 3, x.text);
      assert.match(x.ar, ARABIC);
    }
  });

  it('benchmark made-up words are decodable at the end of their stage and used nowhere else', () => {
    const course = new Set(units.flatMap(u => [...(u.words || []).map(w => w.w), ...(u.pseudo || []).flatMap(pw => [pw.w,
      ...pw.foils.map(f => (typeof f === 'string' ? f : f.w).replace(/\|/g, ''))])]));
    const seen = new Set();
    assert.equal(BENCH_PSEUDO.length, STAGES.length);
    BENCH_PSEUDO.forEach((set, i) => {
      assert.ok(set.items.length >= 6, `stage ${i + 1}`);
      for (const pw of set.items) {
        const r = pw.split ? decodeWord(pw.w, STAGES[i].to, lex, pw.split) : analyzeToken(pw.w, STAGES[i].to, lex);
        assert.ok(r.ok, `${pw.w} (${r.reason})`);
        assert.ok(!course.has(pw.w) && !seen.has(pw.w), `${pw.w} is used elsewhere`);
        seen.add(pw.w);
        assert.equal(pw.foils.length, 2);
        const forms = pw.foils.map(f => (typeof f === 'string' ? f : f.w).replace(/\|/g, ''));
        assert.equal(new Set([pw.w, ...forms]).size, 3, pw.w);
      }
    });
  });

  it('can-do statements exist for every stage, in Arabic, with unique ids', () => {
    assert.equal(CAN_DO_STAGES.length, STAGES.length);
    const ids = CAN_DO_STAGES.flatMap(s => s.items.map(i => i.id));
    assert.equal(new Set(ids).size, ids.length);
    CAN_DO_STAGES.forEach(s => {
      assert.ok(s.items.length >= 3);
      s.items.forEach(i => { assert.match(i.ar, ARABIC); assert.ok(i.link); });
    });
  });
});
