// questions.js - Builds activity questions from the curriculum (pure; no DOM).
//
// A question looks like:
// { key, unit, activity, item, type, instruction, prompt: {...}, focus: [graphemes practised],
//   memory: [item keys for spaced review], feedback: { audio, word, ar, emoji, text } }
// Types:
//   'choice'       options: [{ value, label, lang }], answer
//   'yesno'        options: yes/no, answer: true|false
//   'build'        tiles: [{ id, label }], answerTiles: [label]        (word-build, sentence-build)
//   'spell'        answer: word, graphemes, keys: letters on the keyboard (dictation)
//   'trace'        answer: letter (tracing)
//   'audio-choice' options: [{ value, audio }], answer (made-up words in the placement test)
import {
  buildLexicon, decodeWord, analyzeToken, segment, isVowel, isShortVowel, contrastOf, slugify, clipKey, cleanToken,
  pickGraphemeDistractors, pickWordDistractors, shuffle, VISUAL_CONFUSIONS, SOUND_CONFUSIONS, sameSound, pseudoForm
} from './phonics.js';

export const DEFAULT_ITEMS = 8;
export const PERCEPTION_VOICES = ['f', 'm', 'f2', 'm2'];
/** From this unit on, a placement part has 3 items instead of 5. */
export const SHORT_PLACEMENT_FROM = 11;

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
  'read-text': 'اقرأ النص، ثم أجب: هل هذه الجملة صحيحة؟',
  dictation: 'استمع، ثم اكتب الكلمة.',
  'heart-words': 'استمع: كيف تُكتب هذه الكلمة؟',
  'sentence-build': 'استمع، ثم رتّب الكلمات لتكوّن الجملة.',
  tracing: 'شاهد كيف يُكتب الحرف، ثم تتبّعه، ثم اكتبه وحدك.',
  pseudo: 'هذا اسم منتج جديد. استمع إلى الخيارات الثلاثة: أيّها يقرأ الاسم بشكل صحيح؟',
  perception: 'استمع: أيّ صوت تسمع؟',
  signs: 'اقرأ اللافتة: ماذا تعني؟',
  'read-text-choice': 'اقرأ النص، ثم اختر الإجابة الصحيحة.',
  'forms-statement': 'اقرأ الاستمارة: هل هذه الجملة صحيحة؟'
};
const SUFFIX_TILES = ['ed', 'ing', 's', 'es', 'er', 'est', 'ly', 'ful'];

export function createQuestionBank({ units, gpc, alphabet, perception = [], hasClip = () => true }) {
  const lex = buildLexicon(units, gpc);
  const idx = (unitId) => units.findIndex(u => u.id === unitId);
  const unitOf = (unitId) => units[idx(unitId)];
  const upTo = (unitId) => units.slice(0, idx(unitId) + 1);
  const lastUnit = units[units.length - 1];

  const taughtGraphemes = (unitId) => [...new Set(upTo(unitId).flatMap(u => u.graphemes || []))];
  const taughtLetters = (unitId) => taughtGraphemes(unitId).filter(g => g.length === 1 && alphabet.includes(g));
  const keyboardLetters = (unitId) => [...new Set(taughtGraphemes(unitId).flatMap(g => g.split('')).filter(c => /[a-z]/.test(c)))].sort();
  const label = (g) => (gpc[g] && gpc[g].label) || g;
  // Grapheme keys that are spellings (not second-sound keys such as c2, ow2), for spelling options.
  const spellings = (list) => list.filter(g => !/[0-9]/.test(g) && !/_e$/.test(g));
  const signsUpTo = (unitId) => upTo(unitId).flatMap(u => u.signs || []);
  const wordsUpTo = (unitId) => upTo(unitId).flatMap(u => u.words || []);
  const heartUpTo = (unitId) => upTo(unitId).flatMap(u => u.heart || []);
  const allWords = wordsUpTo(lastUnit.id);
  const allHeart = heartUpTo(lastUnit.id);
  const wordInfo = (w) => allWords.find(x => x.w === w) || { w, ar: '' };
  const heartInfo = (w) => allHeart.find(x => x.w === w) || null;
  const oneSyllable = (list) => list.filter(w => !w.split);
  // Words practised in a unit: its own words, or the whole pool in a review unit.
  const unitWords = (u) => (u.review ? wordsUpTo(u.id) : u.words || []);
  const unitHeart = (u) => (u.review ? heartUpTo(u.id) : u.heart || []);
  /** Sound units (graphemes, e.g. a_e) and spelling chunks (pieces, e.g. a ... e, ed) of a course word. */
  const analyze = (w) => {
    const r = decodeWord(w, lastUnit.id, lex);
    if (r.ok) return r;
    const a = analyzeToken(w, lastUnit.id, lex);
    if (a.ok && a.pieces) return a;
    const gs = segment(w) || [w];
    return { graphemes: gs, pieces: gs };
  };
  const graphemesOf = (w) => analyze(w).graphemes;
  const piecesOf = (w) => analyze(w).pieces;
  /** Vowel spellings to offer beside a target vowel: same kind (short / long), never the same sound twice. */
  const vowelDistractors = (target, pool, n, rng) => {
    const short = isShortVowel(target);
    const cands = shuffle(spellings(pool).filter(g => isVowel(g) && isShortVowel(g) === short && !sameSound(g, target)), rng);
    const out = [];
    for (const g of cands) { if (out.length < n && !out.some(o => sameSound(o, g))) out.push(g); }
    return out;
  };
  const opt = (value, label = value, lang = 'en') => ({ value, label, lang });
  const wordFeedback = (w) => {
    const info = wordInfo(w);
    return { audio: clipKey('w', w), word: w, ar: info.ar, emoji: info.emoji || '' };
  };
  const take = (arr, n) => arr.slice(0, n);
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  /** The unit where an item is introduced (for spaced review). */
  function itemUnit(key) {
    const [kind, ...rest] = key.split(':');
    const v = rest.join(':');
    if (kind === 'ph') return units.find(u => (u.graphemes || []).some(g => gpc[g].ph === v || gpc[g].alt?.ph === v))?.id ?? null;
    if (kind === 'w') return units.find(u => (u.words || []).some(x => x.w === v))?.id ?? null;
    if (kind === 'h') return units.find(u => (u.heart || []).some(x => x.w === v))?.id ?? null;
    return null;
  }

  // ---------------- one question per item ----------------
  function soundItem(u, ph, rng, { force = null } = {}) {
    const taught = taughtGraphemes(u.id);
    const spellings = ph === 'dh' ? ['th'] : taught.filter(g => gpc[g].ph === ph);
    if (!spellings.length) return null;
    const answer = pick(spellings, rng);
    let distractors = pickGraphemeDistractors(answer, taught, 3, rng);
    if (force && force !== answer && taught.includes(force) && !sameSound(force, answer) && !distractors.includes(force)) {
      distractors = [force, ...distractors].slice(0, 3);
    }
    const info = ph === 'dh' ? gpc.th.alt : gpc[answer];
    return {
      key: `${u.id}:sound-match:${ph}`,
      unit: u.id,
      activity: 'sound-match',
      item: ph,
      type: 'choice',
      instruction: INSTRUCTIONS['sound-match'],
      prompt: { audio: clipKey('ph', ph), kw: info.kw },
      options: shuffle([answer, ...distractors], rng).map(g => opt(g, label(g))),
      answer,
      focus: [answer],
      memory: [`ph:${ph}`],
      feedback: { audio: clipKey('w', info.kw), word: info.kw, emoji: info.emoji, ar: '', sound: clipKey('ph', ph) }
    };
  }

  function capitalItem(u, l, rng) {
    const pool = taughtLetters(u.id);
    const toLower = rng() < 0.5;
    const show = (x) => (toLower ? x : x.toUpperCase());
    const distractors = pickGraphemeDistractors(l, pool, 3, rng, VISUAL_CONFUSIONS);
    return {
      key: `${u.id}:capital-match:${l}`,
      unit: u.id,
      activity: 'capital-match',
      item: l,
      type: 'choice',
      instruction: INSTRUCTIONS[toLower ? 'capital-match-lower' : 'capital-match-upper'],
      prompt: { text: toLower ? l.toUpperCase() : l, big: true, audio: clipKey('ln', l) },
      options: shuffle([l, ...distractors], rng).map(x => opt(show(x))),
      answer: show(l),
      focus: [],
      memory: [],
      feedback: { audio: clipKey('ln', l), word: `${l.toUpperCase()} ${l}`, ar: '', emoji: '' }
    };
  }

  const neighboursOf = (u, w) => oneSyllable(wordsUpTo(u.id)).map(x => x.w).filter(x => x !== w && contrastOf(x, w));

  function whichWordItem(u, target, set, rng) {
    const extra = shuffle(neighboursOf(u, target).filter(x => !set.includes(x)), rng);
    const options = [...new Set([...set, ...extra])].slice(0, Math.max(3, Math.min(set.length, 4)));
    if (options.length < 2) return null;
    const focus = [...new Set(options.filter(o => o !== target).map(o => contrastOf(target, o)?.from).filter(Boolean))];
    return {
      key: `${u.id}:which-word:${target}`,
      unit: u.id,
      activity: 'which-word',
      item: target,
      type: 'choice',
      instruction: INSTRUCTIONS['which-word'],
      prompt: { audio: clipKey('w', target), voice: rng() < 0.5 ? 'm' : 'f' },
      options: shuffle(options, rng).map(w => opt(w)),
      answer: target,
      focus,
      memory: [`w:${target}`],
      feedback: wordFeedback(target)
    };
  }

  function wordBuildItem(u, info, rng) {
    const w = info.w;
    const own = (u.review ? wordsUpTo(u.id) : u.words || []).filter(x => x.split && x.w !== w);
    const twoSyllable = own.length ? own : wordsUpTo(u.id).filter(x => x.split && x.w !== w);
    const taught = spellings(taughtGraphemes(u.id));
    let pieces;
    let extras;
    if (info.split) {
      pieces = info.split.split('|');
      const other = shuffle(twoSyllable.flatMap(x => x.split.split('|')), rng).filter(p => !pieces.includes(p));
      extras = other.slice(0, 1);
    } else {
      pieces = piecesOf(w);
      const v = pieces.find(isVowel);
      // One vowel distractor (vowels are what Arabic speakers tend to skip), sometimes a confusable consonant,
      // and another ending for words with -ed / -ing.
      extras = v ? vowelDistractors(v, taught, 1, rng).filter(x => !pieces.includes(x)) : [];
      const cons = pieces.find(p => !isVowel(p) && gpc[p]);
      const consExtra = cons ? pickGraphemeDistractors(cons, taught, 1, rng).filter(x => !pieces.includes(x)) : [];
      if (rng() < 0.5 || !extras.length) extras = [...extras, ...consExtra];
      const ending = pieces[pieces.length - 1];
      if (SUFFIX_TILES.includes(ending) && !gpc[ending]) extras = [...extras, shuffle(SUFFIX_TILES.filter(x => x !== ending), rng)[0]];
      // Words built on a heart word (re|do, kind|ness): offer another word part.
      if (!extras.length) extras = [shuffle(['un', 're', ...SUFFIX_TILES].filter(x => !pieces.includes(x)), rng)[0]];
    }
    const tiles = shuffle([...pieces, ...extras], rng).map((label, i) => ({ id: `t${i}`, label }));
    return {
      key: `${u.id}:word-build:${w}`,
      unit: u.id,
      activity: 'word-build',
      item: w,
      type: 'build',
      instruction: INSTRUCTIONS['word-build'],
      prompt: { audio: clipKey('w', w) },
      tiles,
      answerTiles: pieces,
      focus: info.split ? [] : graphemesOf(w).filter(g => gpc[g]),
      memory: [`w:${w}`],
      feedback: wordFeedback(w)
    };
  }

  function missingLetterItem(u, info, rng, { blank = null, include = null } = {}) {
    const w = info.w;
    const taught = spellings(taughtGraphemes(u.id));
    const { graphemes, pieces } = analyze(w);
    const gs = pieces;
    // Blanks: spellings of single sounds (not word endings, not the silent e of a magic-e word).
    const magicE = graphemes.some(g => /_e$/.test(g));
    const eligible = gs.map((g, k) => (gpc[g] && !(magicE && k === gs.length - 1 && g === 'e') ? k : -1)).filter(k => k >= 0);
    const vowelSlots = eligible.filter(k => isVowel(gs[k]));
    let i;
    if (blank && gs.includes(blank)) i = gs.indexOf(blank);
    else if (vowelSlots.length && rng() < 0.6) i = vowelSlots[Math.floor(rng() * vowelSlots.length)];
    else i = eligible[Math.floor(rng() * eligible.length)];
    const target = gs[i];
    let distractors = isVowel(target)
      ? vowelDistractors(target, taught, 3, rng)
      : pickGraphemeDistractors(target, taught, 3, rng);
    if (include && include !== target && taught.includes(include) && !sameSound(include, target) && !distractors.includes(include)
      && !distractors.some(d => sameSound(d, include))) {
      distractors = [include, ...distractors].slice(0, 3);
    }
    const focus = magicE && isShortVowel(target) && graphemes.includes(`${target}_e`) ? `${target}_e` : target;
    return {
      key: `${u.id}:missing-letter:${w}`,
      unit: u.id,
      activity: 'missing-letter',
      item: w,
      type: 'choice',
      instruction: INSTRUCTIONS['missing-letter'],
      prompt: { audio: clipKey('w', w), parts: gs.map((g, k) => (k === i ? { blank: true } : { text: g })) },
      options: shuffle([target, ...distractors], rng).map(g => opt(g)),
      answer: target,
      focus: [focus],
      memory: [`w:${w}`],
      feedback: wordFeedback(w)
    };
  }

  function meaningItem(u, info, rng) {
    const pool = wordsUpTo(u.id);
    const ok = (x) => x.w !== info.w && x.ar !== info.ar && (!info.group || x.group !== info.group);
    const same = shuffle(unitWords(u).filter(ok), rng);
    const rest = shuffle(pool.filter(x => ok(x) && !same.includes(x)), rng);
    const distractors = [...same, ...rest].slice(0, 3);
    return {
      key: `${u.id}:meaning:${info.w}`,
      unit: u.id,
      activity: 'meaning',
      item: info.w,
      type: 'choice',
      instruction: INSTRUCTIONS.meaning,
      prompt: { text: info.w, big: true },
      options: shuffle([info, ...distractors], rng).map(x => opt(x.w, x.ar, 'ar')),
      answer: info.w,
      focus: [],
      memory: [`w:${info.w}`],
      feedback: wordFeedback(info.w)
    };
  }

  function firstLastItem(u, info, last, rng) {
    const gs = graphemesOf(info.w).filter(g => gpc[g]);
    const target = last ? gs[gs.length - 1] : gs[0];
    // Options are shown by label, so never two keys with the same label (c / c2).
    const pool = taughtGraphemes(u.id).filter(g => !/_e$/.test(g));
    const distractors = pickGraphemeDistractors(target, pool, 3, rng);
    return {
      key: `${u.id}:first-last-sound:${info.w}:${last ? 'last' : 'first'}`,
      unit: u.id,
      activity: 'first-last-sound',
      item: info.w,
      type: 'choice',
      instruction: INSTRUCTIONS[last ? 'last-sound' : 'first-sound'],
      prompt: { audio: clipKey('w', info.w), position: last ? 'last' : 'first' },
      options: shuffle([target, ...distractors], rng).map(g => opt(g, label(g))),
      answer: target,
      focus: [target],
      memory: [`w:${info.w}`],
      feedback: wordFeedback(info.w)
    };
  }

  function completeSentenceItem(u, s, rng) {
    const pool = wordsUpTo(u.id).map(w => w.w);
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
      unit: u.id,
      activity: 'complete-sentence',
      item: s.text,
      type: 'choice',
      instruction: INSTRUCTIONS['complete-sentence'],
      prompt: { audio: clipKey('s', s.text), sentence: true, tokens: raw, blankIndex: pos, before, after },
      options: shuffle([s.missing, ...distractors], rng).map(w => opt(show(w))),
      answer: show(s.missing),
      focus: [],
      memory: [],
      feedback: { audio: clipKey('s', s.text), text: s.text, ar: s.ar, word: s.missing, emoji: '' }
    };
  }

  function dictationItem(u, info, rng) {
    const w = info.w;
    const { graphemes, pieces } = analyze(w);
    return {
      key: `${u.id}:dictation:${w}`,
      unit: u.id,
      activity: 'dictation',
      item: w,
      type: 'spell',
      instruction: INSTRUCTIONS.dictation,
      prompt: { audio: clipKey('w', w), voice: rng() < 0.5 ? 'm' : 'f' },
      answer: w,
      graphemes: pieces,
      keys: keyboardLetters(u.id),
      focus: info.split ? [] : graphemes.filter(g => gpc[g]),
      memory: [`w:${w}`],
      feedback: wordFeedback(w)
    };
  }

  /** Heart-word spellings that look alike: shared letters, same first letter, similar length. */
  function lookAlikes(w, pool, rng) {
    const letters = new Set(w.toLowerCase());
    const score = (x) => [...new Set(x.toLowerCase())].filter(c => letters.has(c)).length
      + (x[0].toLowerCase() === w[0].toLowerCase() ? 1 : 0) - Math.abs(x.length - w.length) * 0.5 + rng() * 0.5;
    return pool.filter(x => x.toLowerCase() !== w.toLowerCase()).sort((a, b) => score(b) - score(a));
  }

  function heartItem(u, h, rng) {
    const heart = heartUpTo(u.id).map(x => x.w);
    const decodable = oneSyllable(wordsUpTo(u.id)).map(x => x.w);
    const distractors = [...lookAlikes(h.w, heart, rng).slice(0, 3)];
    if (distractors.length < 3) distractors.push(...lookAlikes(h.w, decodable, rng).filter(x => !distractors.includes(x)).slice(0, 3 - distractors.length));
    return {
      key: `${u.id}:heart-words:${h.w}`,
      unit: u.id,
      activity: 'heart-words',
      item: h.w,
      type: 'choice',
      instruction: INSTRUCTIONS['heart-words'],
      prompt: { audio: clipKey('w', h.w) },
      options: shuffle([h.w, ...distractors], rng).map(x => opt(x)),
      answer: h.w,
      focus: [],
      memory: [`h:${h.w}`],
      feedback: { audio: clipKey('w', h.w), word: h.w, ar: h.ar, mark: h.mark, emoji: '' }
    };
  }

  function sentenceBuildItem(u, s, rng) {
    const tokens = s.text.split(/\s+/);
    let order = shuffle(tokens.map((label, i) => ({ id: `t${i}`, label })), rng);
    // Never start already in order.
    for (let k = 0; k < 5 && order.map(t => t.label).join(' ') === s.text; k++) order = shuffle(order, rng);
    if (order.map(t => t.label).join(' ') === s.text) order = [...order.slice(1), order[0]];
    return {
      key: `${u.id}:sentence-build:${slugify(s.text)}`,
      unit: u.id,
      activity: 'sentence-build',
      item: s.text,
      type: 'build',
      instruction: INSTRUCTIONS['sentence-build'],
      prompt: { audio: clipKey('s', s.text), ar: s.ar },
      tiles: order,
      answerTiles: tokens,
      focus: [],
      memory: [],
      feedback: { audio: clipKey('s', s.text), text: s.text, ar: s.ar, word: '', emoji: '' }
    };
  }

  function tracingItem(u, l) {
    return {
      key: `${u.id}:tracing:${l}`,
      unit: u.id,
      activity: 'tracing',
      item: l,
      type: 'trace',
      instruction: INSTRUCTIONS.tracing,
      prompt: { letter: l, audio: clipKey('ln', l) },
      answer: l,
      focus: [],
      memory: [],
      feedback: { audio: clipKey('ln', l), word: l, ar: '', emoji: '' }
    };
  }

  function pseudoItem(u, pw, rng) {
    const words = [pw.w, ...pw.foils.map(f => pseudoForm(f, gpc, pw.split).text)];
    const decoded = pw.split ? decodeWord(pw.w, u.id, lex, pw.split) : analyzeToken(pw.w, u.id, lex);
    return {
      key: `${u.id}:pseudo:${pw.w}`,
      unit: u.id,
      activity: 'pseudo',
      item: pw.w,
      type: 'audio-choice',
      instruction: INSTRUCTIONS.pseudo,
      prompt: { text: pw.w, split: pw.split || null },
      options: shuffle(words, rng).map(w => ({ value: w, audio: clipKey('p', w) })),
      answer: pw.w,
      focus: (decoded.graphemes || []).filter(g => gpc[g]),
      memory: [],
      feedback: { audio: clipKey('p', pw.w), word: pw.w, ar: '', emoji: '' }
    };
  }

  function perceptionItem(set, word, label, voice, n) {
    const pair = set.pairs.find(p => p.includes(word));
    return {
      key: `perception:${set.id}:${n}`,
      unit: null,
      activity: 'perception',
      item: word,
      type: 'choice',
      instruction: INSTRUCTIONS.perception,
      prompt: { audio: clipKey('w', word), voice, pair, set: set.id },
      // Fixed order (a, b) so the two answers stay in the same place during a block.
      options: [opt(set.a), opt(set.b)],
      answer: label,
      focus: [label],
      memory: [],
      feedback: { audio: clipKey('w', word), voice, word, pair, ar: '', emoji: '' }
    };
  }

  // ---------------- unit activities ----------------
  function soundMatch(u, n, rng) {
    const taught = taughtGraphemes(u.id);
    const sounds = [];
    const addSound = (ph) => { if (!sounds.includes(ph)) sounds.push(ph); };
    (u.graphemes || []).forEach(g => { addSound(gpc[g].ph); if (gpc[g].alt) addSound(gpc[g].alt.ph); });
    const fresh = sounds.length;
    shuffle(taught, rng).forEach(g => addSound(gpc[g].ph));
    return take(sounds, Math.max(n, fresh)).map(ph => soundItem(u, ph, rng)).filter(Boolean);
  }

  function capitalMatch(u, n, rng) {
    const pool = taughtLetters(u.id);
    const fresh = (u.graphemes || []).filter(g => pool.includes(g));
    const review = shuffle(pool.filter(l => !fresh.includes(l)), rng);
    return take([...fresh, ...review], Math.max(n, fresh.length)).map(l => capitalItem(u, l, rng));
  }

  function whichWord(u, n, rng) {
    const pool = oneSyllable(wordsUpTo(u.id)).map(w => w.w);
    const items = [];
    const used = new Set();
    const addItem = (target, set) => {
      if (used.has(target)) return;
      const q = whichWordItem(u, target, set, rng);
      if (!q) return;
      used.add(target);
      items.push(q);
    };
    shuffle(u.contrasts || [], rng).forEach(set => addItem(pick(set, rng), set));
    shuffle(pool, rng).forEach(w => { if (items.length < n && neighboursOf(u, w).length) addItem(w, [w]); });
    return take(items, n);
  }

  const wordBuild = (u, n, rng) => shuffle(unitWords(u), rng).slice(0, n).map(info => wordBuildItem(u, info, rng));
  const missingLetter = (u, n, rng) => shuffle(unitWords(u), rng).slice(0, n).map(info => missingLetterItem(u, info, rng));
  const meaning = (u, n, rng) => shuffle(unitWords(u), rng).slice(0, n).map(info => meaningItem(u, info, rng));
  const firstLastSound = (u, n, rng) => shuffle(oneSyllable(unitWords(u)), rng).slice(0, n).map((info, k) => firstLastItem(u, info, k % 2 === 1, rng));
  const completeSentence = (u, n, rng) => shuffle(u.sentences || [], rng).slice(0, n).map(s => completeSentenceItem(u, s, rng));
  const dictation = (u, n, rng) => shuffle(unitWords(u), rng).slice(0, n).map(info => dictationItem(u, info, rng));

  function heartWords(u, n, rng) {
    // The unit's own heart words first, then earlier ones for review.
    const own = shuffle(unitHeart(u), rng);
    const earlier = shuffle(heartUpTo(u.id).filter(h => !own.includes(h)), rng);
    return take([...own, ...earlier], n).map(h => heartItem(u, h, rng));
  }

  const sentenceTokens = (s) => s.text.split(/\s+/).length;
  const sentenceBuild = (u, n, rng) => shuffle((u.sentences || []).filter(s => sentenceTokens(s) >= 3 && sentenceTokens(s) <= 7), rng)
    .slice(0, n).map(s => sentenceBuildItem(u, s, rng));

  const tracing = (u) => (u.graphemes || []).filter(g => g.length === 1 && alphabet.includes(g)).map(l => tracingItem(u, l));

  function readText(u, n, rng = Math.random) {
    return (u.texts || []).flatMap(t => t.questions.map((q, k) => ({
      key: `${u.id}:read-text:${t.id}:${k}`,
      unit: u.id,
      activity: 'read-text',
      item: `${t.id}:${k}`,
      type: q.options ? 'choice' : 'yesno',
      instruction: INSTRUCTIONS[q.options ? 'read-text-choice' : 'read-text'],
      prompt: {
        title: t.title,
        textId: t.id,
        sentences: t.sentences.map(s => ({ text: s.text, ar: s.ar, audio: clipKey('s', s.text) })),
        statement: q.text,
        audio: clipKey('s', q.text)
      },
      options: q.options ? shuffle(q.options, rng).map(o => opt(o)) : [opt(true, 'نعم', 'ar'), opt(false, 'لا', 'ar')],
      answer: q.answer,
      focus: [],
      memory: [],
      feedback: { audio: clipKey('s', q.text), text: q.options ? `${q.text} ${q.answer}` : q.text, ar: q.ar, word: '', emoji: '' }
    })));
  }

  function signItem(u, sign, rng) {
    const others = shuffle(signsUpTo(lastUnit.id).filter(x => x.ar !== sign.ar), rng);
    // Prefer signs already met, then any course sign, so there are always four meanings.
    const known = signsUpTo(u.id);
    const distractors = [...others.filter(x => known.includes(x)), ...others.filter(x => !known.includes(x))].slice(0, 3);
    return {
      key: `${u.id}:signs:${slugify(sign.text)}`,
      unit: u.id,
      activity: 'signs',
      item: sign.text,
      type: 'choice',
      instruction: INSTRUCTIONS.signs,
      prompt: { sign: sign.text, kind: sign.kind, audio: clipKey('s', sign.say) },
      options: shuffle([sign, ...distractors], rng).map(x => opt(x.text, x.ar, 'ar')),
      answer: sign.text,
      focus: [],
      memory: [],
      feedback: { audio: clipKey('s', sign.say), word: sign.text, text: sign.say, ar: sign.ar, emoji: '' }
    };
  }

  function signs(u, n, rng) {
    const own = shuffle(u.signs || [], rng);
    const earlier = shuffle(signsUpTo(u.id).filter(x => !own.includes(x)), rng);
    return take([...own, ...earlier], n).map(x => signItem(u, x, rng));
  }

  function forms(u, n, rng) {
    return shuffle((u.forms || []).flatMap(f => {
      const empty = { title: f.title, ar: f.ar, fields: f.fields.map(x => ({ label: x.label, value: '' })) };
      const filled = { title: f.title, ar: f.ar, fields: f.fields.map(x => ({ label: x.label, value: x.value })) };
      const fieldItems = f.fields.map(field => ({
        key: `${u.id}:forms:${f.id}:${slugify(field.label)}`,
        unit: u.id,
        activity: 'forms',
        item: `${f.id}:${field.label}`,
        type: 'choice',
        instruction: field.ask,
        prompt: { form: empty },
        options: shuffle([field, ...shuffle(f.fields.filter(x => x !== field), rng).slice(0, 3)], rng).map(x => opt(x.label)),
        answer: field.label,
        focus: [],
        memory: [],
        feedback: { audio: '', word: field.label, ar: field.ar, emoji: '' }
      }));
      const statementItems = f.statements.map((st, k) => ({
        key: `${u.id}:forms:${f.id}:statement-${k}`,
        unit: u.id,
        activity: 'forms',
        item: `${f.id}:${k}`,
        type: 'yesno',
        instruction: INSTRUCTIONS['forms-statement'],
        prompt: { form: filled, statement: st.text, audio: clipKey('s', st.text) },
        options: [opt(true, 'نعم', 'ar'), opt(false, 'لا', 'ar')],
        answer: st.answer,
        focus: [],
        memory: [],
        feedback: { audio: clipKey('s', st.text), text: st.text, ar: st.ar, word: '', emoji: '' }
      }));
      return [...shuffle(fieldItems, rng).slice(0, Math.max(4, n - statementItems.length)), ...statementItems];
    }), rng).slice(0, Math.max(n, 6));
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
    'read-text': readText,
    dictation,
    'heart-words': heartWords,
    'sentence-build': sentenceBuild,
    tracing,
    signs,
    forms
  };

  /** Build the questions for one activity of one unit. */
  function build(unitId, activity, { rng = Math.random, n = DEFAULT_ITEMS } = {}) {
    const u = unitOf(unitId);
    if (!u || !BUILDERS[activity]) return [];
    return BUILDERS[activity](u, n, rng);
  }

  // ---------------- spaced review ----------------
  // Harder question types as an item becomes more secure (recognition -> recall).
  const REVIEW_TYPES = [['meaning', 'which-word'], ['meaning', 'which-word'], ['which-word', 'missing-letter', 'word-build'],
    ['missing-letter', 'word-build', 'dictation'], ['dictation', 'missing-letter'], ['dictation'], ['dictation']];

  /** One review question for an item key, in the context of the learner's current unit. */
  function buildItem(key, ctxUnitId, rng = Math.random, { box = 0 } = {}) {
    const ctx = unitOf(ctxUnitId) || lastUnit;
    const [kind, ...rest] = key.split(':');
    const v = rest.join(':');
    if (kind === 'ph') return soundItem(ctx, v, rng);
    if (kind === 'h') {
      const h = heartInfo(v);
      return h ? heartItem(ctx, h, rng) : null;
    }
    if (kind !== 'w') return null;
    const info = allWords.find(x => x.w === v);
    if (!info) return null;
    const types = (REVIEW_TYPES[Math.min(box, REVIEW_TYPES.length - 1)]).filter(t => t !== 'which-word' || (!info.split && neighboursOf(ctx, v).length));
    const type = pick(types.length ? types : ['meaning'], rng);
    if (type === 'which-word') return whichWordItem(ctx, v, [v], rng);
    if (type === 'missing-letter') return missingLetterItem(ctx, info, rng);
    if (type === 'word-build') return wordBuildItem(ctx, info, rng);
    if (type === 'dictation') return dictationItem(ctx, info, rng);
    return meaningItem(ctx, info, rng);
  }

  // ---------------- weak sounds ----------------
  const defaultPartner = (g) => {
    const pair = SOUND_CONFUSIONS.find(([a, b]) => a === g || b === g);
    return pair ? (pair[0] === g ? pair[1] : pair[0]) : null;
  };

  /** A short mixed practice for the learner's weak graphemes: [{ target, partner }]. */
  function weakPractice(targets, ctxUnitId, { rng = Math.random, n = 10, usable = () => true } = {}) {
    const ctx = unitOf(ctxUnitId) || lastUnit;
    const taught = taughtGraphemes(ctx.id);
    const words = oneSyllable(wordsUpTo(ctx.id));
    const lists = targets.filter(t => taught.includes(t.target)).map(({ target, partner }) => {
      const other = partner && taught.includes(partner) ? partner : defaultPartner(target);
      const out = [];
      if (gpc[target]) out.push(soundItem(ctx, gpc[target].ph, rng, { force: other }));
      const set = perceptionSets(ctx.id).find(s => (s.a === target && s.b === other) || (s.b === target && s.a === other));
      if (set) out.push(...perceptionBlock(set, { rng, n: 4, usable, prefix: `weak-${target}` }));
      if (other) {
        const pairs = words.flatMap(x => words.filter(y => {
          const c = contrastOf(x.w, y.w);
          return c && c.from === target && c.to === other;
        }).map(y => [x.w, y.w]));
        shuffle(pairs, rng).slice(0, 2).forEach(pair => out.push(whichWordItem(ctx, pair[0], pair, rng)));
      }
      shuffle(words.filter(x => graphemesOf(x.w, ctx.id).includes(target)), rng).slice(0, 2)
        .forEach(info => out.push(missingLetterItem(ctx, info, rng, { blank: target, include: other })));
      return shuffle(out.filter(Boolean), rng);
    });
    const result = [];
    const keys = new Set();
    for (let round = 0; result.length < n && lists.some(l => l.length); round++) {
      lists.forEach(l => {
        const q = l.shift();
        if (q && !keys.has(q.key) && result.length < n) { keys.add(q.key); result.push(q); }
      });
    }
    return result;
  }

  // ---------------- ear training ----------------
  /** Perception sets whose two letters have both been taught by a unit. */
  function perceptionSets(unitId) {
    const taught = taughtGraphemes(unitId);
    return perception.filter(s => taught.includes(s.a) && taught.includes(s.b));
  }

  /** A block of 2-choice trials: half with each sound, several voices, no token twice in a row. */
  function perceptionBlock(set, { rng = Math.random, n = 16, usable = () => true, prefix = 'perception' } = {}) {
    const tokens = (side) => set.pairs.flatMap(pair => PERCEPTION_VOICES
      .filter(v => usable(clipKey('w', pair[side]), v))
      .map(voice => ({ word: pair[side], voice, label: side === 0 ? set.a : set.b })));
    const a = shuffle(tokens(0), rng);
    const b = shuffle(tokens(1), rng);
    if (!a.length || !b.length) return [];
    const chosen = [];
    for (let i = 0; i < n; i++) chosen.push(i % 2 === 0 ? a[(i / 2) % a.length] : b[((i - 1) / 2) % b.length]);
    let order = shuffle(chosen, rng);
    for (let i = 1; i < order.length; i++) {
      if (order[i].word === order[i - 1].word) {
        const j = order.findIndex((t, k) => k > i && t.word !== order[i - 1].word);
        if (j > 0) [order[i], order[j]] = [order[j], order[i]];
      }
    }
    return order.map((t, k) => ({ ...perceptionItem(set, t.word, t.label, t.voice, k), key: `${prefix}:${set.id}:${k}` }));
  }

  // ---------------- placement ----------------
  /**
   * Items for one unit of the placement test (no feedback is given during the test).
   * Units 1-9: five items. From unit 11 the words are cumulative, so three items (minimal pair, made-up word,
   * dictation) are enough and keep the whole test near 10 minutes for a strong reader.
   */
  function placementItems(unitId, rng = Math.random) {
    const u = unitOf(unitId);
    if (!u) return [];
    if (unitId >= SHORT_PLACEMENT_FROM) return shortPlacementItems(u, rng);
    const items = [];
    const soundGraphemes = (u.graphemes || []).filter(g => !gpc[g].variantOf && hasClip(clipKey('ph', gpc[g].ph)));
    if (soundGraphemes.length) {
      shuffle(soundGraphemes, rng).slice(0, 2).forEach(g => items.push(soundItem(u, gpc[g].ph, rng)));
    }
    if (items.length < 2) {
      shuffle(unitWords(u).filter(w => !items.some(q => q.item === w.w)), rng).slice(0, 2 - items.length)
        .forEach(info => items.push(meaningItem(u, info, rng)));
    }
    const sets = shuffle(u.contrasts || [], rng);
    for (const set of sets) {
      const q = whichWordItem(u, pick(set, rng), set, rng);
      if (q) { items.push(q); break; }
    }
    if ((u.pseudo || []).length) items.push(pseudoItem(u, pick(u.pseudo, rng), rng));
    const heart = u.heart || [];
    if (u.id % 2 === 0 && heart.length) items.push(heartItem(u, pick(heart, rng), rng));
    else items.push(dictationItem(u, pick(unitWords(u), rng), rng));
    return items.filter(Boolean).map(q => ({ ...q, key: `place:${q.key}` }));
  }

  function shortPlacementItems(u, rng) {
    const items = [];
    for (const set of shuffle(u.contrasts || [], rng)) {
      const q = whichWordItem(u, pick(set, rng), set, rng);
      if (q) { items.push(q); break; }
    }
    if ((u.pseudo || []).length) items.push(pseudoItem(u, pick(u.pseudo, rng), rng));
    items.push(dictationItem(u, pick(unitWords(u), rng), rng));
    return items.filter(Boolean).map(q => ({ ...q, key: `place:${q.key}` }));
  }

  /** Units covered by the placement test: every unit that teaches something new (not the final review). */
  const placementUnits = () => units.filter(u => !u.review).map(u => u.id);

  /** Correct/incorrect for any question type. */
  function isCorrect(q, value) {
    if (q.type === 'build') return Array.isArray(value) && value.join('|') === q.answerTiles.join('|');
    if (q.type === 'spell') return String(value).trim().toLowerCase() === q.answer;
    return value === q.answer;
  }

  return {
    build, buildItem, isCorrect, weakPractice, perceptionSets, perceptionBlock, placementItems, placementUnits, itemUnit,
    lex, taughtGraphemes, keyboardLetters, wordsUpTo, unitWords, wordInfo, heartInfo
  };
}

// Exported for tests.
export { sameSound };
