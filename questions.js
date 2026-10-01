// questions.js - Builds activity questions from the curriculum (pure; no DOM).
//
// A question looks like:
// { key, activity, item, type: 'choice'|'build'|'yesno', instruction,
//   prompt: { audio, voice?, text?, parts?, big?, kw? },
//   options: [{ value, label, lang }], answer,          // choice / yesno
//   tiles: [{ id, label }], answerTiles: [label],         // build
//   focus: [graphemes practised], feedback: { audio, word, ar, emoji, text } }
import {
  buildLexicon, decodeWord, analyzeToken, segment, isVowel, contrastOf, slugify, clipKey, cleanToken,
  pickGraphemeDistractors, pickWordDistractors, pickBlank, shuffle, VISUAL_CONFUSIONS, sameSound
} from './phonics.js';

export const DEFAULT_ITEMS = 8;

export const INSTRUCTIONS = {
  'sound-match': 'استمع إلى الصوت واختر الحرف الذي يمثّله.',
  'capital-match-lower': 'اختر الحرف الصغير المطابق.',
  'capital-match-upper': 'اختر الحرف الكبير المطابق.',
  'which-word': 'استمع: أيّ كلمة سمعت؟',
  'word-build': 'استمع، ثم كوّن الكلمة بالترتيب.',
  'missing-letter': 'استمع، واختر الحرف الناقص.',
  meaning: 'اقرأ الكلمة: ما معناها؟',
  'first-sound': 'استمع: ما الصوت الأول في الكلمة؟',
  'last-sound': 'استمع: ما الصوت الأخير في الكلمة؟',
  'complete-sentence': 'استمع إلى الجملة، واختر الكلمة الناقصة.',
  'read-text': 'اقرأ النص، ثم أجب: هل هذه الجملة صحيحة؟'
};

export function createQuestionBank({ units, gpc, alphabet }) {
  const lex = buildLexicon(units, gpc);
  const idx = (unitId) => units.findIndex(u => u.id === unitId);
  const unitOf = (unitId) => units[idx(unitId)];
  const upTo = (unitId) => units.slice(0, idx(unitId) + 1);

  const taughtGraphemes = (unitId) => [...new Set(upTo(unitId).flatMap(u => u.graphemes || []))];
  const taughtLetters = (unitId) => taughtGraphemes(unitId).filter(g => g.length === 1 && alphabet.includes(g));
  const wordsUpTo = (unitId) => upTo(unitId).flatMap(u => u.words || []);
  const wordInfo = (w) => wordsUpTo(units[units.length - 1].id).find(x => x.w === w) || { w, ar: '' };
  const oneSyllable = (list) => list.filter(w => !w.split);
  // Words practised in a unit: its own words, or the whole pool in a review unit.
  const unitWords = (u) => (u.review ? wordsUpTo(u.id) : u.words || []);
  const graphemesOf = (w, unitId) => {
    const r = decodeWord(w, unitId, lex);
    return r.ok ? r.graphemes : segment(w) || [w];
  };
  const opt = (value, label = value, lang = 'en') => ({ value, label, lang });
  const wordFeedback = (w) => {
    const info = wordInfo(w);
    return { audio: clipKey('w', w), word: w, ar: info.ar, emoji: info.emoji || '' };
  };
  const take = (arr, n) => arr.slice(0, n);

  // ---------------- builders ----------------
  function soundMatch(u, n, rng) {
    const taught = taughtGraphemes(u.id);
    const spellingsOf = (ph) => taught.filter(g => gpc[g].ph === ph);
    const sounds = [];
    const addSound = (ph, ipa) => { if (!sounds.some(s => s.ph === ph)) sounds.push({ ph, ipa }); };
    (u.graphemes || []).forEach(g => { addSound(gpc[g].ph, gpc[g].ipa); if (gpc[g].alt) addSound(gpc[g].alt.ph, gpc[g].alt.ipa); });
    const fresh = sounds.length;
    shuffle(taught, rng).forEach(g => addSound(gpc[g].ph, gpc[g].ipa));
    return take(sounds, Math.max(n, fresh)).map(({ ph }) => {
      const spellings = ph === 'dh' ? ['th'] : spellingsOf(ph);
      const answer = spellings[Math.floor(rng() * spellings.length)];
      const distractors = pickGraphemeDistractors(answer, taught, 3, rng);
      const info = ph === 'dh' ? gpc.th.alt : gpc[answer];
      return {
        key: `${u.id}:sound-match:${ph}`,
        activity: 'sound-match',
        item: ph,
        type: 'choice',
        instruction: INSTRUCTIONS['sound-match'],
        prompt: { audio: clipKey('ph', ph), kw: info.kw },
        options: shuffle([answer, ...distractors], rng).map(g => opt(g)),
        answer,
        focus: [answer],
        feedback: { audio: clipKey('w', info.kw), word: info.kw, emoji: info.emoji, ar: '', sound: clipKey('ph', ph) }
      };
    });
  }

  function capitalMatch(u, n, rng) {
    const pool = taughtLetters(u.id);
    const fresh = (u.graphemes || []).filter(g => pool.includes(g));
    const review = shuffle(pool.filter(l => !fresh.includes(l)), rng);
    return take([...fresh, ...review], Math.max(n, fresh.length)).map(l => {
      const toLower = rng() < 0.5;
      const show = (x) => (toLower ? x : x.toUpperCase());
      const distractors = pickGraphemeDistractors(l, pool, 3, rng, VISUAL_CONFUSIONS);
      return {
        key: `${u.id}:capital-match:${l}`,
        activity: 'capital-match',
        item: l,
        type: 'choice',
        instruction: INSTRUCTIONS[toLower ? 'capital-match-lower' : 'capital-match-upper'],
        prompt: { text: toLower ? l.toUpperCase() : l, big: true, audio: clipKey('ln', l) },
        options: shuffle([l, ...distractors], rng).map(x => opt(show(x))),
        answer: show(l),
        focus: [],
        feedback: { audio: clipKey('ln', l), word: `${l.toUpperCase()} ${l}`, ar: '', emoji: '' }
      };
    });
  }

  function whichWord(u, n, rng) {
    const pool = oneSyllable(wordsUpTo(u.id)).map(w => w.w);
    const neighbours = (w) => pool.filter(x => x !== w && contrastOf(x, w));
    const items = [];
    const used = new Set();
    const addItem = (target, set) => {
      if (used.has(target)) return;
      const extra = shuffle(neighbours(target).filter(x => !set.includes(x)), rng);
      const options = [...new Set([...set, ...extra])].slice(0, Math.max(3, Math.min(set.length, 4)));
      if (options.length < 2) return;
      used.add(target);
      const focus = [...new Set(options.filter(o => o !== target).map(o => contrastOf(target, o)?.from).filter(Boolean))];
      items.push({
        key: `${u.id}:which-word:${target}`,
        activity: 'which-word',
        item: target,
        type: 'choice',
        instruction: INSTRUCTIONS['which-word'],
        prompt: { audio: clipKey('w', target), voice: rng() < 0.5 ? 'm' : 'f' },
        options: shuffle(options, rng).map(w => opt(w)),
        answer: target,
        focus,
        feedback: wordFeedback(target)
      });
    };
    shuffle(u.contrasts || [], rng).forEach(set => addItem(set[Math.floor(rng() * set.length)], set));
    shuffle(pool, rng).forEach(w => { if (items.length < n && neighbours(w).length) addItem(w, [w]); });
    return take(items, n);
  }

  function wordBuild(u, n, rng) {
    const words = shuffle(unitWords(u), rng).slice(0, n);
    const twoSyllable = (u.words || []).filter(w => w.split);
    const vowels = taughtGraphemes(u.id).filter(isVowel);
    return words.map(info => {
      const w = info.w;
      let pieces;
      let extras;
      if (info.split) {
        pieces = info.split.split('|');
        const other = shuffle(twoSyllable.filter(x => x.w !== w).flatMap(x => x.split.split('|')), rng).filter(p => !pieces.includes(p));
        extras = other.slice(0, 1);
      } else {
        pieces = graphemesOf(w, u.id);
        const v = pieces.find(isVowel);
        // One vowel distractor (vowels are what Arabic speakers tend to skip), sometimes a confusable consonant.
        extras = shuffle(vowels.filter(x => x !== v), rng).slice(0, 1);
        const cons = pieces.find(p => !isVowel(p));
        const consExtra = cons ? pickGraphemeDistractors(cons, taughtGraphemes(u.id), 1, rng).filter(x => !pieces.includes(x)) : [];
        if (rng() < 0.5) extras = [...extras, ...consExtra];
      }
      const tiles = shuffle([...pieces, ...extras], rng).map((label, i) => ({ id: `t${i}`, label }));
      return {
        key: `${u.id}:word-build:${w}`,
        activity: 'word-build',
        item: w,
        type: 'build',
        instruction: INSTRUCTIONS['word-build'],
        prompt: { audio: clipKey('w', w) },
        tiles,
        answerTiles: pieces,
        focus: info.split ? [] : pieces,
        feedback: wordFeedback(w)
      };
    });
  }

  function missingLetter(u, n, rng) {
    const words = shuffle(unitWords(u), rng).slice(0, n);
    const taught = taughtGraphemes(u.id);
    const vowels = taught.filter(isVowel);
    return words.map(info => {
      const w = info.w;
      const gs = graphemesOf(w, u.id);
      const i = pickBlank(gs, rng);
      const target = gs[i];
      const distractors = isVowel(target)
        ? shuffle(vowels.filter(v => v !== target), rng).slice(0, 3)
        : pickGraphemeDistractors(target, taught, 3, rng);
      return {
        key: `${u.id}:missing-letter:${w}`,
        activity: 'missing-letter',
        item: w,
        type: 'choice',
        instruction: INSTRUCTIONS['missing-letter'],
        prompt: { audio: clipKey('w', w), parts: gs.map((g, k) => (k === i ? { blank: true } : { text: g })) },
        options: shuffle([target, ...distractors], rng).map(g => opt(g)),
        answer: target,
        focus: [target],
        feedback: wordFeedback(w)
      };
    });
  }

  function meaning(u, n, rng) {
    const words = shuffle(unitWords(u), rng).slice(0, n);
    const pool = wordsUpTo(u.id);
    return words.map(info => {
      const ok = (x) => x.w !== info.w && x.ar !== info.ar && (!info.group || x.group !== info.group);
      const same = shuffle(unitWords(u).filter(ok), rng);
      const rest = shuffle(pool.filter(x => ok(x) && !same.includes(x)), rng);
      const distractors = [...same, ...rest].slice(0, 3);
      return {
        key: `${u.id}:meaning:${info.w}`,
        activity: 'meaning',
        item: info.w,
        type: 'choice',
        instruction: INSTRUCTIONS.meaning,
        prompt: { text: info.w, big: true },
        options: shuffle([info, ...distractors], rng).map(x => opt(x.w, x.ar, 'ar')),
        answer: info.w,
        focus: [],
        feedback: wordFeedback(info.w)
      };
    });
  }

  function firstLastSound(u, n, rng) {
    const words = shuffle(oneSyllable(unitWords(u)), rng).slice(0, n);
    const taught = taughtGraphemes(u.id);
    return words.map((info, k) => {
      const gs = graphemesOf(info.w, u.id);
      const last = k % 2 === 1;
      const target = last ? gs[gs.length - 1] : gs[0];
      const distractors = pickGraphemeDistractors(target, taught, 3, rng);
      return {
        key: `${u.id}:first-last-sound:${info.w}:${last ? 'last' : 'first'}`,
        activity: 'first-last-sound',
        item: info.w,
        type: 'choice',
        instruction: INSTRUCTIONS[last ? 'last-sound' : 'first-sound'],
        prompt: { audio: clipKey('w', info.w), position: last ? 'last' : 'first' },
        options: shuffle([target, ...distractors], rng).map(g => opt(g)),
        answer: target,
        focus: [target],
        feedback: wordFeedback(info.w)
      };
    });
  }

  function completeSentence(u, n, rng) {
    const pool = wordsUpTo(u.id).map(w => w.w);
    return shuffle(u.sentences || [], rng).slice(0, Math.max(n, 0)).map(s => {
      const raw = s.text.split(/\s+/);
      const pos = raw.findIndex(t => cleanToken(t).toLowerCase() === s.missing);
      const before = raw[pos].match(/^[^A-Za-z]*/)[0];
      const after = raw[pos].match(/[^A-Za-z]*$/)[0];
      const capital = /^[A-Z]/.test(cleanToken(raw[pos]));
      // Plural forms (pens, boxes) get distractors built from the base word.
      const a = analyzeToken(s.missing, u.id, lex);
      let distractors;
      if (pool.includes(s.missing)) {
        distractors = pickWordDistractors(s.missing, pool, 3, rng);
      } else if (a.base) {
        const suffix = s.missing.slice(a.base.length);
        distractors = pickWordDistractors(a.base, pool, 3, rng).map(w => w + suffix);
      } else {
        distractors = pickWordDistractors(s.missing, pool, 3, rng);
      }
      const show = (w) => (capital ? w[0].toUpperCase() + w.slice(1) : w);
      return {
        key: `${u.id}:complete-sentence:${slugify(s.text)}`,
        activity: 'complete-sentence',
        item: s.text,
        type: 'choice',
        instruction: INSTRUCTIONS['complete-sentence'],
        prompt: { audio: clipKey('s', s.text), sentence: true, tokens: raw, blankIndex: pos, before, after },
        options: shuffle([s.missing, ...distractors], rng).map(w => opt(show(w))),
        answer: show(s.missing),
        focus: [],
        feedback: { audio: clipKey('s', s.text), text: s.text, ar: s.ar, word: s.missing, emoji: '' }
      };
    });
  }

  function readText(u) {
    return (u.texts || []).flatMap(t => t.questions.map((q, k) => ({
      key: `${u.id}:read-text:${t.id}:${k}`,
      activity: 'read-text',
      item: `${t.id}:${k}`,
      type: 'yesno',
      instruction: INSTRUCTIONS['read-text'],
      prompt: {
        title: t.title,
        textId: t.id,
        sentences: t.sentences.map(s => ({ text: s.text, ar: s.ar, audio: clipKey('s', s.text) })),
        statement: q.text,
        audio: clipKey('s', q.text)
      },
      options: [opt(true, 'نعم', 'ar'), opt(false, 'لا', 'ar')],
      answer: q.answer,
      focus: [],
      feedback: { audio: clipKey('s', q.text), text: q.text, ar: q.ar, word: '', emoji: '' }
    })));
  }

  const BUILDERS = {
    'sound-match': soundMatch,
    'capital-match': capitalMatch,
    'which-word': whichWord,
    'word-build': wordBuild,
    'missing-letter': missingLetter,
    meaning,
    'first-last-sound': firstLastSound,
    'complete-sentence': completeSentence,
    'read-text': readText
  };

  /** Build the questions for one activity of one unit. */
  function build(unitId, activity, { rng = Math.random, n = DEFAULT_ITEMS } = {}) {
    const u = unitOf(unitId);
    if (!u || !BUILDERS[activity]) return [];
    return BUILDERS[activity](u, n, rng);
  }

  /** Correct/incorrect for a choice question; for word-build compare the sequence of tiles. */
  function isCorrect(q, value) {
    if (q.type === 'build') return Array.isArray(value) && value.join('|') === q.answerTiles.join('|');
    return value === q.answer;
  }

  return { build, isCorrect, lex, taughtGraphemes, wordsUpTo, unitWords, wordInfo };
}

// Exported for tests.
export { sameSound };
