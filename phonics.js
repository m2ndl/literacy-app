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
  'eigh', 'tion',
  'tch', 'dge', 'igh', 'air', 'ear', 'eer', 'ure', 'all',
  'sh', 'ch', 'th', 'wh', 'ph', 'gh', 'ng', 'nk', 'ck', 'qu', 'kn', 'wr', 'mb',
  'ff', 'll', 'ss', 'zz', 'pp', 'dd', 'gg', 'tt', 'bb', 'nn', 'mm', 'rr', 'cc',
  'ai', 'ay', 'ee', 'ea', 'ey', 'ei', 'ie', 'oa', 'oe', 'oo', 'ou', 'ow', 'oi', 'oy', 'ue', 'ui', 'ew', 'au', 'aw',
  'ar', 'er', 'ir', 'or', 'ur',
  ...'abcdefghijklmnopqrstuvwxyz'
].sort((a, b) => b.length - a.length);

export const SHORT_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
// Long-vowel, diphthong and r-controlled spellings (Stage 4), and "magic e" units such as a_e.
const VOWEL_TEAMS = new Set(['ai', 'ay', 'ee', 'ea', 'ey', 'ei', 'ie', 'oa', 'oe', 'oo', 'ou', 'ow', 'oi', 'oy', 'ue', 'ui', 'ew', 'au', 'aw', 'igh', 'eigh']);
const R_VOWELS = new Set(['ar', 'er', 'ir', 'or', 'ur', 'air', 'ear', 'eer', 'ure']);
const DOUBLES = new Set(['ff', 'll', 'ss', 'zz', 'pp', 'dd', 'gg', 'tt', 'bb', 'nn', 'mm']);
// Consonant graphemes that only occur at the start / only at the end of a syllable.
const ONSET_ONLY = new Set(['qu', 'wh', 'y', 'w', 'j', 'v', 'h']);
const CODA_ONLY = new Set(['ck', 'x', 'ng', 'nk', ...DOUBLES]);
// Consonants that can stand between a vowel and a "magic e" (make, five, bathe).
const MAGIC_E_CONSONANTS = new Set([...'bcdfgklmnprstvz', 'th']);
// Consonant clusters (Stage 3) and the rule that introduces each.
const ONSET_CLUSTERS = {
  'blends-s': ['st', 'sp', 'sk', 'sc', 'sm', 'sn', 'sl', 'sw'],
  'blends-lr': ['bl', 'cl', 'fl', 'gl', 'pl', 'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'tw', 'thr', 'shr'],
  'blends-3': ['str', 'spr', 'spl', 'scr', 'squ']
};
const FINAL_CLUSTERS = ['st', 'sk', 'sp', 'nd', 'nt', 'mp', 'ft', 'lt', 'lk', 'lp', 'lf', 'ld', 'lm', 'pt', 'ct', 'xt', 'nch', 'nth', 'mpt'];
// Spellings whose pronunciation breaks the patterns taught (taught as heart words when needed).
export const BLOCKLIST = new Set([
  // u = /ʊ/, o = /ʌ/, irregular short words
  'put', 'push', 'pull', 'full', 'bull', 'bush', 'puss',
  'son', 'won', 'ton', 'from', 'of', 'front', 'month',
  'both', 'most', 'post', 'host', 'ghost', 'roll', 'toll', 'poll', 'troll',
  'is', 'as', 'has', 'his', 'was', 'what', 'does',
  // magic-e look-alikes that are not long vowels
  'give', 'live', 'have', 'love', 'glove', 'dove', 'come', 'some', 'done', 'none', 'one', 'gone', 'move', 'lose',
  'whose', 'were', 'where', 'there', 'here', 'are', 'sure', 'were', 'eye', 'bye',
  // vowel teams with another sound
  'said', 'says', 'again', 'been', 'head', 'bread', 'dead', 'ready', 'heavy', 'breakfast', 'health', 'weather',
  'great', 'break', 'steak', 'blood', 'flood', 'door', 'floor', 'poor', 'friend', 'you', 'your', 'could', 'would',
  'should', 'soup', 'group', 'touch', 'young', 'country', 'four', 'pour', 'tour', 'though', 'through', 'thought',
  'enough', 'cousin', 'double', 'trouble', 'field', 'piece', 'chief', 'shoe', 'canoe', 'build', 'built', 'busy',
  'women', 'people', 'water', 'father', 'mother', 'brother', 'other', 'any', 'many', 'very', 'every', 'only', 'quiet'
]);
// Regular words that the soft-c/g and w+a rules would otherwise reject.
export const ALLOWLIST = new Set(['get', 'gets', 'gig', 'wax', 'wag', 'quack', 'give', 'girl', 'begin', 'target']);
// Suffix endings that need -es (not -s) in the plural.
const ES_BASE_ENDINGS = new Set(['s', 'ss', 'x', 'z', 'zz', 'sh', 'ch', 'tch']);

/** Any vowel spelling: a short vowel letter, a vowel team, an r-controlled vowel, "all" or a magic-e unit (a_e). */
export function isVowel(g) {
  return SHORT_VOWELS.has(g) || VOWEL_TEAMS.has(g) || R_VOWELS.has(g) || g === 'all' || /^[aeiou]_e$/.test(g);
}

export function isShortVowel(g) {
  return SHORT_VOWELS.has(g);
}

/**
 * Fold a final "magic e" into the vowel: m,a,k,e -> m,a_e,k. A silent final e after a vowel team or an
 * r-controlled vowel (cheese, more) is dropped. Returns { units, silentE }.
 */
export function foldMagicE(gs) {
  const n = gs.length;
  if (n >= 3 && gs[n - 1] === 'e' && SHORT_VOWELS.has(gs[n - 3]) && MAGIC_E_CONSONANTS.has(gs[n - 2])) {
    return { units: [...gs.slice(0, n - 3), `${gs[n - 3]}_e`, gs[n - 2]], silentE: 'magic' };
  }
  if (n >= 3 && gs[n - 1] === 'e' && (VOWEL_TEAMS.has(gs[n - 3]) || R_VOWELS.has(gs[n - 3])) && MAGIC_E_CONSONANTS.has(gs[n - 2])) {
    return { units: gs.slice(0, n - 1), silentE: 'after-team' };
  }
  if (n >= 2 && gs[n - 1] === 'e' && gs[n - 2] === 'or') return { units: gs.slice(0, n - 1), silentE: 'after-team' };
  return { units: gs, silentE: null };
}

/** Sound units of a whole one-syllable word (segment + magic e), or null. */
export function soundUnits(word) {
  const gs = segment(word);
  return gs ? foldMagicE(gs).units : null;
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

// IPA in the grapheme table -> misaki (Kokoro) phoneme tokens.
const KOKORO_IPA = { 'dʒ': 'ʤ', 'tʃ': 'ʧ', 'eɪ': 'A', 'aɪ': 'I', 'oʊ': 'O', 'aʊ': 'W', 'ɔɪ': 'Y', 'juː': 'ju', 'iː': 'i', 'uː': 'u', 'ɝ': 'ɜɹ' };

/**
 * Phonemes for a made-up word, from its graphemes (used to synthesise placement "brand names").
 * Stress on the first syllable; later syllables keep a full vowel (secondary stress).
 */
export function toPhonemes(word, gpc, split = null) {
  const syllables = split ? split.split('|') : [word];
  const LONG = { a: 'A', e: 'i', i: 'I', o: 'O', u: 'ju' };   // a vowel at the end of an open syllable says its name
  return syllables.map((syl, i) => {
    const stress = i === 0 ? 'ˈ' : 'ˌ';
    if (/^(?:[bcdfgkptz]|ck)le$/.test(syl)) return `${KOKORO_IPA[gpc[syl[0]].ipa] || gpc[syl[0]].ipa}əl`;
    const gs = segment(syl);
    if (!gs) throw new Error(`cannot segment "${syl}"`);
    let units = foldMagicE(gs).units;
    if (!units.some(isVowel) && units[units.length - 1] === 'y') units = [...units.slice(0, -1), syllables.length > 1 ? 'y3' : 'y2'];
    // soft c and g before e, i, y
    units = units.map((g, k) => ((g === 'c' || g === 'g') && /^[eiy]/.test(units[k + 1] || '') ? `${g}2` : g));
    const open = SHORT_VOWELS.has(units[units.length - 1]);
    return units.map((g, k) => {
      if (open && k === units.length - 1) return stress + LONG[g];
      if (!gpc[g]) throw new Error(`no sound for "${g}" in "${syl}"`);
      const ipa = KOKORO_IPA[gpc[g].ipa] || gpc[g].ipa;
      return isVowel(g) || g === 'y2' || g === 'y3' ? stress + ipa : ipa;
    }).join('');
  }).join('');
}

/**
 * A made-up word or one of its foils as { text, ipa }. Foils may be written with | for syllables ("si|nep")
 * or as { w, ipa } when the spelling alone doesn't give the sound (word endings).
 */
export function pseudoForm(item, gpc, targetSplit = null) {
  if (typeof item === 'object') return { text: item.w, ipa: item.ipa || toPhonemes(item.w, gpc, item.split || null) };
  if (item.includes('|')) return { text: item.replace(/\|/g, ''), ipa: toPhonemes(item.replace(/\|/g, ''), gpc, item) };
  return { text: item, ipa: toPhonemes(item, gpc, targetSplit ? splitLike(item, targetSplit) : null) };
}

/**
 * Every audio clip the curriculum needs, with the voices to render.
 * Voices: f = main (female), m = second talker (male), fs = main voice, slow;
 * f2 and m2 = extra talkers for ear training (perception sets).
 * Kinds: ph = speech sound, ln = letter name, w = word, s = sentence, p = made-up word (from phonemes).
 * Returns [{ key, kind, text, voices, ipa? }], sorted by key, no duplicates.
 */
export function requiredClips(units, gpc, alphabet, perception = [], extraPseudo = []) {
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
  const addPseudo = (pw) => {
    const target = pw.ipa ? { text: pw.w, ipa: pw.ipa } : pseudoForm(pw.split || pw.w, gpc);
    add('p', target.text, ['f'], { ipa: target.ipa });
    pw.foils.forEach(f => { const form = pseudoForm(f, gpc, pw.split); add('p', form.text, ['f'], { ipa: form.ipa }); });
  };
  units.forEach(u => {
    (u.words || []).forEach(w => add('w', w.w, ['f', 'm', 'fs']));
    (u.contrasts || []).flat().forEach(w => add('w', w, ['f', 'm', 'fs']));
    (u.heart || []).forEach(h => add('w', h.w, ['f']));
    (u.names || []).forEach(n => add('w', n.w, ['f']));
    (u.sentences || []).forEach(s => add('s', s.text, ['f', 'fs']));
    (u.texts || []).forEach(t => [...t.sentences, ...t.questions].forEach(s => add('s', s.text, ['f', 'fs'])));
    (u.pseudo || []).forEach(addPseudo);
    (u.signs || []).forEach(s => add('s', s.say, ['f']));
    (u.forms || []).forEach(f => f.statements.forEach(st => add('s', st.text, ['f'])));
  });
  perception.forEach(set => set.pairs.flat().forEach(w => add('w', w, ['f', 'm', 'f2', 'm2'])));
  extraPseudo.forEach(addPseudo);   // made-up words used only in the stage benchmarks
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

const fail = (reason, graphemes) => ({ ok: false, reason, ...(graphemes ? { graphemes } : {}) });
const ruleTaught = (rule, unitId, lex) => introducedBy(lex.rules, rule, unitId, lex);

/**
 * Check one syllable against what has been taught by a unit.
 * Stage 0-2: [consonant] + short vowel + one consonant. Later stages add consonant clusters, magic e,
 * vowel teams, r-controlled vowels, open syllables (go, stu|dent), y as a vowel (my, ba|by),
 * consonant-le (ta|ble) and -tion.
 * Returns { ok, graphemes (sound units, e.g. a_e), pieces (spelling chunks in order) }.
 */
function checkSyllable(syl, unitId, lex, { last = true, multi = false } = {}) {
  const raw = segment(syl);
  if (!raw) return fail(`cannot segment "${syl}"`);
  // ta|ble, lit|tle: a consonant + le syllable
  if (multi && last && /^(?:[bcdfgkptz]|ck)le$/.test(syl)) {
    if (!ruleTaught('consonant-le', unitId, lex)) return fail('consonant-le syllables not taught yet', raw);
    return { ok: true, graphemes: [raw[0], 'le'], pieces: [syl.slice(0, -2), 'le'] };
  }
  if (syl === 'tion') {
    return graphemeTaught('tion', unitId, lex) ? { ok: true, graphemes: ['tion'], pieces: ['tion'] } : fail('"tion" not taught yet', raw);
  }
  const { units, silentE } = last ? foldMagicE(raw) : { units: raw, silentE: null };
  if (silentE === 'after-team' && !ruleTaught('silent-e', unitId, lex)) return fail('silent final e not taught yet', raw);
  let gs = units;
  // y as a vowel at the end of a syllable: my, fly (long i); ba|by, hap|py (long e)
  const yVowel = !gs.some(isVowel) && gs[gs.length - 1] === 'y' && (gs.length >= 2 || (multi && last));
  if (yVowel) gs = [...gs.slice(0, -1), multi && last ? 'y3' : 'y2'];
  for (const g of gs) {
    if (!graphemeTaught(g, unitId, lex)) {
      return fail(lex.gpc[g] ? `"${g}" not taught yet` : `pattern "${g}" not in this stage`, gs);
    }
  }
  const vIdx = gs.map((g, i) => (isVowel(g) || g === 'y2' || g === 'y3' ? i : -1)).filter(i => i >= 0);
  if (vIdx.length !== 1) return fail(vIdx.length ? 'needs exactly one vowel' : 'needs exactly one short vowel', gs);
  const v = vIdx[0];
  const nucleus = gs[v];
  const onset = gs.slice(0, v);
  const coda = gs.slice(v + 1);
  if (onset.length > 1) {
    const cluster = onset.join('');
    const rule = Object.keys(ONSET_CLUSTERS).find(r => ONSET_CLUSTERS[r].includes(cluster));
    if (!rule) return fail(`"${cluster}" is not an English starting cluster`, gs);
    if (!ruleTaught(rule, unitId, lex)) return fail('consonant cluster at the start', gs);
  } else if (onset.length && CODA_ONLY.has(onset[0])) {
    return fail(`"${onset[0]}" cannot start a syllable`, gs);
  }
  if (coda.length === 0 && SHORT_VOWELS.has(nucleus)) {
    // An open syllable (go, stu|dent): the vowel says its name.
    if (!ruleTaught('open-syllable', unitId, lex)) return fail('open syllable (ends in a vowel)', gs);
  }
  if (coda.length > 1) {
    const cluster = coda.join('');
    if (!FINAL_CLUSTERS.includes(cluster)) return fail(`"${cluster}" is not an English final cluster`, gs);
    if (!ruleTaught('blends-final', unitId, lex)) return fail('consonant cluster at the end', gs);
  }
  if (coda.length === 1 && ONSET_ONLY.has(coda[0]) && !/_e$/.test(nucleus)) return fail(`"${coda[0]}" cannot end a syllable`, gs);
  if (silentE === 'magic' && !graphemeTaught(nucleus, unitId, lex)) return fail(`"${nucleus}" not taught yet`, gs);
  return { ok: true, graphemes: gs, pieces: yVowel ? raw : [...raw] };
}

function spellingRulesOk(word, unitId, lex) {
  if (ALLOWLIST.has(word)) return true;
  const soft = lex && ruleTaught('soft-cg', unitId, lex);
  if (!soft && /c[eiy]/.test(word)) return false;   // soft c (cent, city)
  if (!soft && /g[eiy]/.test(word)) return false;   // soft g (gem, gin)
  if (/(w|wh|qu)a/.test(word) && !/(w|wh|qu)a(y|i)/.test(word)) return false;  // w + a changes the vowel (want, wash)
  if (/w(or|ar)/.test(word)) return false;           // word, work, warm
  if (/(old|olt|ind|ild)$/.test(word)) return false;  // long vowel in a closed syllable (cold, find, child)
  if (/alk$|alf$|alm$/.test(word)) return false;     // talk, half, calm
  return true;
}

/**
 * Is a plain lowercase word decodable at a unit using taught graphemes only?
 * Words of two or more syllables must be known to the lexicon with a split ("lap|top"), or the split is given.
 * Returns { ok, graphemes, pieces, syllables } or { ok: false, reason }.
 */
export function decodeWord(word, unitId, lex, split = null) {
  if (BLOCKLIST.has(word)) return { ok: false, reason: 'irregular spelling' };
  if (!spellingRulesOk(word, unitId, lex)) return { ok: false, reason: 'spelling rule not taught yet (soft c/g, w+a, -old/-ind)' };
  const known = split ? { split } : lex.words.get(word);
  if (known && known.split) {
    if (!introducedBy(lex.rules, 'two-syllable', unitId, lex)) return { ok: false, reason: 'two-syllable words not taught yet' };
    const parts = known.split.split('|');
    const graphemes = [];
    const pieces = [];
    for (let i = 0; i < parts.length; i++) {
      const r = checkSyllable(parts[i], unitId, lex, { last: i === parts.length - 1, multi: true });
      if (!r.ok) return r;
      graphemes.push(...r.graphemes);
      pieces.push(...r.pieces);
    }
    return { ok: true, via: 'gpc', graphemes, pieces, syllables: parts };
  }
  const r = checkSyllable(word, unitId, lex, { last: true, multi: false });
  return r.ok ? { ...r, via: 'gpc', syllables: [word] } : r;
}

/**
 * Analyse one token as it appears in a sentence.
 * @param {string} rawToken   token (punctuation is stripped here)
 * @param {*} unitId          unit the text belongs to
 * @param {Object} lex        from buildLexicon
 * @param {boolean} sentenceStart  true for the first token of a sentence
 */
export function analyzeToken(rawToken, unitId, lex, sentenceStart = false, depth = 0) {
  const tok = cleanToken(rawToken);
  if (!tok) return { ok: false, reason: 'empty token' };
  if (/^[0-9][0-9:.]*$/.test(tok) && ruleTaught('digits', unitId, lex)) return { ok: true, via: 'number' };
  if (/[0-9]/.test(tok)) return { ok: false, reason: 'digits are not used yet' };
  if (/['\-]/.test(tok)) return { ok: false, reason: 'apostrophes and hyphens are not used yet' };
  if (introducedBy(lex.names, tok, unitId, lex)) return { ok: true, via: 'name' };
  if (tok === 'I') return introducedBy(lex.heart, 'I', unitId, lex) ? { ok: true, via: 'heart' } : { ok: false, reason: '"I" not taught yet' };
  if (/[A-Z]/.test(tok.slice(1))) return { ok: false, reason: 'capital letter inside a word' };
  if (/^[A-Z]/.test(tok) && !sentenceStart) return { ok: false, reason: `"${tok}" is capitalised but is not a taught name` };
  const word = tok.toLowerCase();
  if (introducedBy(lex.heart, word, unitId, lex)) return { ok: true, via: 'heart', graphemes: [word], pieces: [word] };
  const direct = decodeWord(word, unitId, lex);
  if (direct.ok) return direct;
  if (depth > 1) return direct;
  const base = (w) => {
    const r = analyzeToken(w, unitId, lex, false, depth + 1);
    return r.ok ? r : null;
  };
  const lastUnit = (b) => (b.graphemes || [])[(b.graphemes || []).length - 1];
  // -es after s/x/z/sh/ch (boxes, quizzes), -ies (cities) and -s (pens, gets, makes)
  if (word.endsWith('ies') && ruleTaught('plural-es', unitId, lex)) {
    const b = base(`${word.slice(0, -3)}y`);
    if (b) return { ok: true, via: 'suffix-es', graphemes: [...b.graphemes, 's'], pieces: [...b.pieces.slice(0, -1), 'ies'], base: `${word.slice(0, -3)}y` };
  }
  if (word.endsWith('es') && ruleTaught('plural-es', unitId, lex)) {
    const b = base(word.slice(0, -2));
    if (b && ES_BASE_ENDINGS.has(lastUnit(b))) return { ok: true, via: 'suffix-es', graphemes: [...b.graphemes, 'es'], pieces: [...b.pieces, 'es'], base: word.slice(0, -2) };
  }
  if (word.endsWith('s') && !word.endsWith('ss') && ruleTaught('plural-s', unitId, lex)) {
    const b = base(word.slice(0, -1));
    if (b && !ES_BASE_ENDINGS.has(lastUnit(b))) return { ok: true, via: 'suffix-s', graphemes: [...b.graphemes, 's'], pieces: [...b.pieces, 's'], base: word.slice(0, -1) };
  }
  for (const [suffix, rule] of SUFFIXES) {
    if (!word.endsWith(suffix) || word.length <= suffix.length + 1 || !ruleTaught(rule, unitId, lex)) continue;
    for (const cand of baseCandidates(word, suffix)) {
      const b = base(cand);
      if (b) return { ok: true, via: `suffix-${suffix}`, graphemes: [...b.graphemes, suffix], pieces: [...stemPieces(b.pieces, cand, word.slice(0, -suffix.length)), suffix], base: cand };
    }
  }
  for (const [prefix, rule] of PREFIXES) {
    if (!word.startsWith(prefix) || word.length <= prefix.length + 1 || !ruleTaught(rule, unitId, lex)) continue;
    const b = base(word.slice(prefix.length));
    if (b) return { ok: true, via: `prefix-${prefix}`, graphemes: [prefix, ...b.graphemes], pieces: [prefix, ...b.pieces], base: word.slice(prefix.length) };
  }
  return direct;
}

// Word endings and beginnings (Stage 3 and 5) and the rules that introduce them.
const SUFFIXES = [['ing', 'suffix-ing'], ['ed', 'suffix-ed'], ['est', 'suffix-er'], ['er', 'suffix-er'],
  ['ful', 'suffixes'], ['less', 'suffixes'], ['ness', 'suffixes'], ['ment', 'suffixes'], ['ly', 'suffixes']];
const PREFIXES = [['un', 'prefixes'], ['re', 'prefixes']];

/** Spelling pieces of the stem as written before a suffix: drive -> driv(er), stop -> stop+p(ed), try -> tri(ed). */
function stemPieces(pieces, base, stem) {
  if (stem === base) return pieces;
  if (stem === base.slice(0, -1)) return pieces.slice(0, -1);                   // e dropped: driv|er
  if (stem === base + base[base.length - 1]) return [...pieces, base[base.length - 1]];   // doubled: stop|p|ed
  if (base.endsWith('y') && stem === `${base.slice(0, -1)}i`) return [...pieces.slice(0, -1), 'i'];   // tri|ed
  return [stem];
}

/** Possible base words before a suffix: jump|ed, stop(p)|ed, lik(e)|ed, tri(y)|ed. */
function baseCandidates(word, suffix) {
  const stem = word.slice(0, -suffix.length);
  const out = [stem];
  if (/([b-df-hj-np-tv-z])\1$/.test(stem) && !/(ll|ss|ff|zz)$/.test(stem)) out.push(stem.slice(0, -1));
  out.push(`${stem}e`);
  if (stem.endsWith('i')) out.push(`${stem.slice(0, -1)}y`);
  return out;
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
/** If two one-syllable words differ in exactly one sound unit (cap/cape counts), return where and how. */
export function contrastOf(a, b) {
  const ga = soundUnits(a);
  const gb = soundUnits(b);
  if (!ga || !gb || ga.length !== gb.length) return null;
  const diff = ga.map((g, i) => (g === gb[i] ? -1 : i)).filter(i => i >= 0);
  if (diff.length !== 1) return null;
  const pos = diff[0];
  return { pos, from: ga[pos], to: gb[pos] };
}

// Graphemes that spell the same sound: never offer one as a distractor for the other.
// Keys such as ow2, y2, c2 are second sounds of the same spelling (cow, fly, city); they never go together either.
const SAME_SOUND = [['ch', 'tch'], ['c', 'k', 'ck'], ['f', 'ff'], ['l', 'll'], ['s', 'ss', 'c2'], ['z', 'zz'], ['w', 'wh'], ['p', 'pp'],
  ['d', 'dd'], ['g', 'gg'], ['j', 'g2', 'dge'], ['a_e', 'ai', 'ay'], ['i_e', 'igh', 'ie', 'y2'], ['o_e', 'oa', 'ow'], ['ee', 'ea', 'y3'],
  ['oo', 'ew', 'ue', 'u_e'], ['er', 'ir', 'ur'], ['ou', 'ow2'], ['oi', 'oy'], ['ow', 'ow2'], ['y', 'y2', 'y3'], ['c', 'c2'], ['g', 'g2']];
// Sounds Arabic speakers tend to confuse (listening).
export const SOUND_CONFUSIONS = [
  ['p', 'b'], ['f', 'v'], ['w', 'v'], ['j', 'y'], ['t', 'd'], ['k', 'g'], ['c', 'g'], ['s', 'z'],
  ['sh', 'ch'], ['s', 'sh'], ['th', 't'], ['th', 's'], ['n', 'ng'], ['ng', 'nk'], ['qu', 'k'], ['x', 's'],
  ['e', 'i'], ['e', 'a'], ['a', 'i'], ['u', 'o'], ['u', 'a'], ['o', 'a'],
  ['a', 'a_e'], ['i', 'i_e'], ['o', 'o_e'], ['u', 'u_e'], ['i', 'ee'], ['e', 'ee'], ['e', 'ai'], ['o', 'oa'], ['u', 'oo'],
  ['ar', 'or'], ['er', 'ar'], ['or', 'er'], ['ou', 'oa'], ['oi', 'i_e']
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
