// app.js (ES module) - Interface for the course: units, lessons, activities, feedback, reports.
// Pedagogical design: see PEDAGOGY_PLAN.md.
import { units, gpc, ALPHABET, ACTIVITY_META, HINTS, getAchievements } from './data.js';
import {
  STORAGE_KEY, LEGACY_KEY, getDefaultProgress, loadProgressFrom, recordAttempt, topConfusions,
  graphemeAccuracy, hasPassed, isUnitComplete, nextUnitId, formatTime, computeStreak, PASS_MARK
} from './logic.js';
import { createQuestionBank } from './questions.js';
import { clipKey, segment, isVowel, errorFocus, classifyError, shuffle } from './phonics.js';
import * as audio from './audio.js';

const bank = createQuestionBank({ units, gpc, alphabet: ALPHABET });
const achievements = getAchievements(units.length);
const POINTS_FIRST_TRY = 5;
const ITEMS_PER_ACTIVITY = 8;
// Activities whose prompt is heard (played automatically); "meaning" and texts are read first.
const AUTOPLAY = new Set(['sound-match', 'which-word', 'word-build', 'missing-letter', 'first-last-sound', 'complete-sentence']);
const GRAPHEME_OPTIONS = new Set(['sound-match', 'capital-match', 'missing-letter', 'first-last-sound']);

let progress = getDefaultProgress();
let legacyFound = false;
let session = null;
let backTarget = null;
let saveTimer = null;
let learningTimer = null;
let readerToken = 0;
let slowWords = false;
const achievementQueue = [];
let showingAchievement = false;

const $ = (id) => document.getElementById(id);
const unitById = (id) => units.find(u => u.id === id);
const toArabicDigits = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

// ---------------------------------------------------------------------------
// Small DOM helpers (textContent only: no HTML injection)
// ---------------------------------------------------------------------------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  });
  children.flat().forEach(c => {
    if (c === null || c === undefined || c === false) return;
    node.append(c.nodeType ? c : String(c));
  });
  return node;
}

function svgIcon(path, cls) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  p.setAttribute('stroke-width', '2');
  p.setAttribute('d', path);
  svg.append(p);
  return svg;
}

/** English text inside Arabic: isolated, left-to-right, reading font. */
function en(text, cls = '') {
  return el('bdi', { lang: 'en', dir: 'ltr', class: `english-content ${cls}`.trim(), text });
}

/** Arabic text that may contain English words: wrap the English runs so they display correctly. */
function richArabic(text) {
  return String(text).split(/([A-Za-z][A-Za-z'/|]*(?:[ ,–\-|/≠]+[A-Za-z][A-Za-z'/|]*)*)/).filter(Boolean)
    .map(part => (/^[A-Za-z]/.test(part) ? en(part) : part));
}

/** An English word with its vowels highlighted (helps learners notice vowel letters). */
function wordNode(word, { syllables = false, cls = '' } = {}) {
  const info = bank.wordInfo(word.toLowerCase());
  const parts = info.split ? info.split.split('|') : [word.toLowerCase()];
  const out = el('bdi', { lang: 'en', dir: 'ltr', class: `english-content word ${cls}`.trim() });
  let pos = 0;
  parts.forEach((p, i) => {
    (segment(p) || [p]).forEach(g => {
      out.append(el('span', { class: isVowel(g) ? 'vowel' : null, text: word.slice(pos, pos + g.length) }));
      pos += g.length;
    });
    if (syllables && i < parts.length - 1) out.append(el('span', { class: 'syllable-dot', 'aria-hidden': 'true', text: '·' }));
  });
  if (pos < word.length) out.append(word.slice(pos)); // punctuation or suffix
  return out;
}

/** A heart word with its tricky part marked: mark "th[e]" -> th + <e>. */
function heartNode(mark) {
  const out = el('bdi', { lang: 'en', dir: 'ltr', class: 'english-content word' });
  mark.split(/(\[[^\]]+\])/).filter(Boolean).forEach(part => {
    out.append(part.startsWith('[') ? el('span', { class: 'tricky', text: part.slice(1, -1) }) : part);
  });
  return out;
}

function section(title, ...content) {
  return el('section', { class: 'lesson-section' }, el('h3', { class: 'section-title', text: title }), ...content);
}

// ---------------------------------------------------------------------------
// Persistence, header, timer, streak
// ---------------------------------------------------------------------------
function save(now = false) {
  clearTimeout(saveTimer);
  const write = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
    catch (e) { console.warn('Cannot save progress (private browsing?):', e); }
  };
  if (now) write(); else saveTimer = setTimeout(write, 800);
}

function updateHeader() {
  $('points-display').textContent = progress.points;
  $('streak-display').textContent = progress.streak;
}

function startTimer() {
  clearInterval(learningTimer);
  learningTimer = setInterval(() => {
    progress.timeSpent++;
    if (progress.timeSpent % 15 === 0) save();
  }, 1000);
}

function stopTimer() {
  clearInterval(learningTimer);
  learningTimer = null;
  save(true);
}

function handleStreak() {
  const updated = computeStreak(progress);
  if (updated.lastLoginDate === progress.lastLoginDate && updated.streak === progress.streak) return;
  progress.streak = updated.streak;
  progress.lastLoginDate = updated.lastLoginDate;
  checkAchievements();
  save();
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
const VIEWS = ['dashboard-view', 'lesson-view', 'activity-view', 'achievements-view', 'progress-report-view', 'important-note-view', 'audio-test-view'];

function showView(id, title, back = null) {
  readerToken++;
  audio.stop();
  VIEWS.forEach(v => $(v).classList.toggle('hidden', v !== id));
  $('main-title').textContent = title;
  backTarget = back;
  $('back-button').classList.toggle('hidden', !back);
  window.scrollTo(0, 0);
}

function closeMenu() {
  $('dropdown-menu').classList.add('hidden');
  $('menu-button').setAttribute('aria-expanded', 'false');
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
const ICONS = {
  lock: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  done: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  open: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
};

function unitSubtitle(u) {
  if (u.review) return 'مراجعة ونصوص قصيرة';
  if ((u.rules || []).includes('two-syllable')) return 'كلمات من مقطعين';
  return '';
}

function renderDashboard() {
  const grid = $('unit-grid');
  grid.replaceChildren();
  units.forEach(u => {
    const locked = u.id > progress.unlockedUnit;
    const done = progress.completedUnits.includes(u.id);
    const count = (progress.completedActivities[u.id] || []).length;
    const icon = svgIcon(locked ? ICONS.lock : done ? ICONS.done : ICONS.open, `w-6 h-6 ${locked ? 'text-gray-400' : done ? 'text-green-600' : 'text-blue-500'}`);
    const sub = unitSubtitle(u);
    grid.append(el('button', {
      class: `chunk-card unit-card p-6 border-2 rounded-xl shadow-sm text-right ${locked ? 'locked' : ''} ${done ? 'completed' : 'bg-white'}`,
      disabled: locked,
      'aria-label': `${u.title}${locked ? ' (مقفلة)' : done ? ' (مكتملة)' : ''}`,
      onclick: () => showLesson(u.id)
    },
    el('div', { class: 'flex justify-between items-start' }, el('span', { class: 'text-sm font-semibold text-gray-500', text: u.title }), icon),
    u.graphemes.length
      ? el('div', { class: 'unit-graphemes mt-3' }, ...u.graphemes.map(g => en(g, 'grapheme-pill')))
      : el('div', { class: 'mt-3 text-lg font-bold text-gray-800', text: sub }),
    el('div', { class: 'text-sm text-gray-500 mt-3', text: `${toArabicDigits(count)} / ${toArabicDigits(u.activities.length)} أنشطة` })));
  });
  showView('dashboard-view', 'مسار التعلّم');
}

// ---------------------------------------------------------------------------
// Lesson view
// ---------------------------------------------------------------------------
async function playSound(ph, kw) {
  const key = clipKey('ph', ph);
  await audio.initAudio();
  if (audio.hasClip(key)) return audio.play(key);
  // No clean recording of this sound on its own: teach it through its keyword.
  return audio.play(clipKey('w', kw), { text: kw });
}

function soundCard(g) {
  const info = gpc[g];
  const sounds = [info, ...(info.alt ? [info.alt] : [])];
  const card = el('div', { class: 'sound-card' });
  card.append(el('button', {
    class: 'sound-main', 'aria-label': `استمع إلى صوت ${g}`, onclick: () => playSound(info.ph, info.kw)
  }, en(g.length === 1 ? `${g.toUpperCase()}${g}` : g, 'sound-letters'), el('span', { class: 'sound-play', 'aria-hidden': 'true', text: '🔊' })));
  if (g.length === 1) {
    card.append(el('button', { class: 'name-btn', onclick: () => audio.play(clipKey('ln', g)) }, 'اسم الحرف'));
  }
  sounds.forEach((s, i) => {
    if (i > 0) {
      card.append(el('button', { class: 'name-btn', onclick: () => playSound(s.ph, s.kw) }, 'الصوت الثاني ', en(g)));
    }
    card.append(el('button', { class: 'keyword', onclick: () => audio.play(clipKey('w', s.kw), { text: s.kw }) },
      el('span', { class: 'keyword-emoji', 'aria-hidden': 'true', text: s.emoji }), wordNode(s.kw)));
    const note = s.ar ? `مثل «${s.ar}»` : info.newSound && i === 0 ? 'صوت جديد' : '';
    if (note) card.append(el('span', { class: `sound-note ${s.ar ? '' : 'is-new'}`, text: note }));
  });
  if (info.variantOf) card.append(el('span', { class: 'sound-note' }, 'نفس صوت ', en(info.variantOf)));
  return card;
}

function wordChip(w) {
  return el('button', {
    class: 'word-chip', onclick: () => audio.play(clipKey('w', w.w), { slow: slowWords, text: w.w })
  },
  w.emoji ? el('span', { class: 'chip-emoji', 'aria-hidden': 'true', text: w.emoji }) : null,
  wordNode(w.w, { syllables: !!w.split }),
  el('span', { class: 'chip-ar', text: w.ar }));
}

function heartChip(h) {
  return el('button', { class: 'word-chip heart-chip', onclick: () => audio.play(clipKey('w', h.w), { text: h.w }) },
    el('span', { class: 'chip-emoji', 'aria-hidden': 'true', text: '♥' }), heartNode(h.mark), el('span', { class: 'chip-ar', text: h.ar }));
}

function textReader(t) {
  const lines = t.sentences.map(s => el('button', {
    class: 'reader-line', onclick: () => audio.play(clipKey('s', s.text), { text: s.text })
  }, en(s.text), el('span', { class: 'reader-ar hidden', text: s.ar })));
  const playAll = async () => {
    const token = ++readerToken;
    for (const line of lines) {
      if (token !== readerToken) break;
      line.classList.add('is-playing');
      const s = t.sentences[lines.indexOf(line)];
      await audio.play(clipKey('s', s.text), { text: s.text });
      line.classList.remove('is-playing');
      if (token !== readerToken) break;
      await new Promise(r => setTimeout(r, 250));
    }
  };
  const toggleAr = el('button', { class: 'small-btn', onclick: () => lines.forEach(l => l.querySelector('.reader-ar').classList.toggle('hidden')) }, 'الترجمة');
  return el('div', { class: 'reader' },
    el('div', { class: 'reader-head' }, en(t.title, 'reader-title'),
      el('div', { class: 'flex gap-2' }, el('button', { class: 'small-btn', onclick: playAll }, '🔊 استمع وتابع'), toggleAr)),
    ...lines);
}

function unitClipKeys(u) {
  const keys = [];
  u.graphemes.forEach(g => {
    const info = gpc[g];
    [info, info.alt].filter(Boolean).forEach(s => keys.push(clipKey('ph', s.ph), clipKey('w', s.kw)));
    if (g.length === 1) keys.push(clipKey('ln', g));
  });
  (u.words || []).forEach(w => keys.push(clipKey('w', w.w)));
  (u.heart || []).forEach(h => keys.push(clipKey('w', h.w)));
  (u.names || []).forEach(n => keys.push(clipKey('w', n.w)));
  (u.contrasts || []).flat().forEach(w => keys.push(clipKey('w', w)));
  (u.sentences || []).forEach(s => keys.push(clipKey('s', s.text)));
  (u.texts || []).forEach(t => [...t.sentences, ...t.questions].forEach(s => keys.push(clipKey('s', s.text))));
  return keys;
}

function showLesson(unitId) {
  const u = unitById(unitId);
  if (!u) return;
  const root = $('lesson-view');
  root.replaceChildren();
  root.append(section('قبل أن تبدأ', el('ul', { class: 'tips-list' }, ...u.tips.map(t => el('li', {}, ...richArabic(t))))));
  if (u.graphemes.length) {
    root.append(section('أصوات جديدة', el('p', { class: 'section-help', text: 'اضغط على الحرف لتسمع صوته. في القراءة نستخدم الصوت، أما «اسم الحرف» فللتهجئة.' }),
      el('div', { class: 'sound-grid' }, ...u.graphemes.map(soundCard))));
  }
  if (u.words.length) {
    const slowBtn = el('button', { class: `small-btn ${slowWords ? 'is-on' : ''}`, 'aria-pressed': String(slowWords) }, '🐢 استماع بطيء');
    slowBtn.addEventListener('click', () => {
      slowWords = !slowWords;
      slowBtn.classList.toggle('is-on', slowWords);
      slowBtn.setAttribute('aria-pressed', String(slowWords));
    });
    root.append(section('كلمات للقراءة',
      el('div', { class: 'section-tools' }, el('p', { class: 'section-help', text: 'اقرأ الكلمة بنفسك أولًا، ثم اضغط لتسمعها. حروف العلة ملوّنة لتنتبه لها.' }), slowBtn),
      el('div', { class: 'word-grid' }, ...u.words.map(wordChip))));
  }
  const heart = [...(u.heart || []), ...(u.names || []).map(n => ({ w: n.w, ar: n.ar, mark: n.w }))];
  if (heart.length) {
    root.append(section('كلمات القلب ♥', el('p', { class: 'section-help', text: 'كلمات شائعة جدًا لا تُقرأ بالقواعد التي تعلّمتها بعد. الجزء الملوّن هو الجزء الصعب: احفظه.' }),
      el('div', { class: 'word-grid' }, ...heart.map(heartChip))));
  }
  if ((u.texts || []).length) {
    root.append(section('نصوص قصيرة', el('p', { class: 'section-help', text: 'اقرأ بنفسك، ثم استمع وتابع، ثم اقرأ مرة أخرى.' }), ...u.texts.map(textReader)));
  }
  const done = progress.completedActivities[u.id] || [];
  root.append(section('أنشطة تدريبية', el('div', { id: 'activities-container', class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' },
    ...u.activities.map(id => {
      const meta = ACTIVITY_META[id];
      const complete = done.includes(id);
      return el('button', {
        class: `activity-btn enhanced ${complete ? 'activity-btn-complete' : 'activity-btn-default'}`,
        'data-activity': id, onclick: () => startActivity(u.id, id)
      },
      el('div', { class: 'flex items-start justify-between gap-3' },
        el('div', { class: 'text-right' }, el('h4', { class: 'text-lg font-bold leading-7', text: meta.title }),
          el('p', { class: 'mt-1 text-sm text-gray-500 font-medium' }, ...richArabic(meta.desc))),
        el('span', { class: 'activity-icon', 'aria-hidden': 'true', text: meta.icon })),
      el('div', { class: 'mt-4 flex items-center justify-between text-sm' },
        el('span', { class: 'activity-chip', text: complete ? 'مكتمل ✓' : 'ابدأ' })));
    }))));
  showView('lesson-view', u.title, renderDashboard);
  audio.preload(unitClipKeys(u));
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------
function startActivity(unitId, activityId) {
  audio.unlock();
  const questions = bank.build(unitId, activityId, { n: ITEMS_PER_ACTIVITY });
  if (!questions.length) {
    showMessage('لا توجد أسئلة لهذا النشاط بعد.');
    return;
  }
  session = {
    unitId, activityId,
    queue: questions.map(q => ({ q, delayed: false })),
    index: 0, total: questions.length, firstTry: 0, tries: 0, shownAt: 0, locked: false, confusions: {}
  };
  $('activity-title').textContent = ACTIVITY_META[activityId].title;
  showView('activity-view', unitById(unitId).title, () => { audio.stop(); showLesson(unitId); });
  renderQuestion();
}

function ttsText(q) {
  return q.prompt.statement || (q.activity === 'complete-sentence' ? q.item : q.item);
}

function playPrompt(q, slow = false) {
  if (q.activity === 'sound-match' && !audio.hasClip(q.prompt.audio)) {
    return audio.play(clipKey('w', q.prompt.kw), { text: q.prompt.kw });
  }
  return audio.play(q.prompt.audio, { voice: q.prompt.voice || 'f', slow, text: ttsText(q) });
}

function promptAudioButtons(q) {
  const big = el('button', { class: 'play-btn', 'aria-label': 'استمع', onclick: () => playPrompt(q) },
    svgIcon('M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z', 'w-9 h-9'));
  const kind = q.prompt.audio.split(':')[0];
  const slow = (kind === 'w' || kind === 's') && audio.hasClip(q.prompt.audio, 'fs')
    ? el('button', { class: 'slow-btn', onclick: () => playPrompt(q, true) }, '🐢 بطيء') : null;
  return el('div', { class: 'prompt-audio' }, big, slow);
}

function renderPrompt(q) {
  const box = el('div', { class: 'prompt' });
  const p = q.prompt;
  if (q.activity === 'sound-match' && !audio.hasClip(p.audio)) {
    box.append(el('p', { class: 'prompt-note' }, 'استمع إلى أول صوت في كلمة ', en(p.kw)));
  }
  if (p.audio && q.activity !== 'meaning' && q.activity !== 'read-text') box.append(promptAudioButtons(q));
  if (q.activity === 'capital-match' || q.activity === 'meaning') {
    box.append(q.activity === 'meaning' ? wordNode(p.text, { cls: 'prompt-big' }) : en(p.text, 'prompt-big'));
  }
  if (q.activity === 'missing-letter') {
    const word = el('bdi', { lang: 'en', dir: 'ltr', class: 'english-content prompt-word' });
    p.parts.forEach(part => word.append(part.blank ? el('span', { class: 'blank', text: '_' }) : el('span', { class: isVowel(part.text) ? 'vowel' : null, text: part.text })));
    box.append(word);
  }
  if (q.activity === 'first-last-sound') {
    const slots = el('div', { class: 'position-hint', 'aria-hidden': 'true' });
    for (let i = 0; i < 3; i++) {
      const on = (p.position === 'first' && i === 0) || (p.position === 'last' && i === 2);
      slots.append(el('span', { class: on ? 'is-target' : null }));
    }
    box.append(slots);
  }
  if (q.activity === 'complete-sentence') {
    const line = el('bdi', { lang: 'en', dir: 'ltr', class: 'english-content prompt-sentence' });
    p.tokens.forEach((t, i) => {
      if (i) line.append(' ');
      line.append(i === p.blankIndex ? el('span', {}, p.before, el('span', { class: 'blank blank-word', text: '_____' }), p.after) : t);
    });
    box.append(line);
  }
  if (q.activity === 'read-text') {
    const reader = el('div', { class: 'reader reader-compact' }, en(p.title, 'reader-title'),
      ...p.sentences.map(s => el('button', { class: 'reader-line', onclick: () => audio.play(s.audio, { text: s.text }) }, en(s.text))));
    box.append(reader,
      el('div', { class: 'statement' }, el('button', { class: 'small-btn', onclick: () => audio.play(p.audio, { text: p.statement }) }, '🔊'), en(p.statement)));
  }
  return box;
}

function optionLabel(q, o) {
  if (o.lang !== 'en') return o.label;
  if (GRAPHEME_OPTIONS.has(q.activity)) return en(o.label);
  return wordNode(o.label);
}

function renderOptions(q) {
  const wrap = el('div', { class: `options ${GRAPHEME_OPTIONS.has(q.activity) ? 'options-grapheme' : 'options-word'}` });
  q.options.forEach(o => {
    const btn = el('button', {
      class: `option-btn ${o.lang === 'ar' ? 'option-ar' : ''}`, 'data-value': String(o.value)
    }, optionLabel(q, o));
    btn.addEventListener('click', () => onChoice(q, o.value, btn));
    wrap.append(btn);
  });
  return wrap;
}

function renderBuild(q) {
  const slots = el('div', { class: 'build-slots english-content', dir: 'ltr' });
  const tiles = el('div', { class: 'build-tiles english-content', dir: 'ltr' });
  const placed = [];
  const refresh = () => {
    slots.replaceChildren(...q.answerTiles.map((_, i) => {
      const t = placed[i];
      return el('button', {
        class: `slot ${t ? 'filled' : ''}`, 'aria-label': t ? `إزالة ${t.label}` : 'خانة فارغة',
        onclick: () => { if (t && !session.locked) { placed.splice(i, 1); refresh(); } }
      }, t ? t.label : '');
    }));
    tiles.replaceChildren(...q.tiles.map(t => el('button', {
      class: 'tile', disabled: placed.includes(t), onclick: () => {
        if (session.locked || placed.length >= q.answerTiles.length) return;
        placed.push(t);
        refresh();
        if (placed.length === q.answerTiles.length) onChoice(q, placed.map(x => x.label), slots);
      }
    }, t.label)));
  };
  q.resetBuild = () => { placed.length = 0; refresh(); };
  q.fillBuild = () => {
    placed.length = 0;
    q.answerTiles.forEach(label => placed.push(q.tiles.find(t => t.label === label && !placed.includes(t))));
    refresh();
  };
  refresh();
  return el('div', { class: 'build' }, slots, tiles);
}

function renderQuestion() {
  const item = session.queue[session.index];
  const q = item.q;
  session.tries = 0;
  session.locked = false;
  session.shownAt = performance.now();
  $('activity-progress').textContent = `${toArabicDigits(session.index + 1)} / ${toArabicDigits(session.queue.length)}`;
  const box = $('activity-content');
  box.replaceChildren(
    el('p', { class: 'instruction' }, ...richArabic(q.instruction)),
    renderPrompt(q),
    q.type === 'build' ? renderBuild(q) : renderOptions(q),
    el('div', { id: 'feedback', class: 'feedback-panel', 'aria-live': 'polite' })
  );
  if (q.prompt.audio && AUTOPLAY.has(q.activity)) setTimeout(() => { if (session && session.queue[session.index] === item) playPrompt(q); }, 350);
}

/** The grapheme pair behind a wrong answer (for stats, hints and the report). */
function confusionFor(q, value) {
  const chosen = Array.isArray(value) ? value.join('') : String(value);
  if (GRAPHEME_OPTIONS.has(q.activity)) return { target: String(q.answer).toLowerCase(), chosen: chosen.toLowerCase() };
  if (q.activity === 'which-word' || q.activity === 'complete-sentence') {
    const f = errorFocus(String(q.answer).toLowerCase(), chosen.toLowerCase());
    return f && f.target.length <= 2 && f.chosen.length <= 2 ? { target: f.target, chosen: f.chosen } : null;
  }
  if (q.type === 'build' && !q.answerTiles.some(t => t.length > 2)) {
    const i = q.answerTiles.findIndex((t, k) => t !== value[k]);
    return i >= 0 ? { target: q.answerTiles[i], chosen: value[i] } : null;
  }
  return null;
}

function hintFor(q, value) {
  if (q.activity === 'meaning') return 'اقرأ الكلمة صوتًا صوتًا، ثم فكّر في معناها.';
  if (q.activity === 'read-text') return 'اقرأ النص مرة أخرى، وابحث عن الكلمات المهمة.';
  const c = confusionFor(q, value);
  if (!c) return HINTS.types.other;
  return HINTS.pairs[[c.target, c.chosen].sort().join('|')] || HINTS.types[classifyError(c.target, c.chosen)] || HINTS.types.other;
}

function onChoice(q, value, btn) {
  if (!session || session.locked) return;
  audio.unlock();
  const correct = bank.isCorrect(q, value);
  const rt = Math.round(performance.now() - session.shownAt);
  const confusion = correct ? null : confusionFor(q, value);
  recordAttempt(progress, {
    u: session.unitId, a: session.activityId, i: q.item, n: session.tries, ok: correct,
    c: Array.isArray(value) ? value.join('') : String(value), rt: document.hidden ? null : rt,
    focus: q.focus, confusion
  });
  if (confusion) {
    const k = `${confusion.target}|${confusion.chosen}`;
    session.confusions[k] = (session.confusions[k] || 0) + 1;
  }
  if (correct) handleCorrect(q, btn); else handleWrong(q, value, btn);
  save();
}

function feedbackMeaning(q) {
  const f = q.feedback;
  if (q.activity === 'complete-sentence' || q.activity === 'read-text') return el('p', { class: 'feedback-ar', text: f.ar });
  if (q.activity === 'capital-match') return el('p', { class: 'feedback-word' }, en(f.word));
  if (q.activity === 'sound-match') return el('p', { class: 'feedback-word' }, 'كما في ', f.emoji ? `${f.emoji} ` : '', wordNode(f.word));
  return el('p', { class: 'feedback-word' }, f.emoji ? `${f.emoji} ` : '', wordNode(f.word), f.ar ? ` — ${f.ar}` : '');
}

function nextButton() {
  return el('button', { class: 'next-btn', onclick: nextQuestion }, 'التالي ←');
}

function handleCorrect(q, btn) {
  const item = session.queue[session.index];
  session.locked = true;
  btn.classList.add('is-right');
  audio.cue('ok');
  const firstTry = session.tries === 0;
  if (firstTry && !item.delayed) {
    session.firstTry++;
    progress.points += POINTS_FIRST_TRY;
    updateHeader();
  }
  const fb = $('feedback');
  fb.className = 'feedback-panel feedback-ok';
  fb.replaceChildren(el('p', { class: 'feedback-title', text: firstTry ? 'أحسنت!' : 'صحيح.' }), feedbackMeaning(q));
  if (!['complete-sentence', 'read-text', 'which-word'].includes(q.activity) && q.feedback.audio) {
    setTimeout(() => audio.play(q.feedback.audio, { text: q.feedback.word }), 250);
  }
  if (firstTry) setTimeout(() => { if (session && session.queue[session.index] === item) nextQuestion(); }, 1600);
  else fb.append(nextButton());
}

function handleWrong(q, value, btn) {
  session.tries++;
  audio.cue('soft');
  const fb = $('feedback');
  if (q.type !== 'build') {
    btn.classList.add('is-wrong');
    btn.disabled = true;
  }
  if (session.tries === 1) {
    // Delayed test: the item comes back once at the end, with options in a new order.
    const item = session.queue[session.index];
    if (!item.delayed) {
      const copy = { ...q, options: q.options ? shuffle(q.options) : undefined, tiles: q.tiles ? shuffle(q.tiles) : undefined };
      session.queue.push({ q: copy, delayed: true });
      $('activity-progress').textContent = `${toArabicDigits(session.index + 1)} / ${toArabicDigits(session.queue.length)}`;
    }
    fb.className = 'feedback-panel feedback-try';
    const chosen = Array.isArray(value) ? value.join('') : String(value);
    const chosenKey = GRAPHEME_OPTIONS.has(q.activity) && gpc[chosen.toLowerCase()] ? clipKey('ph', gpc[chosen.toLowerCase()].ph)
      : (q.activity === 'which-word' ? clipKey('w', chosen) : null);
    fb.replaceChildren(
      el('p', { class: 'feedback-title', text: 'ليس تمامًا — حاول مرة أخرى.' }),
      el('p', { class: 'hint' }, ...richArabic(hintFor(q, value))),
      el('div', { class: 'compare' },
        q.prompt.audio && q.activity !== 'meaning' ? el('button', { class: 'small-btn', onclick: () => playPrompt(q) }, '🔊 استمع مرة أخرى') : null,
        chosenKey && audio.hasClip(chosenKey) ? el('button', { class: 'small-btn', onclick: () => audio.play(chosenKey) }, '🔊 ما اخترته: ', en(chosen)) : null));
    if (q.type === 'build') setTimeout(() => q.resetBuild(), 700);
    else if (AUTOPLAY.has(q.activity)) setTimeout(() => playPrompt(q), 600);
    return;
  }
  // Second mistake: show the answer; the learner taps it to continue.
  fb.className = 'feedback-panel feedback-reveal';
  fb.replaceChildren(el('p', { class: 'feedback-title', text: 'هذه هي الإجابة الصحيحة.' }), el('p', { class: 'hint' }, ...richArabic(hintFor(q, value))), feedbackMeaning(q));
  if (q.type === 'build') {
    q.fillBuild();
    session.locked = true;
    fb.append(nextButton());
    if (q.feedback.audio) audio.play(q.feedback.audio, { text: q.feedback.word });
    return;
  }
  document.querySelectorAll('#activity-content .option-btn').forEach(b => {
    if (b.dataset.value === String(q.answer)) b.classList.add('reveal');
    else b.disabled = true;
  });
  fb.append(el('p', { class: 'section-help', text: 'اضغط على الإجابة المظلَّلة للمتابعة.' }));
}

function nextQuestion() {
  if (!session) return;
  session.index++;
  if (session.index >= session.queue.length) finishActivity();
  else renderQuestion();
}

function finishActivity() {
  const { unitId, activityId, firstTry, total, confusions } = session;
  const passed = hasPassed(firstTry, total);
  const pct = Math.round((firstTry / total) * 100);
  let unlockedMsg = '';
  if (passed) {
    const list = progress.completedActivities[unitId] || (progress.completedActivities[unitId] = []);
    if (!list.includes(activityId)) list.push(activityId);
    const u = unitById(unitId);
    if (isUnitComplete(u, progress.completedActivities) && !progress.completedUnits.includes(unitId)) {
      progress.completedUnits.push(unitId);
      const next = nextUnitId(units, unitId);
      if (next && progress.unlockedUnit < next) {
        progress.unlockedUnit = next;
        unlockedMsg = `فتحت ${unitById(next).title}!`;
      } else unlockedMsg = 'أكملت الوحدة. أحسنت!';
    }
  }
  save(true);
  session = null;
  const top = Object.entries(confusions).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k.split('|'));
  const msg = el('div', {},
    el('p', { class: 'text-2xl font-bold mb-2', text: passed ? 'اكتمل النشاط ✓' : 'تحتاج إلى تدريب إضافي' }),
    el('p', { text: `صحيح من المحاولة الأولى: ${toArabicDigits(firstTry)} من ${toArabicDigits(total)} (${toArabicDigits(pct)}٪)` }),
    passed ? null : el('p', { class: 'text-gray-600', text: `المطلوب ${toArabicDigits(Math.round(PASS_MARK * 100))}٪ على الأقل. الأخطاء جزء من التعلّم — حاول مرة أخرى.` }),
    unlockedMsg ? el('p', { class: 'text-green-700 font-bold mt-2', text: unlockedMsg }) : null,
    top.length ? el('p', { class: 'mt-3 text-base' }, 'انتبه إلى: ', ...top.flatMap(([a, b], i) => [i ? '، ' : '', en(`${a} / ${b}`)])) : null);
  // New badges are shown after the result, not on top of it.
  showMessage(msg, [
    { label: 'أعد المحاولة', onClick: () => { startActivity(unitId, activityId); checkAchievements(); }, secondary: passed },
    { label: 'العودة إلى الوحدة', onClick: () => { showLesson(unitId); checkAchievements(); }, secondary: !passed }
  ]);
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
function showMessage(content, buttons = [{ label: 'متابعة', onClick: () => {} }]) {
  const modal = $('message-modal');
  $('modal-message').replaceChildren(typeof content === 'string' ? content : content);
  $('modal-buttons').replaceChildren(...buttons.map(b => el('button', {
    class: b.secondary ? 'modal-btn modal-btn-secondary' : b.danger ? 'modal-btn modal-btn-danger' : 'modal-btn',
    onclick: () => { modal.classList.add('hidden'); b.onClick(); }
  }, b.label)));
  modal.classList.remove('hidden');
  $('modal-buttons').firstElementChild?.focus();
}

function confirmAction(message, onConfirm) {
  showMessage(message, [
    { label: 'إلغاء', onClick: () => {}, secondary: true },
    { label: 'تأكيد', onClick: onConfirm, danger: true }
  ]);
}

function checkAchievements() {
  achievements.forEach(a => {
    if (!progress.earnedAchievements.includes(a.id) && a.condition(progress)) {
      progress.earnedAchievements.push(a.id);
      achievementQueue.push(a);
    }
  });
  if (!showingAchievement && achievementQueue.length) showNextAchievement();
}

function showNextAchievement() {
  const a = achievementQueue.shift();
  if (!a) { showingAchievement = false; return; }
  showingAchievement = true;
  $('achievement-icon').innerHTML = a.icon; // static SVG from data.js
  $('achievement-name').textContent = a.name;
  $('achievement-desc').textContent = a.description;
  $('achievement-unlocked-modal').classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Achievements, report, audio test
// ---------------------------------------------------------------------------
function renderAchievements() {
  const grid = $('achievements-grid');
  grid.replaceChildren(...achievements.map(a => {
    const earned = progress.earnedAchievements.includes(a.id);
    const icon = el('div', { class: 'w-16 h-16 mx-auto mb-3' });
    icon.innerHTML = a.icon; // static SVG from data.js
    return el('div', { class: `achievement-card text-center p-4 bg-white rounded-lg shadow-sm border ${earned ? 'border-yellow-400' : 'locked'}` },
      icon, el('h4', { class: 'font-bold text-gray-800', text: a.name }), el('p', { class: 'text-sm text-gray-500', text: a.description }));
  }));
  showView('achievements-view', 'الإنجازات', renderDashboard);
}

function soundButton(g) {
  const info = gpc[g];
  if (!info) return en(g, 'report-g');
  return el('button', { class: 'report-g', onclick: () => playSound(info.ph, info.kw) }, en(g), ' 🔊');
}

function renderProgressReport() {
  const root = $('progress-report-view');
  const stat = (label, value, cls) => el('div', { class: 'bg-white p-4 rounded-lg shadow-sm' },
    el('div', { class: 'text-sm text-gray-500', text: label }), el('div', { class: `text-2xl font-bold ${cls}`, text: value }));
  const confusions = topConfusions(progress, 5);
  const accuracy = graphemeAccuracy(progress, 3);
  root.replaceChildren(
    el('div', { class: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center' },
      stat('النقاط', progress.points, 'text-yellow-500'),
      stat('أيام متتالية', progress.streak, 'text-red-500'),
      stat('وقت التعلّم', formatTime(progress.timeSpent), 'text-blue-500'),
      stat('الوحدات المكتملة', `${progress.completedUnits.length} / ${units.length}`, 'text-green-600')),
    el('div', { class: 'bg-white p-6 rounded-lg shadow-sm mb-6' },
      el('h3', { class: 'text-lg font-bold mb-2', text: 'أصوات تحتاج إلى تدريب' }),
      confusions.length
        ? el('ul', { class: 'confusion-list' }, ...confusions.map(c => el('li', {},
          el('div', { class: 'confusion-pair' }, soundButton(c.target), el('span', { text: 'اختلطت مع' }), soundButton(c.chosen),
            el('span', { class: 'text-gray-500 text-sm', text: `(${toArabicDigits(c.count)} مرات)` })),
          el('p', { class: 'hint' }, ...richArabic(HINTS.pairs[[c.target, c.chosen].sort().join('|')] || HINTS.types[classifyError(c.target, c.chosen)] || '')))))
        : el('p', { class: 'text-gray-500', text: 'لا توجد أخطاء متكررة بعد. استمر في الأنشطة وسيظهر هنا ما يحتاج إلى تدريب.' })),
    el('div', { class: 'bg-white p-6 rounded-lg shadow-sm' },
      el('h3', { class: 'text-lg font-bold mb-2', text: 'دقّتك في كل صوت (من المحاولة الأولى)' }),
      accuracy.length
        ? el('div', { class: 'accuracy-grid' }, ...accuracy.map(a => el('div', {
          class: `accuracy-chip ${a.accuracy >= 0.9 ? 'is-good' : a.accuracy >= 0.7 ? 'is-ok' : 'is-weak'}`
        }, en(a.g), el('span', { text: `${toArabicDigits(Math.round(a.accuracy * 100))}٪` }))))
        : el('p', { class: 'text-gray-500', text: 'ستظهر هنا دقّتك بعد بعض الأنشطة.' })));
  showView('progress-report-view', 'تقرير التقدّم', renderDashboard);
}

async function renderAudioTest() {
  const root = $('audio-test-view');
  const out = el('pre', { class: 'diagnostics', dir: 'ltr' });
  const refresh = () => { out.textContent = JSON.stringify(audio.diagnostics(), null, 2); };
  root.replaceChildren(el('div', { class: 'bg-white p-6 rounded-lg shadow-sm space-y-4 leading-8' },
    el('p', { text: 'اضغط على الأزرار لتتأكد أن الصوت يعمل على جهازك.' }),
    el('div', { class: 'flex flex-wrap gap-3' },
      el('button', { class: 'small-btn', onclick: async () => { await audio.play(clipKey('w', 'yes'), { text: 'yes' }); refresh(); } }, '🔊 كلمة: ', en('yes')),
      el('button', { class: 'small-btn', onclick: async () => { await playSound('s', 'sun'); refresh(); } }, '🔊 صوت: ', en('s')),
      el('button', { class: 'small-btn', onclick: async () => { await audio.play(clipKey('s', 'It is a pin.'), { text: 'It is a pin.' }); refresh(); } }, '🔊 جملة')),
    el('p', { class: 'text-sm text-gray-600', text: 'إذا لم تسمع شيئًا: ارفع مستوى الصوت. في أجهزة iPhone القديمة، أطفئ زر الوضع الصامت. وإذا فتحت الرابط من داخل واتساب أو إنستغرام فافتحه في Safari أو Chrome.' }),
    out));
  await audio.initAudio();
  refresh();
  showView('audio-test-view', 'اختبار الصوت', renderDashboard);
}

// ---------------------------------------------------------------------------
// Event listeners & init
// ---------------------------------------------------------------------------
$('back-button').addEventListener('click', () => { audio.stop(); (backTarget || renderDashboard)(); });
$('menu-button').addEventListener('click', (event) => {
  event.stopPropagation();
  const menu = $('dropdown-menu');
  menu.classList.toggle('hidden');
  $('menu-button').setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
});
window.addEventListener('click', () => { if (!$('dropdown-menu').classList.contains('hidden')) closeMenu(); });
$('progress-report-button').addEventListener('click', () => { closeMenu(); renderProgressReport(); });
$('achievements-button').addEventListener('click', () => { closeMenu(); renderAchievements(); });
$('audio-test-button').addEventListener('click', () => { closeMenu(); renderAudioTest(); });
$('important-note-button').addEventListener('click', () => { closeMenu(); showView('important-note-view', 'ملاحظة مهمة', renderDashboard); });
$('achievement-close-btn').addEventListener('click', () => { $('achievement-unlocked-modal').classList.add('hidden'); showNextAchievement(); });

$('copy-email-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('hello@my2ndlang.com');
    const toast = $('copy-toast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 1500);
  } catch (error) {
    console.log('Could not copy email');
  }
});

$('reset-progress').addEventListener('click', () => {
  closeMenu();
  confirmAction('هل أنت متأكد من رغبتك في إعادة تعيين كل تقدّمك؟ لا يمكن التراجع عن هذا الإجراء.', () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) { console.warn('Cannot clear localStorage (private browsing?):', e); }
    progress = getDefaultProgress();
    progress.seenNotices.push('new-course');
    updateHeader();
    renderDashboard();
  });
});

$('unlock-all').addEventListener('click', () => {
  closeMenu();
  confirmAction('هل تريد فتح جميع الوحدات؟ نوصي بالبدء من الوحدة الأولى إلا إذا كنت تعرف أصوات الحروف جيدًا.', () => {
    progress.unlockedUnit = units[units.length - 1].id;
    save();
    renderDashboard();
  });
});

function showNewCourseNotice() {
  if (!legacyFound || progress.seenNotices.includes('new-course')) return;
  progress.seenNotices.push('new-course');
  save();
  showMessage(el('div', { class: 'text-right' },
    el('p', { class: 'font-bold mb-2', text: 'تحديث جديد للبرنامج' }),
    el('p', { class: 'text-base', text: 'صمّمنا المنهج من جديد للطلاب البالغين: أصوات حقيقية للحروف، وكلمات مفيدة مع معانيها، وتدريب على الفروق الصعبة للمتحدثين بالعربية.' }),
    el('p', { class: 'text-base mt-2', text: 'لأن الوحدات تغيّرت، يبدأ تقدّمك من جديد. إذا كنت تعرف أصوات الحروف فيمكنك استخدام «فتح كل الوحدات» من القائمة.' })),
  [{ label: 'لنبدأ', onClick: () => {} }]);
}

function init() {
  const loaded = loadProgressFrom(safeStorage());
  progress = loaded.progress;
  legacyFound = loaded.legacyFound;
  handleStreak();
  updateHeader();
  renderDashboard();
  startTimer();
  audio.initAudio();
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopTimer(); else startTimer(); });
  // iOS doesn't reliably fire beforeunload: save on pagehide too.
  window.addEventListener('pagehide', () => stopTimer());
  window.addEventListener('beforeunload', () => stopTimer());
  showNewCourseNotice();
}

function safeStorage() {
  try { return window.localStorage; } catch (e) { return { getItem: () => null }; }
}

document.getElementById('landing-year').textContent = new Date().getFullYear();

$('start-learning-btn').addEventListener('click', () => {
  audio.unlock();
  $('landing-page').classList.add('hidden');
  $('app-container').classList.remove('hidden');
  $('app-container').classList.add('fade-in');
  init();
});

// -------------------- PWA Installation --------------------
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => console.log('ServiceWorker registered:', registration.scope))
      .catch(err => console.log('ServiceWorker registration failed:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('install-app-button')?.classList.remove('hidden');
});

$('install-app-button')?.addEventListener('click', async () => {
  closeMenu();
  if (!deferredPrompt) {
    showMessage('التطبيق مثبّت بالفعل أو غير متاح للتثبيت على هذا المتصفح.');
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('install-app-button').classList.add('hidden');
});

window.addEventListener('appinstalled', () => {
  $('install-app-button')?.classList.add('hidden');
  deferredPrompt = null;
});
