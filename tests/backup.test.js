import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeBackup, decodeBackup, checksum, backupDue, attemptsCsv, BACKUP_KEEP_ATTEMPTS } from '../backup.js';
import { getDefaultProgress, recordAttempt } from '../logic.js';

function sample() {
  const p = getDefaultProgress();
  p.unlockedUnit = 4;
  p.completedUnits = [1, 2, 3];
  p.points = 230;
  p.items = { 'w:pin': { b: 2, due: 20400, h: '1101', rt: 1800, days: 3, last: 20398 } };
  p.perception = { 'i-e': { n: 32, k: 27, blocks: [75, 94] } };
  for (let i = 0; i < 400; i++) recordAttempt(p, { u: 1, a: 'sound-match', i: 'p', n: 0, ok: i % 3 > 0, c: 'b', rt: 900, focus: ['p'], confusion: { target: 'p', chosen: 'b' } }, 1_700_000_000_000 + i);
  return p;
}

describe('backup codes', () => {
  it('round-trips progress (compressed)', async () => {
    const p = sample();
    const code = await encodeBackup(p, { now: 123 });
    assert.match(code, /^L2A1\.[A-Za-z0-9_-]+\.[0-9a-z]{6}$/);
    const r = await decodeBackup(code);
    assert.equal(r.ok, true);
    assert.equal(r.saved, 123);
    assert.deepEqual({ ...r.progress, attempts: [] }, { ...p, attempts: [] });
    assert.equal(r.progress.attempts.length, BACKUP_KEEP_ATTEMPTS);
    assert.deepEqual(r.progress.attempts.at(-1), p.attempts.at(-1));
  });

  it('round-trips without compression, and is much shorter compressed', async () => {
    const p = sample();
    const plain = await encodeBackup(p, { compress: false });
    assert.match(plain, /^L2A0\./);
    assert.equal((await decodeBackup(plain)).ok, true);
    const packed = await encodeBackup(p);
    assert.ok(packed.length < plain.length / 3, `${packed.length} vs ${plain.length}`);
  });

  it('ignores spaces and line breaks from copying', async () => {
    const code = await encodeBackup(sample());
    const messy = `  ${code.slice(0, 40)}\n${code.slice(40, 90)} ${code.slice(90)}\n`;
    assert.equal((await decodeBackup(messy)).ok, true);
  });

  it('rejects cut, changed and foreign codes', async () => {
    const code = await encodeBackup(sample());
    assert.deepEqual(await decodeBackup('hello'), { ok: false, error: 'format' });
    assert.deepEqual(await decodeBackup(code.slice(0, -9) + code.slice(-7)), { ok: false, error: 'checksum' }, 'cut');
    const body = code.split('.')[1];
    const changed = `L2A1.${body.slice(0, 20)}${body[20] === 'A' ? 'B' : 'A'}${body.slice(21)}.${code.split('.')[2]}`;
    assert.deepEqual(await decodeBackup(changed), { ok: false, error: 'checksum' });
    const foreignBody = Buffer.from(JSON.stringify({ app: 'other', progress: {} })).toString('base64url');
    assert.deepEqual(await decodeBackup(`L2A0.${foreignBody}.${checksum(`L2A0.${foreignBody}`)}`), { ok: false, error: 'data' });
  });
});

describe('backup reminder', () => {
  it('asks after real progress and every two weeks', () => {
    const p = getDefaultProgress();
    assert.equal(backupDue(p, 100), false);
    p.completedUnits = [1];
    assert.equal(backupDue(p, 100), true);
    p.lastBackupDay = 95;
    assert.equal(backupDue(p, 100), false);
    assert.equal(backupDue(p, 109), true);
  });
});

describe('answer log CSV', () => {
  it('writes one row per answer with a header and escapes text', () => {
    const p = getDefaultProgress();
    recordAttempt(p, { u: 7, a: 'complete-sentence', i: 'Ali, sit.', n: 0, ok: false, c: 'sat, "x"', rt: 1500, focus: [] }, Date.UTC(2026, 0, 2));
    const lines = attemptsCsv(p).trim().split('\n');
    assert.equal(lines.length, 2);
    assert.match(lines[0], /^time,unit,activity/);
    assert.equal(lines[1], '2026-01-02T00:00:00.000Z,7,complete-sentence,"Ali, sit.",0,0,0,"sat, ""x""",1500,unit,,');
  });
});
