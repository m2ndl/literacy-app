// audio.js - Plays recorded clips from ./audio when they exist and falls back to the browser's
// speech synthesis otherwise. Speech can only say letter names ("bee" for b), so every recorded
// clip replaces a guess with the real sound. See audio/RECORDING-LIST.md.
import { clipKeyFor } from './logic.js';

let clipFiles = {};          // clip key -> file path inside ./audio, from audio/manifest.json
let player = null;
let playToken = 0;           // increases on every play so stale callbacks can be ignored
let englishVoice = null;
let voiceStatus = 'unknown'; // 'ok' | 'missing' | 'unknown' (voice list not available yet)
let startWatch = null;
let problemReported = false;
let problemHandler = () => {};

// Called once when speech can't play (no English voice, or speech never starts).
export function onAudioProblem(handler) {
  problemHandler = handler;
}

function reportProblem() {
  if (problemReported) return;
  problemReported = true;
  problemHandler();
}

export async function loadClipManifest() {
  try {
    const res = await fetch('./audio/manifest.json');
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data.files === 'object' && data.files !== null) clipFiles = data.files;
  } catch (e) {
    console.warn('Audio manifest not loaded:', e);
  }
}

// -------------------- Speech fallback --------------------
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return; // some browsers fill the list later
  englishVoice = voices.find(v => v.name === 'Google UK English Female') ||
                 voices.find(v => v.name === 'Google US English') ||
                 voices.find(v => v.name?.includes('Samantha')) ||
                 voices.find(v => v.name?.includes('Microsoft Hazel')) ||
                 voices.find(v => v.name?.includes('Microsoft Zira')) ||
                 voices.find(v => v.lang === 'en-GB' && v.name?.includes('Female')) ||
                 voices.find(v => v.lang === 'en-US' && v.name?.includes('Female')) ||
                 voices.find(v => v.lang === 'en-GB') ||
                 voices.find(v => v.lang?.toLowerCase().replace('_', '-').startsWith('en')) ||
                 null;
  // Never fall back to a non-English voice: an Arabic voice reading "bat" teaches the wrong sounds.
  voiceStatus = englishVoice ? 'ok' : 'missing';
}

export function initSpeech() {
  if (!('speechSynthesis' in window)) { voiceStatus = 'missing'; return; }
  pickVoice();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
}

function speak(text, slow) {
  if (!('speechSynthesis' in window) || voiceStatus === 'missing') {
    reportProblem();
    return;
  }
  try {
    const token = playToken;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = slow ? 0.5 : 0.8;
    if (englishVoice) u.voice = englishVoice;
    let started = false;
    u.onstart = () => { started = true; };
    u.onend = () => { started = true; };
    u.onerror = (e) => {
      if (e?.error === 'interrupted' || e?.error === 'canceled') return;
      console.error('Speech error:', e?.error);
      if (token === playToken) reportProblem();
    };
    window.speechSynthesis.speak(u);
    // Some devices accept the request but never make a sound; tell the learner instead of staying silent.
    startWatch = setTimeout(() => {
      if (!started && token === playToken) reportProblem();
    }, 4000);
  } catch (e) {
    console.error('Speech synthesis failed:', e);
    reportProblem();
  }
}

// -------------------- Playback --------------------
function stopAll() {
  if (startWatch) { clearTimeout(startWatch); startWatch = null; }
  if (player) player.pause();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function playClip(file, slow, text) {
  const token = playToken;
  if (!player) player = new Audio();
  player.onerror = () => {
    // Missing or unplayable file: say it with speech instead
    if (token === playToken) speak(text, slow);
  };
  player.src = `./audio/${file}`;
  const rate = slow ? 0.65 : 1;
  player.defaultPlaybackRate = rate;
  player.playbackRate = rate;
  player.preservesPitch = true;
  player.play().catch(e => {
    if (e?.name !== 'AbortError') console.warn('Clip playback failed:', e);
  });
}

// kind is optional: 'letter' | 'word' | 'pair' | 'sentence' (see clipKeyFor)
export function playItem(text, { slow = false, kind } = {}) {
  stopAll();
  playToken++;
  const file = clipFiles[clipKeyFor(text, kind)];
  if (file) playClip(file, slow, text);
  else speak(text, slow);
}
