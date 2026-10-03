// backup.js - Backup codes and data export (pure; no DOM).
//
// There is no login, so progress lives in this browser only. A backup code is the progress as
// compressed JSON in base64url, with a short checksum, so a learner can keep it (copy, share to
// themselves, or save as a file) and restore it on another phone.
//   L2A1.<base64url(deflate(JSON))>.<checksum>   compressed (CompressionStream: Chrome 80+, Safari 16.4+)
//   L2A0.<base64url(JSON)>.<checksum>            older browsers
import { validateProgress } from './logic.js';

export const BACKUP_KEEP_ATTEMPTS = 300;   // recent answers kept in a code (they find weak sounds)
export const BACKUP_REMINDER_DAYS = 14;
const APP = 'my2ndlang';

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

/** FNV-1a hash, 6 base-36 characters: catches codes that were cut or changed while copying. */
export function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(6, '0').slice(-6);
}

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export function backupPayload(progress, now = Date.now()) {
  return { app: APP, saved: now, progress: { ...progress, attempts: progress.attempts.slice(-BACKUP_KEEP_ATTEMPTS) } };
}

/** Make a backup code. `compress: false` makes the uncompressed form (also used where CompressionStream is missing). */
export async function encodeBackup(progress, { now = Date.now(), compress = typeof CompressionStream === 'function' } = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify(backupPayload(progress, now)));
  const body = toBase64Url(compress ? await pipe(bytes, new CompressionStream('deflate')) : bytes);
  const prefix = compress ? 'L2A1' : 'L2A0';
  return `${prefix}.${body}.${checksum(`${prefix}.${body}`)}`;
}

/**
 * Read a backup code (spaces and line breaks are ignored).
 * Returns { ok: true, progress, saved } or { ok: false, error } with error one of:
 * 'format' (not a code), 'checksum' (cut or changed), 'unsupported' (browser can't decompress), 'data'.
 */
export async function decodeBackup(code) {
  const clean = String(code || '').replace(/\s+/g, '');
  const m = clean.match(/^(L2A[01])\.([A-Za-z0-9_-]+)\.([0-9a-z]{6})$/);
  if (!m) return { ok: false, error: 'format' };
  const [, prefix, body, sum] = m;
  if (checksum(`${prefix}.${body}`) !== sum) return { ok: false, error: 'checksum' };
  try {
    let bytes = fromBase64Url(body);
    if (prefix === 'L2A1') {
      if (typeof DecompressionStream !== 'function') return { ok: false, error: 'unsupported' };
      bytes = await pipe(bytes, new DecompressionStream('deflate'));
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || payload.app !== APP || !payload.progress) return { ok: false, error: 'data' };
    const progress = validateProgress(payload.progress);
    if (progress.version !== payload.progress.version && payload.progress.version !== 3) return { ok: false, error: 'data' };
    return { ok: true, progress, saved: Number.isFinite(payload.saved) ? payload.saved : null };
  } catch (e) {
    return { ok: false, error: 'data' };
  }
}

/** Remind learners who have made real progress and have not saved a code for two weeks. */
export function backupDue(progress, today) {
  const worthSaving = progress.completedUnits.length > 0 || progress.attempts.length >= 100;
  return worthSaving && (progress.lastBackupDay === null || today - progress.lastBackupDay >= BACKUP_REMINDER_DAYS);
}

const CSV_COLUMNS = ['time', 'unit', 'activity', 'item', 'try', 'retest', 'correct', 'chosen', 'rt_ms', 'mode', 'graphemes', 'confusion'];

const cell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The answer log as CSV, for a teacher or a study (the learner decides whether to share it). */
export function attemptsCsv(progress) {
  const rows = progress.attempts.map(a => [
    Number.isFinite(a.t) ? new Date(a.t).toISOString() : '', a.u, a.a, a.i, a.n, a.d ? 1 : 0, a.ok ? 1 : 0, a.c, a.rt,
    a.m || 'unit', Array.isArray(a.f) ? a.f.join(' ') : '', a.x || ''
  ].map(cell).join(','));
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n';
}

const BENCH_COLUMNS = ['sitting', 'stage', 'date', 'after_stage', 'part', 'item', 'correct', 'rt_ms', 'right', 'wrong', 'seconds', 'total'];

/** Day number (learner.js dayNumber) as YYYY-MM-DD. */
const dayDate = (day) => new Date(day * 86400000).toISOString().slice(0, 10);

/**
 * Stage benchmarks as CSV for a pilot study: one row per item answered, then one summary row per part
 * (item = "(part)"), and one row per can-do rating (part = "can-do"). tools/pilot/item_analysis.py reads it.
 */
export function benchmarksCsv(progress) {
  const rows = [];
  progress.benchmarks.forEach((b, k) => {
    const head = [k + 1, b.stage + 1, dayDate(b.day), b.done ? 1 : 0];
    b.items.forEach(([part, item, ok, ms]) => rows.push([...head, part, item, ok, ms, '', '', '', '']));
    Object.entries(b.parts).forEach(([part, v]) => rows.push([...head, part, '(part)', '', '', v.n ?? v.r, v.x ?? '', v.s ?? '', v.t ?? '']));
    Object.entries(b.can || {}).forEach(([id, r]) => rows.push([...head, 'can-do', id, r, '', '', '', '', '']));
  });
  return [BENCH_COLUMNS.join(','), ...rows.map(r => r.map(cell).join(','))].join('\n') + '\n';
}
