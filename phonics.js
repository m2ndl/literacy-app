// phonics.js - Pure helpers for decoding, distractor choice and audio keys.
// No DOM access and no data imports: curriculum data is passed in, so everything here
// can be unit-tested in Node.

// ---------------------------------------------------------------------------
// Grapheme inventory
// ---------------------------------------------------------------------------
// Segmentation uses the FULL inventory (longest match wins). Graphemes that are not taught
// yet (vowel teams, r-controlled vowels, silent letters...) are still recognised, so a word
// like "feet" or "car" fails the check instead of slipping through as single letters.
export const INVENTORY = [
  'eigh',
  'tch', 'dge', 'igh', 'air', 'ear', 'eer', 'ure', 'all',
  'sh', 'ch', 'th', 'wh', 'ph', 'gh', 'ng', 'nk', 'ck', 'qu', 'kn', 'wr', 'mb',
  'ff', 'll', 'ss', 'zz', 'pp', 'dd', 'gg', 'tt', 'bb', 'nn', 'mm', 'rr', 'cc',
  'ai', 'ay', 'ee', 'ea', 'ey', 'ei', 'ie', 'oa', 'oe', 'oo', 'ou', 'ow', 'oi', 'oy', 'ue', 'ui', 'ew', 'au', 'aw',
  'ar', 'er', 'ir', 'or', 'ur',
  ...'abcdefghijklmnopqrstuvwxyz'
].sort((a, b) => b.length - a.length);

export const SHORT_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const DOUBLES = new Set(['ff', 'll', 'ss', 'zz', 'pp', 'dd', 'gg', 'tt', 'bb', 'nn', 'mm']);
// Consonant graphemes that only occur at the start / only at the end of a syllable in Stage 0-2.
const ONSET_ONLY = new Set(['qu', 'wh', 'y', 'w', 'j', 'v', 'h']);
const CODA_ONLY = new Set(['ck', 'x', 'ng', 'nk', ...DOUBLES]);
// Spellings whose pronunciation breaks the patterns taught in Stage 0-2.
export const BLOCKLIST = new Set([
  'put', 'push', 'pull', 'full', 'bull', 'bush', 'puss',
  'son', 'won', 'ton', 'from', 'of', 'front', 'month',
  'both', 'most', 'post', 'host', 'ghost', 'roll', 'toll', 'poll', 'troll',
  'is', 'as', 'has', 'his', 'was', 'what', 'does'
]);
// Regular words that the soft-c/g and w+a rules would otherwise reject.
export const ALLOWLIST = new Set(['get', 'gets', 'gig', 'wax', 'wag', 'quack']);
// Suffix endings that need -es (not -s) in the plural.
const ES_BASE_ENDINGS = new Set(['s', 'ss', 'x', 'z', 'zz', 'sh', 'ch']);

export function isVowel(g) {
  return SHORT_VOWELS.has(g);
}

/** Split a single syllable (lowercase letters only) into graphemes by longest match. */
export function segment(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const g = INVENTORY.find(c => text.startsWith(c, i));
    if (!g) return null;
    out.push(g);
    i += g.length;
  }
  return out;
}

/** Normalise a raw text token: strip surrounding punctuation, curly quotes -> straight. */
export function cleanToken(raw) {
  return String(raw).replace(/[‘’]/g, "'").replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '');
}

/** Split a sentence into word tokens (punctuation removed, case kept). */
export function tokenize(text) {
  return String(text).split(/\s+/).map(cleanToken).filter(Boolean);
}

/** Turn any text into a stable file-name slug: "It is a pin." -> "it-is-a-pin". */
export function slugify(text) {
  return String(text).toLowerCase().replace(/[‘’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Audio clip key, shared by the app, the audio build script and the tests. */
export function clipKey(kind, text) {
  return kind === 'ph' || kind === 'ln' ? `${kind}:${text}` : `${kind}:${slugify(text)}`;
}

// Misaki (Kokoro) phoneme symbols for affricates.
const KOKORO_IPA = { 'dʒ': 'ʤ', 'tʃ': 'ʧ' };

/**
 * Phonemes for a made-up word, from its graphemes (used to synthesise placement "brand names").
 * Stress on the first syllable; the second syllable keeps a full vowel (secondary stress).
 */
export function toPhonemes(word, gpc, split = null) {
  const syllables = split ? split.split('|') : [word];
  return syllables.map((syl, i) => {
    const gs = segment(syl);
    if (!gs) throw new Error(`cannot segment "${syl}"`);
    return gs.map(g => {
      const ipa = KOKORO_IPA[gpc[g].ipa] || gpc[g].ipa;
      return isVowel(g) ? (i === 0 ? 'ˈ' : 'ˌ') + ipa : ipa;
    }).join('');
  }).join('');
}

/**
 * Every audio clip the curriculum needs, with the voices to render.
 * Voices: f = main (female), m = second talker (male), fs = main voice, slow;
 * f2 and m2 = extra talkers for ear training (perception sets).
 * Kinds: ph = speech sound, ln = letter name, w = word, s = sentence, p = made-up word (from phonemes).
 * Returns [{ key, kind, text, voices, ipa? }], sorted by key, no duplicates.
 */
export function requiredClips(units, gpc, alphabet, perception = []) {
  const clips = new Map();
  const add = (kind, text, voices, extra = {}) => {
    const key = clipKey(kind, text);
    const prev = clips.get(key);
    if (prev) {
      prev.voices = [...new Set([...prev.voices, ...voices])];
      return;
    }
    clips.set(key, { key, kind, text, voices: [...voices], ...extra });
  };
  Object.values(gpc).forEach(info => {
    add('ph', info.ph, ['f'], { ipa: info.ipa });
    add('w', info.kw, ['f']);
    if (info.alt) {
      add('ph', info.alt.ph, ['f'], { ipa: info.alt.ipa });
      add('w', info.alt.kw, ['f']);
    }
  });
  alphabet.forEach(l => add('ln', l, ['f']));
  units.forEach(u => {
    (u.words || []).forEach(w => add('w', w.w, ['f', 'm', 'fs']));
    (u.contrasts || []).flat().forEach(w => add('w', w, ['f', 'm', 'fs']));
    (u.heart || []).forEach(h => add('w', h.w, ['f']));
    (u.names || []).forEach(n => add('w', n.w, ['f']));
    (u.sentences || []).forEach(s => add('s', s.text, ['f', 'fs']));
    (u.texts || []).forEach(t => [...t.sentences, ...t.questions].forEach(s => add('s', s.text, ['f', 'fs'])));
    (u.pseudo || []).forEach(pw => [pw.w, ...pw.foils].forEach(w => {
      add('p', w, ['f'], { ipa: toPhonemes(w, gpc, pw.split ? splitLike(w, pw.split) : null) });
    }));
  });
  perception.forEach(set => set.pairs.flat().forEach(w => add('w', w, ['f', 'm', 'f2', 'm2'])));
  return [...clips.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Split a foil like its target ("tobnab" like "tob|nap" -> "tob|nab"). */
function splitLike(word, split) {
  const n = split.indexOf('|');
  return `${word.slice(0, n)}|${word.slice(n)}`;
}

// ---------------------------------------------------------------------------
// Lexicon: what is taught where
// ---------------------------------------------------------------------------
/**
 * Build lookup tables from the curriculum.
 * @param {Array} units  curriculum units in teaching order
 * @param {Object} gpc   grapheme table (grapheme -> {ph, variantOf?, ...})
 */
export function buildLexicon(units, gpc) {
  const taught = new Map();   // grapheme -> unit id where it is introduced
  const heart = new Map();    // word -> unit id
  const names = new Map();    // Name -> unit id
  const words = new Map();    // word -> { unit, split, ar }
  const rules = new Map();    // rule -> unit id
  units.forEach(u => {
    (u.graphemes || []).forEach(g => { if (!taught.has(g)) taught.set(g, u.id); });
    (u.heart || []).forEach(h => { if (!heart.has(h.w)) heart.set(h.w, u.id); });
    (u.names || []).forEach(n => { if (!names.has(n.w)) names.set(n.w, u.id); });
    (u.rules || []).forEach(r => { if (!rules.has(r)) rules.set(r, u.id); });
    (u.words || []).forEach(w => { if (!words.has(w.w)) words.set(w.w, { unit: u.id, split: w.split || null, ar: w.ar }); });
  });
  const order = new Map(units.map((u, i) => [u.id, i]));
  return { taught, heart, names, words, rules, gpc, order };
}

function introducedBy(map, key, unitId, lex) {
  if (!map.has(key)) return false;
  return lex.order.get(map.get(key)) <= lex.order.get(unitId);
}

function graphemeTaught(g, unitId, lex) {
  if (introducedBy(lex.taught, g, unitId, lex)) return true;
  // "A doubled consonant letter = one sound" (rule taught with ff/ll/ss).
  if (DOUBLES.has(g) && introducedBy(lex.rules, 'doubles', unitId, lex)) {
    return introducedBy(lex.taught, g[0], unitId, lex);
  }
  return false;
}

/** Check one closed syllable: [onset consonant]? + one short vowel + one consonant. */
function checkSyllable(syl, unitId, lex) {
  const gs = segment(syl);
  if (!gs) return { ok: false, reason: `cannot segment "${syl}"` };
  for (const g of gs) {
    if (!graphemeTaught(g, unitId, lex)) {
      return { ok: false, graphemes: gs, reason: lex.gpc[g] ? `"${g}" not taught yet` : `pattern "${g}" not in this stage` };
    }
  }
  const vIdx = gs.map((g, i) => (isVowel(g) ? i : -1)).filter(i => i >= 0);
  if (vIdx.length !== 1) return { ok: false, graphemes: gs, reason: 'needs exactly one short vowel' };
  const v = vIdx[0];
  const onset = gs.slice(0, v);
  const coda = gs.slice(v + 1);
  if (onset.length > 1) return { ok: false, graphemes: gs, reason: 'consonant cluster at the start' };
  if (coda.length !== 1) return { ok: false, graphemes: gs, reason: coda.length ? 'consonant cluster at the end' : 'open syllable (ends in a vowel)' };
  if (onset.length && CODA_ONLY.has(onset[0])) return { ok: false, graphemes: gs, reason: `"${onset[0]}" cannot start a syllable` };
  if (ONSET_ONLY.has(coda[0])) return { ok: false, graphemes: gs, reason: `"${coda[0]}" cannot end a syllable` };
  return { ok: true, graphemes: gs };
}

function spellingRulesOk(word) {
  if (ALLOWLIST.has(word)) return true;
  if (/c[eiy]/.test(word)) return false;          // soft c (cent, city)
  if (/g[eiy]/.test(word)) return false;          // soft g (gem, gin)
  if (/(w|wh|qu)a/.test(word)) return false;      // w + a changes the vowel (want, wash)
  return true;
}

/**
 * Is a plain lowercase word decodable at a unit using taught graphemes only?
 * Two-syllable words must be known to the lexicon with a split ("lap|top"), or the split is given.
 */
export function decodeWord(word, unitId, lex, split = null) {
  if (BLOCKLIST.has(word)) return { ok: false, reason: 'irregular spelling' };
  if (!spellingRulesOk(word)) return { ok: false, reason: 'spelling rule not taught yet (soft c/g or w+a)' };
  const known = split ? { split } : lex.words.get(word);
  if (known && known.split) {
    if (!introducedBy(lex.rules, 'two-syllable', unitId, lex)) return { ok: false, reason: 'two-syllable words not taught yet' };
    const parts = known.split.split('|');
    const graphemes = [];
    for (const p of parts) {
      const r = checkSyllable(p, unitId, lex);
      if (!r.ok) return r;
      graphemes.push(...r.graphemes);
    }
    return { ok: true, via: 'gpc', graphemes, syllables: parts };
  }
  const r = checkSyllable(word, unitId, lex);
  return r.ok ? { ...r, via: 'gpc', syllables: [word] } : r;
}

/**
 * Analyse one token as it appears in a sentence.
 * @param {string} rawToken   token (punctuation is stripped here)
 * @param {*} unitId          unit the text belongs to
 * @param {Object} lex        from buildLexicon
 * @param {boolean} sentenceStart  true for the first token of a sentence
 */
export function analyzeToken(rawToken, unitId, lex, sentenceStart = false) {
  const tok = cleanToken(rawToken);
  if (!tok) return { ok: false, reason: 'empty token' };
  if (/[0-9]/.test(tok)) return { ok: false, reason: 'digits are not used yet' };
  if (/['\-]/.test(tok)) return { ok: false, reason: 'apostrophes and hyphens are not used yet' };
  if (introducedBy(lex.names, tok, unitId, lex)) return { ok: true, via: 'name' };
  if (tok === 'I') return introducedBy(lex.heart, 'I', unitId, lex) ? { ok: true, via: 'heart' } : { ok: false, reason: '"I" not taught yet' };
  if (/[A-Z]/.test(tok.slice(1))) return { ok: false, reason: 'capital letter inside a word' };
  if (/^[A-Z]/.test(tok) && !sentenceStart) return { ok: false, reason: `"${tok}" is capitalised but is not a taught name` };
  const word = tok.toLowerCase();
  if (introducedBy(lex.heart, word, unitId, lex)) return { ok: true, via: 'heart' };
  const direct = decodeWord(word, unitId, lex);
  if (direct.ok) return direct;
  // -es after s/x/z/sh/ch (boxes, quizzes) and -s (pens, gets)
  if (word.endsWith('es') && introducedBy(lex.rules, 'plural-es', unitId, lex)) {
    const base = word.slice(0, -2);
    const b = decodeWord(base, unitId, lex);
    if (b.ok && ES_BASE_ENDINGS.has(b.graphemes[b.graphemes.length - 1])) return { ok: true, via: 'suffix-es', graphemes: [...b.graphemes, 'es'], base };
  }
  if (word.endsWith('s') && !word.endsWith('ss') && introducedBy(lex.rules, 'plural-s', unitId, lex)) {
    const base = word.slice(0, -1);
    const b = decodeWord(base, unitId, lex);
    if (b.ok && !ES_BASE_ENDINGS.has(b.graphemes[b.graphemes.length - 1])) return { ok: true, via: 'suffix-s', graphemes: [...b.graphemes, 's'], base };
  }
  return direct;
}

/** Analyse a whole sentence (or several); returns the tokens that fail. */
export function checkSentence(text, unitId, lex) {
  const raw = String(text).split(/\s+/).filter(Boolean);
  const failures = [];
  raw.forEach((r, i) => {
    const tok = cleanToken(r);
    if (!tok) return;
    // A new sentence starts at the beginning, after . ! ? or at an opening quote.
    const start = i === 0 || /[.!?]["”]?$/.test(raw[i - 1]) || /^["“]/.test(r);
    const res = analyzeToken(tok, unitId, lex, start);
    if (!res.ok) failures.push({ token: tok, reason: res.reason });
  });
  return failures;
}

// ---------------------------------------------------------------------------
// Contrasts and errors
// ---------------------------------------------------------------------------
/** If two one-syllable words differ in exactly one grapheme, return where and how. */
export function contrastOf(a, b) {
  const ga = segment(a);
  const gb = segment(b);
  if (!ga || !gb || ga.length !== gb.length) return null;
  const diff = ga.map((g, i) => (g === gb[i] ? -1 : i)).filter(i => i >= 0);
  if (diff.length !== 1) return null;
  const pos = diff[0];
  return { pos, from: ga[pos], to: gb[pos] };
}

// Graphemes that spell the same sound: never offer one as a distractor for the other.
const SAME_SOUND = [['ch', 'tch'], ['c', 'k', 'ck'], ['f', 'ff'], ['l', 'll'], ['s', 'ss'], ['z', 'zz'], ['w', 'wh'], ['p', 'pp'], ['d', 'dd'], ['g', 'gg']];
// Sounds Arabic speakers tend to confuse (listening).
export const SOUND_CONFUSIONS = [
  ['p', 'b'], ['f', 'v'], ['w', 'v'], ['j', 'y'], ['t', 'd'], ['k', 'g'], ['c', 'g'], ['s', 'z'],
  ['sh', 'ch'], ['s', 'sh'], ['th', 't'], ['th', 's'], ['n', 'ng'], ['ng', 'nk'], ['qu', 'k'], ['x', 's'],
  ['e', 'i'], ['e', 'a'], ['a', 'i'], ['u', 'o'], ['u', 'a'], ['o', 'a']
];
// Letters that look alike (reading).
export const VISUAL_CONFUSIONS = [['b', 'd'], ['p', 'q'], ['b', 'p'], ['d', 'q'], ['n', 'u'], ['m', 'w'], ['h', 'n'], ['i', 'l'], ['t', 'f']];
const VOICING = new Set(['p|b', 'b|p', 't|d', 'd|t', 'k|g', 'g|k', 'c|g', 'g|c', 'f|v', 'v|f', 's|z', 'z|s', 'ch|j', 'j|ch']);

function inPairs(pairs, a, b) {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function sameSound(a, b) {
  if (a === b) return true;
  return SAME_SOUND.some(set => set.includes(a) && set.includes(b));
}

/** Classify a wrong answer so feedback can explain it. */
export function classifyError(target, chosen) {
  if (isVowel(target) && isVowel(chosen)) return 'vowel';
  if (VOICING.has(`${target}|${chosen}`)) return inPairs(VISUAL_CONFUSIONS, target, chosen) ? 'visual-voicing' : 'voicing';
  if (inPairs(VISUAL_CONFUSIONS, target, chosen)) return 'visual';
  if (inPairs(SOUND_CONFUSIONS, target, chosen)) return 'sound';
  return 'other';
}

/** Reduce a wrong word choice to the grapheme pair that differs (pin vs pen -> i/e). */
export function errorFocus(target, chosen) {
  if (target === chosen) return null;
  const c = contrastOf(String(target).toLowerCase(), String(chosen).toLowerCase());
  if (c) return { target: c.from, chosen: c.to, type: classifyError(c.from, c.to) };
  return { target, chosen, type: classifyError(target, chosen) };
}

// ---------------------------------------------------------------------------
// Random helpers (seedable so tests are deterministic)
// ---------------------------------------------------------------------------
export function makeRng(seed = Date.now()) {
  let s = (seed >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Choose up to n distractors for a grapheme: confusable ones first, then others.
 * Never returns the target, a same-sound spelling of it, or duplicates.
 */
export function pickGraphemeDistractors(target, pool, n, rng = Math.random, pairs = SOUND_CONFUSIONS) {
  const candidates = [...new Set(pool)].filter(g => !sameSound(g, target));
  const confusable = shuffle(candidates.filter(g => inPairs(pairs, g, target)), rng);
  const others = shuffle(candidates.filter(g => !inPairs(pairs, g, target)), rng);
  const out = [];
  // keep only one spelling per sound among the distractors
  for (const g of [...confusable, ...others]) {
    if (out.length >= n) break;
    if (!out.some(o => sameSound(o, g))) out.push(g);
  }
  return out;
}

/**
 * Choose up to n word distractors: minimal-pair neighbours first (one grapheme different),
 * then words of similar length.
 */
export function pickWordDistractors(target, pool, n, rng = Math.random) {
  const candidates = [...new Set(pool)].filter(w => w !== target);
  const neighbours = shuffle(candidates.filter(w => contrastOf(w, target)), rng);
  const similar = shuffle(candidates.filter(w => !contrastOf(w, target) && Math.abs(w.length - target.length) <= 1), rng);
  const rest = shuffle(candidates.filter(w => !neighbours.includes(w) && !similar.includes(w)), rng);
  return [...neighbours, ...similar, ...rest].slice(0, n);
}

/**
 * Choose which grapheme to blank out. Vowels are chosen with probability `vowelBias`
 * (Arabic speakers tend to skip vowels when reading and spelling).
 */
export function pickBlank(graphemes, rng = Math.random, vowelBias = 0.6) {
  const vowels = graphemes.map((g, i) => (isVowel(g) ? i : -1)).filter(i => i >= 0);
  const consonants = graphemes.map((g, i) => (isVowel(g) ? -1 : i)).filter(i => i >= 0);
  const useVowel = vowels.length && (!consonants.length || rng() < vowelBias);
  const from = useVowel ? vowels : consonants;
  return from[Math.floor(rng() * from.length)];
}

// ---------------------------------------------------------------------------
// Spelling feedback (dictation)
// ---------------------------------------------------------------------------
/** Graphemes of any typed string (longest match; unknown letters stay single). */
function graphemesOfTyped(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const g = INVENTORY.find(c => text.startsWith(c, i)) || text[i];
    out.push(g);
    i += g.length;
  }
  return out;
}

/**
 * Compare a typed spelling with the target, grapheme by grapheme (edit-distance alignment).
 * Returns { ok, correct: number of target graphemes spelled right, total, ops: [{ op, target, typed }],
 *           confusion: { target, chosen } when exactly one grapheme was swapped for another }.
 * op is 'ok' | 'sub' | 'miss' (target grapheme left out) | 'extra' (typed grapheme not in the target).
 */
export function compareSpelling(target, typed, targetGraphemes = null) {
  const t = targetGraphemes || graphemesOfTyped(target);
  const u = graphemesOfTyped(String(typed).toLowerCase());
  const n = t.length;
  const m = u.length;
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (t[i - 1] === u[j - 1] ? 0 : 1));
    }
  }
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (t[i - 1] === u[j - 1] ? 0 : 1)) {
      ops.unshift({ op: t[i - 1] === u[j - 1] ? 'ok' : 'sub', target: t[i - 1], typed: u[j - 1] });
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.unshift({ op: 'miss', target: t[i - 1], typed: '' });
      i--;
    } else {
      ops.unshift({ op: 'extra', target: '', typed: u[j - 1] });
      j--;
    }
  }
  const subs = ops.filter(o => o.op === 'sub');
  const ok = ops.every(o => o.op === 'ok');
  return {
    ok,
    correct: ops.filter(o => o.op === 'ok').length,
    total: n,
    ops,
    confusion: !ok && subs.length === 1 && ops.every(o => o.op === 'ok' || o.op === 'sub') ? { target: subs[0].target, chosen: subs[0].typed } : null
  };
}
