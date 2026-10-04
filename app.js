// app.js (ES module) - Interface for the course: units, lessons, activities, review, ear training,
// placement, reports. Pedagogical design: see PEDAGOGY_PLAN.md.
import { units, gpc, ALPHABET, ACTIVITY_META, HINTS, PERCEPTION, STAGES, getAchievements } from './data.js';
import {
  STORAGE_KEY, V4_KEY, V3_KEY, LEGACY_KEY, getDefaultProgress, loadProgressFrom, recordAttempt, topConfusions,
  graphemeAccuracy, hasPassed, isUnitComplete, requiredActivities, unitSteps, nextStep, nextUnitId, formatTime, computeStreak, PASS_MARK
} from './logic.js';
import {
  dayNumber, learnItems, dueItems, weakTargets, recentConfusions, itemStatus, placementOutcome, recordPerceptionBlock
} from './learner.js';
import { createQuestionBank, PERCEPTION_VOICES } from './questions.js';
import { clipKey, errorFocus, classifyError, compareSpelling, sameSound, isVowel, shuffle, toPhonemes } from './phonics.js';
import * as audio from './audio.js';
import { el, en, svgIcon, richArabic, wordNode, section, toArabicDigits, configureWords } from './dom.js';
import { buildWidget, keyboardWidget, audioChoiceWidget, blendWidget, spellingDiff, brandCard, cleanupWidgets } from './widgets.js';
import { traceWidget } from './tracing.js';
import { renderBackup, backupDue } from './backup-ui.js';
import { SENSE, BENCHMARK_TEXTS, CAN_DO_STAGES, PICTURES, BENCH_PSEUDO } from './data-assess.js';
import { recordCheck, checkPassed, wordsPerMinute, recordTextReading } from './assess.js';
import { todayCards, reportSections, renderSpeedMenu } from './assess-ui.js';
import { recordWidget, stopRecorder } from './recorder.js';
import { platformInfo, renderInstallGuide, inAppBanner } from './platform.js';

const bank = createQuestionBank({
  units, gpc, alphabet: ALPHABET, perception: PERCEPTION, hasClip: (k) => audio.hasClip(k),
  sense: SENSE, benchTexts: BENCHMARK_TEXTS, stages: STAGES, pictures: PICTURES, benchPseudo: BENCH_PSEUDO
});
configureWords(bank.wordInfo);
const achievements = getAchievements(units.length);
const POINTS = { unit: 5, review: 5, weak: 5, perception: 1, placement: 0, check: 0, benchmark: 0, fix: 2 };
const CHECK_BONUS = 20;                 // points for passing a unit check
const ASSESSMENT_MODES = new Set(['placement', 'check', 'benchmark', 'letters']);   // no feedback until the end
const ITEMS_PER_ACTIVITY = 8;
const WORD_BATCH = 12;          // words shown at once in a unit's word list
const REVIEW_SIZE = 12;
// Activities whose prompt is heard (played automatically); "meaning" and texts are read first.
const AUTOPLAY = new Set(['sound-match', 'which-word', 'word-build', 'missing-letter', 'first-last-sound', 'complete-sentence',
  'dictation', 'sentence-build', 'perception']);
const GRAPHEME_OPTIONS = new Set(['sound-match', 'capital-match', 'missing-letter', 'first-last-sound', 'perception']);
const TIMED = new Set(['choice', 'yesno']);   // response times are kept for recognition tasks only

let progress = getDefaultProgress();
let legacyFound = false;
let session = null;
let backTarget = null;
let saveTimer = null;
let learningTimer = null;
let readerToken = 0;
let slowWords = false;
let activeDrill = null;                 // a timed drill in progress (stopped when the view changes)

const $ = (id) => document.getElementById(id);
const unitById = (id) => units.find(u => u.id === id);
const today = () => dayNumber();
/** How a grapheme key is shown: a_e, ow (for ow2), y (for y2)... */
const gLabel = (g) => (gpc[g] && gpc[g].label) || g;
const unitOfGrapheme = (g) => units.find(u => (u.graphemes || []).includes(g))?.id ?? null;

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

// Points are still counted (achievements), but not shown all the time: less to watch while learning.
function updateHeader() {
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
const VIEWS = ['dashboard-view', 'lesson-view', 'activity-view', 'achievements-view', 'progress-report-view', 'important-note-view',
  'audio-test-view', 'perception-view', 'backup-view', 'install-view'];

function showView(id, title, back = null) {
  readerToken++;
  audio.stop();
  cleanupWidgets();
  stopRecorder();
  activeDrill?.cancel();
  activeDrill = null;
  if (id !== 'activity-view') session = null;
  VIEWS.forEach(v => $(v).classList.toggle('hidden', v !== id));
  $('main-title').textContent = title;
  backTarget = back;
  $('back-button').classList.toggle('hidden', !back);
  window.scrollTo(0, 0);
}

function closeMenu() {
  $('dropdown-menu').classList.add('hidden');
  $('settings-group').open = false;
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

// 'h:' items are left over from the heart-word activity, which was removed: they are no longer reviewed.
const reviewFilter = (k) => !k.startsWith('h:') && (bank.itemUnit(k) || 1) <= progress.unlockedUnit;
const currentWeak = () => {
  const taught = bank.taughtGraphemes(progress.unlockedUnit);
  return weakTargets(progress.attempts).filter(t => taught.includes(t.target));
};

function todayCard({ icon, title, text, action, onClick, muted = false, id = null }) {
  return el('div', { class: `today-card ${muted ? 'is-muted' : ''}`, 'data-card': id },
    el('div', { class: 'today-head' }, el('span', { class: 'today-icon', 'aria-hidden': 'true', text: icon }), el('h3', { class: 'today-title' }, ...richArabic(title))),
    el('p', { class: 'today-text' }, ...richArabic(text)),
    action ? el('button', { class: 'today-btn', onclick: onClick }, action) : null);
}

/** The unit to work on now: the newest open unit, else the first one not finished. */
function currentUnit() {
  const open = unitById(progress.unlockedUnit);
  if (open && !progress.completedUnits.includes(open.id)) return open;
  return units.find(u => u.id <= progress.unlockedUnit && !progress.completedUnits.includes(u.id)) || null;
}

/** Letters found unknown by the letter check and not yet learned, in course order. */
const lettersToLearn = () => (progress.letters
  ? bank.letterOrder.filter(l => progress.letters.unknown.includes(l) && !progress.letters.learned.includes(l)) : []);
// A new learner (nothing done yet, no placement test) starts with the letter check.
const needsLetterCheck = () => !progress.letters && !progress.placement && !progress.completedUnits.length && !progress.attempts.length;

/** "Today's lesson": one big button that carries on where the learner stopped. */
function lessonCard() {
  const big = (title, text, label, onClick) => el('div', { class: 'today-card lesson-card', 'data-card': 'lesson' },
    el('p', { class: 'continue-step', text: 'درس اليوم' }), el('h3', { class: 'continue-title', text: title }),
    el('p', { class: 'continue-desc', text }), el('button', { class: 'continue-btn', onclick: onClick }, label));
  if (needsLetterCheck()) {
    return big('ماذا تعرف من الحروف؟', 'فحص قصير (حوالي ٣ دقائق): تسمع كلمة وتختار حرفها. نتعلّم بعده الحروف التي لا تعرفها فقط.', 'ابدأ ←', introduceLetterCheck);
  }
  const todo = lettersToLearn();
  if (todo.length) {
    return big('الحروف', `حروف تتعلّمها الآن: ${toArabicDigits(todo.length)} (${todo.join(' ')})`, 'تابع ←', startAlphabet);
  }
  const u = currentUnit();
  if (!u) {
    return todayCard({ id: 'lesson', icon: '🎓', title: 'أكملت كل الوحدات!', text: 'راجع ما تعلّمته، وتدرّب على الطلاقة من «المزيد».' });
  }
  const steps = unitSteps(u);
  const next = nextStep(u, progress.completedActivities, progress.completedUnits);
  const started = (progress.completedActivities[u.id] || []).length > 0;
  return el('div', { class: 'today-card lesson-card', 'data-card': 'lesson' },
    el('p', { class: 'continue-step', text: 'درس اليوم' }),
    el('h3', { class: 'continue-title', text: u.title }),
    el('p', { class: 'continue-desc', text: started && next
      ? `الخطوة ${toArabicDigits(steps.indexOf(next) + 1)} من ${toArabicDigits(steps.length)}: ${ACTIVITY_META[next].title}` : unitSubtitle(u) }),
    // A new unit opens on its page first, so the learner meets its sounds and words before practising.
    el('button', { class: 'continue-btn', onclick: () => (started ? continueUnit(u.id) : showLesson(u.id)) }, started ? 'تابع ←' : 'ابدأ ←'));
}

function renderToday() {
  const main = [lessonCard()];
  const due = dueItems(progress.items, today(), { filter: reviewFilter });
  if (due.length) {
    main.push(todayCard({ id: 'review', icon: '🔁', title: `مراجعة اليوم (${toArabicDigits(due.length)})`, text: 'أسئلة قصيرة عن أصوات وكلمات تعلّمتها، قبل أن تنساها.', action: 'ابدأ المراجعة', onClick: startReview }));
  }
  // Everything else waits, folded, under "More".
  const more = [];
  if (bank.perceptionSets(progress.unlockedUnit).length) {
    more.push(todayCard({ id: 'ear', icon: '👂', title: 'تدريب الأذن', text: 'ميّز بين أصوات متقاربة (مثل pin / pen) بأربعة أصوات مختلفة.', action: 'تدرّب', onClick: renderPerceptionMenu }));
  }
  const weak = currentWeak();
  if (weak.length) {
    const label = weak.map(t => (t.partner ? `${t.target} / ${t.partner}` : t.target)).join('، ');
    more.push(todayCard({ id: 'weak', icon: '🎯', title: 'نقاط ضعفي', text: `تدريب قصير على: ${label}`, action: 'تدرّب', onClick: startWeak }));
  }
  todayCards(assessContext()).forEach(c => more.push(todayCard(c)));
  if (!progress.letters && !needsLetterCheck()) {
    more.push(todayCard({ id: 'letters', icon: '🔤', title: 'فحص الحروف', text: 'اعرف أيّ الحروف تحتاج إلى تدريب، وتعلّمها وحدها.', action: 'ابدأ', onClick: introduceLetterCheck }));
  }
  if (backupDue(progress, today())) {
    more.push(todayCard({ id: 'backup', icon: '💾', title: 'احفظ نسخة من تقدّمك', text: 'التقدّم محفوظ على هذا الجهاز فقط. احفظ رمزًا احتياطيًا في مكان آمن.', action: 'نسخة احتياطية', onClick: () => renderBackup(backupContext()) }));
  }
  return el('div', {},
    el('div', { class: 'today-grid today-main' }, ...main),
    more.length ? el('details', { class: 'more-practice' },
      el('summary', { class: 'all-activities-summary' }, `المزيد (${toArabicDigits(more.length)})`),
      el('div', { class: 'today-grid' }, ...more)) : null);
}

function renderDashboard() {
  $('today-panel').replaceChildren(renderToday());
  const grid = $('unit-grid');
  grid.replaceChildren();
  units.forEach(u => {
    const stage = STAGES.find(st => st.from === u.id);
    if (stage) grid.append(el('h2', { class: 'stage-title', text: stage.title }));
    const locked = u.id > progress.unlockedUnit;
    const done = progress.completedUnits.includes(u.id);
    const required = requiredActivities(u);
    const count = (progress.completedActivities[u.id] || []).filter(a => required.includes(a)).length;
    const icon = svgIcon(locked ? ICONS.lock : done ? ICONS.done : ICONS.open, `w-6 h-6 ${locked ? 'text-gray-400' : done ? 'text-green-600' : 'text-blue-500'}`);
    const sub = unitSubtitle(u);
    grid.append(el('button', {
      class: `chunk-card unit-card p-6 border-2 rounded-xl shadow-sm text-right ${locked ? 'locked' : ''} ${done ? 'completed' : 'bg-white'}`,
      disabled: locked,
      'aria-label': `${u.title}${locked ? ' (مقفلة)' : done ? ' (مكتملة)' : ''}`,
      onclick: () => showLesson(u.id)
    },
    el('div', { class: 'flex justify-between items-start' }, el('span', { class: 'text-sm font-semibold text-gray-500', text: u.title }), icon),
    u.graphemes.length || (u.patterns || []).length
      ? el('div', { class: 'unit-graphemes mt-3' }, ...(u.graphemes.length ? u.graphemes.map(gLabel) : u.patterns.map(p => p.p)).map(g => en(g, 'grapheme-pill')))
      : el('div', { class: 'mt-3 text-lg font-bold text-gray-800', text: sub }),
    el('div', { class: 'text-sm text-gray-500 mt-3', text: `${toArabicDigits(count)} / ${toArabicDigits(required.length)} أنشطة` })));
  });
  showView('dashboard-view', 'مسار التعلّم');
}

// ---------------------------------------------------------------------------
// Lesson view
// ---------------------------------------------------------------------------
// A letter's sound on its own: nothing is played before or after it, so an example word is never taken
// for the letter's name. With no clean recording of the sound alone, its example word is played instead.
async function playSound(ph, kw) {
  const key = clipKey('ph', ph);
  await audio.initAudio();
  return audio.hasClip(key) ? audio.play(key) : audio.play(clipKey('w', kw), { text: kw });
}

/**
 * A new letter. Adults already know that letters have names and sounds, so the letter comes first and its
 * name, its sound and an example word are separate buttons. Nothing plays by itself.
 */
function soundCard(g, letter = g.length === 1 ? g : null) {
  const info = gpc[g];
  const sounds = [info, ...(info.alt ? [info.alt] : [])];
  const card = el('div', { class: 'sound-card' }, en(letter ? `${letter.toUpperCase()}${letter}` : gLabel(g), 'sound-letters'));
  if (letter) {
    card.append(el('button', { class: 'sound-btn', 'data-name': letter, onclick: () => audio.play(clipKey('ln', letter)) }, '🔤 اسم الحرف'));
  }
  sounds.forEach((s, i) => {
    const soundBtn = el('button', { class: 'sound-btn', 'data-sound': s.ph, onclick: () => playSound(s.ph, s.kw) },
      sounds.length > 1 ? `🔊 الصوت ${toArabicDigits(i + 1)}` : '🔊 الصوت');
    // Hidden when the sound has no clean recording on its own (th): the example word teaches it.
    audio.initAudio().then(() => { soundBtn.hidden = !audio.hasClip(clipKey('ph', s.ph)); });
    const example = el('button', { class: 'sound-btn keyword', 'data-example': s.kw, onclick: () => audio.play(clipKey('w', s.kw), { text: s.kw }) },
      el('span', { class: 'keyword-label', text: 'مثال:' }), el('span', { class: 'keyword-emoji', 'aria-hidden': 'true', text: s.emoji }), wordNode(s.kw));
    card.append(el('div', { class: 'sound-pair' }, soundBtn, example));
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

/** Time a silent reading of a text (repeated reading): words a minute, compared with last time. */
function readingTimer(t, unitId) {
  const id = `${unitId}:${t.id}`;
  const words = t.sentences.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  const out = el('span', { class: 'text-sm', 'aria-live': 'polite' });
  let startedAt = null;
  const btn = el('button', { class: 'small-btn' }, '⏱ قِس سرعتك');
  btn.addEventListener('click', () => {
    if (startedAt === null) {
      audio.stop();
      startedAt = performance.now();
      btn.textContent = '⏹ انتهيت';
      out.textContent = 'اقرأ النص كله بعينيك، ثم اضغط «انتهيت».';
      return;
    }
    const wpm = wordsPerMinute(words, (performance.now() - startedAt) / 1000);
    startedAt = null;
    btn.textContent = '⏱ قِس مرة أخرى';
    if (wpm === null) { out.textContent = 'كان ذلك سريعًا جدًا: اقرأ النص كله ثم اضغط «انتهيت».'; return; }
    const before = recordTextReading(progress, { day: today(), id, wpm });
    save(true);
    out.textContent = `${toArabicDigits(wpm)} كلمة في الدقيقة` + (before ? ` (المرة السابقة: ${toArabicDigits(before.wpm)})` : '');
  });
  return el('div', { class: 'reader-timer' }, btn, out);
}

function textReader(t, unitId = null) {
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
    ...lines,
    unitId ? readingTimer(t, unitId) : null);
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

/** The single next step of a unit: "Step 3 of 7 — Meaning — Continue". */
function continueCard(u) {
  const steps = unitSteps(u);
  const next = nextStep(u, progress.completedActivities, progress.completedUnits);
  const done = progress.completedActivities[u.id] || [];
  const dots = el('div', { class: 'step-dots', 'aria-hidden': 'true' },
    ...steps.map(a => el('span', { class: `step-dot ${done.includes(a) || !next ? 'is-done' : a === next ? 'is-next' : ''}` })));
  if (!next) {
    const nextId = nextUnitId(units, u.id);
    return el('div', { class: 'continue-card is-done' }, dots,
      el('p', { class: 'continue-title', text: 'أكملت هذه الوحدة ✓' }),
      nextId && nextId <= progress.unlockedUnit
        ? el('button', { class: 'continue-btn', onclick: () => showLesson(nextId) }, `${unitById(nextId).title} ←`) : null);
  }
  const meta = ACTIVITY_META[next];
  return el('div', { class: 'continue-card' }, dots,
    el('p', { class: 'continue-step', text: `الخطوة ${toArabicDigits(steps.indexOf(next) + 1)} من ${toArabicDigits(steps.length)}` }),
    el('h3', { class: 'continue-title', text: `${meta.icon} ${meta.title}` }),
    el('p', { class: 'continue-desc' }, ...richArabic(meta.desc)),
    el('button', { class: 'continue-btn', 'data-continue': next, onclick: () => startUnitActivity(u.id, next) }, 'تابع ←'));
}

/** Go on with a unit: its next step, or the unit page when every step is done. */
function continueUnit(unitId) {
  const next = nextStep(unitById(unitId), progress.completedActivities, progress.completedUnits);
  if (next) startUnitActivity(unitId, next); else showLesson(unitId);
}

function showLesson(unitId) {
  const u = unitById(unitId);
  if (!u) return;
  const root = $('lesson-view');
  root.replaceChildren();
  // Tips are read before the first step; once the unit is under way they fold away.
  const started = (progress.completedActivities[u.id] || []).length > 0;
  root.append(el('details', { class: 'lesson-section unit-tips', open: !started },
    el('summary', { class: 'section-title all-activities-summary', text: 'قبل أن تبدأ' }),
    el('ul', { class: 'tips-list' }, ...u.tips.map(t => el('li', {}, ...richArabic(t))))));
  if (u.graphemes.length) {
    root.append(section('أصوات جديدة', el('p', { class: 'section-help', text: 'اضغط على الحرف لتسمع صوته. في القراءة نستخدم الصوت، أما «اسم الحرف» فللتهجئة.' }),
      el('div', { class: 'sound-grid' }, ...u.graphemes.map(g => soundCard(g)))));
  }
  if ((u.patterns || []).length) {
    root.append(section('أنماط جديدة', el('p', { class: 'section-help', text: 'اضغط على المثال لتسمعه، واقرأ الحروف معًا بلا حركة بينها.' }),
      el('div', { class: 'word-grid' }, ...u.patterns.map(p => el('button', {
        class: 'word-chip pattern-chip', onclick: () => audio.play(clipKey('w', p.ex), { text: p.ex })
      }, en(p.p, 'pattern-label'), wordNode(p.ex))))));
  }
  if (u.words.length) {
    const slowBtn = el('button', { class: `small-btn ${slowWords ? 'is-on' : ''}`, 'aria-pressed': String(slowWords) }, '🐢 استماع بطيء');
    slowBtn.addEventListener('click', () => {
      slowWords = !slowWords;
      slowBtn.classList.toggle('is-on', slowWords);
      slowBtn.setAttribute('aria-pressed', String(slowWords));
    });
    // Long lists are shown a few words at a time.
    const grid = el('div', { class: 'word-grid' });
    const more = el('button', { class: 'small-btn more-words' });
    let shown = 0;
    const showMore = () => {
      grid.append(...u.words.slice(shown, shown + WORD_BATCH).map(wordChip));
      shown = Math.min(u.words.length, shown + WORD_BATCH);
      more.textContent = `كلمات أخرى (${toArabicDigits(u.words.length - shown)})`;
      more.hidden = shown >= u.words.length;
    };
    more.addEventListener('click', showMore);
    showMore();
    root.append(section('كلمات للقراءة',
      el('div', { class: 'section-tools' }, el('p', { class: 'section-help', text: 'اقرأ الكلمة بنفسك أولًا، ثم اضغط لتسمعها. حروف العلة ملوّنة لتنتبه لها.' }), slowBtn),
      grid, more));
  }
  if ((u.signs || []).length) {
    root.append(section('لافتات في الحرم الجامعي', el('p', { class: 'section-help', text: 'اللافتات تُكتب غالبًا بحروف كبيرة. اضغط على اللافتة لتسمعها.' }),
      el('div', { class: 'sign-grid' }, ...u.signs.map(sg => el('button', { class: 'sign-chip', onclick: () => audio.play(clipKey('s', sg.say), { text: sg.say }) },
        signPlate(sg.text, sg.kind), el('span', { class: 'chip-ar', text: sg.ar }))))));
  }
  (u.forms || []).forEach(f => {
    root.append(section(`استمارة: ${f.ar}`, el('p', { class: 'section-help', text: 'تعرّف على خانات الاستمارة ومعانيها.' }),
      formCard({ title: f.title, fields: f.fields.map(x => ({ label: x.label, value: '', ar: x.ar })) })));
  });
  if ((u.texts || []).length) {
    root.append(section('نصوص قصيرة', el('p', { class: 'section-help', text: 'اقرأ بنفسك، ثم استمع وتابع، ثم اقرأ مرة أخرى.' }), ...u.texts.map(t => textReader(t, u.id))));
  }
  const done = progress.completedActivities[u.id] || [];
  const steps = unitSteps(u);
  const list = [...steps, ...u.activities.filter(a => !steps.includes(a))];
  root.append(el('details', { class: 'all-activities' },
    el('summary', { class: 'all-activities-summary' }, 'كل الأنشطة وتدريب إضافي'),
    el('div', { id: 'activities-container', class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' },
    ...list.map(id => {
      const meta = ACTIVITY_META[id];
      const complete = done.includes(id);
      const waiting = meta.check && !complete && !checkOpen(u);
      const best = meta.check && progress.checks[u.id] ? progress.checks[u.id].best : null;
      return el('button', {
        class: `activity-btn enhanced ${complete ? 'activity-btn-complete' : 'activity-btn-default'}`,
        'data-activity': id, onclick: () => startUnitActivity(u.id, id)
      },
      el('div', { class: 'flex items-start justify-between gap-3' },
        el('div', { class: 'text-right' }, el('h4', { class: 'text-lg font-bold leading-7', text: meta.title }),
          el('p', { class: 'mt-1 text-sm text-gray-500 font-medium' }, ...richArabic(meta.desc))),
        el('span', { class: 'activity-icon', 'aria-hidden': 'true', text: meta.icon })),
      el('div', { class: 'mt-4 flex items-center justify-between text-sm' },
        el('span', { class: 'activity-chip', text: complete ? 'مكتمل ✓' : waiting ? 'بعد الأنشطة' : 'ابدأ' }),
        meta.optional ? el('span', { class: 'optional-chip', text: 'اختياري' }) : null,
        best !== null ? el('span', { class: 'optional-chip', text: `أفضل نتيجة: ${toArabicDigits(Math.round(best * 100))}٪` }) : null));
    }))));
  root.prepend(continueCard(u));
  showView('lesson-view', u.title, renderDashboard);
  audio.preload(unitClipKeys(u));
}

// ---------------------------------------------------------------------------
// Sessions: one engine for unit activities, review, weak sounds, ear training and placement
// ---------------------------------------------------------------------------
/**
 * opts: { mode: 'unit'|'review'|'weak'|'perception'|'placement', title, heading, back, unitId?, activityId?,
 *         onFinish(session), onQueueEnd?(session) -> more questions or null, progressLabel?(session) }
 */
function startSession(questions, opts) {
  audio.unlock();
  if (!questions.length) {
    showMessage('لا توجد أسئلة لهذا النشاط بعد.');
    return;
  }
  $('activity-title').textContent = opts.heading;
  showView('activity-view', opts.title, opts.back);
  session = {
    mode: opts.mode, unitId: opts.unitId ?? null, activityId: opts.activityId ?? null,
    onFinish: opts.onFinish, onQueueEnd: opts.onQueueEnd || null, progressLabel: opts.progressLabel || null,
    queue: questions.map(q => ({ q, delayed: false })),
    index: 0, firstTry: 0, tries: 0, shownAt: 0, locked: false, confusions: {}, results: [], widget: null,
    assessment: ASSESSMENT_MODES.has(opts.mode), singleTry: opts.mode === 'perception'
  };
  renderQuestion();
}

const isLocked = () => !session || session.locked;

function setProgressLabel() {
  $('activity-progress').textContent = session.progressLabel
    ? session.progressLabel(session)
    : `${toArabicDigits(session.index + 1)} / ${toArabicDigits(session.queue.length)}`;
}

function ttsText(q) {
  return q.prompt.statement || q.item;
}

function playPrompt(q, slow = false) {
  return audio.play(q.prompt.audio, { voice: q.prompt.voice || 'f', slow, text: ttsText(q) });
}

function promptAudioButtons(q) {
  const big = el('button', { class: 'play-btn', 'aria-label': 'استمع', onclick: () => playPrompt(q) },
    svgIcon('M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z', 'w-9 h-9'));
  const kind = q.prompt.audio.split(':')[0];
  const slow = (kind === 'w' || kind === 's') && q.activity !== 'perception' && audio.hasClip(q.prompt.audio, 'fs')
    ? el('button', { class: 'slow-btn', onclick: () => playPrompt(q, true) }, '🐢 بطيء') : null;
  return el('div', { class: 'prompt-audio' }, big, slow);
}

/** A campus sign: capital letters on a coloured plate (red = stop / not allowed, green = go, blue = information). */
function signPlate(text, kind = 'info') {
  return el('span', { class: `sign-plate sign-${kind}`, lang: 'en', dir: 'ltr', text });
}

/** A simple form: labels, with the learner's values or empty lines. */
function formCard(form) {
  return el('div', { class: 'form-card english-content', dir: 'ltr', lang: 'en' },
    el('div', { class: 'form-title', text: form.title }),
    ...form.fields.map(f => el('div', { class: 'form-row' },
      el('span', { class: 'form-label', text: `${f.label}:` }),
      el('span', { class: `form-value ${f.value ? '' : 'is-empty'}`, text: f.value || '' }),
      f.ar ? el('span', { class: 'form-ar', dir: 'rtl', lang: 'ar', text: f.ar }) : null)));
}

function renderPrompt(q) {
  const box = el('div', { class: 'prompt' });
  const p = q.prompt;
  if (q.type === 'trace') return box;
  if (q.activity === 'pseudo') {
    box.append(brandCard(wordNode(p.text, { split: p.split, cls: 'brand-name' })));
    return box;
  }
  if (q.activity === 'read-aloud') {
    box.append(el('p', { class: 'english-content prompt-sentence read-aloud-text', dir: 'ltr', lang: 'en' },
      ...p.text.split(' ').flatMap((w, i) => [i ? ' ' : '', wordNode(w)])));
    return box;
  }
  if (q.activity === 'sentence-picture') {
    box.append(el('p', { class: 'english-content prompt-sentence', dir: 'ltr', lang: 'en', text: p.statement }));
    return box;
  }
  if (q.activity === 'bench-text') {
    box.append(el('div', { class: 'reader reader-compact' }, en(p.title, 'reader-title'),
      ...p.sentences.map(s => el('p', { class: 'reader-line is-static' }, en(s.text)))),
    el('div', { class: 'statement' }, en(p.statement)));
    return box;
  }
  // The keyword's picture; its spelling is shown only after the answer.
  if (q.activity === 'sound-match' && p.emoji) box.append(el('div', { class: 'prompt-emoji', 'aria-hidden': 'true', text: p.emoji }));
  if (p.audio && !['meaning', 'read-text', 'signs', 'forms'].includes(q.activity)) box.append(promptAudioButtons(q));
  if (q.activity === 'capital-match' || q.activity === 'meaning') {
    box.append(q.activity === 'meaning' ? wordNode(p.text, { cls: 'prompt-big' }) : en(p.text, 'prompt-big'));
  }
  if (q.activity === 'sentence-build') box.append(el('p', { class: 'prompt-meaning' }, 'المعنى: ', p.ar));
  if (q.activity === 'missing-letter') {
    const word = el('bdi', { lang: 'en', dir: 'ltr', class: 'english-content prompt-word' });
    p.parts.forEach(part => word.append(part.blank ? el('span', { class: 'blank', text: '_' }) : el('span', { class: isVowel(part.text) ? 'vowel' : null, text: part.text })));
    box.append(word);
  }
  if (q.activity === 'first-last-sound' || q.activity === 'sound-match') {
    const slots = el('div', { class: 'position-hint', 'aria-hidden': 'true' });
    for (let i = 0; i < 3; i++) {
      const on = (p.position === 'first' && i === 0) || (p.position === 'middle' && i === 1) || (p.position === 'last' && i === 2);
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
  if (q.activity === 'signs') box.append(signPlate(p.sign, p.kind));
  if (q.activity === 'forms') {
    box.append(formCard(p.form));
    if (p.statement) box.append(el('div', { class: 'statement' }, el('button', { class: 'small-btn', onclick: () => audio.play(p.audio, { text: p.statement }) }, '🔊'), en(p.statement)));
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
  if (o.lang === 'pic') return el('span', { class: 'pic-option', text: o.label });
  if (o.lang !== 'en') return o.label;
  if (['read-text', 'forms', 'bench-text'].includes(q.activity) || /\s/.test(o.label)) return en(o.label);
  if (GRAPHEME_OPTIONS.has(q.activity)) return en(o.label);
  return wordNode(o.label);
}

function renderOptions(q) {
  const wrap = el('div', { class: `options ${GRAPHEME_OPTIONS.has(q.activity) ? 'options-grapheme' : 'options-word'}` });
  q.options.forEach(o => {
    const btn = el('button', {
      class: `option-btn ${o.lang === 'ar' ? 'option-ar' : o.lang === 'pic' ? 'option-pic' : ''}`, 'data-value': String(o.value)
    }, optionLabel(q, o));
    btn.addEventListener('click', () => onChoice(q, o.value, btn));
    wrap.append(btn);
  });
  return wrap;
}

function renderAnswer(q) {
  const onSubmit = (value, node) => onChoice(q, value, node);
  if (q.type === 'intro') {
    // A new letter is shown, not asked: nothing is scored or logged, and nothing plays by itself.
    return el('div', { class: 'letter-intro' }, soundCard(q.prompt.grapheme, q.prompt.letter),
      el('button', { class: 'next-btn', 'data-intro-next': '', onclick: () => nextQuestion() }, 'التالي ←'));
  }
  if (q.type === 'build') session.widget = buildWidget(q, { onSubmit, isLocked, words: q.activity === 'sentence-build' });
  else if (q.type === 'spell') session.widget = keyboardWidget(q, { onSubmit, isLocked });
  else if (q.type === 'audio-choice') session.widget = audioChoiceWidget(q, { play: (key) => audio.play(key), onSubmit, isLocked });
  else if (q.type === 'trace') session.widget = traceWidget(q, { onSubmit, isLocked, playName: () => audio.play(q.prompt.audio) });
  else if (q.type === 'blend') {
    session.widget = blendWidget(q, {
      play: (key) => audio.play(key), playSlow: () => audio.play(q.prompt.slow, { slow: true, text: q.answer }),
      slowMs: audio.clipMs(q.prompt.slow, 'fs'), onSubmit, isLocked
    });
  } else if (q.type === 'record') session.widget = recordWidget(q, { audio, isLocked, onSubmit: (rating, times) => onRecorded(q, rating, times) });
  else return renderOptions(q);
  return session.widget.node;
}

function renderQuestion() {
  cleanupWidgets();
  stopRecorder();
  const item = session.queue[session.index];
  const q = item.q;
  session.tries = 0;
  session.locked = false;
  session.widget = null;
  session.shownAt = performance.now();
  setProgressLabel();
  const box = $('activity-content');
  box.replaceChildren(
    el('p', { class: 'instruction' }, ...richArabic(q.instruction)),
    renderPrompt(q),
    renderAnswer(q),
    el('div', { id: 'feedback', class: 'feedback-panel', 'aria-live': 'polite' })
  );
  if (q.prompt.audio && AUTOPLAY.has(q.activity)) setTimeout(() => { if (session && session.queue[session.index] === item) playPrompt(q); }, 350);
}

/** The grapheme pair behind a wrong answer (for stats, hints and the report). */
function confusionFor(q, value, spell) {
  if (q.type === 'spell') return spell && spell.confusion;
  const chosen = Array.isArray(value) ? value.join('') : String(value);
  if (GRAPHEME_OPTIONS.has(q.activity)) return { target: String(q.answer).toLowerCase(), chosen: chosen.toLowerCase() };
  if (q.activity === 'which-word' || q.activity === 'complete-sentence') {
    const f = errorFocus(String(q.answer).toLowerCase(), chosen.toLowerCase());
    return f && f.target.length <= 2 && f.chosen.length <= 2 ? { target: f.target, chosen: f.chosen } : null;
  }
  if (q.activity === 'word-build' && !q.answerTiles.some(t => t.length > 2)) {
    const i = q.answerTiles.findIndex((t, k) => t !== value[k]);
    return i >= 0 ? { target: q.answerTiles[i], chosen: value[i] } : null;
  }
  return null;
}

function pairHint(c) {
  return HINTS.pairs[[c.target, c.chosen].sort().join('|')] || HINTS.types[classifyError(c.target, c.chosen)] || HINTS.types.other;
}

/** Two spellings of the same sounds (rane / rain, fone / phone)? */
function soundsTheSame(target, typed) {
  if (!typed || typed === target) return false;
  try {
    const plain = (w) => toPhonemes(w, gpc).replace(/[ˈˌ]/g, '');
    return plain(typed) === plain(target);
  } catch (e) {
    return false;
  }
}

function hintFor(q, value, spell) {
  if (q.activity === 'meaning') return 'اقرأ الكلمة صوتًا صوتًا، ثم فكّر في معناها.';
  if (q.activity === 'read-text') return 'اقرأ النص مرة أخرى، وابحث عن الكلمات المهمة.';
  if (q.activity === 'sentence-build') return 'ابدأ بالكلمة التي أولها حرف كبير، وانتهِ بالكلمة التي فيها النقطة. استمع مرة أخرى.';
  if (q.activity === 'signs') return 'اقرأ اللافتة كلمةً كلمة: الحروف الكبيرة هي الحروف نفسها (EXIT = exit).';
  if (q.activity === 'forms') return q.prompt.statement ? 'اقرأ الخانة المطلوبة في الاستمارة وقارنها بالجملة.' : 'اقرأ كلمات الخانات، واختر الخانة التي تعني ما تحتاجه.';
  if (q.type === 'trace') return 'ابدأ من النقطة الخضراء واتبع الأسهم، وابقَ قريبًا من الخط المنقّط.';
  if (q.type === 'spell') {
    if (soundsTheSame(q.answer, String(value))) return 'نطقك صحيح! لكن هذه الكلمة تُكتب بطريقة أخرى. انظر إلى الكلمة وتذكّر شكلها.';
    const c = spell && spell.confusion;
    if (c && sameSound(c.target, c.chosen)) return `الصوت صحيح، لكن الكتابة هنا ${c.target}.`;
    if (c) return pairHint(c);
    if (spell && spell.ops.some(o => o.op === 'miss' && isVowel(o.target))) return 'لا تنسَ حرف العلة: في الإنجليزية يُكتب كل حرف علة.';
    return 'استمع صوتًا صوتًا، واكتب حرفًا (أو حرفين) لكل صوت.';
  }
  const c = confusionFor(q, value, spell);
  return c ? pairHint(c) : HINTS.types.other;
}

function onChoice(q, value, node) {
  if (!session || session.locked) return;
  audio.unlock();
  const item = session.queue[session.index];
  const correct = bank.isCorrect(q, value);
  const rt = Math.round(performance.now() - session.shownAt);
  const spell = q.type === 'spell' ? compareSpelling(q.answer, value, q.graphemes) : null;
  const confusion = correct ? null : confusionFor(q, value, spell);
  const first = session.tries === 0 && !item.delayed;
  recordAttempt(progress, {
    u: q.unit ?? session.unitId, a: q.activity, i: q.item, n: session.tries, d: item.delayed, ok: correct,
    c: Array.isArray(value) ? value.join(' ') : String(value), rt: document.hidden ? null : rt,
    ...(session.mode !== 'unit' ? { m: session.mode } : {}),
    focus: q.focus, confusion
  });
  if (first) {
    session.results.push({ q, ok: correct, rt: document.hidden ? null : rt });
    if (q.memory.length) learnItems(progress.items, q.memory, correct, { day: today(), rt: TIMED.has(q.type) && !document.hidden ? rt : null });
  }
  if (confusion) {
    const k = `${confusion.target}|${confusion.chosen}`;
    session.confusions[k] = (session.confusions[k] || 0) + 1;
  }
  if (session.assessment) handleAssessment(node);
  else if (correct) handleCorrect(q, node);
  else handleWrong(q, value, node, spell);
  save();
}

/** Read aloud: the learner's own rating of their recording against the model (no right or wrong). */
function onRecorded(q, rating, times) {
  if (!session || session.locked) return;
  session.locked = true;
  const fmt1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '');
  recordAttempt(progress, {
    u: q.unit ?? session.unitId, a: q.activity, i: q.item, n: 0, ok: rating >= 1,
    c: `${rating}|${fmt1(times?.learner)}|${fmt1(times?.model)}`, rt: null, focus: []
  });
  session.results.push({ q, ok: rating >= 1, rating, times });
  if (rating >= 1) session.firstTry++;
  save();
  nextQuestion();
}

function handleAssessment(node) {
  session.locked = true;
  node?.classList?.add('is-chosen');
  setTimeout(() => { if (session) nextQuestion(); }, 450);
}

function feedbackMeaning(q) {
  const f = q.feedback;
  if (q.activity === 'signs') return el('p', { class: 'feedback-word' }, signPlate(f.word, q.prompt.kind), ` — ${f.ar}`);
  if (q.activity === 'forms' && !q.prompt.statement) return el('p', { class: 'feedback-word' }, en(f.word), ` — ${f.ar}`);
  if (q.activity === 'forms') return el('p', { class: 'feedback-ar', text: f.ar });
  if (q.activity === 'complete-sentence' || q.activity === 'read-text' || q.activity === 'sentence-build') {
    return el('div', {}, q.activity === 'sentence-build' ? el('p', { class: 'feedback-word' }, en(f.text)) : null, el('p', { class: 'feedback-ar', text: f.ar }));
  }
  if (q.activity === 'capital-match') return el('p', { class: 'feedback-word' }, en(f.word));
  if (q.activity === 'tracing') return el('p', { class: 'feedback-word' }, en(`${f.word.toUpperCase()} ${f.word}`));
  if (q.activity === 'sound-match') return el('p', { class: 'feedback-word' }, 'كما في ', f.emoji ? `${f.emoji} ` : '', wordNode(f.word));
  if (q.activity === 'perception') return el('p', { class: 'feedback-word' }, wordNode(f.word));
  return el('p', { class: 'feedback-word' }, f.emoji ? `${f.emoji} ` : '', wordNode(f.word), f.ar ? ` — ${f.ar}` : '');
}

function nextButton() {
  return el('button', { class: 'next-btn', onclick: nextQuestion }, 'التالي ←');
}

function handleCorrect(q, node) {
  const item = session.queue[session.index];
  session.locked = true;
  node?.classList?.add('is-right');
  audio.cue('ok');
  const firstTry = session.tries === 0;
  if (firstTry && !item.delayed) {
    session.firstTry++;
    progress.points += POINTS[session.mode] ?? 0;
    updateHeader();
  }
  const fb = $('feedback');
  fb.className = 'feedback-panel feedback-ok';
  fb.replaceChildren(el('p', { class: 'feedback-title', text: firstTry ? 'أحسنت!' : 'صحيح.' }), feedbackMeaning(q));
  if (!['complete-sentence', 'read-text', 'which-word', 'perception', 'sentence-build'].includes(q.activity) && q.feedback.audio) {
    setTimeout(() => audio.play(q.feedback.audio, { text: q.feedback.word }), 250);
  }
  if (firstTry) setTimeout(() => { if (session && session.queue[session.index] === item) nextQuestion(); }, q.activity === 'perception' ? 1100 : 1600);
  else fb.append(nextButton());
}

/** Ear training: one try; a wrong answer plays both words in the same voice. */
function handlePerceptionWrong(q, node) {
  session.locked = true;
  node?.classList?.add('is-wrong');
  audio.cue('soft');
  document.querySelectorAll('#activity-content .option-btn').forEach(b => { if (b.dataset.value === String(q.answer)) b.classList.add('reveal'); });
  const voice = q.prompt.voice;
  const [a, b] = q.prompt.pair;
  const fb = $('feedback');
  fb.className = 'feedback-panel feedback-reveal';
  fb.replaceChildren(
    el('p', { class: 'feedback-title' }, 'سمعت ', wordNode(q.item), ' (', en(q.answer), ').'),
    el('p', { class: 'hint' }, ...richArabic(pairHint({ target: q.answer, chosen: q.options.find(o => o.value !== q.answer).value }))),
    el('div', { class: 'compare' },
      el('button', { class: 'small-btn', onclick: () => audio.play(clipKey('w', a), { voice }) }, '🔊 ', wordNode(a)),
      el('button', { class: 'small-btn', onclick: () => audio.play(clipKey('w', b), { voice }) }, '🔊 ', wordNode(b))),
    nextButton());
  setTimeout(async () => {
    if (!session || session.queue[session.index].q !== q) return;
    await audio.play(clipKey('w', a), { voice });
    await new Promise(r => setTimeout(r, 400));
    if (session && session.queue[session.index].q === q) audio.play(clipKey('w', b), { voice });
  }, 500);
}

function handleWrong(q, value, node, spell) {
  if (session.singleTry) { handlePerceptionWrong(q, node); return; }
  session.tries++;
  audio.cue('soft');
  const fb = $('feedback');
  if (['choice', 'yesno'].includes(q.type) && node) {
    node.classList.add('is-wrong');
    node.disabled = true;
  }
  if (session.tries === 1) {
    // Delayed test: the item comes back once at the end, with options in a new order.
    const item = session.queue[session.index];
    if (!item.delayed) {
      const copy = { ...q, options: q.options ? shuffle(q.options) : undefined, tiles: q.tiles ? shuffle(q.tiles) : undefined };
      session.queue.push({ q: copy, delayed: true });
      setProgressLabel();
    }
    fb.className = 'feedback-panel feedback-try';
    const chosen = Array.isArray(value) ? value.join('') : String(value);
    const chosenSound = GRAPHEME_OPTIONS.has(q.activity) ? gpc[chosen.toLowerCase()] : null;
    const chosenKey = chosenSound ? clipKey('ph', chosenSound.ph) : (['which-word', 'blend'].includes(q.activity) ? clipKey('w', chosen) : null);
    fb.replaceChildren(
      el('p', { class: 'feedback-title', text: 'ليس تمامًا — حاول مرة أخرى.' }),
      spell ? spellingDiff(spell) : null,
      el('p', { class: 'hint' }, ...richArabic(hintFor(q, value, spell))),
      el('div', { class: 'compare' },
        q.prompt.audio && !['meaning', 'pseudo'].includes(q.activity) && q.type !== 'trace' ? el('button', { class: 'small-btn', onclick: () => playPrompt(q) }, '🔊 استمع مرة أخرى') : null,
        chosenKey && audio.hasClip(chosenKey) ? el('button', { class: 'small-btn', onclick: () => (chosenSound ? playSound(chosenSound.ph, chosenSound.kw) : audio.play(chosenKey)) }, '🔊 ما اخترته: ', en(chosen)) : null));
    if (q.type === 'build' || q.type === 'spell') setTimeout(() => { if (session && session.queue[session.index].q === q) session.widget.reset(); }, 900);
    else if (q.type === 'trace') session.widget.retry();
    else if (AUTOPLAY.has(q.activity)) setTimeout(() => playPrompt(q), 600);
    return;
  }
  // Second mistake: show the answer; the learner taps it (or "next") to continue.
  fb.className = 'feedback-panel feedback-reveal';
  fb.replaceChildren(el('p', { class: 'feedback-title', text: 'هذه هي الإجابة الصحيحة.' }),
    spell ? spellingDiff(spell) : null,
    el('p', { class: 'hint' }, ...richArabic(hintFor(q, value, spell))), feedbackMeaning(q));
  if (['build', 'spell', 'trace'].includes(q.type)) {
    if (q.type === 'build') session.widget.fill();
    if (q.type === 'spell') session.widget.show(q.answer);
    if (q.type === 'trace') session.widget.showModel();
    session.locked = true;
    fb.append(nextButton());
    if (q.feedback.audio && q.type !== 'trace') audio.play(q.feedback.audio, { text: q.feedback.word || q.feedback.text });
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
  if (session.index >= session.queue.length && session.onQueueEnd) {
    const more = session.onQueueEnd(session) || [];
    more.forEach(q => session.queue.push({ q, delayed: false }));
  }
  if (session.index >= session.queue.length) {
    const s = session;
    session = null;
    cleanupWidgets();
    save(true);
    s.onFinish(s);
  } else renderQuestion();
}

const topSessionConfusions = (s) => Object.entries(s.confusions).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k.split('|'));
const confusionLine = (top) => (top.length ? el('p', { class: 'mt-3 text-base' }, 'انتبه إلى: ', ...top.flatMap(([a, b], i) => [i ? '، ' : '', en(`${a} / ${b}`)])) : null);
const scoreLine = (right, total) => el('p', { text: `صحيح من المحاولة الأولى: ${toArabicDigits(right)} من ${toArabicDigits(total)} (${toArabicDigits(Math.round((right / Math.max(1, total)) * 100))}٪)` });

// ---------------- unit activities ----------------
/** The unit check opens when every other required activity is done (or the unit is already complete). */
function checkOpen(u) {
  if (progress.completedUnits.includes(u.id)) return true;
  const done = progress.completedActivities[u.id] || [];
  return requiredActivities(u).filter(a => !ACTIVITY_META[a].check).every(a => done.includes(a));
}

function startUnitActivity(unitId, activityId) {
  const u = unitById(unitId);
  if (ACTIVITY_META[activityId].check) {
    if (!checkOpen(u)) {
      showMessage(el('p', { class: 'text-base', text: 'أكمل أنشطة الوحدة الأخرى أولًا، ثم خذ اختبار الوحدة.' }));
      return;
    }
    startSession(bank.unitCheck(u), {
      mode: 'check', unitId, activityId, title: u.title, heading: ACTIVITY_META[activityId].title,
      back: () => { audio.stop(); showLesson(unitId); },
      onFinish: finishUnitCheck
    });
    return;
  }
  const questions = bank.build(unitId, activityId, { n: ITEMS_PER_ACTIVITY });
  startSession(questions, {
    mode: 'unit', unitId, activityId, title: u.title, heading: ACTIVITY_META[activityId].title,
    back: () => { audio.stop(); showLesson(unitId); },
    onFinish: finishUnitActivity
  });
}

/** Mark an activity done; complete the unit (and open the next) when nothing required is left. */
function markActivityDone(unitId, activityId) {
  const list = progress.completedActivities[unitId] || (progress.completedActivities[unitId] = []);
  if (!list.includes(activityId)) list.push(activityId);
  const u = unitById(unitId);
  if (isUnitComplete(u, progress.completedActivities) && !progress.completedUnits.includes(unitId)) {
    progress.completedUnits.push(unitId);
    const next = nextUnitId(units, unitId);
    if (next && progress.unlockedUnit < next) {
      progress.unlockedUnit = next;
      return `فتحت ${unitById(next).title}!`;
    }
    return 'أكملت الوحدة. أحسنت!';
  }
  return '';
}

/** What the right answer was, for the list of missed items after a unit check. */
function answerLine(q) {
  const play = (key, text) => (key ? el('button', { class: 'small-btn', onclick: () => audio.play(key, { text }) }, '🔊') : null);
  const word = (w, ar) => el('span', {}, wordNode(w), ar ? ` = ${ar}` : '');
  let content;
  if (q.activity === 'pseudo') content = [brandCard(q.item), play(q.feedback.audio), el('span', { text: ' هذه القراءة الصحيحة.' })];
  else if (['read-text', 'complete-sentence', 'forms', 'bench-text'].includes(q.activity) && q.prompt.statement) {
    content = [en(q.prompt.statement), ` — ${q.answer === true ? 'نعم' : q.answer === false ? 'لا' : q.answer}`, play(q.feedback.audio, q.prompt.statement)];
  } else if (q.activity === 'complete-sentence') content = [en(q.feedback.text || q.item), play(q.feedback.audio, q.item)];
  else if (q.activity === 'signs') content = [en(q.item), ` = ${q.feedback.ar}`];
  else if (q.activity === 'forms') content = [en(q.answer), ` (${q.feedback.ar})`];
  else if (q.activity === 'sound-match') content = [en(q.answer), play(q.prompt.audio)];
  else {
    const w = q.feedback.word || q.item;
    content = [word(w, q.feedback.ar || bank.wordInfo(w)?.ar), play(q.feedback.audio, w)];
  }
  return el('li', { class: 'missed-item' }, el('span', { class: 'missed-type', text: ACTIVITY_META[q.activity]?.title || '' }), ...content);
}

function finishUnitCheck(s) {
  const { unitId, activityId } = s;
  const right = s.results.filter(r => r.ok).length;
  const total = s.results.length;
  const passed = checkPassed(right, total);
  const firstPass = passed && !(progress.checks[unitId]?.passed);
  recordCheck(progress, unitId, right, total, today());
  let unlockedMsg = '';
  if (passed) {
    unlockedMsg = markActivityDone(unitId, activityId);
    if (firstPass) { progress.points += CHECK_BONUS; updateHeader(); }
  }
  save(true);
  const missed = s.results.filter(r => !r.ok).map(r => r.q);
  const fix = () => startSession(missed.map(q => ({ ...q, key: q.key.replace(/^check:/, 'fix:') })), {
    mode: 'fix', unitId, activityId: 'fix', title: unitById(unitId).title, heading: 'تدرّب على أخطائك',
    back: () => showLesson(unitId),
    onFinish: () => showMessage(el('p', { class: 'text-base', text: 'أحسنت. الآن أعد اختبار الوحدة بأسئلة جديدة.' }), [
      { label: 'أعد الاختبار', onClick: () => startUnitActivity(unitId, activityId) },
      { label: 'العودة إلى الوحدة', onClick: () => showLesson(unitId), secondary: true }])
  });
  $('activity-title').textContent = 'نتيجة اختبار الوحدة';
  $('activity-progress').textContent = '';
  showView('activity-view', unitById(unitId).title, () => showLesson(unitId));
  $('activity-content').replaceChildren(el('div', { class: 'check-result' },
    el('p', { class: 'text-2xl font-bold mb-2', text: passed ? 'نجحت في اختبار الوحدة ✓' : 'لم تصل إلى ٨٠٪ بعد' }),
    el('p', { text: `صحيح: ${toArabicDigits(right)} من ${toArabicDigits(total)} (${toArabicDigits(Math.round((right / Math.max(1, total)) * 100))}٪)` }),
    unlockedMsg ? el('p', { class: 'text-green-700 font-bold mt-2', text: unlockedMsg }) : null,
    passed ? null : el('p', { class: 'text-gray-600 mt-2', text: 'هذا طبيعي: تدرّب على الأسئلة التي أخطأت فيها، ثم أعد الاختبار بأسئلة جديدة.' }),
    missed.length ? el('div', { class: 'mt-4' }, el('h4', { class: 'font-bold mb-2', text: 'الأسئلة التي أخطأت فيها' }), el('ul', { class: 'missed-list' }, ...missed.map(answerLine))) : null,
    el('div', { class: 'flex flex-wrap gap-2 mt-4' },
      missed.length ? el('button', { class: passed ? 'small-btn' : 'today-btn', onclick: fix }, 'تدرّب على أخطائك') : null,
      passed ? null : el('button', { class: 'small-btn', onclick: () => startUnitActivity(unitId, activityId) }, 'أعد الاختبار'),
      passed && nextUnitId(units, unitId) ? el('button', { class: 'today-btn', onclick: () => showLesson(nextUnitId(units, unitId)) }, `${unitById(nextUnitId(units, unitId)).title} ←`) : null,
      el('button', { class: passed && nextUnitId(units, unitId) ? 'small-btn' : passed ? 'today-btn' : 'small-btn', onclick: () => showLesson(unitId) }, 'العودة إلى الوحدة'))));
  checkAchievements();
}

function finishReadAloud(s) {
  const { unitId, activityId } = s;
  const unlockedMsg = markActivityDone(unitId, activityId);
  save(true);
  const counts = [0, 1, 2].map(v => s.results.filter(r => r.rating === v).length);
  const ratios = s.results.map(r => (r.times?.learner && r.times?.model ? r.times.learner / r.times.model : null)).filter(Boolean);
  const ratio = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;
  showMessage(el('div', {},
    el('p', { class: 'text-2xl font-bold mb-2', text: 'أحسنت! قرأت بصوت عالٍ ✓' }),
    el('p', { text: `مثل النموذج: ${toArabicDigits(counts[2])} — قريبة: ${toArabicDigits(counts[1])} — أحتاج تدريبًا: ${toArabicDigits(counts[0])}` }),
    ratio ? el('p', { class: 'text-base mt-2', text: `في المتوسط استغرقت قراءتك ${toArabicDigits(ratio.toFixed(1)).replace('.', '٫')} ضعف وقت النموذج. مع التدريب يقترب هذا الرقم من ١.` }) : null,
    unlockedMsg ? el('p', { class: 'text-green-700 font-bold mt-2', text: unlockedMsg }) : null,
    el('p', { class: 'text-base text-gray-600 mt-2', text: 'اقرأ بصوت عالٍ كل يوم: القراءة المتكررة مع نموذج تزيد سرعتك ودقّتك.' })),
  [{ label: 'مرة أخرى', onClick: () => startUnitActivity(unitId, activityId), secondary: true },
    { label: 'العودة إلى الوحدة', onClick: () => { showLesson(unitId); checkAchievements(); } }]);
}

function finishUnitActivity(s) {
  if (s.activityId === 'read-aloud') { finishReadAloud(s); return; }
  const { unitId, activityId, firstTry } = s;
  const total = s.results.length;
  const passed = hasPassed(firstTry, total);
  const unlockedMsg = passed ? markActivityDone(unitId, activityId) : '';
  save(true);
  const msg = el('div', {},
    el('p', { class: 'text-2xl font-bold mb-2', text: passed ? 'اكتمل النشاط ✓' : 'تحتاج إلى تدريب إضافي' }),
    scoreLine(firstTry, total),
    passed ? null : el('p', { class: 'text-gray-600', text: `المطلوب ${toArabicDigits(Math.round(PASS_MARK * 100))}٪ على الأقل. الأخطاء جزء من التعلّم — حاول مرة أخرى.` }),
    unlockedMsg ? el('p', { class: 'text-green-700 font-bold mt-2', text: unlockedMsg }) : null,
    activityId === 'tracing' ? el('p', { class: 'text-base mt-2', text: 'اكتب الحروف على الورق أيضًا: الكتابة باليد تساعد على تذكّر شكل الحرف.' }) : null,
    confusionLine(topSessionConfusions(s)));
  // New badges are shown after the result, not on top of it.
  showMessage(msg, [
    passed ? { label: 'تابع ←', onClick: () => continueUnit(unitId) }
      : { label: 'أعد المحاولة', onClick: () => startUnitActivity(unitId, activityId) },
    { label: 'العودة إلى الوحدة', onClick: () => showLesson(unitId), secondary: true }
  ]);
  checkAchievements();
}

// ---------------- spaced review ----------------
function startReview() {
  const keys = shuffle(dueItems(progress.items, today(), { filter: reviewFilter, limit: REVIEW_SIZE }));
  const seen = new Set();
  const questions = keys.map(k => bank.buildItem(k, progress.unlockedUnit, Math.random, { box: progress.items[k].b }))
    .filter(q => q && !seen.has(q.key) && seen.add(q.key));
  startSession(questions, {
    mode: 'review', title: 'مراجعة اليوم', heading: 'مراجعة', back: renderDashboard,
    onFinish: (s) => {
      const left = dueItems(progress.items, today(), { filter: reviewFilter }).length;
      const tomorrow = dueItems(progress.items, today() + 1, { filter: reviewFilter }).length;
      showMessage(el('div', {},
        el('p', { class: 'text-2xl font-bold mb-2', text: 'انتهت المراجعة ✓' }),
        scoreLine(s.firstTry, s.results.length),
        el('p', { class: 'text-base mt-2', text: left ? `بقي ${toArabicDigits(left)} للمراجعة اليوم.` : `المراجعة القادمة: ${toArabicDigits(tomorrow)} غدًا.` }),
        el('p', { class: 'text-base text-gray-600 mt-2', text: 'ما تجيب عنه صحيحًا يعود بعد مدة أطول، وما تخطئ فيه يعود غدًا.' })),
      [{ label: left ? 'تابع المراجعة' : 'متابعة', onClick: () => { if (left) startReview(); else renderDashboard(); checkAchievements(); } }]);
    }
  });
}

// ---------------- weak sounds ----------------
async function startWeak() {
  await audio.initAudio();
  const targets = currentWeak();
  const questions = bank.weakPractice(targets, progress.unlockedUnit, { usable: audio.usable });
  startSession(questions, {
    mode: 'weak', title: 'نقاط ضعفي', heading: 'تدريب على الأصوات الصعبة', back: renderDashboard,
    onFinish: (s) => showMessage(el('div', {},
      el('p', { class: 'text-2xl font-bold mb-2', text: 'انتهى التدريب ✓' }),
      scoreLine(s.firstTry, s.results.length),
      confusionLine(topSessionConfusions(s))),
    [{ label: 'تدريب آخر', onClick: startWeak, secondary: true }, { label: 'متابعة', onClick: renderDashboard }])
  });
}

// ---------------- ear training ----------------
const setUnlockUnit = (set) => Math.max(unitOfGrapheme(set.a), unitOfGrapheme(set.b));

function trend(blocks) {
  return blocks.slice(-5).map(b => `${toArabicDigits(b)}٪`).join(' ← ');
}

function renderPerceptionMenu() {
  const root = $('perception-view');
  const open = bank.perceptionSets(progress.unlockedUnit).map(s => s.id);
  root.replaceChildren(
    el('p', { class: 'section-help mb-4', text: 'استمع إلى كلمة بصوت متحدث مختلف في كل مرة، واختر الحرف الذي تسمعه. التدريب بأصوات كثيرة يساعد الأذن على التمييز بين الأصوات الجديدة. كل جولة ١٦ كلمة.' }),
    el('div', { class: 'perception-grid' }, ...PERCEPTION.map(set => {
      const stats = progress.perception[set.id];
      const isOpen = open.includes(set.id);
      const [a, b] = set.pairs[0];
      return el('button', {
        class: `perception-card ${isOpen ? '' : 'locked'}`, disabled: !isOpen, 'data-set': set.id,
        onclick: () => startPerception(set.id)
      },
      el('span', { class: 'perception-letters' }, en(`${set.a} / ${set.b}`)),
      el('span', { class: 'perception-example' }, wordNode(a), ' – ', wordNode(b)),
      el('span', { class: 'perception-stats', text: !isOpen ? `بعد ${unitById(setUnlockUnit(set)).title}` : stats ? trend(stats.blocks) : 'جديد' }));
    })));
  showView('perception-view', 'تدريب الأذن', renderDashboard);
}

async function startPerception(setId) {
  await audio.initAudio();
  const set = PERCEPTION.find(s => s.id === setId);
  const questions = bank.perceptionBlock(set, { usable: audio.usable });
  audio.preload([...new Set(questions.map(q => q.prompt.audio))], PERCEPTION_VOICES);
  startSession(questions, {
    mode: 'perception', title: 'تدريب الأذن', heading: `${set.a} أم ${set.b}؟`, back: renderPerceptionMenu,
    onFinish: (s) => {
      const right = s.firstTry;
      const total = s.results.length;
      progress.perception = recordPerceptionBlock(progress.perception, set.id, right, total);
      save(true);
      const blocks = progress.perception[set.id].blocks;
      showMessage(el('div', {},
        el('p', { class: 'text-2xl font-bold mb-2', text: `${toArabicDigits(right)} من ${toArabicDigits(total)}` }),
        blocks.length > 1 ? el('p', { class: 'text-base', text: `آخر الجولات: ${trend(blocks)}` }) : null,
        el('p', { class: 'text-base text-gray-600 mt-2', text: 'التحسّن يأتي مع التكرار: جولة أو جولتان كل يوم أفضل من جولات كثيرة مرة واحدة.' })),
      [{ label: 'جولة أخرى', onClick: () => startPerception(setId) }, { label: 'رجوع', onClick: renderPerceptionMenu, secondary: true }]);
    }
  });
}

// ---------------- placement test ----------------
const CAN_DO = [
  [0, 'سنبدأ معًا من الأصوات الأولى: s, a, t, i, n, p.'],
  [1, 'تعرف أصوات عدد من الحروف، وتقرأ كلمات قصيرة مثل pin و map.'],
  [4, 'تقرأ كلمات قصيرة بحروف علة مختلفة مثل pen و cup و bag.'],
  [6, 'تقرأ كلمات وجملًا قصيرة فيها معظم أصوات الحروف.'],
  [8, 'تقرأ كلمات من مقطعين وجملًا بسيطة.'],
  // Counts of units passed: units 1-9 = 9, then 11-14 (clusters, endings), 15-20 (long vowels), 22-23.
  [10, 'تقرأ كلمات تبدأ بحرفين ساكنين مثل stop و spin.'],
  [13, 'تقرأ كلمات فيها حروف ساكنة متتالية ونهايات مثل hand و jumped و helping.'],
  [16, 'تقرأ حروف العلة الطويلة مثل make و rain و night.'],
  [19, 'تقرأ معظم حروف العلة الطويلة ونصوصًا قصيرة عن الحياة الجامعية.'],
  [21, 'تقرأ كلمات طويلة مثل student و teacher، ولافتات واستمارات بسيطة.']
];

// ---------------- letters: the check, then lessons for unknown letters only ----------------
function introduceLetterCheck() {
  showMessage(el('div', { class: 'text-right' },
    el('p', { class: 'font-bold mb-2', text: 'ماذا تعرف من الحروف؟' }),
    el('p', { class: 'text-base', text: 'تسمع كلمة وترى صورتها، ثم تختار الحرف. إذا لم تعرف فاختر ما تظنّه: لا توجد علامات.' }),
    el('p', { class: 'text-base mt-2', text: 'بعد الفحص نتعلّم الحروف التي تحتاجها فقط.' })),
  [{ label: 'ابدأ', onClick: startLetterCheck }, { label: 'لاحقًا', onClick: () => {}, secondary: true }]);
}

async function startLetterCheck() {
  await audio.initAudio();
  const items = bank.letterCheck();
  audio.preload(items.map(q => q.prompt.audio), ['f']);
  startSession(items, { mode: 'letters', title: 'فحص الحروف', heading: 'استمع واختر الحرف', back: renderDashboard, onFinish: finishLetterCheck });
}

function finishLetterCheck(s) {
  const known = s.results.filter(r => r.ok).map(r => r.q.answer);
  const unknown = s.results.filter(r => !r.ok).map(r => r.q.answer);
  progress.letters = { day: today(), known, unknown, learned: [] };
  save(true);
  const todo = lettersToLearn();
  showMessage(el('div', { class: 'text-right' },
    el('p', { class: 'text-2xl font-bold mb-2', text: 'نتيجة الفحص' }),
    el('p', { class: 'text-base', text: `تعرف أصوات ${toArabicDigits(known.length)} حرفًا من ${toArabicDigits(s.results.length)}. أحسنت.` }),
    todo.length
      ? el('p', { class: 'text-base mt-2' }, 'نتعلّم الآن هذه الحروف فقط، في دروس قصيرة: ', en(todo.join(' ')))
      : el('p', { class: 'text-base mt-2', text: 'تعرف كل الحروف! ابدأ الوحدة الأولى.' })),
  [{ label: todo.length ? 'ابدأ الحروف' : 'ابدأ الوحدة الأولى', onClick: () => (todo.length ? startAlphabet() : showLesson(progress.unlockedUnit)) }]);
}

const ALPHABET_GROUP = 3;   // new letters per short lesson

function startAlphabet() {
  const group = lettersToLearn().slice(0, ALPHABET_GROUP);
  if (!group.length) { renderDashboard(); return; }
  const known = [...new Set([...progress.letters.known, ...progress.letters.learned])];
  startSession(bank.alphabetLesson(group, known), {
    mode: 'alphabet', title: 'الحروف', heading: `حروف جديدة: ${group.join(' ')}`, back: renderDashboard,
    onFinish: (s) => finishAlphabet(s, group)
  });
}

function finishAlphabet(s, group) {
  group.forEach(l => { if (!progress.letters.learned.includes(l)) progress.letters.learned.push(l); });
  save(true);
  const left = lettersToLearn();
  showMessage(el('div', {},
    el('p', { class: 'text-2xl font-bold mb-2', text: 'أحسنت ✓' }),
    el('p', { class: 'text-base' }, 'تعلّمت: ', en(group.join(' '))),
    el('p', { class: 'text-base mt-2', text: left.length ? `بقي ${toArabicDigits(left.length)} حروف.` : 'تعلّمت كل الحروف التي تحتاجها. ابدأ الوحدة الأولى.' })),
  [left.length ? { label: 'الحروف التالية ←', onClick: startAlphabet } : { label: 'ابدأ الوحدة الأولى ←', onClick: () => showLesson(progress.unlockedUnit) },
    { label: 'الصفحة الرئيسية', onClick: renderDashboard, secondary: true }]);
  checkAchievements();
}

function introducePlacement() {
  showMessage(el('div', { class: 'text-right' },
    el('p', { class: 'font-bold mb-2', text: 'اختبار تحديد المستوى' }),
    el('p', { class: 'text-base', text: 'اختبار قصير (حوالي ١٠ دقائق) يحدّد من أين تبدأ. يتوقف عندما تصل إلى الأصوات التي لم تتعلّمها بعد.' }),
    el('p', { class: 'text-base mt-2', text: 'لن ترى الإجابات الصحيحة أثناء الاختبار. إذا لم تعرف الإجابة فاختر ما تظنّه — هذا طبيعي.' })),
  [{ label: 'ابدأ الاختبار', onClick: startPlacement }, { label: 'إلغاء', onClick: () => {}, secondary: true }]);
}

async function startPlacement() {
  await audio.initAudio();
  const unitIds = bank.placementUnits();
  const results = [];
  let unitIndex = 0;
  let unitStart = 0;
  const label = () => `الجزء ${toArabicDigits(unitIndex + 1)} من ${toArabicDigits(unitIds.length)}`;
  const first = bank.placementItems(unitIds[0]);
  audio.preload(first.flatMap(q => [q.prompt.audio, ...(q.options || []).map(o => o.audio)]).filter(Boolean), ['f', 'm']);
  startSession(first, {
    mode: 'placement', title: 'اختبار تحديد المستوى', heading: 'أجب بما تعرفه', back: renderDashboard,
    progressLabel: label,
    onQueueEnd: (s) => {
      const part = s.results.slice(unitStart);
      results.push({ unit: unitIds[unitIndex], right: part.filter(r => r.ok).length, total: part.length });
      const passedSoFar = placementOutcome(results, unitIds).passed.length === results.length;
      if (!passedSoFar || unitIndex + 1 >= unitIds.length) return null;
      unitIndex++;
      unitStart = s.results.length;
      const next = bank.placementItems(unitIds[unitIndex]);
      audio.preload(next.flatMap(q => [q.prompt.audio, ...(q.options || []).map(o => o.audio)]).filter(Boolean), ['f', 'm']);
      return next;
    },
    onFinish: () => finishPlacement(results, unitIds)
  });
}

function finishPlacement(results, unitIds) {
  const { passed, start } = placementOutcome(results, unitIds);
  // After the last teaching unit, the learner goes on to the review unit.
  const startUnit = passed.length === unitIds.length ? nextUnitId(units, unitIds[unitIds.length - 1]) || start : start;
  passed.forEach(id => { if (!progress.completedUnits.includes(id)) progress.completedUnits.push(id); });
  progress.unlockedUnit = Math.max(progress.unlockedUnit, startUnit);
  progress.placement = { day: today(), start: startUnit, passed };
  save(true);
  const canDo = [...CAN_DO].reverse().find(([n]) => passed.length >= n)[1];
  showMessage(el('div', { class: 'text-right' },
    el('p', { class: 'text-2xl font-bold mb-2', text: 'نتيجة الاختبار' }),
    el('p', { class: 'text-base' }, ...richArabic(canDo)),
    passed.length ? el('p', { class: 'text-base mt-2', text: `أتقنت: ${passed.map(id => unitById(id).title).join('، ')}` }) : null,
    el('p', { class: 'font-bold mt-2', text: `ابدأ من ${unitById(progress.unlockedUnit).title}.` }),
    passed.length ? el('p', { class: 'text-base text-gray-600 mt-2', text: 'الوحدات السابقة مفتوحة إذا أردت مراجعتها.' }) : null),
  [{ label: 'ابدأ', onClick: () => { checkAchievements(); showLesson(progress.unlockedUnit); } }]);
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
function showMessage(content, buttons = [{ label: 'متابعة', onClick: () => {} }]) {
  const modal = $('message-modal');
  $('modal-message').replaceChildren(content);
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

// Badges are recorded quietly (see them under Settings → Achievements): a pop-up in the middle of
// practice interrupts the learner.
function checkAchievements() {
  achievements.forEach(a => {
    if (!progress.earnedAchievements.includes(a.id) && a.condition(progress)) progress.earnedAchievements.push(a.id);
  });
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

/** Item memory grouped by kind and status (new / learning / mastered). */
function masterySummary() {
  const out = { ph: { mastered: [], learning: [] }, w: { mastered: [], learning: [] }, h: { mastered: [], learning: [] } };
  Object.entries(progress.items).forEach(([k, m]) => {
    const [kind, ...rest] = k.split(':');
    const status = itemStatus(m);
    if (out[kind] && status !== 'new') out[kind][status].push(rest.join(':'));
  });
  return out;
}

function renderProgressReport() {
  const root = $('progress-report-view');
  const stat = (label, value, cls) => el('div', { class: 'bg-white p-4 rounded-lg shadow-sm' },
    el('div', { class: 'text-sm text-gray-500', text: label }), el('div', { class: `text-2xl font-bold ${cls}`, text: value }));
  const recent = recentConfusions(progress.attempts, { n: 5 });
  const confusions = recent.length ? recent : topConfusions(progress, 5);
  const accuracy = graphemeAccuracy(progress, 3);
  const m = masterySummary();
  const phToGrapheme = (ph) => Object.keys(gpc).find(g => gpc[g].ph === ph && !gpc[g].variantOf) || (ph === 'dh' ? 'th' : ph);
  const weak = currentWeak();
  const box = (n, label) => el('div', { class: 'mastery-box' }, el('div', { class: 'mastery-num', text: toArabicDigits(n) }), el('div', { text: label }));
  root.replaceChildren(
    el('div', { class: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center' },
      stat('النقاط', progress.points, 'text-yellow-500'),
      stat('أيام متتالية', progress.streak, 'text-red-500'),
      stat('وقت التعلّم', formatTime(progress.timeSpent), 'text-blue-500'),
      stat('الوحدات المكتملة', `${progress.completedUnits.length} / ${units.length}`, 'text-green-600')),
    el('div', { class: 'bg-white p-6 rounded-lg shadow-sm mb-6' },
      el('h3', { class: 'text-lg font-bold mb-2', text: 'ما أتقنته' }),
      el('p', { class: 'section-help', text: '«أتقنت» تعني: صحيح في ٩٠٪ من آخر ٨ محاولات أو أكثر، في يومين مختلفين على الأقل، وبسرعة.' }),
      el('div', { class: 'mastery-grid' },
        box(m.ph.mastered.length, 'أصوات أتقنتها'),
        box(m.w.mastered.length, 'كلمات أتقنتها'),
        box(m.h.mastered.length, 'كلمات قلب أتقنتها'),
        box(m.ph.learning.length + m.w.learning.length + m.h.learning.length, 'قيد التعلّم')),
      m.ph.mastered.length ? el('div', { class: 'accuracy-grid mt-3' }, ...m.ph.mastered.map(ph => el('span', { class: 'accuracy-chip is-good' }, en(phToGrapheme(ph))))) : null),
    el('div', { class: 'bg-white p-6 rounded-lg shadow-sm mb-6' },
      el('h3', { class: 'text-lg font-bold mb-2', text: 'أصوات تحتاج إلى تدريب' }),
      confusions.length
        ? el('ul', { class: 'confusion-list' }, ...confusions.map(c => el('li', {},
          el('div', { class: 'confusion-pair' }, soundButton(c.target), el('span', { text: 'اختلطت مع' }), soundButton(c.chosen),
            el('span', { class: 'text-gray-500 text-sm', text: `(${toArabicDigits(c.count)} مرات)` })),
          el('p', { class: 'hint' }, ...richArabic(pairHint(c))))))
        : el('p', { class: 'text-gray-500', text: 'لا توجد أخطاء متكررة بعد. استمر في الأنشطة وسيظهر هنا ما يحتاج إلى تدريب.' }),
      weak.length ? el('button', { class: 'today-btn mt-3', onclick: startWeak }, 'تدرّب على هذه الأصوات') : null),
    el('div', { class: 'bg-white p-6 rounded-lg shadow-sm mb-6' },
      el('h3', { class: 'text-lg font-bold mb-2', text: 'دقّتك في كل صوت (من المحاولة الأولى)' }),
      accuracy.length
        ? el('div', { class: 'accuracy-grid' }, ...accuracy.map(a => el('div', {
          class: `accuracy-chip ${a.accuracy >= 0.9 ? 'is-good' : a.accuracy >= 0.7 ? 'is-ok' : 'is-weak'}`
        }, en(a.g), el('span', { text: `${toArabicDigits(Math.round(a.accuracy * 100))}٪` }))))
        : el('p', { class: 'text-gray-500', text: 'ستظهر هنا دقّتك بعد بعض الأنشطة.' })),
    Object.keys(progress.perception).length ? el('div', { class: 'bg-white p-6 rounded-lg shadow-sm' },
      el('h3', { class: 'text-lg font-bold mb-2', text: 'تدريب الأذن (آخر الجولات)' }),
      el('ul', { class: 'confusion-list' }, ...PERCEPTION.filter(s => progress.perception[s.id]).map(s => el('li', {},
        el('div', { class: 'confusion-pair' }, en(`${s.a} / ${s.b}`), el('span', { text: trend(progress.perception[s.id].blocks) })))))) : null);
  root.append(...reportSections(assessContext(), units));
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
// Backup and install guide (see backup-ui.js and platform.js)
// ---------------------------------------------------------------------------
/** Shared state and helpers for the Phase 4 screens (assess-ui.js). */
function assessContext() {
  return {
    getProgress: () => progress,
    save, today, bank, stages: STAGES, canDo: CAN_DO_STAGES,
    activityRoot: (title, heading, back) => {
      showView('activity-view', title, back);
      session = null;
      $('activity-title').textContent = heading;
      $('activity-progress').textContent = '';
      return $('activity-content');
    },
    showMessage, renderDashboard, renderReport: renderProgressReport,
    runQuestions: (questions, { title, heading, back, onDone }) => startSession(questions, { mode: 'benchmark', title, heading, back, onFinish: onDone }),
    cue: (type) => audio.cue(type),
    maxUnit: () => Math.max(0, ...progress.completedUnits),
    track: (drill) => { activeDrill = drill; }
  };
}

function backupContext() {
  return {
    getProgress: () => progress,
    replaceProgress: (p) => { progress = p; save(true); updateHeader(); },
    markBackedUp: () => { progress.lastBackupDay = today(); save(true); },
    root: $('backup-view'),
    showView: () => showView('backup-view', 'نسخة احتياطية', renderDashboard),
    showMessage, confirmAction, renderDashboard, units
  };
}

function openInstallGuide() {
  renderInstallGuide($('install-view'), platformInfo(), { canPrompt: () => !!deferredPrompt, onInstall: promptInstall, onDone: renderDashboard });
  showView('install-view', 'تثبيت التطبيق', renderDashboard);
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
// Opening the settings group inside the menu must not close the menu.
$('settings-group').querySelector('summary').addEventListener('click', (event) => event.stopPropagation());
$('progress-report-button').addEventListener('click', () => { closeMenu(); renderProgressReport(); });
$('achievements-button').addEventListener('click', () => { closeMenu(); renderAchievements(); });
$('audio-test-button').addEventListener('click', () => { closeMenu(); renderAudioTest(); });
$('placement-button').addEventListener('click', () => { closeMenu(); introducePlacement(); });
$('backup-button').addEventListener('click', () => { closeMenu(); renderBackup(backupContext()); });
$('install-app-button').addEventListener('click', () => { closeMenu(); openInstallGuide(); });
$('important-note-button').addEventListener('click', () => { closeMenu(); showView('important-note-view', 'ملاحظة مهمة', renderDashboard); });

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
      [STORAGE_KEY, V4_KEY, V3_KEY, LEGACY_KEY].forEach(k => localStorage.removeItem(k));
    } catch (e) { console.warn('Cannot clear localStorage (private browsing?):', e); }
    progress = getDefaultProgress();
    progress.seenNotices.push('new-course', 'ios-install');
    updateHeader();
    renderDashboard();
    showStartChoice();
  });
});

/** First visit: complete beginners start at unit 1; others can take the placement test. */
function showStartChoice() {
  if (progress.seenNotices.includes('start-choice') || progress.attempts.length || progress.placement) return;
  progress.seenNotices.push('start-choice');
  save();
  showMessage(el('div', { class: 'text-right' },
    el('p', { class: 'font-bold mb-2', text: 'كيف تريد أن تبدأ؟' }),
    el('p', { class: 'text-base', text: 'إذا كانت القراءة بالإنجليزية جديدة عليك، فابدأ بفحص قصير للحروف ثم نتعلّم ما ينقصك منها. وإذا كنت تقرأ بعض الكلمات، فاختبار قصير يحدّد لك من أين تبدأ.' })),
  [{ label: 'أنا مبتدئ: أبدأ بالحروف', onClick: () => maybeShowInstallGuide(introduceLetterCheck) },
    { label: 'أعرف بعض الإنجليزية: اختبار قصير', onClick: () => maybeShowInstallGuide(introducePlacement), secondary: true }]);
}

/** iPhone/iPad in Safari (not installed): explain Home Screen install once, before the first lesson. */
function maybeShowInstallGuide(next) {
  const info = platformInfo();
  if (info.ios && !info.standalone && !info.inApp && !progress.seenNotices.includes('ios-install')) {
    progress.seenNotices.push('ios-install');
    save();
    renderInstallGuide($('install-view'), info, { canPrompt: () => false, onInstall: promptInstall, onDone: next });
    showView('install-view', 'قبل أن تبدأ', null);
    return;
  }
  next();
}

function showNewCourseNotice(next) {
  if (!legacyFound || progress.seenNotices.includes('new-course')) { next(); return; }
  progress.seenNotices.push('new-course');
  save();
  showMessage(el('div', { class: 'text-right' },
    el('p', { class: 'font-bold mb-2', text: 'تحديث جديد للبرنامج' }),
    el('p', { class: 'text-base', text: 'صمّمنا المنهج من جديد للطلاب البالغين: أصوات حقيقية للحروف، وكلمات مفيدة مع معانيها، وتدريب على الفروق الصعبة للمتحدثين بالعربية.' }),
    el('p', { class: 'text-base mt-2', text: 'لأن الوحدات تغيّرت، يبدأ تقدّمك من جديد. إذا كنت تعرف أصوات الحروف فجرّب «اختبار تحديد المستوى».' })),
  [{ label: 'لنبدأ', onClick: next }]);
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
  showNewCourseNotice(showStartChoice);
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

// In-app browsers (Instagram, Facebook, TikTok...) can lose progress and can't install the app.
const banner = inAppBanner(platformInfo());
if (banner) $('landing-page').prepend(banner);

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
});

async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return !!choice && choice.outcome === 'accepted';
}

window.addEventListener('appinstalled', () => { deferredPrompt = null; });
