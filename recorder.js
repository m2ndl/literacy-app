// recorder.js - Read aloud, record, and compare with the model voice.
//
// There is no speech recogniser (the app is offline and has no server), so the learner judges the
// comparison themselves, helped by two objective cues: how long they spoke compared with the model,
// and the two waveforms side by side (pauses show as gaps). Recordings stay in memory and are gone
// when the learner moves on: nothing is saved or sent.
import { el, toArabicDigits } from './dom.js';

const MAX_SECONDS = 15;
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];

// ---------------------------------------------------------------------------
// Pure helpers (tested in node)
// ---------------------------------------------------------------------------
/**
 * Start and end (seconds) of speech in a recording: frames louder than `rel` dB below the loudest
 * frame and above an absolute floor. Returns null for silence.
 */
export function speechSpan(samples, sampleRate, { frameMs = 20, rel = -35, floor = 0.01 } = {}) {
  const size = Math.max(1, Math.round((sampleRate * frameMs) / 1000));
  const rms = [];
  for (let i = 0; i < samples.length; i += size) {
    let sum = 0;
    const end = Math.min(samples.length, i + size);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    rms.push(Math.sqrt(sum / Math.max(1, end - i)));
  }
  const peak = Math.max(0, ...rms);
  if (peak < floor) return null;
  const limit = Math.max(floor, peak * 10 ** (rel / 20));
  const first = rms.findIndex(v => v >= limit);
  let last = rms.length - 1;
  while (last > first && rms[last] < limit) last--;
  return { start: (first * size) / sampleRate, end: Math.min(samples.length, (last + 1) * size) / sampleRate };
}

/** Peak amplitude in `bins` equal slices between start and end (seconds), scaled to 0..1. */
export function envelope(samples, sampleRate, bins, start = 0, end = samples.length / sampleRate) {
  const a = Math.max(0, Math.floor(start * sampleRate));
  const b = Math.min(samples.length, Math.ceil(end * sampleRate));
  const step = Math.max(1, (b - a) / bins);
  const out = [];
  for (let k = 0; k < bins; k++) {
    let peak = 0;
    for (let i = Math.floor(a + k * step); i < Math.min(b, Math.floor(a + (k + 1) * step)); i++) peak = Math.max(peak, Math.abs(samples[i]));
    out.push(peak);
  }
  const top = Math.max(...out, 1e-6);
  return out.map(v => v / top);
}

/** Arabic advice from the learner's speaking time compared with the model's. */
export function paceAdvice(learner, model) {
  if (!learner || !model) return '';
  const r = learner / model;
  if (r < 0.4) return 'التسجيل قصير جدًا: هل قرأت الجملة كلها؟';
  if (r <= 1.3) return 'سرعتك قريبة من سرعة النموذج. أحسنت!';
  if (r <= 2) return 'قراءتك أبطأ قليلًا من النموذج. أعد القراءة لتقترب منه.';
  return 'قراءتك أبطأ بكثير من النموذج، وهذا طبيعي في البداية. اقرأ الجملة مرة أخرى بعد الاستماع.';
}

export function recordingSupported() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------
const seconds = (v) => `${toArabicDigits(v.toFixed(1)).replace('.', '٫')} ث`;

function waveform(values, cls) {
  return el('div', { class: `wave ${cls}`, 'aria-hidden': 'true' }, ...values.map(v => {
    const bar = el('span');
    bar.style.height = `${Math.max(6, Math.round(v * 100))}%`;
    return bar;
  }));
}

let active = null;   // the recording in progress, stopped when the learner leaves the question

/** Stop the microphone (when leaving a question). */
export function stopRecorder() {
  if (active) active.cancel();
  active = null;
}

/**
 * The record-and-compare panel for one sentence. `audio` is the audio engine.
 * onSubmit(rating, { learner, model }) with rating 2 (like the model), 1 (close), 0 (needs practice).
 * Returns { node }.
 */
export function recordWidget(q, { audio, onSubmit, isLocked }) {
  const status = el('p', { class: 'record-status', 'aria-live': 'polite' });
  const compare = el('div', { class: 'record-compare' });
  const rate = el('div', { class: 'record-rate hidden' });
  let recording = null;   // AudioBuffer
  let span = null;
  let modelSec = null;
  const recordBtn = el('button', { class: 'record-btn', 'aria-pressed': 'false' }, '🎙 سجّل قراءتك');
  const modelBtn = el('button', { class: 'small-btn', onclick: () => audio.play(q.prompt.audio, { text: q.prompt.text }) }, '🔊 النموذج');
  const mineBtn = el('button', { class: 'small-btn', disabled: true, onclick: () => playMine() }, '▶ صوتي');
  const bothBtn = el('button', { class: 'small-btn', disabled: true, onclick: () => playBoth() }, '▶ صوتي ثم النموذج');

  const playMine = () => (recording ? audio.playRecording(recording, Math.max(0, (span?.start || 0) - 0.05)) : null);
  const playBoth = async () => {
    await playMine();
    await new Promise(r => setTimeout(r, 300));
    await audio.play(q.prompt.audio, { text: q.prompt.text });
  };

  const showRating = () => {
    rate.classList.remove('hidden');
    rate.replaceChildren(el('p', { class: 'record-question', text: 'قارن قراءتك بالنموذج:' }),
      el('div', { class: 'record-ratings' },
        ...[[2, '😀 مثل النموذج'], [1, '🙂 قريبة'], [0, '🔁 أحتاج تدريبًا']].map(([v, label]) => el('button', {
          class: 'option-btn option-ar', 'data-value': String(v),
          onclick: () => { if (!isLocked()) { stopRecorder(); onSubmit(v, { learner: span ? span.end - span.start : null, model: modelSec }); } }
        }, label))));
  };

  async function analyse(blob) {
    try {
      recording = await audio.decodeRecording(blob);
    } catch (e) {
      status.textContent = 'لم نستطع تشغيل التسجيل على هذا الجهاز. استمع إلى النموذج وقارن بنفسك.';
      showRating();
      return;
    }
    const data = recording.getChannelData(0);
    span = speechSpan(data, recording.sampleRate);
    const model = await audio.clipBuffer(q.prompt.audio);
    const modelSpan = model ? speechSpan(model.getChannelData(0), model.sampleRate) : null;
    modelSec = modelSpan ? modelSpan.end - modelSpan.start : null;
    if (!span) {
      status.textContent = 'لم نسمع صوتًا. اقترب من الميكروفون وسجّل مرة أخرى.';
      return;
    }
    const learnerSec = span.end - span.start;
    const bins = 48;
    const rows = [el('div', { class: 'wave-row' }, el('span', { class: 'wave-label', text: `أنت (${seconds(learnerSec)})` }),
      waveform(envelope(data, recording.sampleRate, bins, span.start, span.end), 'is-learner'))];
    if (modelSpan) {
      rows.push(el('div', { class: 'wave-row' }, el('span', { class: 'wave-label', text: `النموذج (${seconds(modelSec)})` }),
        waveform(envelope(model.getChannelData(0), model.sampleRate, bins, modelSpan.start, modelSpan.end), 'is-model')));
    }
    compare.replaceChildren(...rows, el('p', { class: 'hint' }, paceAdvice(learnerSec, modelSec)));
    status.textContent = 'استمع إلى صوتك ثم إلى النموذج. الفجوات في الشكل هي وقفات.';
    mineBtn.disabled = false;
    bothBtn.disabled = false;
    showRating();
    playBoth();
  }

  async function start() {
    if (isLocked()) return;
    audio.stop();
    audio.setRecording(true);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      audio.setRecording(false);
      status.textContent = 'لم يُسمح باستخدام الميكروفون. اقرأ الجملة بصوت عالٍ، ثم استمع إلى النموذج وقارن.';
      showRating();
      return;
    }
    const mimeType = MIME_TYPES.find(t => MediaRecorder.isTypeSupported?.(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    let timer = null;
    let cancelled = false;
    const finish = () => {
      clearTimeout(timer);
      stream.getTracks().forEach(t => t.stop());   // free the microphone (iPhone: back to the speaker)
      audio.setRecording(false);
      recordBtn.textContent = '🎙 سجّل مرة أخرى';
      recordBtn.setAttribute('aria-pressed', 'false');
      recordBtn.classList.remove('is-recording');
      active = null;
    };
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      finish();
      if (!cancelled) analyse(new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' }));
    };
    active = { cancel: () => { cancelled = true; try { rec.state !== 'inactive' ? rec.stop() : finish(); } catch (e) { finish(); } }, stop: () => rec.stop() };
    rec.start();
    recordBtn.textContent = '⏹ أوقف التسجيل';
    recordBtn.setAttribute('aria-pressed', 'true');
    recordBtn.classList.add('is-recording');
    status.textContent = 'اقرأ الجملة الآن بصوت عالٍ...';
    timer = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, MAX_SECONDS * 1000);
  }

  recordBtn.addEventListener('click', () => {
    if (active) active.stop();
    else start();
  });

  const node = el('div', { class: 'record' });
  if (recordingSupported()) {
    status.textContent = 'اقرأ الجملة بنفسك أولًا، ثم سجّل قراءتك.';
    node.append(recordBtn, status, el('div', { class: 'record-play' }, mineBtn, modelBtn, bothBtn), compare, rate,
      el('p', { class: 'record-privacy', text: '🔒 التسجيل يبقى على جهازك ويُحذف عندما تنتقل إلى السؤال التالي.' }));
  } else {
    status.textContent = 'التسجيل غير متاح في هذا المتصفح. اقرأ الجملة بصوت عالٍ، ثم استمع إلى النموذج وقارن.';
    node.append(status, el('div', { class: 'record-play' }, modelBtn), rate);
    showRating();
  }
  return { node };
}
