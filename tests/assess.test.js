import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  netPerMinute, recordFluency, fluencyTrend, wordsPerMinute, recordTextReading, checkPassed, recordCheck,
  benchmarkProfile, recordBenchmark, lastBenchmark, benchmarkStatus, stageFinished, FLUENCY_HISTORY, BENCHMARK_HISTORY
} from '../assess.js';
import { getDefaultProgress } from '../logic.js';
import { STAGES } from '../data.js';

describe('timed drills', () => {
  it('scores right minus wrong per minute, never below zero', () => {
    assert.equal(netPerMinute({ n: 20, x: 2, s: 60 }), 18);
    assert.equal(netPerMinute({ n: 9, x: 0, s: 90 }), 6);
    assert.equal(netPerMinute({ n: 2, x: 5, s: 60 }), 0);
    assert.equal(netPerMinute({ n: 5, x: 0, s: 0 }), 0);
    assert.equal(netPerMinute(null), 0);
  });

  it('keeps a capped history and reports a new personal best', () => {
    const p = getDefaultProgress();
    assert.deepEqual(recordFluency(p, 'words', { day: 1, n: 10, x: 0, s: 60 }), { rate: 10, best: null, isBest: true });
    assert.deepEqual(recordFluency(p, 'words', { day: 2, n: 9, x: 1, s: 60 }), { rate: 8, best: 10, isBest: false });
    assert.equal(recordFluency(p, 'words', { day: 3, n: 15, x: 0, s: 60 }).isBest, true);
    for (let i = 0; i < FLUENCY_HISTORY + 5; i++) recordFluency(p, 'sentences', { day: i, n: i, x: 0, s: 90 });
    assert.equal(p.fluency.sentences.length, FLUENCY_HISTORY);
    assert.deepEqual(fluencyTrend(p, 'words', 2), [8, 15]);
  });

  it('times text reading, refusing impossible speeds', () => {
    assert.equal(wordsPerMinute(40, 30), 80);
    assert.equal(wordsPerMinute(40, 5), null);
    assert.equal(wordsPerMinute(0, 10), null);
    const p = getDefaultProgress();
    assert.equal(recordTextReading(p, { day: 1, id: '11:0', wpm: 40 }), null);
    recordTextReading(p, { day: 1, id: '12:0', wpm: 30 });
    assert.deepEqual(recordTextReading(p, { day: 2, id: '11:0', wpm: 55 }), { day: 1, id: '11:0', wpm: 40 });
  });
});

describe('unit checks', () => {
  it('passes at 80% and keeps the best score', () => {
    assert.equal(checkPassed(10, 12), true);
    assert.equal(checkPassed(9, 12), false);
    assert.equal(checkPassed(0, 0), false);
    const p = getDefaultProgress();
    assert.deepEqual(recordCheck(p, 3, 9, 12, 100), { best: 0.75, n: 1, last: 100, passed: false });
    assert.deepEqual(recordCheck(p, 3, 11, 12, 101), { best: 0.92, n: 2, last: 101, passed: true });
    assert.deepEqual(recordCheck(p, 3, 6, 12, 102), { best: 0.92, n: 3, last: 102, passed: true });
  });
});

describe('stage benchmarks', () => {
  const parts = { words: { n: 22, x: 1, s: 60 }, sentences: { n: 7, x: 2, s: 90 }, decoding: { r: 5, t: 6 }, spelling: { r: 4, t: 6 }, reading: { r: 3, t: 4 } };

  it('builds a profile against the criteria', () => {
    const profile = benchmarkProfile(parts);
    assert.deepEqual(profile.map(p => [p.part, p.value, p.met]), [
      ['words', 21, true], ['sentences', 3.3, false], ['decoding', 83, true], ['spelling', 67, false], ['reading', 75, true]
    ]);
    assert.ok(profile.find(p => p.part === 'words').provisional);
    assert.ok(!profile.find(p => p.part === 'reading').provisional);
  });

  it('records sittings, the latest self-assessment, and a capped history', () => {
    const p = getDefaultProgress();
    recordBenchmark(p, { stage: 0, day: 10, done: false, parts, items: [], can: { a: 1 } });
    recordBenchmark(p, { stage: 0, day: 30, done: true, parts, items: [], can: { a: 2 } });
    assert.equal(lastBenchmark(p, 0).day, 30);
    assert.equal(lastBenchmark(p, 1), null);
    assert.deepEqual(p.selfAssess[0], { day: 30, r: { a: 2 } });
    for (let i = 0; i < BENCHMARK_HISTORY; i++) recordBenchmark(p, { stage: 1, day: 40 + i, done: true, parts, items: [], can: {} });
    assert.equal(p.benchmarks.length, BENCHMARK_HISTORY);
  });

  it('recommends the latest finished stage without a benchmark taken after finishing it', () => {
    const p = getDefaultProgress();
    p.unlockedUnit = 11;
    p.completedUnits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let st = benchmarkStatus(p, STAGES);
    assert.deepEqual(st.open.map(s => s.index), [0, 1]);
    assert.equal(st.recommended, null);
    p.completedUnits.push(10);
    assert.ok(stageFinished(p, STAGES[0]));
    assert.equal(benchmarkStatus(p, STAGES).recommended.index, 0);
    recordBenchmark(p, { stage: 0, day: 5, done: false, parts, items: [], can: {} });
    assert.equal(benchmarkStatus(p, STAGES).recommended.index, 0, 'a pre-test does not count');
    recordBenchmark(p, { stage: 0, day: 9, done: true, parts, items: [], can: {} });
    assert.equal(benchmarkStatus(p, STAGES).recommended, null);
  });
});

describe('record and compare', async () => {
  const { speechSpan, envelope, paceAdvice } = await import('../recorder.js');
  const sr = 1000;
  const signal = (parts) => Float32Array.from(parts.flatMap(([sec, amp]) => Array.from({ length: sec * sr }, (_, i) => amp * Math.sin(i))));

  it('finds where speech starts and ends', () => {
    const s = speechSpan(signal([[1, 0.001], [2, 0.5], [0.5, 0.002]]), sr);
    assert.ok(Math.abs(s.start - 1) < 0.03 && Math.abs(s.end - 3) < 0.03, JSON.stringify(s));
    assert.equal(speechSpan(signal([[1, 0.001]]), sr), null);
  });

  it('draws a normalised envelope with gaps for pauses', () => {
    const env = envelope(signal([[1, 0.4], [1, 0], [1, 0.2]]), sr, 3);
    assert.equal(env.length, 3);
    assert.ok(Math.abs(env[0] - 1) < 0.01 && env[1] === 0 && Math.abs(env[2] - 0.5) < 0.02);
  });

  it('gives pace advice from the learner/model time ratio', () => {
    assert.match(paceAdvice(0.5, 2), /قصير/);
    assert.match(paceAdvice(2.2, 2), /قريبة/);
    assert.match(paceAdvice(3.5, 2), /أبطأ قليلًا/);
    assert.match(paceAdvice(6, 2), /بكثير/);
    assert.equal(paceAdvice(null, 2), '');
  });
});

describe('benchmark export', async () => {
  const { benchmarksCsv } = await import('../backup.js');
  it('writes one row per item, per part and per can-do rating', () => {
    const p = getDefaultProgress();
    recordBenchmark(p, {
      stage: 1, day: 20000, done: true,
      parts: { words: { n: 2, x: 1, s: 60 }, decoding: { r: 1, t: 1 } },
      items: [['words', 'stop', 1, 900], ['words', 'spin', 1, 800], ['words', 'skip', 0, 1200], ['decoding', 'snep', 1, 3000]],
      can: { 's2-text': 1 }
    });
    const lines = benchmarksCsv(p).trim().split('\n');
    assert.equal(lines[0], 'sitting,stage,date,after_stage,part,item,correct,rt_ms,right,wrong,seconds,total');
    assert.equal(lines.length, 1 + 4 + 2 + 1);
    assert.equal(lines[1], '1,2,2024-10-04,1,words,stop,1,900,,,,');
    assert.ok(lines.includes('1,2,2024-10-04,1,words,(part),,,2,1,60,'));
    assert.ok(lines.includes('1,2,2024-10-04,1,can-do,s2-text,1,,,,,'));
  });
});
