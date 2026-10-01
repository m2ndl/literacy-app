// app.js (ES module)
import { appData, getAchievements } from './data.js';
import { getDefaultProgress, validateProgress, shuffleArray, formatTime, getLearnedContent, computeStreak, pickDistractors, getPossibleActivities, isChunkComplete, buildQuestionSet, activityAccuracy, PASS_ACCURACY, resetProgress, liveStreak, courseProgress, nextStep, pickOptions } from './logic.js';
import { playItem, initSpeech, loadClipManifest, onAudioProblem } from './audio.js';
import { initSync, isSyncConfigured, getSyncState, hasAuthReturn, notifyProgressChanged, startSignIn, syncNow, signOut, deleteServerData } from './sync.js';

// -------------------- Constants --------------------
const PLAY_SVG = `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
  <path fill-rule="evenodd"
        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
        clip-rule="evenodd"></path>
</svg>`;

// English text for learners, with vowels marked. Arabic rarely writes short vowels, so a/e/i/o/u
// are the hardest part of reading English for these learners; they get one colour everywhere they
// are taught (never on answer buttons, where the colour would give answers away).
function vowelHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[aeiou]/gi, v => `<span class="vowel">${v}</span>`);
}

// Every activity type, in the order a lesson goes through them
const ACTIVITIES = {
  'sound-match': { name: 'مطابقة صوت الحروف', icon: '🔊', desc: 'استمع واختر الحرف المطابق.' },
  'capital-match': { name: 'مطابقة الحروف الكبيرة والصغيرة', icon: '🔠', desc: 'طابق بين الحروف الكبيرة والصغيرة.' },
  'combined-sound-match': { name: 'مطابقة أصوات الكلمات والمقاطع', icon: '🎧', desc: 'ميّز أصوات الكلمات والمقاطع.' },
  'word-build': { name: 'بناء الكلمات', icon: '🧩', desc: 'كوّن الكلمة بالترتيب الصحيح.' },
  'fill-in-the-blank': { name: 'إكمال الكلمة', icon: '✍️', desc: 'أكمل الحرف الناقص في الكلمة.' },
  'word-match': { name: 'مطابقة الكلمات', icon: '🔗', desc: 'استمع واختر الكلمة الصحيحة.' },
  'initial-sound': { name: 'أوجد الصوت الأول', icon: '🎯', desc: 'حدّد الصوت الأول في الكلمة.' },
  'sentence-build': { name: 'بناء الجمل', icon: '📝', desc: 'أكمل الجملة بالكلمة المناسبة.' }
};

// -------------------- Global State --------------------
let achievements = getAchievements(appData.chunks.length);

let userProgress = {
  unlockedChunk: 1,
  completedChunks: [],
  completedActivities: {},
  points: 0,
  streak: 0,
  lastLoginDate: null,
  earnedAchievements: [],
  timeSpent: 0,
  version: 2
};

let currentActivity = {};
let audioCtx = null;
let learningTimer = null;
let saveTimeout = null;
let achievementQueue = [];
let isShowingAchievement = false;

// -------------------- Audio Engine --------------------
function initAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('Audio context failed to initialize:', e);
    }
  }
}
function playSuccessSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (e) { console.error('Error playing success sound:', e); }
}
function playFailureSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(330, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.25);
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) { console.error('Error playing failure sound:', e); }
}

// -------------------- Persistence & Utilities --------------------
function debouncedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try { localStorage.setItem('literacyAppProgress', JSON.stringify(userProgress)); }
    catch (e) { console.warn('Cannot save progress (private browsing?):', e); }
  }, 1000);
}
function saveProgress() {
  debouncedSave();
  notifyProgressChanged();
}

function loadProgress() {
  try {
    const saved = localStorage.getItem('literacyAppProgress');
    if (saved) {
      const parsed = JSON.parse(saved);
      userProgress = validateProgress(parsed);
    }
  } catch (e) {
    console.error('Error loading progress:', e);
    userProgress = getDefaultProgress();
  }
}

function updateHeaderStats() {
  pointsDisplay.textContent = toArabicDigits(userProgress.points);
  streakDisplay.textContent = toArabicDigits(liveStreak(userProgress));
}

// The streak counts days on which the learner finished an activity, not days the app was opened
function recordLearningDay() {
  const updated = computeStreak(userProgress);
  userProgress.streak = updated.streak;
  userProgress.lastLoginDate = updated.lastLoginDate;
}

function startLearningTimer() {
  if (learningTimer) clearInterval(learningTimer);
  learningTimer = setInterval(() => {
    userProgress.timeSpent++;
    if (userProgress.timeSpent % 10 === 0) saveProgress();
  }, 1000);
}
function stopLearningTimer() {
  if (learningTimer) {
    clearInterval(learningTimer);
    learningTimer = null;
  }
  saveProgress();
}

// -------------------- Achievements --------------------
function checkAchievements() {
  achievements.forEach(ach => {
    if (!userProgress.earnedAchievements.includes(ach.id) && ach.condition(userProgress)) {
      userProgress.earnedAchievements.push(ach.id);
      achievementQueue.push(ach);
    }
  });
  // Badges wait for the results screen instead of interrupting an activity
  const answering = Boolean(currentActivity.questions) && !currentActivity.finished;
  if (!answering && !isShowingAchievement && achievementQueue.length > 0) showNextAchievement();
}
function showNextAchievement() {
  if (achievementQueue.length === 0) { isShowingAchievement = false; return; }
  isShowingAchievement = true;
  const ach = achievementQueue.shift();
  showAchievementUnlockedModal(ach);
}

// -------------------- DOM Refs --------------------
const landingPage = document.getElementById('landing-page');
const startLearningBtn = document.getElementById('start-learning-btn');
const appContainer = document.getElementById('app-container');
const mainTitle = document.getElementById('main-title');
const backButton = document.getElementById('back-button');
const dashboardView = document.getElementById('dashboard-view');
const lessonView = document.getElementById('lesson-view');
const activityView = document.getElementById('activity-view');
const achievementsView = document.getElementById('achievements-view');
const progressReportView = document.getElementById('progress-report-view');
const importantNoteView = document.getElementById('important-note-view');
const syncView = document.getElementById('sync-view');
const onboardingView = document.getElementById('onboarding-view');
const chunkGrid = document.getElementById('chunk-grid');
const messageModal = document.getElementById('message-modal');
const modalMessage = document.getElementById('modal-message');
const modalButtons = document.getElementById('modal-buttons');
const activityProgress = document.getElementById('activity-progress');
const menuButton = document.getElementById('menu-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const pointsDisplay = document.getElementById('points-display');
const streakDisplay = document.getElementById('streak-display');
const achievementUnlockedModal = document.getElementById('achievement-unlocked-modal');
const loadingIndicator = document.getElementById('loading-indicator');

// -------------------- View Switching --------------------
function showView(viewName) {
  document.body.classList.toggle('in-activity', viewName === 'activity' || viewName === 'onboarding');
  [dashboardView, lessonView, activityView, achievementsView, progressReportView, importantNoteView, syncView, onboardingView].forEach(v => v.classList.add('hidden'));
  backButton.classList.add('hidden');

  if (viewName === 'dashboard') {
    dashboardView.classList.remove('hidden');
    mainTitle.textContent = 'مسار التعلم';
  } else if (viewName === 'lesson' || viewName === 'activity') {
    backButton.classList.remove('hidden');
    if (viewName === 'lesson') lessonView.classList.remove('hidden'); else activityView.classList.remove('hidden');
  } else if (viewName === 'achievements') {
    achievementsView.classList.remove('hidden');
    backButton.classList.remove('hidden');
    mainTitle.textContent = 'الإنجازات';
  } else if (viewName === 'progress-report') {
    progressReportView.classList.remove('hidden');
    backButton.classList.remove('hidden');
    mainTitle.textContent = 'تقرير التقدم';
  } else if (viewName === 'important-note') {
    importantNoteView.classList.remove('hidden');
    backButton.classList.remove('hidden');
    mainTitle.textContent = 'ملاحظة مهمة';
  } else if (viewName === 'onboarding') {
    onboardingView.classList.remove('hidden');
  } else if (viewName === 'sync') {
    syncView.classList.remove('hidden');
    backButton.classList.remove('hidden');
    mainTitle.textContent = 'حفظ التقدم على كل أجهزتك';
  }
}

// -------------------- Navigation (browser history) --------------------
// Every screen gets a history entry, so the phone's back button and the header back button
// both go up one level (activity → lesson → home) instead of leaving the app.
let leaveConfirmOpen = false;

function navigate(state) {
  history.pushState(state, '');
  renderRoute(state);
  window.scrollTo(0, 0);
  mainTitle.focus({ preventScroll: true });
}

function isChunkOpen(chunkId) {
  return appData.chunks.some(c => c.id === chunkId) && chunkId <= userProgress.unlockedChunk;
}

function isActivityLive(chunkId) {
  return Boolean(currentActivity.questions) && !currentActivity.finished && currentActivity.chunkId === chunkId;
}

// True once the learner has answered something, so leaving would throw work away
function isActivityInProgress() {
  return Boolean(currentActivity.questions) && !currentActivity.finished &&
    (currentActivity.currentIndex > 0 || currentActivity.questionsWithErrors.size > 0 || answerChecked);
}

function renderRoute(state) {
  dropdownMenu.classList.add('hidden');
  messageModal.classList.add('hidden');
  leaveConfirmOpen = false;
  const view = state?.view;

  if ((view === 'lesson' || view === 'activity') && isChunkOpen(state.chunkId)) {
    if (view === 'activity' && isActivityLive(state.chunkId)) {
      mainTitle.textContent = 'نشاط';
      showView('activity');
      return;
    }
    // An activity that ended can't be reopened from history; show its lesson instead
    if (view === 'activity') history.replaceState({ view: 'lesson', chunkId: state.chunkId }, '');
    showLesson(state.chunkId);
  } else if (view === 'achievements') {
    renderAchievementsPage();
  } else if (view === 'progress-report') {
    renderProgressReportPage();
  } else if (view === 'important-note') {
    renderImportantNotePage();
  } else if (view === 'onboarding' && onboarding) {
    showView('onboarding');
  } else if (view === 'sync' && isSyncConfigured()) {
    renderSyncPage();
    showView('sync');
  } else {
    renderDashboard();
    showView('dashboard');
  }
}

function confirmLeaveActivity() {
  leaveConfirmOpen = true;
  showConfirmationModal('هل تريد الخروج من النشاط؟ لن يُحفظ تقدّمك فيه.', () => {
    leaveConfirmOpen = false;
    currentActivity.finished = true;
    history.back();
  }, { confirmText: 'خروج', cancelText: 'متابعة النشاط', onCancel: () => { leaveConfirmOpen = false; } });
}

function goBack() {
  if (!activityView.classList.contains('hidden') && isActivityInProgress()) {
    confirmLeaveActivity();
    return;
  }
  history.back();
}

window.addEventListener('popstate', (event) => {
  if (appContainer.classList.contains('hidden')) return; // still on the landing page
  if (finishingOnboarding) {
    // The first-run entry is gone; open the home screen in its place
    const then = finishingOnboarding;
    finishingOnboarding = null;
    history.replaceState({ view: 'dashboard' }, '');
    renderRoute({ view: 'dashboard' });
    then();
    return;
  }
  if (!onboardingView.classList.contains('hidden')) {
    // Back steps through the first-run screens; on the first one it leaves as usual
    if (onboardingBack()) history.pushState({ view: 'onboarding' }, '');
    else history.back();
    return;
  }
  const leavingActivity = !activityView.classList.contains('hidden') && event.state?.view !== 'activity';
  if (leavingActivity && isActivityInProgress()) {
    if (leaveConfirmOpen) {
      // Back pressed again while we're asking: treat it as "leave"
      currentActivity.finished = true;
    } else {
      // Undo the browser's step back and ask first
      history.pushState({ view: 'activity', chunkId: currentActivity.chunkId }, '');
      confirmLeaveActivity();
      return;
    }
  }
  renderRoute(event.state);
});

// -------------------- Rendering --------------------
function renderDashboard() {
  updateSyncPrompt();
  renderContinueCard();
  chunkGrid.innerHTML = '';
  appData.chunks.forEach(chunk => {
    const isLocked = chunk.id > userProgress.unlockedChunk;
    const isCompleted = userProgress.completedChunks.includes(chunk.id);
    const possible = getPossibleActivities(chunk);
    const completed = userProgress.completedActivities[chunk.id] || [];
    const done = possible.filter(a => completed.includes(a)).length;
    const percent = possible.length ? Math.round((done / possible.length) * 100) : 0;
    const sightWords = chunk.sightWords || [];
    const sample = (chunk.words || []).filter(w => !sightWords.includes(w)).slice(0, 3);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `chunk-card w-full p-6 border-2 rounded-xl shadow-sm text-right ${isLocked ? 'locked' : 'cursor-pointer'} ${isCompleted ? 'completed' : 'bg-white'}`;
    if (isLocked) card.disabled = true;
    else card.addEventListener('click', () => navigate({ view: 'lesson', chunkId: chunk.id }));

    const statusIcon = isLocked
      ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
      : isCompleted
      ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z';
    const iconColor = isLocked ? 'text-gray-400' : isCompleted ? 'text-green-600' : 'text-blue-500';
    const hasLetters = chunk.letters && chunk.letters.length > 0;
    const status = isLocked ? 'أكمل المجموعة السابقة لفتحها' : `${toArabicDigits(done)} من ${toArabicDigits(possible.length)} أنشطة`;

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <span class="text-sm font-semibold text-gray-500">${chunk.title}</span>
        <svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${statusIcon}"></path>
        </svg>
      </div>
      ${hasLetters
        ? `<p class="text-3xl font-bold mt-2 text-gray-800 english-content tracking-wider" lang="en">${vowelHtml(chunk.letters.join(' '))}</p>`
        : `<p class="text-2xl font-bold mt-2 text-gray-800">مراجعة</p>`}
      ${sample.length ? `<p class="mt-2 text-sm text-gray-600">ستقرأ: <span dir="ltr" lang="en" class="font-semibold">${vowelHtml(sample.join(', '))}</span></p>` : ''}
      <div class="mt-4 flex items-center gap-3">
        <div class="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden" aria-hidden="true"><div class="h-full rounded-full bg-green-500" style="width:${percent}%"></div></div>
        <span class="text-xs text-gray-500">${status}</span>
      </div>`;

    chunkGrid.appendChild(card);
  });
}

// One clear next step at the top of the home screen
function renderContinueCard() {
  const { done, total } = courseProgress(userProgress.completedActivities);
  document.getElementById('course-progress-bar').style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
  document.getElementById('course-progress-label').textContent = `أنجزت ${toArabicDigits(done)} من ${toArabicDigits(total)} نشاطاً`;

  const step = nextStep(userProgress);
  const button = document.getElementById('continue-btn');
  if (step) {
    const chunk = appData.chunks.find(c => c.id === step.chunkId);
    document.getElementById('continue-eyebrow').textContent = done === 0 ? 'ابدأ من هنا' : 'تابع التعلّم';
    document.getElementById('continue-title').textContent = ACTIVITIES[step.activityId].name;
    document.getElementById('continue-subtitle').textContent = chunk.title;
    button.textContent = done === 0 ? 'ابدأ' : 'تابع';
    button.classList.remove('hidden');
    button.onclick = () => {
      navigate({ view: 'lesson', chunkId: step.chunkId });
      startActivity(step.chunkId, step.activityId);
    };
  } else {
    document.getElementById('continue-eyebrow').textContent = 'أحسنت!';
    document.getElementById('continue-title').textContent = 'أكملت كل المجموعات 🎉';
    document.getElementById('continue-subtitle').textContent = 'راجع أي مجموعة متى شئت لتثبيت ما تعلّمته.';
    button.classList.add('hidden');
  }
}

function showLesson(chunkId) {
  const chunk = appData.chunks.find(c => c.id === chunkId);
  if (!chunk) return;

  mainTitle.textContent = chunk.title;

  const createSoundButton = (text, pronunciation, kind) => {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center';

    const mainBtn = document.createElement('button');
    // min-w + padding lets long words ("Hamad") grow instead of spilling out of the tile
    mainBtn.className = 'text-2xl font-bold bg-blue-100 text-blue-800 min-w-16 h-16 px-3 rounded-lg flex items-center justify-center hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500';
    mainBtn.innerHTML = vowelHtml(text);
    mainBtn.lang = 'en';
    let isPlaying = false;
    mainBtn.onclick = () => {
      if (!isPlaying) {
        isPlaying = true;
        playItem(pronunciation || text, { kind });
        setTimeout(() => { isPlaying = false; }, 300);
      }
    };

    const slowBtn = document.createElement('button');
    slowBtn.className = 'slow-btn mt-1';
    slowBtn.innerHTML = '<span aria-hidden="true">🐢</span> بطيء';
    slowBtn.setAttribute('aria-label', 'استمع ببطء');
    let isPlayingSlow = false;
    slowBtn.onclick = (e) => {
      e.stopPropagation();
      if (!isPlayingSlow) {
        isPlayingSlow = true;
        playItem(pronunciation || text, { slow: true, kind });
        setTimeout(() => { isPlayingSlow = false; }, 500);
      }
    };

    container.appendChild(mainBtn);
    container.appendChild(slowBtn);
    return container;
  };

  const lettersContainer = document.getElementById('lesson-letters');
  lettersContainer.innerHTML = '';

  if (chunk.letters && chunk.letters.length > 0) {
    chunk.letters.forEach(l => lettersContainer.appendChild(createSoundButton(l.toUpperCase() + l, l, 'letter')));
  } else {
    lettersContainer.innerHTML = '<p class="text-gray-500">مراجعة - لا توجد حروف جديدة</p>';
  }

  const sightWords = chunk.sightWords || [];
  const wordsContainer = document.getElementById('lesson-words');
  wordsContainer.innerHTML = '';
  (chunk.words || []).filter(w => !sightWords.includes(w)).forEach(w => wordsContainer.appendChild(createSoundButton(w)));

  // Heart words can't be sounded out letter by letter, so they're taught as whole words
  const sightContainer = document.getElementById('lesson-sight-words');
  sightContainer.innerHTML = '';
  sightWords.forEach(w => sightContainer.appendChild(createSoundButton(w, w, 'word')));
  document.getElementById('lesson-sight-section').classList.toggle('hidden', sightWords.length === 0);

  renderActivities(chunkId);
  renderLessonStartButton(chunk);
  showView('lesson');
}

// One button that runs the lesson's activities in order
function renderLessonStartButton(chunk) {
  const order = getPossibleActivities(chunk);
  const completed = userProgress.completedActivities[chunk.id] || [];
  const next = order.find(a => !completed.includes(a));
  const btn = document.getElementById('lesson-start-btn');
  btn.textContent = !next ? 'راجع الدرس من البداية'
    : completed.length === 0 ? 'ابدأ الدرس'
    : `تابع الدرس: ${ACTIVITIES[next].name}`;
  btn.onclick = () => startActivity(chunk.id, next || order[0]);
}

function renderActivities(chunkId) {
  const container = document.getElementById('activities-container');
  container.innerHTML = '';
  const chunk = appData.chunks.find(c => c.id === chunkId);
  const activities = getPossibleActivities(chunk).map(id => ({ id, name: ACTIVITIES[id].name }));

  container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5';
  const completed = userProgress.completedActivities[chunkId] || [];

  activities.forEach(activity => {
    const isCompleted = completed.includes(activity.id);
    const meta = ACTIVITIES[activity.id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `activity-btn ${isCompleted ? 'activity-btn-complete' : 'activity-btn-default'}`;
    btn.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="text-right">
          <h4 class="text-lg font-bold leading-7">${meta.name}</h4>
          <p class="mt-1 text-sm text-gray-500 font-medium">${meta.desc}</p>
        </div>
        <span class="activity-icon" aria-hidden="true">${meta.icon}</span>
      </div>
      <div class="mt-4 flex items-center justify-between text-sm">
        <span class="activity-chip">${isCompleted ? 'مكتمل ✓' : 'ابدأ'}</span>
      </div>`;
    btn.onclick = () => startActivity(chunkId, activity.id);
    container.appendChild(btn);
  });
}

// -------------------- Modals & Pages --------------------
const BUTTON_STYLES = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg',
  secondary: 'bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg',
  danger: 'bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg'
};

// buttons: [{ label, variant, id?, focus?, onClick? }]; every button closes the modal first
function openModal(message, buttons, details = null) {
  modalMessage.textContent = message;
  modalButtons.innerHTML = '';
  if (details) modalButtons.appendChild(details);
  const row = document.createElement('div');
  row.className = 'flex flex-wrap justify-center gap-3';
  let focusTarget = null;
  buttons.forEach(({ label, variant = 'primary', id, focus, onClick }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    if (id) btn.id = id;
    btn.className = BUTTON_STYLES[variant];
    btn.textContent = label;
    btn.onclick = () => { messageModal.classList.add('hidden'); if (onClick) onClick(); };
    row.appendChild(btn);
    if (focus) focusTarget = btn;
  });
  modalButtons.appendChild(row);
  messageModal.classList.remove('hidden');
  (focusTarget || row.firstElementChild)?.focus();
}

function showConfirmationModal(message, onConfirm, { confirmText = 'تأكيد', cancelText = 'إلغاء', onCancel } = {}) {
  openModal(message, [
    { label: cancelText, variant: 'secondary', id: 'modal-cancel-btn', onClick: onCancel },
    { label: confirmText, variant: 'danger', id: 'modal-confirm-btn', onClick: onConfirm }
  ]);
}

function toArabicDigits(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// Which clip to play for an activity item: letter pairs ("do") are not the same as words ("do")
function itemKind(item, chunk, activityType) {
  if (typeof item !== 'string') return 'sentence';
  if (activityType === 'sound-match' || activityType === 'capital-match') return 'letter';
  if (activityType === 'combined-sound-match' && !(chunk.words || []).includes(item)) {
    return item.length === 1 ? 'letter' : 'pair';
  }
  return 'word';
}

function renderAchievementsPage() {
  const grid = document.getElementById('achievements-grid');
  grid.innerHTML = '';
  achievements.forEach(ach => {
    const earned = userProgress.earnedAchievements.includes(ach.id);
    const card = document.createElement('div');
    card.className = `achievement-card text-center p-4 bg-white rounded-lg shadow-sm border ${earned ? 'border-yellow-400' : 'locked'}`;
    card.innerHTML = `
      <div class="w-16 h-16 mx-auto mb-3">${ach.icon}</div>
      <h4 class="font-bold text-gray-800">${ach.name}</h4>
      <p class="text-sm text-gray-500">${ach.description}</p>`;
    grid.appendChild(card);
  });
  showView('achievements');
}

function renderProgressReportPage() {
  document.getElementById('report-points').textContent = toArabicDigits(userProgress.points);
  document.getElementById('report-streak').textContent = toArabicDigits(liveStreak(userProgress));
  document.getElementById('report-time').textContent = toArabicDigits(formatTime(userProgress.timeSpent));

  const masteredLetters = new Set();
  userProgress.completedChunks.forEach(chunkId => {
    const chunk = appData.chunks.find(c => c.id === chunkId);
    if (chunk && chunk.letters) chunk.letters.forEach(l => masteredLetters.add(l));
  });

  const arr = Array.from(masteredLetters).sort();
  document.getElementById('report-letters-count').textContent = toArabicDigits(arr.length);
  const lettersGrid = document.getElementById('report-letters-grid');
  lettersGrid.innerHTML = '';
  if (arr.length === 0) {
    lettersGrid.innerHTML = `<p class="text-gray-500">لم تتقن أي حروف بعد. أكمل المجموعة الأولى للبدء!</p>`;
  } else {
    arr.forEach(letter => {
      const el = document.createElement('span');
      el.className = 'w-12 h-12 flex items-center justify-center bg-green-100 text-green-800 font-bold text-2xl rounded-md';
      el.innerHTML = vowelHtml(letter);
      lettersGrid.appendChild(el);
    });
  }
  showView('progress-report');
}

function renderImportantNotePage() {
  showView('important-note');
}

function showAchievementUnlockedModal(achievement) {
  document.getElementById('achievement-icon').innerHTML = achievement.icon;
  document.getElementById('achievement-name').textContent = achievement.name;
  document.getElementById('achievement-desc').textContent = achievement.description;
  achievementUnlockedModal.classList.remove('hidden');
}

// -------------------- Activity Engine --------------------
// Each question type draws itself into the activity card and returns
//   { audio, autoplay, display, hint, isCorrect(answer), mark(answer, correct) }
// The learner picks or builds an answer (setAnswer), then presses "Check". A feedback panel says
// whether it was right and shows the right answer with its sound. Nothing counts before "Check",
// and a wrong answer is never retried by guessing: it comes back once at the end instead.
const activityContent = document.getElementById('activity-content');
const checkButton = document.getElementById('check-btn');
const feedbackPanel = document.getElementById('feedback');
let currentQuestion = null;
let selectedAnswer = null;
let answerChecked = false;
let replayTimer = null; // replays the right answer after a mistake; cancelled when moving on

// replace: true restarts in place (the "try again" button) instead of adding a history entry
function startActivity(chunkId, activityType, { replace = false } = {}) {
  const chunk = appData.chunks.find(c => c.id === chunkId);
  let questions = [];
  if (activityType === 'sound-match' || activityType === 'capital-match') {
    questions = chunk.letters || [];
  } else if (activityType === 'combined-sound-match') {
    questions = [...(chunk.words || []), ...(chunk.letterPairs || [])];
  } else if (activityType === 'sentence-build') {
    questions = chunk.sentences || [];
  } else {
    questions = chunk.words || [];
  }
  if (questions.length === 0) {
    openModal('لا توجد أسئلة لهذا النشاط.', [{ label: 'حسناً' }]);
    return;
  }

  currentActivity = {
    chunkId,
    activityType,
    questions: buildQuestionSet(questions),
    currentIndex: 0,
    originalQuestionCount: 0,
    questionsWithErrors: new Set(),
    requeuedFromIndex: new Set(),
    pointsEarned: 0,
    finished: false
  };
  currentActivity.originalQuestionCount = currentActivity.questions.length;

  const state = { view: 'activity', chunkId };
  if (replace) history.replaceState(state, ''); else history.pushState(state, '');
  document.getElementById('activity-title').textContent = ACTIVITIES[activityType].name;
  showView('activity');
  window.scrollTo(0, 0);
  displayCurrentQuestion();
}

function setAnswer(value) {
  if (answerChecked) return;
  selectedAnswer = value;
  checkButton.disabled = value === null || value === undefined;
}

function updateActivityProgress(done) {
  const { currentIndex, questions } = currentActivity;
  const percent = done ? 100 : Math.round((currentIndex / questions.length) * 100);
  document.getElementById('activity-progress-fill').style.width = `${percent}%`;
  document.getElementById('activity-progressbar').setAttribute('aria-valuenow', String(percent));
  activityProgress.textContent = done ? '' : `${toArabicDigits(currentIndex + 1)} من ${toArabicDigits(questions.length)}`;
}

function displayCurrentQuestion() {
  const { questions, currentIndex, activityType, chunkId } = currentActivity;
  const chunk = appData.chunks.find(c => c.id === chunkId);
  updateActivityProgress(false);
  feedbackPanel.classList.add('hidden');
  checkButton.classList.remove('hidden');
  checkButton.disabled = true;
  selectedAnswer = null;
  answerChecked = false;
  clearTimeout(replayTimer);
  activityContent.innerHTML = '';
  currentQuestion = QUESTION_TYPES[activityType](questions[currentIndex], activityContent, chunk);
  if (currentQuestion.autoplay && currentQuestion.audio) playQuestionAudio();
}

function playQuestionAudio(slow = false) {
  const { text, kind } = currentQuestion.audio;
  playItem(text, { slow, kind });
}

function checkAnswer() {
  if (answerChecked || selectedAnswer === null || !currentQuestion) return;
  answerChecked = true;
  checkButton.disabled = true;
  const correct = currentQuestion.isCorrect(selectedAnswer);
  currentQuestion.mark(selectedAnswer, correct);
  activityContent.querySelectorAll('.option-btn, .letter-slot').forEach(el => { el.disabled = true; el.style.pointerEvents = 'none'; });

  if (correct) {
    playSuccessSound();
    userProgress.points += 5;
    currentActivity.pointsEarned += 5;
    updateHeaderStats();
  } else {
    playFailureSound();
    recordMistake();
    // Let the learner hear the right answer
    if (currentQuestion.audio) replayTimer = setTimeout(() => playQuestionAudio(), 450);
  }
  showFeedback(correct);
  checkAchievements();
  saveProgress();
}

// Only a question's first appearance counts toward the score, and it comes back once at the end
function recordMistake() {
  const idx = currentActivity.currentIndex;
  if (idx >= currentActivity.originalQuestionCount) return;
  currentActivity.questionsWithErrors.add(idx);
  if (!currentActivity.requeuedFromIndex.has(idx)) {
    currentActivity.requeuedFromIndex.add(idx);
    currentActivity.questions.push(currentActivity.questions[idx]);
  }
}

const PRAISE = ['أحسنت!', 'صحيح!', 'ممتاز!', 'رائع!'];

function showFeedback(correct) {
  checkButton.classList.add('hidden');
  feedbackPanel.classList.remove('hidden', 'feedback-correct', 'feedback-wrong');
  feedbackPanel.classList.add(correct ? 'feedback-correct' : 'feedback-wrong');
  document.getElementById('feedback-title').textContent = correct
    ? PRAISE[Math.floor(Math.random() * PRAISE.length)]
    : 'الإجابة الصحيحة:';
  document.getElementById('feedback-answer').innerHTML = vowelHtml(currentQuestion.display);
  document.getElementById('feedback-replay').classList.toggle('hidden', !currentQuestion.audio);
  const hint = document.getElementById('feedback-hint');
  hint.textContent = currentQuestion.hint || '';
  hint.classList.toggle('hidden', !currentQuestion.hint);
  const continueBtn = document.getElementById('feedback-continue');
  continueBtn.textContent = currentActivity.currentIndex >= currentActivity.questions.length - 1 ? 'عرض النتيجة' : 'متابعة';
  continueBtn.focus({ preventScroll: true });
  feedbackPanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function continueActivity() {
  if (!answerChecked) return;
  if (currentActivity.currentIndex >= currentActivity.questions.length - 1) {
    finishActivity();
  } else {
    currentActivity.currentIndex++;
    displayCurrentQuestion();
  }
}

function finishActivity() {
  clearTimeout(replayTimer);
  currentActivity.finished = true;
  const { chunkId, activityType, originalQuestionCount, questionsWithErrors, questions } = currentActivity;
  const accuracy = activityAccuracy(originalQuestionCount, questionsWithErrors.size);
  const passed = accuracy >= PASS_ACCURACY;
  let headline = '';

  if (passed) {
    recordLearningDay();
    if (!userProgress.completedActivities[chunkId]) userProgress.completedActivities[chunkId] = [];
    if (!userProgress.completedActivities[chunkId].includes(activityType)) {
      userProgress.completedActivities[chunkId].push(activityType);
    }
    headline = 'اكتمل النشاط!';
    if (isChunkComplete(chunkId, userProgress.completedActivities) && !userProgress.completedChunks.includes(chunkId)) {
      userProgress.completedChunks.push(chunkId);
      // Unlock by array order (works even if IDs skip numbers)
      const nextChunk = appData.chunks[appData.chunks.findIndex(c => c.id === chunkId) + 1];
      if (userProgress.unlockedChunk === chunkId && nextChunk) {
        userProgress.unlockedChunk = nextChunk.id;
        headline = `أكملت الدرس وفتحت ${nextChunk.title}!`;
      } else {
        headline = 'أكملت الدرس كله!';
      }
    }
  }

  updateHeaderStats();
  saveProgress();
  renderResults({ passed, accuracy, headline, missed: [...questionsWithErrors].map(i => questions[i]) });
  checkAchievements();
}

// The next unfinished activity in this lesson; when the lesson is done, the next open group
function nextActivityAfter(chunkId, activityType) {
  const chunk = appData.chunks.find(c => c.id === chunkId);
  const order = getPossibleActivities(chunk);
  const completed = userProgress.completedActivities[chunkId] || [];
  const start = order.indexOf(activityType);
  for (let i = 1; i <= order.length; i++) {
    const id = order[(start + i) % order.length];
    if (!completed.includes(id)) return { chunkId, activityId: id };
  }
  return nextStep(userProgress, chunkId);
}

function renderResults({ passed, accuracy, headline, missed }) {
  const { chunkId, activityType, pointsEarned } = currentActivity;
  const chunk = appData.chunks.find(c => c.id === chunkId);
  checkButton.classList.add('hidden');
  feedbackPanel.classList.add('hidden');
  updateActivityProgress(true);

  activityContent.innerHTML = `
    <div class="w-full max-w-md flex flex-col gap-5 items-center">
      <div class="text-6xl" aria-hidden="true">${passed ? '🎉' : '💪'}</div>
      <h3 id="results-title" class="text-2xl font-bold text-gray-900 focus:outline-none" tabindex="-1"></h3>
      <div class="flex justify-center gap-3 flex-wrap">
        <div class="result-stat"><div class="text-sm text-gray-500">الدقة</div><div class="text-2xl font-bold ${passed ? 'text-green-600' : 'text-orange-500'}">${toArabicDigits(accuracy)}٪</div></div>
        <div class="result-stat"><div class="text-sm text-gray-500">النقاط</div><div class="text-2xl font-bold text-yellow-500">+${toArabicDigits(pointsEarned)}</div></div>
      </div>
      <div id="results-review" class="w-full hidden">
        <p class="text-sm text-gray-600 mb-2"></p>
        <div class="flex flex-wrap justify-center gap-2" dir="ltr" lang="en"></div>
      </div>
      <div id="results-actions" class="w-full flex flex-col gap-3"></div>
    </div>`;

  document.getElementById('results-title').textContent = passed
    ? headline
    : `قاربت! حصلت على ${toArabicDigits(accuracy)}٪، وتحتاج ${toArabicDigits(PASS_ACCURACY)}٪ للنجاح.`;

  // What to review: tap to hear each one again
  const review = document.getElementById('results-review');
  const shown = new Set();
  missed.forEach(item => {
    const text = typeof item === 'string' ? item : item.text;
    const kind = itemKind(item, chunk, activityType);
    const display = kind === 'letter' ? text.toUpperCase() + text.toLowerCase() : text;
    if (shown.has(display)) return;
    shown.add(display);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'bg-blue-100 text-blue-800 font-bold text-xl px-3 py-1 rounded-lg hover:bg-blue-200';
    chip.innerHTML = vowelHtml(display);
    chip.onclick = () => playItem(text, { kind });
    review.lastElementChild.appendChild(chip);
  });
  if (shown.size) {
    review.firstElementChild.textContent = passed ? 'راجع هذه لاحقاً (اضغط لتسمعها):' : 'راجع هذه ثم حاول مرة أخرى (اضغط لتسمعها):';
    review.classList.remove('hidden');
  }

  const actions = document.getElementById('results-actions');
  const addButton = (label, variant, onClick) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `big-btn ${variant === 'primary' ? 'big-btn-primary' : 'big-btn-secondary'}`;
    btn.textContent = label;
    btn.onclick = onClick;
    actions.appendChild(btn);
    return btn;
  };
  if (passed) {
    const next = nextActivityAfter(chunkId, activityType);
    if (next && next.chunkId === chunkId) {
      addButton(`النشاط التالي: ${ACTIVITIES[next.activityId].name}`, 'primary', () => startActivity(chunkId, next.activityId, { replace: true }));
    } else if (next) {
      const nextChunk = appData.chunks.find(c => c.id === next.chunkId);
      addButton(`ابدأ ${nextChunk.title}`, 'primary', () => {
        history.replaceState({ view: 'lesson', chunkId: next.chunkId }, '');
        startActivity(next.chunkId, next.activityId);
      });
    }
    addButton('العودة للدرس', next ? 'secondary' : 'primary', () => history.back());
  } else {
    addButton('أعد المحاولة', 'primary', () => startActivity(chunkId, activityType, { replace: true }));
    addButton('العودة للدرس', 'secondary', () => history.back());
  }
  document.getElementById('results-title').focus({ preventScroll: true });
}

// -------------------- Question types --------------------
function soundControlsHtml() {
  return `
    <div class="flex flex-col items-center gap-1">
      <button type="button" data-play class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full" aria-label="استمع">${PLAY_SVG}</button>
      <button type="button" data-play-slow class="slow-btn" aria-label="استمع ببطء"><span aria-hidden="true">🐢</span> بطيء</button>
    </div>`;
}

function wireSoundControls(container) {
  container.querySelector('[data-play]')?.addEventListener('click', () => playQuestionAudio(false));
  container.querySelector('[data-play-slow]')?.addEventListener('click', () => playQuestionAudio(true));
}

// Answer buttons: tapping one selects it (tap another to change your mind) until "Check"
function renderOptions(container, options, { size = 'letter' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap justify-center gap-4 mt-2';
  wrap.dir = 'ltr';
  wrap.lang = 'en';
  const buttons = options.map(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `option-btn ${size === 'letter' ? 'option-letter' : 'option-word'}`;
    btn.textContent = value;
    btn.setAttribute('aria-pressed', 'false');
    btn.onclick = () => {
      buttons.forEach(b => { b.classList.remove('option-selected'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('option-selected');
      btn.setAttribute('aria-pressed', 'true');
      setAnswer(value);
    };
    wrap.appendChild(btn);
    return btn;
  });
  container.appendChild(wrap);
  return {
    mark(selected, correctValue) {
      buttons.forEach((b, i) => {
        b.classList.remove('option-selected');
        if (options[i] === correctValue) b.classList.add('option-correct');
        else if (options[i] === selected) b.classList.add('option-wrong');
      });
    }
  };
}

function promptHtml(text) {
  return `<p class="text-xl mb-5">${text}</p>`;
}

// The same letter in the case it has in the word (so "Hamad" asks for "H", not "h")
function inCaseOf(letter, sample) {
  return sample === sample.toUpperCase() ? letter.toUpperCase() : letter.toLowerCase();
}

// A word with one letter replaced by a blank, as LTR English markup
function wordWithBlank(word, index) {
  return `${vowelHtml(word.slice(0, index))}<span class="text-blue-500">_</span>${vowelHtml(word.slice(index + 1))}`;
}

const QUESTION_TYPES = {
  'sound-match': (letter, container, chunk) => {
    const options = pickOptions(letter, chunk.letters, getLearnedContent(chunk.id, 'letters'));
    container.innerHTML = promptHtml('استمع واختر الحرف الذي تسمعه.') + `<div class="mb-6">${soundControlsHtml()}</div>`;
    wireSoundControls(container);
    const opts = renderOptions(container, options);
    return {
      audio: { text: letter, kind: 'letter' }, autoplay: true, display: letter.toUpperCase() + letter,
      isCorrect: v => v === letter, mark: (v) => opts.mark(v, letter)
    };
  },

  'combined-sound-match': (item, container, chunk) => {
    const words = chunk.words || [];
    const isWord = words.includes(item);
    const pool = isWord ? words : (chunk.letterPairs || []);
    const kind = itemKind(item, chunk, 'combined-sound-match');
    const options = pickOptions(item, pool);
    container.innerHTML = promptHtml('استمع واختر ما تسمعه.') + `<div class="mb-6">${soundControlsHtml()}</div>`;
    wireSoundControls(container);
    const opts = renderOptions(container, options, { size: isWord ? 'word' : 'letter' });
    return {
      audio: { text: item, kind }, autoplay: true, display: item,
      isCorrect: v => v === item, mark: (v) => opts.mark(v, item)
    };
  },

  'capital-match': (letter, container, chunk) => {
    const showUpper = Math.random() < 0.5;
    const shown = showUpper ? letter.toUpperCase() : letter.toLowerCase();
    const correct = showUpper ? letter.toLowerCase() : letter.toUpperCase();
    const toCase = l => (showUpper ? l.toLowerCase() : l.toUpperCase());
    const options = pickOptions(correct, chunk.letters.map(toCase), getLearnedContent(chunk.id, 'letters').map(toCase));
    container.innerHTML = promptHtml(showUpper ? 'اختر الحرف الصغير لهذا الحرف.' : 'اختر الحرف الكبير لهذا الحرف.') + `
      <div class="flex items-center justify-center gap-6 mb-6">
        <div class="text-8xl font-bold english-content" lang="en">${vowelHtml(shown)}</div>
        ${soundControlsHtml()}
      </div>`;
    wireSoundControls(container);
    const opts = renderOptions(container, options);
    return {
      audio: { text: letter, kind: 'letter' }, autoplay: false, display: letter.toUpperCase() + letter.toLowerCase(),
      isCorrect: v => v === correct, mark: (v) => opts.mark(v, correct)
    };
  },

  'word-match': (word, container, chunk) => {
    const learned = getLearnedContent(chunk.id, 'words');
    const similar = learned.filter(w => Math.abs(w.length - word.length) <= 1);
    const options = pickOptions(word, similar, learned);
    container.innerHTML = promptHtml('استمع واختر الكلمة التي تسمعها.') + `<div class="mb-6">${soundControlsHtml()}</div>`;
    wireSoundControls(container);
    const opts = renderOptions(container, options, { size: 'word' });
    return {
      audio: { text: word, kind: 'word' }, autoplay: true, display: word,
      isCorrect: v => v === word, mark: (v) => opts.mark(v, word)
    };
  },

  'fill-in-the-blank': (word, container, chunk) => {
    // Vowels are the hardest part for Arabic readers, so ask for a missing vowel more often
    const vowelIndexes = [...word].map((ch, i) => ('aeiou'.includes(ch.toLowerCase()) ? i : -1)).filter(i => i >= 0);
    const index = vowelIndexes.length && Math.random() < 0.6
      ? vowelIndexes[Math.floor(Math.random() * vowelIndexes.length)]
      : Math.floor(Math.random() * word.length);
    const missing = word[index];
    const learned = getLearnedContent(chunk.id, 'letters').map(l => inCaseOf(l, missing));
    const preferred = 'aeiou'.includes(missing.toLowerCase())
      ? learned.filter(l => 'aeiou'.includes(l.toLowerCase()))
      : chunk.letters.map(l => inCaseOf(l, missing));
    const options = pickOptions(missing, preferred, learned);
    container.innerHTML = promptHtml('استمع للكلمة واختر الحرف الناقص.') + `
      <div class="flex items-center justify-center gap-5 mb-6">
        ${soundControlsHtml()}
        <p class="text-5xl font-bold tracking-widest english-content" lang="en">${wordWithBlank(word, index)}</p>
      </div>`;
    wireSoundControls(container);
    const opts = renderOptions(container, options);
    return {
      audio: { text: word, kind: 'word' }, autoplay: true, display: word,
      isCorrect: v => v === missing, mark: (v) => opts.mark(v, missing)
    };
  },

  'initial-sound': (word, container, chunk) => {
    const first = word[0];
    const learned = getLearnedContent(chunk.id, 'letters').map(l => inCaseOf(l, first));
    const options = pickOptions(first, chunk.letters.map(l => inCaseOf(l, first)), learned);
    container.innerHTML = promptHtml('استمع واختر الحرف الأول من الكلمة.') + `
      <div class="flex items-center justify-center gap-5 mb-6">
        ${soundControlsHtml()}
        <p class="text-5xl font-bold tracking-widest english-content" lang="en">${wordWithBlank(word, 0)}</p>
      </div>`;
    wireSoundControls(container);
    const opts = renderOptions(container, options);
    return {
      audio: { text: word, kind: 'word' }, autoplay: true, display: word,
      isCorrect: v => v === first, mark: (v) => opts.mark(v, first)
    };
  },

  'word-build': (word, container) => {
    const letters = shuffleArray(word.split(''));
    // Tiles shrink to fit the card: up to 4rem each, never wider than the screen allows
    const columns = `grid-template-columns: repeat(${word.length}, minmax(0, 4rem))`;
    container.innerHTML = promptHtml('استمع للكلمة ثم كوّنها من هذه الحروف.') + `
      <div class="mb-6">${soundControlsHtml()}</div>
      <div class="grid justify-center gap-2 w-full mb-6 english-content" lang="en" style="${columns}" data-slots>
        ${word.split('').map((_, i) => `<button type="button" class="letter-slot aspect-square w-full" data-index="${i}" aria-label="خانة ${toArabicDigits(i + 1)}"></button>`).join('')}
      </div>
      <div class="grid justify-center gap-2 w-full english-content" lang="en" style="${columns}" data-tiles>
        ${letters.map((l, i) => `<button type="button" class="option-btn letter-tile" data-tile="${i}">${l}</button>`).join('')}
      </div>`;
    wireSoundControls(container);

    const slots = [...container.querySelectorAll('.letter-slot')];
    const tiles = [...container.querySelectorAll('.letter-tile')];
    const built = Array(word.length).fill(null); // tile index in each slot
    const update = () => {
      slots.forEach((slot, i) => {
        slot.textContent = built[i] === null ? '' : letters[built[i]];
        slot.classList.toggle('filled', built[i] !== null);
      });
      tiles.forEach((tile, i) => tile.classList.toggle('used', built.includes(i)));
      setAnswer(built.includes(null) ? null : built.map(i => letters[i]).join(''));
    };
    tiles.forEach((tile, i) => tile.addEventListener('click', () => {
      const empty = built.indexOf(null);
      if (empty === -1 || built.includes(i)) return;
      built[empty] = i;
      update();
    }));
    slots.forEach((slot, i) => slot.addEventListener('click', () => {
      if (built[i] === null) return;
      built[i] = null;
      update();
    }));

    return {
      audio: { text: word, kind: 'word' }, autoplay: true, display: word,
      isCorrect: v => v === word,
      mark: (v) => slots.forEach((slot, i) => slot.classList.add(v[i] === word[i] ? 'slot-correct' : 'slot-wrong'))
    };
  },

  'sentence-build': (sentence, container, chunk) => {
    const answer = sentence.missing;
    const inSentence = sentence.text.split(' ');
    const learned = getLearnedContent(chunk.id, 'words').filter(w => !inSentence.includes(w));
    const similar = learned.filter(w => Math.abs(w.length - answer.length) <= 1);
    const options = pickOptions(answer, similar, learned);
    const shownWords = inSentence.map(w => (w === answer ? '<span class="text-blue-500">_____</span>' : vowelHtml(w)));
    container.innerHTML = promptHtml('استمع للجملة واختر الكلمة الناقصة.') + `
      <div class="flex items-center justify-center gap-5 mb-6 flex-wrap">
        ${soundControlsHtml()}
        <p class="text-3xl sm:text-4xl font-bold tracking-wide english-content" lang="en">${shownWords.join(' ')}</p>
      </div>`;
    wireSoundControls(container);
    const opts = renderOptions(container, options, { size: 'word' });
    return {
      audio: { text: sentence.text, kind: 'sentence' }, autoplay: true, display: sentence.text,
      hint: `المعنى: ${sentence.translation}`,
      isCorrect: v => v === answer, mark: (v) => opts.mark(v, answer)
    };
  }
};

// -------------------- Event Listeners & Init --------------------
backButton.addEventListener('click', goBack);
document.getElementById('activity-close').addEventListener('click', goBack);
checkButton.addEventListener('click', checkAnswer);
document.getElementById('feedback-continue').addEventListener('click', continueActivity);
document.getElementById('feedback-replay').addEventListener('click', () => { if (currentQuestion?.audio) playQuestionAudio(); });
// Enter checks the answer, then continues (unless a button has focus and handles Enter itself)
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || activityView.classList.contains('hidden') || !messageModal.classList.contains('hidden')) return;
  if (event.target instanceof HTMLButtonElement) return;
  if (answerChecked && !currentActivity.finished) continueActivity();
  else if (!checkButton.disabled) checkAnswer();
});

menuButton.addEventListener('click', (event) => { event.stopPropagation(); dropdownMenu.classList.toggle('hidden'); });
window.addEventListener('click', () => { if (!dropdownMenu.classList.contains('hidden')) dropdownMenu.classList.add('hidden'); });

document.getElementById('progress-report-button').addEventListener('click', () => navigate({ view: 'progress-report' }));
document.getElementById('achievements-button').addEventListener('click', () => navigate({ view: 'achievements' }));
document.getElementById('important-note-button').addEventListener('click', () => navigate({ view: 'important-note' }));

// Copy email functionality
document.getElementById('copy-email-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('hello@my2ndlang.com');
    const toast = document.getElementById('copy-toast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 1500);
  } catch (error) {
    console.log('Could not copy email');
  }
});

document.getElementById('reset-progress').addEventListener('click', () => {
  dropdownMenu.classList.add('hidden');
  showConfirmationModal('هل أنت متأكد من رغبتك في إعادة تعيين كل تقدمك؟ لا يمكن التراجع عن هذا الإجراء.', () => {
    // A reset carries a higher epoch, so signed-in devices replace their progress too
    userProgress = resetProgress(userProgress);
    try { localStorage.setItem('literacyAppProgress', JSON.stringify(userProgress)); } catch (e) { console.warn('Cannot save progress (private browsing?):', e); }
    notifyProgressChanged();
    updateHeaderStats();
    showDashboardAfterChange();
  });
});

document.getElementById('unlock-all').addEventListener('click', () => {
  dropdownMenu.classList.add('hidden');
  showConfirmationModal('هل أنت متأكد من رغبتك في فتح جميع الوحدات؟', () => {
    // unlock all by setting to the id of the last chunk
    const last = appData.chunks[appData.chunks.length - 1];
    userProgress.unlockedChunk = last ? last.id : userProgress.unlockedChunk;
    saveProgress();
    showDashboardAfterChange();
  });
});

function showDashboardAfterChange() {
  if (dashboardView.classList.contains('hidden')) navigate({ view: 'dashboard' });
  else renderDashboard();
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!achievementUnlockedModal.classList.contains('hidden')) document.getElementById('achievement-close-btn').click();
  else if (!messageModal.classList.contains('hidden')) document.getElementById('modal-cancel-btn')?.click();
  else if (!dropdownMenu.classList.contains('hidden')) dropdownMenu.classList.add('hidden');
});

document.getElementById('achievement-close-btn').addEventListener('click', () => {
  achievementUnlockedModal.classList.add('hidden');
  showNextAchievement();
});

function init() {
  loadProgress();
  initSync({ getProgress: () => userProgress, applyProgress: applySyncedProgress, onStatus: handleSyncStatus });
  updateHeaderStats();

  initSpeech();

  renderDashboard();
  startLearningTimer();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLearningTimer(); else startLearningTimer();
  });

  window.addEventListener('beforeunload', () => {
    stopLearningTimer();
    if (saveTimeout) clearTimeout(saveTimeout);
    try { localStorage.setItem('literacyAppProgress', JSON.stringify(userProgress)); }
    catch (e) { console.warn('Cannot save progress on unload (private browsing?):', e); }
  });
}

// Landing actions (the theme is handled by theme.js)
document.getElementById('landing-year').textContent = new Date().getFullYear();

function startApp() {
  landingPage.classList.add('hidden');
  appContainer.classList.remove('hidden');
  appContainer.classList.add('fade-in');
  history.replaceState({ view: 'dashboard' }, '');
  init();
  initAudio();
}

startLearningBtn.addEventListener('click', () => {
  startApp();
  if (!isOnboarded() && !hasSavedProgress()) startOnboarding();
});

// -------------------- First run --------------------
// A short first visit: welcome, a sound check, the learner's level (with a quick reading check that
// unlocks the right starting group), and where progress is saved. Shown once per device.
const ONBOARDED_KEY = 'literacyOnboarded';
const ONBOARDING_STEPS = ['welcome', 'sound', 'level', 'placement', 'done'];
const onboardingContent = document.getElementById('onboarding-content');
let onboarding = null;          // { step, past: [], startChunk, placementIndex }
let finishingOnboarding = null; // what to open once the first-run history entry is gone

function isOnboarded() {
  try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch (e) { return false; }
}

function startOnboarding() {
  onboarding = { step: 'welcome', past: [], startChunk: 1, placementIndex: 0 };
  history.replaceState({ view: 'onboarding-base' }, '');
  history.pushState({ view: 'onboarding' }, '');
  showView('onboarding');
  renderOnboardingStep();
}

function goToOnboardingStep(step) {
  onboarding.past.push({ step: onboarding.step, placementIndex: onboarding.placementIndex });
  onboarding.step = step;
  renderOnboardingStep();
}

function onboardingBack() {
  if (!onboarding || onboarding.past.length === 0) return false;
  Object.assign(onboarding, onboarding.past.pop());
  renderOnboardingStep();
  return true;
}

function finishOnboarding({ signIn = false } = {}) {
  try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch (e) { /* private mode: shown again next time */ }
  const startChunk = onboarding.startChunk;
  if (startChunk > userProgress.unlockedChunk) userProgress.unlockedChunk = startChunk;
  userProgress.placedAt = Math.max(userProgress.placedAt || 1, startChunk);
  try { localStorage.setItem('literacyAppProgress', JSON.stringify(userProgress)); } catch (e) { /* ignore */ }
  notifyProgressChanged();
  onboarding = null;
  finishingOnboarding = signIn ? () => startSignIn() : () => navigate({ view: 'lesson', chunkId: startChunk });
  history.back(); // drop the first-run entry; the popstate handler opens what comes next
}

// Groups the reading check can place a learner in, with three regular words from each
function placementGroups() {
  return appData.chunks
    .filter(c => c.letters.length > 0)
    .map(c => ({ chunk: c, words: c.words.filter(w => !(c.sightWords || []).includes(w)).slice(0, 3) }));
}

function renderOnboardingStep() {
  const { step } = onboarding;
  document.getElementById('onboarding-progress').style.width =
    `${Math.round((ONBOARDING_STEPS.indexOf(step) / (ONBOARDING_STEPS.length - 1)) * 100)}%`;
  const bigButton = (id, label, variant = 'primary') =>
    `<button id="${id}" type="button" class="big-btn ${variant === 'primary' ? 'big-btn-primary' : 'big-btn-secondary'}">${label}</button>`;
  const on = (id, handler) => document.getElementById(id).addEventListener('click', handler);

  if (step === 'welcome') {
    onboardingContent.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-900 focus:outline-none" tabindex="-1">أهلاً بك 👋</h2>
      <p class="text-lg text-gray-700 leading-8">هنا تتعلّم قراءة الإنجليزية خطوة بخطوة، من الحروف إلى الكلمات ثم الجمل.</p>
      <ul class="space-y-3 text-gray-700">
        <li class="flex gap-3"><span aria-hidden="true">🎧</span><span>تسمع صوت كل حرف وكلمة، وتعيده متى شئت.</span></li>
        <li class="flex gap-3"><span aria-hidden="true">⏱️</span><span>دروس قصيرة، حوالي ٥ دقائق للنشاط.</span></li>
        <li class="flex gap-3"><span aria-hidden="true">🔁</span><span>ما تخطئ فيه يعود إليك لتراجعه.</span></li>
        <li class="flex gap-3"><span aria-hidden="true">🤝</span><span>كثير من البالغين يتعلّمون القراءة بلغة جديدة، وأنت تستطيع ذلك أيضاً.</span></li>
      </ul>
      ${bigButton('ob-next', 'التالي')}`;
    on('ob-next', () => goToOnboardingStep('sound'));
  } else if (step === 'sound') {
    onboardingContent.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-900 focus:outline-none" tabindex="-1">لنتأكد من الصوت</h2>
      <p class="text-lg text-gray-700">اضغط الزر واستمع. ستسمع كلمة إنجليزية.</p>
      <div class="flex flex-col items-center gap-1 py-2">
        <button id="ob-play" type="button" class="bg-blue-500 hover:bg-blue-600 text-white p-5 rounded-full" aria-label="استمع">${PLAY_SVG}</button>
        <button id="ob-play-slow" type="button" class="slow-btn" aria-label="استمع ببطء"><span aria-hidden="true">🐢</span> بطيء</button>
      </div>
      <div id="ob-sound-help" class="hidden bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 space-y-2 text-sm leading-6">
        <p class="font-bold">جرّب هذه الخطوات:</p>
        <p>• ارفع صوت الجهاز. وعلى الآيفون تأكد أن زر الوضع الصامت مغلق.</p>
        <p>• جرّب سماعات الأذن.</p>
        <p>• إذا لم يصدر صوت أبداً: افتح إعدادات الجهاز وابحث عن «تحويل النص إلى كلام»، ثم ثبّت اللغة الإنجليزية.</p>
      </div>
      <div class="flex flex-col gap-3">
        ${bigButton('ob-heard', 'نعم، أسمعها ✓')}
        ${bigButton('ob-not-heard', 'لا أسمع شيئاً', 'secondary')}
      </div>`;
    on('ob-play', () => playItem('bat', { kind: 'word' }));
    on('ob-play-slow', () => playItem('bat', { slow: true, kind: 'word' }));
    on('ob-heard', () => goToOnboardingStep('level'));
    on('ob-not-heard', () => {
      document.getElementById('ob-sound-help').classList.remove('hidden');
      const btn = document.getElementById('ob-not-heard');
      btn.textContent = 'أكمل الآن وسأصلح الصوت لاحقاً';
      btn.onclick = () => goToOnboardingStep('level');
    });
  } else if (step === 'level') {
    const option = (id, title, desc) => `
      <button id="${id}" type="button" class="w-full text-right rounded-xl border-2 border-gray-200 hover:border-blue-400 bg-white p-4">
        <span class="block text-lg font-bold text-gray-900">${title}</span>
        <span class="block text-sm text-gray-500 mt-1">${desc}</span>
      </button>`;
    onboardingContent.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-900 focus:outline-none" tabindex="-1">ما مستواك الآن؟</h2>
      <div class="flex flex-col gap-3">
        ${option('ob-level-zero', 'لا أعرف الحروف الإنجليزية', 'سنبدأ معك من أول حرف.')}
        ${option('ob-level-some', 'أعرف بعض الحروف', 'سنعرض عليك كلمات قصيرة لنعرف من أين تبدأ.')}
        ${option('ob-level-letters', 'أعرف الحروف لكن القراءة صعبة', 'سنعرض عليك كلمات قصيرة لنعرف من أين تبدأ.')}
      </div>`;
    on('ob-level-zero', () => { onboarding.startChunk = 1; goToOnboardingStep('done'); });
    const toPlacement = () => { onboarding.placementIndex = 0; goToOnboardingStep('placement'); };
    on('ob-level-some', toPlacement);
    on('ob-level-letters', toPlacement);
  } else if (step === 'placement') {
    const groups = placementGroups();
    const { chunk, words } = groups[onboarding.placementIndex];
    onboardingContent.innerHTML = `
      <p class="text-sm text-gray-500">${chunk.title} من ${toArabicDigits(groups.length)}</p>
      <h2 class="text-2xl font-bold text-gray-900 focus:outline-none" tabindex="-1">هل تستطيع قراءة هذه الكلمات؟</h2>
      <p class="text-gray-600">اقرأها في نفسك أولاً، ثم اضغط على كل كلمة لتسمعها وتتأكد.</p>
      <div class="flex flex-wrap justify-center gap-3 py-2 english-content" lang="en">
        ${words.map(w => `<button type="button" class="ob-word bg-blue-100 text-blue-800 text-3xl font-bold rounded-xl px-5 py-3 hover:bg-blue-200" data-word="${w}">${vowelHtml(w)}</button>`).join('')}
      </div>
      <div class="flex flex-col gap-3">
        ${bigButton('ob-can-read', 'نعم، قرأتها كلها')}
        ${bigButton('ob-cannot-read', 'ليس بعد', 'secondary')}
      </div>`;
    onboardingContent.querySelectorAll('.ob-word').forEach(b => b.addEventListener('click', () => playItem(b.dataset.word, { kind: 'word' })));
    on('ob-can-read', () => {
      if (onboarding.placementIndex + 1 < groups.length) {
        onboarding.past.push({ step: 'placement', placementIndex: onboarding.placementIndex });
        onboarding.placementIndex++;
        renderOnboardingStep();
      } else {
        // Read every group: start with the review group
        onboarding.startChunk = appData.chunks[appData.chunks.length - 1].id;
        goToOnboardingStep('done');
      }
    });
    on('ob-cannot-read', () => { onboarding.startChunk = chunk.id; goToOnboardingStep('done'); });
  } else if (step === 'done') {
    const start = appData.chunks.find(c => c.id === onboarding.startChunk);
    const where = onboarding.startChunk === appData.chunks[0].id
      ? 'ستبدأ من المجموعة الأولى.'
      : `ستبدأ من ${start.title}. المجموعات السابقة مفتوحة لك إن أردت مراجعتها.`;
    const sync = isSyncConfigured();
    onboardingContent.innerHTML = `
      <h2 class="text-2xl font-bold text-gray-900 focus:outline-none" tabindex="-1">جاهز! 🎉</h2>
      <p class="text-lg text-gray-700">${where}</p>
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 leading-6">
        ${sync
          ? 'يُحفظ تقدمك تلقائياً على هذا الجهاز. ولتكمل من هاتفك أو من كمبيوتر الجامعة، سجّل الدخول بحساب Google.'
          : 'يُحفظ تقدمك تلقائياً على هذا الجهاز وفي هذا المتصفح. إذا غيّرت الجهاز أو المتصفح ستبدأ من جديد.'}
      </div>
      <div class="flex flex-col gap-3">
        ${bigButton('ob-start', 'ابدأ التعلّم')}
        ${sync ? bigButton('ob-signin', 'تسجيل الدخول بحساب Google', 'secondary') : ''}
      </div>`;
    on('ob-start', () => finishOnboarding());
    if (sync) on('ob-signin', () => finishOnboarding({ signIn: true }));
  }
  onboardingContent.querySelector('h2')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}


// -------------------- Sync across devices --------------------
// Progress from the server (merged with this device's) replaces the local copy
function applySyncedProgress(progress) {
  userProgress = validateProgress(progress);
  try { localStorage.setItem('literacyAppProgress', JSON.stringify(userProgress)); }
  catch (e) { console.warn('Cannot save progress (private browsing?):', e); }
  updateHeaderStats();
  // Redraw what's on screen, but never interrupt an activity
  if (!dashboardView.classList.contains('hidden')) renderDashboard();
  else if (!lessonView.classList.contains('hidden') && history.state?.chunkId) renderActivities(history.state.chunkId);
  else if (!progressReportView.classList.contains('hidden')) renderProgressReportPage();
  else if (!achievementsView.classList.contains('hidden')) renderAchievementsPage();
}

function handleSyncStatus() {
  if (!syncView.classList.contains('hidden')) renderSyncPage();
  updateSyncPrompt();
}

function syncStatusText({ status, lastSyncedAt }) {
  if (status === 'syncing') return { text: 'جارٍ المزامنة…', tone: 'text-gray-500' };
  if (status === 'offline') return { text: 'لا يوجد اتصال بالإنترنت. تقدمك محفوظ على هذا الجهاز وسيُرفع عند عودة الاتصال.', tone: 'text-amber-700' };
  if (status === 'error') return { text: 'تعذّرت المزامنة الآن. تقدمك محفوظ على هذا الجهاز وسنحاول مرة أخرى.', tone: 'text-amber-700' };
  let when = '';
  if (lastSyncedAt) {
    const minutes = Math.round((Date.now() - lastSyncedAt) / 60000);
    when = minutes < 1 ? ' · آخر مزامنة الآن'
      : ` · آخر مزامنة ${new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }).format(-minutes, 'minute')}`;
  }
  return { text: `✓ تقدمك محفوظ في حسابك${when}`, tone: 'text-green-700' };
}

function renderSyncPage() {
  const sync = getSyncState();
  document.getElementById('sync-signed-out').classList.toggle('hidden', sync.signedIn);
  document.getElementById('sync-signed-in').classList.toggle('hidden', !sync.signedIn);
  const message = document.getElementById('sync-message');
  message.textContent = sync.message;
  message.classList.toggle('hidden', !sync.message);
  if (sync.signedIn && sync.user) {
    const name = sync.user.name || sync.user.email || '';
    document.getElementById('sync-name').textContent = name;
    document.getElementById('sync-email').textContent = sync.user.email || '';
    document.getElementById('sync-avatar').textContent = name.trim().charAt(0).toUpperCase();
    const { text, tone } = syncStatusText(sync);
    const statusEl = document.getElementById('sync-status');
    statusEl.textContent = text;
    statusEl.className = `text-sm font-medium ${tone}`;
    document.getElementById('sync-now-btn').disabled = sync.status === 'syncing';
  }
}

function updateSyncPrompt() {
  const sync = getSyncState();
  let dismissed = false;
  try { dismissed = localStorage.getItem('literacySyncPromptDismissed') === '1'; } catch (e) { /* ignore */ }
  const hasProgress = Object.values(userProgress.completedActivities).some(list => Array.isArray(list) && list.length > 0);
  document.getElementById('sync-prompt').classList.toggle('hidden', !(sync.configured && !sync.signedIn && hasProgress && !dismissed));
}

if (isSyncConfigured()) {
  document.getElementById('sync-button').classList.remove('hidden');
  document.getElementById('note-sync').classList.remove('hidden');
}
document.getElementById('sync-button').addEventListener('click', () => navigate({ view: 'sync' }));
document.getElementById('sync-prompt-open').addEventListener('click', () => navigate({ view: 'sync' }));
document.getElementById('sync-prompt-dismiss').addEventListener('click', () => {
  try { localStorage.setItem('literacySyncPromptDismissed', '1'); } catch (e) { /* ignore */ }
  updateSyncPrompt();
});
document.getElementById('sync-signin-btn').addEventListener('click', startSignIn);
document.getElementById('sync-now-btn').addEventListener('click', () => syncNow());
document.getElementById('sync-signout-btn').addEventListener('click', () => signOut());
document.getElementById('sync-signout-clear-btn').addEventListener('click', () => {
  showConfirmationModal('سيتم تسجيل الخروج وحذف التقدم من هذا الجهاز فقط. يبقى تقدمك محفوظاً في حسابك.', () => signOut({ clearDevice: true }),
    { confirmText: 'خروج وحذف', cancelText: 'إلغاء' });
});
document.getElementById('sync-delete-btn').addEventListener('click', () => {
  showConfirmationModal('سيتم حذف تقدمك المحفوظ في حسابك من كل الأجهزة. يبقى التقدم على هذا الجهاز فقط. لا يمكن التراجع.', () => deleteServerData(),
    { confirmText: 'حذف بياناتي', cancelText: 'إلغاء' });
});

function hasSavedProgress() {
  try {
    if (localStorage.getItem('literacyOnboarded') === '1') return true;
    const saved = JSON.parse(localStorage.getItem('literacyAppProgress'));
    return Boolean(saved) && (saved.points > 0 || Object.keys(saved.completedActivities || {}).length > 0);
  } catch (e) {
    return false;
  }
}

// Back from Google's sign-in page: open the app straight on the sync screen
if (hasAuthReturn()) {
  startApp();
  navigate({ view: 'sync' });
} else if (hasSavedProgress()) {
  // Returning learners go straight to their learning path; the landing page is for first visits
  startApp();
}

// -------------------- Audio clips & missing-voice help --------------------
loadClipManifest();
onAudioProblem(() => document.getElementById('audio-help')?.classList.remove('hidden'));
document.getElementById('audio-help-close')?.addEventListener('click', () => {
  document.getElementById('audio-help').classList.add('hidden');
});

// -------------------- PWA Installation --------------------
let deferredPrompt = null;

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => console.log('ServiceWorker registered:', registration.scope))
      .catch(err => console.log('ServiceWorker registration failed:', err));
  });
}

// Capture the install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show install button
  const installButton = document.getElementById('install-app-button');
  if (installButton) {
    installButton.classList.remove('hidden');
  }
});

// Handle install button click
document.getElementById('install-app-button')?.addEventListener('click', async () => {
  dropdownMenu.classList.add('hidden');
  
  if (!deferredPrompt) {
    alert('التطبيق مثبت بالفعل أو غير متاح للتثبيت');
    return;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response: ${outcome}`);
  
  // Clear the deferred prompt
  deferredPrompt = null;
  
  // Hide the install button
  document.getElementById('install-app-button').classList.add('hidden');
});

// Hide install button if app is already installed
window.addEventListener('appinstalled', () => {
  console.log('PWA was installed');
  const installButton = document.getElementById('install-app-button');
  if (installButton) {
    installButton.classList.add('hidden');
  }
  deferredPrompt = null;
});
