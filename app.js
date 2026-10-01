// app.js (ES module)
import { appData, getAchievements } from './data.js';
import { getDefaultProgress, validateProgress, shuffleArray, formatTime, getLearnedContent, computeStreak, pickDistractors, getPossibleActivities, isChunkComplete, buildQuestionSet, activityAccuracy, PASS_ACCURACY, resetProgress, liveStreak, courseProgress, nextStep } from './logic.js';
import { playItem, initSpeech, loadClipManifest, onAudioProblem } from './audio.js';
import { initSync, isSyncConfigured, getSyncState, hasAuthReturn, notifyProgressChanged, startSignIn, syncNow, signOut, deleteServerData } from './sync.js';

// -------------------- Constants --------------------
const PLAY_SVG = `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
  <path fill-rule="evenodd"
        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
        clip-rule="evenodd"></path>
</svg>`;

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
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
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
  if (!isShowingAchievement && achievementQueue.length > 0) showNextAchievement();
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
const chunkGrid = document.getElementById('chunk-grid');
const messageModal = document.getElementById('message-modal');
const modalMessage = document.getElementById('modal-message');
const modalButtons = document.getElementById('modal-buttons');
const activityProgress = document.getElementById('activity-progress');
const appBody = document.querySelector('body');
const menuButton = document.getElementById('menu-button');
const dropdownMenu = document.getElementById('dropdown-menu');
const pointsDisplay = document.getElementById('points-display');
const streakDisplay = document.getElementById('streak-display');
const achievementUnlockedModal = document.getElementById('achievement-unlocked-modal');
const loadingIndicator = document.getElementById('loading-indicator');

// -------------------- View Switching --------------------
function showView(viewName) {
  [dashboardView, lessonView, activityView, achievementsView, progressReportView, importantNoteView, syncView].forEach(v => v.classList.add('hidden'));
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
    (currentActivity.currentIndex > 0 || currentActivity.questionsWithErrors.size > 0);
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
        ? `<p class="text-3xl font-bold mt-2 text-gray-800 english-content tracking-wider" lang="en">${chunk.letters.join(' ')}</p>`
        : `<p class="text-2xl font-bold mt-2 text-gray-800">مراجعة</p>`}
      ${sample.length ? `<p class="mt-2 text-sm text-gray-600">ستقرأ: <span dir="ltr" lang="en" class="font-semibold">${sample.join(', ')}</span></p>` : ''}
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
    mainBtn.textContent = text;
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
  showView('lesson');
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

function showActivityPassed(message) {
  openModal(message, [{ label: 'متابعة', onClick: () => history.back() }]);
}

function showActivityFailed(accuracy, missedItems) {
  const { chunkId, activityType } = currentActivity;
  const chunk = appData.chunks.find(c => c.id === chunkId);

  // The items the learner got wrong, as buttons they can tap to hear again
  const details = document.createElement('div');
  details.className = 'mb-6';
  const label = document.createElement('p');
  label.className = 'text-sm text-gray-600 mb-2';
  label.textContent = 'راجع هذه ثم حاول مرة أخرى:';
  const list = document.createElement('div');
  list.className = 'flex flex-wrap justify-center gap-2';
  list.dir = 'ltr';
  const shown = new Set();
  missedItems.forEach(item => {
    const text = typeof item === 'string' ? item : item.text;
    const kind = itemKind(item, chunk, activityType);
    const display = kind === 'letter' ? text.toUpperCase() + text.toLowerCase() : text;
    if (shown.has(display)) return;
    shown.add(display);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.lang = 'en';
    chip.className = 'bg-blue-100 text-blue-800 font-bold text-xl px-3 py-1 rounded-lg hover:bg-blue-200';
    chip.textContent = display;
    chip.onclick = () => playItem(text, { kind });
    list.appendChild(chip);
  });
  details.append(label, list);

  openModal(`حصلت على ${toArabicDigits(accuracy)}٪، وتحتاج ${toArabicDigits(PASS_ACCURACY)}٪ للنجاح.`, [
    { label: 'أعد المحاولة', focus: true, onClick: () => startActivity(chunkId, activityType, { replace: true }) },
    { label: 'العودة للدرس', variant: 'secondary', onClick: () => history.back() }
  ], details);
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
      el.textContent = letter;
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
// replace: true restarts in place (the "try again" button) instead of adding a history entry
function startActivity(chunkId, activityType, { replace = false } = {}) {
  const chunk = appData.chunks.find(c => c.id === chunkId);
  const title = ACTIVITIES[activityType].name;
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

  if (!questions || questions.length === 0) {
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
    finished: false
  };
  currentActivity.originalQuestionCount = currentActivity.questions.length;

  const state = { view: 'activity', chunkId };
  if (replace) history.replaceState(state, ''); else history.pushState(state, '');
  document.getElementById('activity-title').textContent = title;
  mainTitle.textContent = 'نشاط';
  showView('activity');
  window.scrollTo(0, 0);
  displayCurrentQuestion();
}

function displayCurrentQuestion() {
  const { questions, currentIndex, activityType } = currentActivity;
  activityProgress.textContent = `${currentIndex + 1} / ${questions.length}`;
  const question = questions[currentIndex];
  const container = document.getElementById('activity-content');
  container.innerHTML = '';

  if (activityType === 'sound-match' || activityType === 'combined-sound-match') {
    renderSoundMatchUI(question, container);
  } else if (activityType === 'word-build') renderWordBuildUI(question, container);
  else if (activityType === 'fill-in-the-blank') renderFillInTheBlankUI(question, container);
  else if (activityType === 'word-match') renderWordMatchUI(question, container);
  else if (activityType === 'initial-sound') renderInitialSoundUI(question, container);
  else if (activityType === 'sentence-build') renderSentenceBuildUI(question, container);
  else if (activityType === 'capital-match') renderCapitalMatchUI(question, container);
}

function handleCorrectAnswer() {
  playSuccessSound();
  userProgress.points += 5;
  updateHeaderStats();
  appBody.classList.add('correct-flash');
  setTimeout(() => appBody.classList.remove('correct-flash'), 700);

  if (currentActivity.currentIndex >= currentActivity.questions.length - 1) {
    currentActivity.finished = true;
    const { chunkId, activityType, originalQuestionCount, questionsWithErrors, questions } = currentActivity;
    const accuracy = activityAccuracy(originalQuestionCount, questionsWithErrors.size);

    if (accuracy < PASS_ACCURACY) {
      showActivityFailed(accuracy, [...questionsWithErrors].map(i => questions[i]));
      saveProgress();
      return;
    }

    recordLearningDay();
    updateHeaderStats();
    if (!userProgress.completedActivities[chunkId]) userProgress.completedActivities[chunkId] = [];
    if (!userProgress.completedActivities[chunkId].includes(activityType)) {
      userProgress.completedActivities[chunkId].push(activityType);
    }

    if (isChunkComplete(chunkId, userProgress.completedActivities)) {
      if (!userProgress.completedChunks.includes(chunkId)) {
        userProgress.completedChunks.push(chunkId);

        // Unlock by array order (works even if IDs skip numbers)
        const currentIdx = appData.chunks.findIndex(c => c.id === chunkId);
        const nextChunk = appData.chunks[currentIdx + 1];

        if (userProgress.unlockedChunk === chunkId && nextChunk) {
          userProgress.unlockedChunk = nextChunk.id;
          showActivityPassed(`عمل رائع! لقد فتحت ${nextChunk.title}.`);
        } else {
          showActivityPassed("اكتملت المجموعة! أحسنت صنعًا.");
        }
      } else {
        showActivityPassed("اكتمل النشاط! عمل جيد.");
      }
    } else {
      showActivityPassed("اكتمل النشاط! استمر في التقدم.");
    }
    checkAchievements();
    saveProgress();
  } else {
    currentActivity.currentIndex++;
    checkAchievements();
    saveProgress();
    setTimeout(displayCurrentQuestion, 700);
  }
}

function handleWrongAttempt() {
  playFailureSound();
  const idx = currentActivity.currentIndex;
  if (idx < currentActivity.originalQuestionCount) {
    currentActivity.questionsWithErrors.add(idx);
  }
  if (!currentActivity.requeuedFromIndex.has(idx)) {
    currentActivity.requeuedFromIndex.add(idx);
    currentActivity.questions.push(currentActivity.questions[idx]);
  }
}

// -------------------- Activity Renderers --------------------
function renderInitialSoundUI(word, container) {
  const firstChar = word[0];
  const correctLetter = firstChar.toLowerCase(); // normalize for capitals like Sara/Ali
  const partialWord = '<span class="text-blue-500">_</span>' + word.substring(1);

  const allLearnedLetters = getLearnedContent(currentActivity.chunkId, 'letters')
    .map(l => l.toLowerCase()); // normalize pool
  const distractors = allLearnedLetters.filter(l => l !== correctLetter);

  let options = [correctLetter];
  const maxOptions = Math.min(4, allLearnedLetters.length);
  const availableDistractors = [...distractors];
  while (options.length < maxOptions && availableDistractors.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableDistractors.length);
    const randomDistractor = availableDistractors.splice(randomIndex, 1)[0];
    if (!options.includes(randomDistractor)) {
      options.push(randomDistractor);
    }
  }

  container.innerHTML = `
    <p class="text-xl mb-4">اختر الحرف الأول الصحيح لإكمال الكلمة.</p>
    <div class="flex items-center justify-center gap-4 mb-8">
      <div class="flex flex-col items-center gap-1">
        <button id="play-word-sound-btn" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full" aria-label="Listen to word">
          ${PLAY_SVG}
        </button>
        <button id="play-word-slow-sound-btn" class="text-sm text-gray-500 hover:text-blue-600 font-medium">صوت بطيء</button>
      </div>
      <p class="text-4xl font-bold tracking-widest english-content">${partialWord}</p>
    </div>
    <div id="options-container" class="flex flex-wrap justify-center gap-4"></div>`;

  document.getElementById('play-word-sound-btn').onclick = () => playItem(word);
  document.getElementById('play-word-slow-sound-btn').onclick = () => playItem(word, { slow: true });

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'sound-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = letter;
    btn.onclick = () => {
      if (letter.toLowerCase() === correctLetter) {
        handleCorrectAnswer();
      } else {
        handleWrongAttempt();
        btn.disabled = true;
        btn.classList.add('incorrect');
        setTimeout(() => { btn.classList.remove('incorrect'); btn.classList.add('opacity-50', 'cursor-not-allowed'); }, 500);
      }
    };
    optionsContainer.appendChild(btn);
  });
}

function renderSoundMatchUI(correctItem, container) {
  const chunk = appData.chunks.find(c => c.id === currentActivity.chunkId);
  let optionsPool;
  const words = chunk.words || [];

  if (currentActivity.activityType === 'sound-match') {
    optionsPool = chunk.letters || [];
  } else {
    const isPair = (correctItem?.length > 1) && !words.includes(correctItem);
    if (isPair) optionsPool = chunk.letterPairs || [];
    else if (words.includes(correctItem)) optionsPool = words;
    else optionsPool = chunk.letters || [];
  }

  let options = [correctItem];
  const maxOptions = Math.min(4, optionsPool.length);
  while (options.length < maxOptions) {
    const randomItem = optionsPool[Math.floor(Math.random() * optionsPool.length)];
    if (!options.includes(randomItem)) options.push(randomItem);
  }

  const promptText = (currentActivity.activityType === 'sound-match')
    ? "استمع للصوت واختر الحرف الصحيح."
    : "استمع للصوت واختر الإجابة الصحيحة.";

  container.innerHTML = `
    <p class="text-xl mb-6">${promptText}</p>
    <div class="flex flex-col items-center gap-1 mb-8">
      <button id="play-sound-btn" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full" aria-label="Play sound">
        ${PLAY_SVG}
      </button>
      <button id="play-slow-sound-btn" class="text-sm text-gray-500 hover:text-blue-600 font-medium">صوت بطيء</button>
    </div>
    <div id="options-container" class="flex flex-wrap justify-center gap-4"></div>`;

  const kind = itemKind(correctItem, chunk, currentActivity.activityType);
  document.getElementById('play-sound-btn').onclick = () => playItem(correctItem, { kind });
  document.getElementById('play-slow-sound-btn').onclick = () => playItem(correctItem, { slow: true, kind });

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(item => {
    const isWord = words.includes(item);
    const btn = document.createElement('button');
    btn.className = isWord
      ? 'word-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content'
      : 'sound-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = item;
    btn.onclick = () => {
      if (item === correctItem) handleCorrectAnswer();
      else { handleWrongAttempt(); btn.disabled = true; btn.classList.add('incorrect'); setTimeout(() => { btn.classList.remove('incorrect'); btn.classList.add('opacity-50', 'cursor-not-allowed'); }, 500); }
    };
    optionsContainer.appendChild(btn);
  });
}

function renderWordMatchUI(correctWord, container) {
  const allLearnedWords = getLearnedContent(currentActivity.chunkId, 'words');
  const distractors = allLearnedWords.filter(w => w !== correctWord && Math.abs(w.length - correctWord.length) <= 2);

  let options = [correctWord];
  const maxOptions = Math.min(4, allLearnedWords.length);
  const availableDistractors = [...distractors];
  while (options.length < maxOptions && availableDistractors.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableDistractors.length);
    const randomDistractor = availableDistractors.splice(randomIndex, 1)[0];
    if (!options.includes(randomDistractor)) options.push(randomDistractor);
  }

  container.innerHTML = `
    <p class="text-xl mb-6">استمع واختر الكلمة الصحيحة.</p>
    <div class="flex flex-col items-center gap-1 mb-8">
      <button id="play-sound-btn" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full" aria-label="Play word">
        ${PLAY_SVG}
      </button>
      <button id="play-slow-sound-btn" class="text-sm text-gray-500 hover:text-blue-600 font-medium">صوت بطيء</button>
    </div>
    <div id="options-container" class="flex flex-wrap justify-center gap-4"></div>`;

  document.getElementById('play-sound-btn').onclick = () => playItem(correctWord);
  document.getElementById('play-slow-sound-btn').onclick = () => playItem(correctWord, { slow: true });

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'word-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = word;
    btn.onclick = () => {
      if (word === correctWord) handleCorrectAnswer();
      else { handleWrongAttempt(); btn.disabled = true; btn.classList.add('incorrect'); setTimeout(() => { btn.classList.remove('incorrect'); btn.classList.add('opacity-50', 'cursor-not-allowed'); }, 500); }
    };
    optionsContainer.appendChild(btn);
  });
}

function renderFillInTheBlankUI(word, container) {
  const missingLetterIndex = Math.floor(Math.random() * word.length);
  const correctLetter = word[missingLetterIndex];
  const partialWord = word.substring(0, missingLetterIndex) + '<span class="text-blue-500">_</span>' + word.substring(missingLetterIndex + 1);

  const allLearnedLetters = getLearnedContent(currentActivity.chunkId, 'letters');
  const distractors = allLearnedLetters.filter(l => l !== correctLetter);

  let options = [correctLetter];
  const maxOptions = Math.min(4, allLearnedLetters.length);
  const availableDistractors = [...distractors];
  while (options.length < maxOptions && availableDistractors.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableDistractors.length);
    const randomDistractor = availableDistractors.splice(randomIndex, 1)[0];
    if (!options.includes(randomDistractor)) options.push(randomDistractor);
  }

  container.innerHTML = `
    <p class="text-xl mb-4">استمع للكلمة واختر الحرف المفقود.</p>
    <div class="flex items-center justify-center gap-4 mb-8">
      <div class="flex flex-col items-center gap-1">
        <button id="play-word-sound-btn" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full" aria-label="Play word">
          ${PLAY_SVG}
        </button>
        <button id="play-word-slow-sound-btn" class="text-sm text-gray-500 hover:text-blue-600 font-medium">صوت بطيء</button>
      </div>
      <p class="text-4xl font-bold tracking-widest english-content">${partialWord}</p>
    </div>
    <div id="options-container" class="flex flex-wrap justify-center gap-4"></div>`;

  document.getElementById('play-word-sound-btn').onclick = () => playItem(word);
  document.getElementById('play-word-slow-sound-btn').onclick = () => playItem(word, { slow: true });

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'sound-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = letter;
    btn.onclick = () => {
      if (letter === correctLetter) handleCorrectAnswer();
      else { handleWrongAttempt(); btn.disabled = true; btn.classList.add('incorrect'); setTimeout(() => { btn.classList.remove('incorrect'); btn.classList.add('opacity-50', 'cursor-not-allowed'); }, 500); }
    };
    optionsContainer.appendChild(btn);
  });
}

function renderWordBuildUI(word, container) {
  const letters = shuffleArray(word.split(''));
  // Tiles shrink to fit the card: up to 4rem each, never wider than the screen allows
  const columns = `grid-template-columns: repeat(${word.length}, minmax(0, 4rem))`;
  container.innerHTML = `
    <p class="text-xl mb-4">استمع للكلمة ثم كوّنها باستخدام هذه الحروف.</p>
    <div class="flex flex-col items-center gap-1 mb-8">
      <button id="play-word-sound-btn" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full" aria-label="Play word">
        ${PLAY_SVG}
      </button>
      <button id="play-word-slow-sound-btn" class="text-sm text-gray-500 hover:text-blue-600 font-medium">صوت بطيء</button>
    </div>
    <div id="answer-slots" class="grid justify-center gap-2 w-full mb-8 english-content" style="${columns}">
      ${word.split('').map((_, i) => `<div class="letter-slot aspect-square w-full bg-gray-200 rounded-lg" data-index="${i}"></div>`).join('')}
    </div>
    <div id="letter-choices" class="grid justify-center gap-2 w-full english-content" style="${columns}">
      ${letters.map((l, i) => `<button class="draggable-letter aspect-square w-full bg-blue-100 text-blue-800 text-3xl font-bold rounded-lg hover:bg-blue-200" data-letter="${l}" data-original-index="${i}">${l}</button>`).join('')}
    </div>
    <div id="retry-container" class="h-12 mt-4"></div>`;

  document.getElementById('play-word-sound-btn').onclick = () => playItem(word);
  document.getElementById('play-word-slow-sound-btn').onclick = () => playItem(word, { slow: true });

  const letterChoices = container.querySelectorAll('.draggable-letter');
  const answerSlots = container.querySelectorAll('.letter-slot');
  let builtWord = Array(word.length).fill(null);

  letterChoices.forEach(btn => {
    btn.onclick = () => {
      if (btn.style.visibility === 'hidden') return;

      const firstEmptyIndex = builtWord.indexOf(null);
      if (firstEmptyIndex !== -1) {
        btn.style.visibility = 'hidden';
        const slot = answerSlots[firstEmptyIndex];
        slot.textContent = btn.textContent;
        slot.classList.add('bg-white','text-3xl','font-bold','flex','items-center','justify-center','filled');
        slot.dataset.sourceButton = btn.dataset.originalIndex;
        builtWord[firstEmptyIndex] = btn.textContent;

        if (!builtWord.includes(null)) {
          if (builtWord.join('') === word) {
            handleCorrectAnswer();
          } else {
            handleWrongAttempt();
            answerSlots.forEach(s => { s.classList.add('incorrect'); setTimeout(() => s.classList.remove('incorrect'), 500); });
            const retryBtn = document.createElement('button');
            retryBtn.textContent = 'حاول مرة أخرى';
            retryBtn.className = 'bg-orange-400 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg';
            retryBtn.onclick = displayCurrentQuestion;
            document.getElementById('retry-container').appendChild(retryBtn);
          }
        }
      }
    };
  });

  answerSlots.forEach((slot, index) => {
    slot.onclick = () => {
      if (slot.classList.contains('filled')) {
        const sourceButtonIndex = slot.dataset.sourceButton;
        if (sourceButtonIndex !== undefined) {
          const sourceButton = container.querySelector(`.draggable-letter[data-original-index="${sourceButtonIndex}"]`);
          if (sourceButton) sourceButton.style.visibility = 'visible';
        }
        slot.textContent = '';
        slot.classList.remove('bg-white','text-3xl','font-bold','flex','items-center','justify-center','filled');
        delete slot.dataset.sourceButton;
        builtWord[index] = null;
      }
    };
  });
}

function renderSentenceBuildUI(sentence, container) {
  if (!sentence || !sentence.missing) {
    container.innerHTML = '<p class="text-xl text-red-500">خطأ في تحميل السؤال</p>';
    return;
  }

  const correctWord = sentence.missing;
  const partialSentence = sentence.text.replace(correctWord, '<span class="text-blue-500 font-bold">_____</span>');
  const allLearnedWords = getLearnedContent(currentActivity.chunkId, 'words');
  const distractors = allLearnedWords.filter(w => w !== correctWord);

  let options = [correctWord];
  const maxOptions = Math.min(4, allLearnedWords.length);
  const availableDistractors = [...distractors];
  while (options.length < maxOptions && availableDistractors.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableDistractors.length);
    const randomDistractor = availableDistractors.splice(randomIndex, 1)[0];
    if (!options.includes(randomDistractor)) options.push(randomDistractor);
  }

  container.innerHTML = `
    <p class="text-lg text-gray-600 mb-4">${sentence.translation}</p>
    <div class="flex items-center justify-center gap-4 mb-8">
      <div class="flex flex-col items-center gap-1">
        <button id="play-sentence-sound-btn" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full" aria-label="Play sentence">
          ${PLAY_SVG}
        </button>
        <button id="play-sentence-slow-sound-btn" class="text-sm text-gray-500 hover:text-blue-600 font-medium">صوت بطيء</button>
      </div>
      <p class="text-3xl font-bold tracking-wider english-content">${partialSentence}</p>
    </div>
    <div id="options-container" class="flex flex-wrap justify-center gap-4"></div>`;

  document.getElementById('play-sentence-sound-btn').onclick = () => playItem(sentence.text);
  document.getElementById('play-sentence-slow-sound-btn').onclick = () => playItem(sentence.text, { slow: true });

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'word-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = word;
    btn.onclick = () => {
      if (word === correctWord) handleCorrectAnswer();
      else { handleWrongAttempt(); btn.disabled = true; btn.classList.add('incorrect'); setTimeout(() => { btn.classList.remove('incorrect'); btn.classList.add('opacity-50', 'cursor-not-allowed'); }, 500); }
    };
    optionsContainer.appendChild(btn);
  });
}

function renderCapitalMatchUI(letter, container) {
  const allLearnedLetters = getLearnedContent(currentActivity.chunkId, 'letters');
  const isQuestionUppercase = Math.random() < 0.5;
  const questionLetter = isQuestionUppercase ? letter.toUpperCase() : letter.toLowerCase();
  const correctLetter = isQuestionUppercase ? letter.toLowerCase() : letter.toUpperCase();

  const availableDistractors = allLearnedLetters.filter(l => l !== letter);
  let options = [correctLetter];
  const maxOptions = Math.min(4, allLearnedLetters.length);

  while (options.length < maxOptions && availableDistractors.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableDistractors.length);
    const randomDistractor = availableDistractors.splice(randomIndex, 1)[0];
    const distractorOption = isQuestionUppercase ? randomDistractor.toLowerCase() : randomDistractor.toUpperCase();
    if (!options.includes(distractorOption)) options.push(distractorOption);
  }

  container.innerHTML = `
    <p class="text-xl mb-6">اختر الحرف المطابق.</p>
    <div class="text-8xl font-bold mb-8 english-content">${questionLetter}</div>
    <div id="options-container" class="flex flex-wrap justify-center gap-4"></div>`;

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(optionLetter => {
    const btn = document.createElement('button');
    btn.className = 'sound-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = optionLetter;
    btn.onclick = () => {
      if (optionLetter === correctLetter) handleCorrectAnswer();
      else { handleWrongAttempt(); btn.disabled = true; btn.classList.add('incorrect'); setTimeout(() => { btn.classList.remove('incorrect'); btn.classList.add('opacity-50', 'cursor-not-allowed'); }, 500); }
    };
    optionsContainer.appendChild(btn);
  });
}

// -------------------- Event Listeners & Init --------------------
backButton.addEventListener('click', goBack);

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

startLearningBtn.addEventListener('click', startApp);

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
