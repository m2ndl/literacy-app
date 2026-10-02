// assess.js - Scoring for timed reading drills, unit checks and stage benchmarks (pure; no DOM).
//
// Speed is scored as in timed silent-reading tests (e.g. TOSREC; Wagner et al. 2010): items right minus
// items wrong, per minute, so guessing does not pay. The speed criteria below are provisional: they follow
// the mastery rule's 3 s per item and must be set from pilot data (PEDAGOGY_PLAN.md, section 15).

export const DRILL_SECONDS = { words: 60, sentences: 90 };
export const FLUENCY_HISTORY = 30;      // drill results kept per kind
export const TEXT_HISTORY = 60;         // timed text readings kept
export const BENCHMARK_HISTORY = 12;    // stage benchmarks kept
export const UNIT_CHECK_SIZE = 12;
export const UNIT_CHECK_PASS = 0.8;

export const BENCHMARK_CRITERIA = {
  words: { rate: 20, provisional: true },       // net words a minute (3 s a word)
  sentences: { rate: 6, provisional: true },    // net sentences a minute (10 s a sentence)
  decoding: { accuracy: 0.8 },                  // made-up words
  spelling: { accuracy: 0.8 },                  // dictation, whole words
  reading: { accuracy: 0.75 }                   // questions on an unseen text
};
export const BENCHMARK_PARTS = ['words', 'sentences', 'decoding', 'spelling', 'reading'];

/** Net items a minute: (right - wrong) * 60 / seconds, never below 0. rec = { n: right, x: wrong, s: seconds } */
export function netPerMinute(rec) {
  if (!rec || !(rec.s > 0)) return 0;
  return Math.max(0, ((rec.n - rec.x) * 60) / rec.s);
}

const round1 = (v) => Math.round(v * 10) / 10;

/** Add a drill result ({ day, n, x, s }); returns { rate, best, isBest } (best = the previous best). */
export function recordFluency(progress, kind, rec) {
  const list = progress.fluency[kind] || (progress.fluency[kind] = []);
  const best = list.length ? Math.max(...list.map(netPerMinute)) : null;
  list.push({ day: rec.day, n: rec.n, x: rec.x, s: round1(rec.s) });
  if (list.length > FLUENCY_HISTORY) list.splice(0, list.length - FLUENCY_HISTORY);
  const rate = netPerMinute(rec);
  return { rate, best, isBest: best === null || rate > best };
}

/** Rates of the last `k` drills of one kind (oldest first). */
export function fluencyTrend(progress, kind, k = 6) {
  return (progress.fluency[kind] || []).slice(-k).map(netPerMinute);
}

/** Words a minute for a timed reading of a text; null if too fast to be real reading (< 0.25 s a word). */
export function wordsPerMinute(words, seconds) {
  if (!(words > 0) || !(seconds > 0) || seconds < words * 0.25) return null;
  return Math.round((words * 60) / seconds);
}

/** Add a timed text reading; returns the previous reading of the same text (or null). */
export function recordTextReading(progress, rec) {
  const list = progress.fluency.texts || (progress.fluency.texts = []);
  const before = [...list].reverse().find(r => r.id === rec.id) || null;
  list.push({ day: rec.day, id: rec.id, wpm: rec.wpm });
  if (list.length > TEXT_HISTORY) list.splice(0, list.length - TEXT_HISTORY);
  return before;
}

export function checkPassed(right, total) {
  return total > 0 && right / total >= UNIT_CHECK_PASS;
}

/** Keep the best score, the number of tries and the last day for a unit check. */
export function recordCheck(progress, unitId, right, total, day) {
  const prev = progress.checks[unitId] || { best: 0, n: 0, last: null, passed: false };
  const score = total > 0 ? right / total : 0;
  const next = { best: Math.max(prev.best, Math.round(score * 100) / 100), n: prev.n + 1, last: day, passed: prev.passed || checkPassed(right, total) };
  progress.checks[unitId] = next;
  return next;
}

/** Each part of a benchmark with its value and whether it met the criterion. */
export function benchmarkProfile(parts) {
  return BENCHMARK_PARTS.filter(p => parts[p]).map(p => {
    const c = BENCHMARK_CRITERIA[p];
    const v = parts[p];
    if (c.rate) {
      const rate = netPerMinute(v);
      return { part: p, value: round1(rate), unit: 'rate', met: rate >= c.rate, provisional: !!c.provisional };
    }
    const accuracy = v.t > 0 ? v.r / v.t : 0;
    return { part: p, value: Math.round(accuracy * 100), unit: 'percent', met: accuracy >= c.accuracy, provisional: false };
  });
}

/**
 * Save a benchmark sitting: { stage, day, done, parts, items: [[part, item, ok 0|1, ms|null]], can: { id: 0|1|2 } }.
 * `done` says whether all units of the stage were complete (a sitting before that is a pre-test).
 */
export function recordBenchmark(progress, entry) {
  progress.benchmarks.push(entry);
  if (progress.benchmarks.length > BENCHMARK_HISTORY) progress.benchmarks.splice(0, progress.benchmarks.length - BENCHMARK_HISTORY);
  if (entry.can && Object.keys(entry.can).length) progress.selfAssess[entry.stage] = { day: entry.day, r: { ...entry.can } };
  return benchmarkProfile(entry.parts);
}

/** The latest benchmark of a stage, or null. */
export function lastBenchmark(progress, stage) {
  return [...progress.benchmarks].reverse().find(b => b.stage === stage) || null;
}

export function stageFinished(progress, stage) {
  for (let u = stage.from; u <= stage.to; u++) if (!progress.completedUnits.includes(u)) return false;
  return true;
}

/**
 * Stage benchmarks a learner can take: every stage whose first unit is open. `recommended` is the
 * latest finished stage with no benchmark taken after finishing it.
 */
export function benchmarkStatus(progress, stages) {
  const open = stages.map((s, i) => ({ ...s, index: i })).filter(s => progress.unlockedUnit >= s.from);
  const recommended = [...open].reverse()
    .find(s => stageFinished(progress, s) && !progress.benchmarks.some(b => b.stage === s.index && b.done)) || null;
  return { open, recommended };
}
