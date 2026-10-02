// audio.js - Plays the app's pre-recorded clips reliably on iPhone (Safari / Home Screen app)
// and Android (Chrome).
//
// - Web Audio (fetch -> decodeAudioData -> buffer source): low latency, and no Range requests,
//   so clips cached by the service worker play offline in Safari too.
// - The audio context is resumed inside the learner's taps (required by iOS and Chrome) and
//   recreated if iOS leaves it "interrupted" (calls, Siri, app switch).
// - iPhone silent switch: navigator.audioSession.type = 'playback' (Safari 16.4+); older iOS gets
//   a silent looping <audio> element started on the first tap.
// - Missing clip: words and sentences fall back to the device voice (en-US). Letter sounds never
//   do, because speech engines read a lone letter by its name ("bee").

const BASE = './audio/';
const MAX_DECODED_SECONDS = 150;   // memory cap for decoded clips (low-end Android)
const PRELOAD_CONCURRENCY = 4;

let manifest = { clips: {} };
let manifestReady = null;
let ctx = null;
let current = [];                  // playing sources
const buffers = new Map();         // url -> { buffer, offset }   (insertion order = LRU)
let decodedSeconds = 0;
let silentLoop = null;
let ttsVoice = null;
let playToken = 0;

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
export function initAudio() {
  if (manifestReady) return manifestReady;
  try {
    if ('audioSession' in navigator) navigator.audioSession.type = 'playback';
  } catch (e) { /* not supported */ }
  ['touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeContext(); });
  if ('speechSynthesis' in window) {
    pickVoice();
    window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
  }
  try { navigator.storage?.persist?.(); } catch (e) { /* ignore */ }
  manifestReady = loadManifest();
  return manifestReady;
}

async function loadManifest() {
  try {
    // Network first via the service worker, which falls back to its cached copy offline.
    const res = await fetch(`${BASE}manifest.json`);
    const m = res.ok ? await res.json() : null;
    if (m && m.clips) manifest = m;
  } catch (e) {
    console.warn('Audio manifest not available:', e);
  }
  return manifest;
}

function getContext() {
  if (!ctx || ctx.state === 'closed') {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function resumeContext() {
  const c = getContext();
  if (!c) return;
  if (c.state !== 'running') {
    const p = c.resume ? c.resume() : null;
    // iOS can leave the context "interrupted"; if resume doesn't settle quickly, start a new one.
    setTimeout(() => {
      if (ctx === c && c.state !== 'running' && !document.hidden) {
        try { c.close(); } catch (e) { /* ignore */ }
        ctx = null;
        getContext()?.resume?.();
      }
    }, 300);
    p?.catch?.(() => {});
  }
}

/** Call from inside a tap/click handler (done automatically for every tap). */
export function unlock() {
  resumeContext();
  if (!silentLoop && isIOS() && !('audioSession' in navigator)) {
    // Older iOS: a playing media element moves audio to the "playback" category,
    // so the silent switch no longer mutes Web Audio.
    try {
      silentLoop = new Audio(silentWavUrl());
      silentLoop.loop = true;
      silentLoop.setAttribute('playsinline', '');
      silentLoop.play().catch(() => { silentLoop = null; });
    } catch (e) { silentLoop = null; }
  }
}

function silentWavUrl() {
  const n = 2400; // 0.1 s at 24 kHz, 16-bit mono
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 24000, true); v.setUint32(28, 48000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

// ---------------------------------------------------------------------------
// Clips
// ---------------------------------------------------------------------------
/** Voices recorded for a clip key (e.g. ['f', 'm', 'fs']). */
export function voicesFor(key) {
  return Object.keys(manifest.clips[key] || {});
}

export function hasClip(key, voice = 'f') {
  return !!(manifest.clips[key] && manifest.clips[key][voice]);
}

export function clipUrl(key, voice = 'f') {
  const entry = manifest.clips[key] && manifest.clips[key][voice];
  if (!entry) return null;
  const i = key.indexOf(':');
  return `${BASE}${voice}/${key.slice(0, i)}/${key.slice(i + 1)}.mp3?v=${entry.h}`;
}

function decode(c, data) {
  return new Promise((resolve, reject) => {
    // Older Safari only supports the callback form.
    const p = c.decodeAudioData(data, resolve, reject);
    if (p && p.then) p.then(resolve, reject);
  });
}

async function loadBuffer(url) {
  if (buffers.has(url)) {
    const hit = buffers.get(url);
    buffers.delete(url);
    buffers.set(url, hit);       // refresh LRU position
    return hit;
  }
  const c = getContext();
  if (!c) throw new Error('Web Audio not available');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = await decode(c, await res.arrayBuffer());
  // Skip leading encoder silence so clips can be chained without gaps.
  const data = buffer.getChannelData(0);
  const limit = Math.min(data.length, Math.floor(buffer.sampleRate * 0.2));
  let first = 0;
  while (first < limit && Math.abs(data[first]) < 0.003) first++;
  const entry = { buffer, offset: Math.max(0, first / buffer.sampleRate - 0.01) };
  buffers.set(url, entry);
  decodedSeconds += buffer.duration;
  while (decodedSeconds > MAX_DECODED_SECONDS && buffers.size > 1) {
    const [oldUrl, old] = buffers.entries().next().value;
    buffers.delete(oldUrl);
    decodedSeconds -= old.buffer.duration;
  }
  return entry;
}

function playBuffer({ buffer, offset }) {
  return new Promise(resolve => {
    const c = getContext();
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.onended = () => { current = current.filter(s => s !== src); resolve(); };
    current.push(src);
    src.start(0, offset);
  });
}

// ---------------------------------------------------------------------------
// Device voice fallback (words and sentences only)
// ---------------------------------------------------------------------------
function pickVoice() {
  const voices = window.speechSynthesis.getVoices() || [];
  const us = voices.filter(v => /^en[-_]US/i.test(v.lang));
  ttsVoice = us.find(v => v.localService && /samantha|aaron|nicky|google us/i.test(v.name)) ||
    us.find(v => v.localService) || us[0] || voices.find(v => /^en/i.test(v.lang)) || null;
}

function speak(text, slow) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window) || !text) return resolve(false);
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = slow ? 0.7 : 0.9;
      if (ttsVoice) u.voice = ttsVoice;
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      window.speechSynthesis.speak(u);
    } catch (e) { resolve(false); }
  });
}

// ---------------------------------------------------------------------------
// Public playback API
// ---------------------------------------------------------------------------
export function stop() {
  playToken++;
  current.forEach(s => { try { s.stop(); } catch (e) { /* already stopped */ } });
  current = [];
  try { window.speechSynthesis?.cancel(); } catch (e) { /* ignore */ }
}

/**
 * Play a clip by key ('ph:ae', 'ln:b', 'w:pin', 's:it-is-a-pin').
 * options: voice ('f' | 'm'), slow (prefer the slow recording), text (for the device-voice fallback)
 * Resolves to 'clip', 'tts' or 'none' when playback ends.
 */
export async function play(key, { voice = 'f', slow = false, text = '' } = {}) {
  stop();
  const token = playToken;
  await initAudio();
  resumeContext();
  const v = slow && hasClip(key, 'fs') ? 'fs' : hasClip(key, voice) ? voice : 'f';
  const url = clipUrl(key, v);
  if (url) {
    try {
      const entry = await loadBuffer(url);
      if (token !== playToken) return 'none';
      await playBuffer(entry);
      return 'clip';
    } catch (e) {
      console.warn('Clip failed, falling back:', key, e);
    }
  }
  const kind = key.split(':')[0];
  if ((kind === 'w' || kind === 's') && text) {
    return (await speak(text, slow)) ? 'tts' : 'none';
  }
  return 'none';
}

/** Play several clips one after another (e.g. a short text, sentence by sentence). */
export async function playSequence(items, { gapMs = 250, slow = false } = {}) {
  stop();
  const token = playToken;
  for (const item of items) {
    if (token !== playToken) return;
    const { key, text } = typeof item === 'string' ? { key: item, text: '' } : item;
    const v = slow && hasClip(key, 'fs') ? 'fs' : 'f';
    const url = clipUrl(key, v);
    try {
      if (url) await playBuffer(await loadBuffer(url));
      else if (text) await speak(text, slow);
    } catch (e) { /* skip this item */ }
    if (token !== playToken) return;
    await new Promise(r => setTimeout(r, gapMs));
  }
}

/** Download clips ahead of time so they work offline (the service worker caches them). */
export async function preload(keys, voices = ['f', 'm', 'fs']) {
  await initAudio();
  const urls = [...new Set(keys.flatMap(k => voices.map(v => clipUrl(k, v)).filter(Boolean)))];
  let i = 0;
  const worker = async () => {
    while (i < urls.length) {
      const url = urls[i++];
      try { await fetch(url); } catch (e) { /* offline: try again next time */ }
    }
  };
  await Promise.allSettled(Array.from({ length: PRELOAD_CONCURRENCY }, worker));
}

/** Short, soft interface sounds (no harsh buzzer). */
export function cue(type) {
  const c = getContext();
  if (!c || c.state !== 'running') return;
  try {
    const notes = type === 'ok' ? [[660, 0], [880, 0.09]] : [[330, 0]];
    notes.forEach(([freq, at]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      const t = c.currentTime + at;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(type === 'ok' ? 0.18 : 0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + 0.2);
    });
  } catch (e) { /* ignore */ }
}

/** Information for the "audio test" screen. */
export function diagnostics() {
  return {
    context: ctx ? ctx.state : 'not started',
    sampleRate: ctx ? ctx.sampleRate : null,
    audioSession: 'audioSession' in navigator ? navigator.audioSession.type : 'not supported',
    clips: Object.keys(manifest.clips).length,
    deviceVoice: ttsVoice ? `${ttsVoice.name} (${ttsVoice.lang})` : 'none',
    decodedSeconds: Math.round(decodedSeconds)
  };
}
