// app.js (ES module)
import { appData, getAchievements } from './data.js';
import { getDefaultProgress, validateProgress, shuffleArray, formatTime, getLearnedContent, computeStreak, pickDistractors, getPossibleActivities, isChunkComplete } from './logic.js';

// -------------------- Constants --------------------
const PLAY_SVG = `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
  <path fill-rule="evenodd"
        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
        clip-rule="evenodd"></path>
</svg>`;

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

let femaleVoice = null;
let currentActivity = {};
let audioCtx = null;
let learningTimer = null;
let saveTimeout = null;
let achievementQueue = [];
let isShowingAchievement = false;
let speechTimeout = null;

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
function saveProgress() { debouncedSave(); }

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
  pointsDisplay.textContent = userProgress.points;
  streakDisplay.textContent = userProgress.streak;
}

function handleStreak() {
  const updated = computeStreak(userProgress);
  if (updated.lastLoginDate === userProgress.lastLoginDate && updated.streak === userProgress.streak) return;
  userProgress.streak = updated.streak;
  userProgress.lastLoginDate = updated.lastLoginDate;
  checkAchievements();
  saveProgress();
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

// -------------------- Speech --------------------
function loadAndSetVoice() {
  if (!('speechSynthesis' in window)) { console.warn('Speech synthesis not supported'); return; }
  const voices = window.speechSynthesis.getVoices();

  femaleVoice = voices.find(v => v.name === 'Google UK English Female') ||
                voices.find(v => v.name === 'Google US English') ||
                voices.find(v => v.name?.includes('Samantha')) ||
                voices.find(v => v.name?.includes('Microsoft Hazel')) ||
                voices.find(v => v.name?.includes('Microsoft Zira')) ||
                voices.find(v => v.lang === 'en-GB' && v.name?.includes('Female')) ||
                voices.find(v => v.lang === 'en-US' && v.name?.includes('Female')) ||
                voices.find(v => v.lang === 'en-GB') ||
                voices.find(v => v.lang?.startsWith('en'));

  if (!femaleVoice && voices.length > 0) femaleVoice = voices[0];
}
function speak(text, rate = 0.8) {
  if (!('speechSynthesis' in window)) return;
  try {
    if (speechTimeout) { clearTimeout(speechTimeout); speechTimeout = null; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = rate;
    if (femaleVoice) u.voice = femaleVoice;
    u.onerror = (e) => console.error('Speech error:', e?.error);
    window.speechSynthesis.speak(u);
  } catch (e) { console.error('Speech synthesis failed:', e); }
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
  [dashboardView, lessonView, activityView, achievementsView, progressReportView, importantNoteView].forEach(v => v.classList.add('hidden'));
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
  }
}

// -------------------- Rendering --------------------
function renderDashboard() {
  chunkGrid.innerHTML = '';
  appData.chunks.forEach(chunk => {
    const isLocked = chunk.id > userProgress.unlockedChunk;
    const isCompleted = userProgress.completedChunks.includes(chunk.id);
    const card = document.createElement('div');
    card.className = `chunk-card p-6 border-2 rounded-xl shadow-sm cursor-pointer text-right ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : 'bg-white'}`;
    if (!isLocked) card.addEventListener('click', () => showLesson(chunk.id));

    const statusIcon = isLocked
      ? 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
      : isCompleted
      ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z';

    const iconColor = isLocked ? 'text-gray-400' : isCompleted ? 'text-green-600' : 'text-blue-500';
    const lettersDisplay = (chunk.letters && chunk.letters.length > 0) ? chunk.letters.join(', ') : 'مراجعة';

    card.innerHTML = `
      <div class="flex justify-between items-start">
        <span class="text-sm font-semibold text-gray-500">${chunk.title}</span>
        <svg class="w-6 h-6 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${statusIcon}"></path>
        </svg>
      </div>
      <h3 class="text-xl font-bold mt-2 text-gray-800 english-content">${lettersDisplay}</h3>
      ${chunk.letters && chunk.letters.length > 0 ? `
        <div class="mt-4 flex flex-wrap gap-1 justify-end">
          ${chunk.letters.map(l => `<span class="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1 rounded-full english-content">${l}</span>`).join('')}
        </div>` : ''}`;

    chunkGrid.appendChild(card);
  });
}

function showLesson(chunkId) {
  const chunk = appData.chunks.find(c => c.id === chunkId);
  if (!chunk) return;

  document.getElementById('lesson-title').textContent = chunk.title;
  mainTitle.textContent = `درس: ${chunk.title}`;

  const createSoundButton = (text, pronunciation) => {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center';

    const mainBtn = document.createElement('button');
    mainBtn.className = 'text-2xl font-bold bg-blue-100 text-blue-800 w-16 h-16 rounded-lg flex items-center justify-center hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500';
    mainBtn.textContent = text;
    mainBtn.setAttribute('aria-label', `Listen to ${text}`);
    let isPlaying = false;
    mainBtn.onclick = () => {
      if (!isPlaying) {
        isPlaying = true;
        speak(pronunciation || text);
        setTimeout(() => { isPlaying = false; }, 300);
      }
    };

    const slowBtn = document.createElement('button');
    slowBtn.className = 'text-xs text-gray-500 hover:text-blue-600 font-medium mt-1';
    slowBtn.textContent = 'صوت بطيء';
    slowBtn.setAttribute('aria-label', `Listen to ${text} slowly`);
    let isPlayingSlow = false;
    slowBtn.onclick = (e) => {
      e.stopPropagation();
      if (!isPlayingSlow) {
        isPlayingSlow = true;
        speak(pronunciation || text, 0.5);
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
    chunk.letters.forEach(l => lettersContainer.appendChild(createSoundButton(l.toUpperCase() + l, l)));
  } else {
    lettersContainer.innerHTML = '<p class="text-gray-500">مراجعة - لا توجد حروف جديدة</p>';
  }

  const wordsContainer = document.getElementById('lesson-words');
  wordsContainer.innerHTML = '';
  (chunk.words || []).forEach(w => wordsContainer.appendChild(createSoundButton(w)));

  renderActivities(chunkId);
  showView('lesson');
}

function renderActivities(chunkId) {
  const container = document.getElementById('activities-container');
  container.innerHTML = '';
  const chunk = appData.chunks.find(c => c.id === chunkId);
  const activities = [];

  if (chunk.letters && chunk.letters.length > 0) {
    activities.push({ id: 'sound-match', name: 'مطابقة صوت الحروف' });
    activities.push({ id: 'capital-match', name: 'مطابقة الحروف الكبيرة والصغيرة' });
  }
  if ((chunk.words && chunk.words.length > 0) || (chunk.letterPairs && chunk.letterPairs.length > 0)) {
    activities.push({ id: 'combined-sound-match', name: 'مطابقة أصوات الكلمات والمقاطع' });
  }
  if (chunk.words && chunk.words.length > 0) {
    activities.push({ id: 'word-build', name: 'بناء الكلمات' });
    activities.push({ id: 'fill-in-the-blank', name: 'إكمال الكلمة' });
    activities.push({ id: 'word-match', name: 'مطابقة الكلمات' });
    activities.push({ id: 'initial-sound', name: 'أوجد الصوت الأول' });
  }
  if (chunk.sentences && chunk.sentences.length > 0) {
    activities.push({ id: 'sentence-build', name: 'بناء الجمل' });
  }

  container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  const completed = userProgress.completedActivities[chunkId] || [];

  activities.forEach(activity => {
    const isCompleted = completed.includes(activity.id);
    const btn = document.createElement('button');
    btn.className = `activity-btn p-4 rounded-lg text-right text-lg font-semibold shadow-sm ${isCompleted ? 'bg-green-200 text-green-800' : 'bg-white hover:bg-gray-100'}`;
    btn.innerHTML = `<span class="block">${activity.name}</span> ${isCompleted ? '<span class="text-sm font-normal">مكتمل ✓</span>' : ''}`;
    btn.onclick = () => startActivity(chunkId, activity.id);
    container.appendChild(btn);
  });
}

// -------------------- Modals & Pages --------------------
function showModal(message) {
  modalMessage.textContent = message;
  modalButtons.innerHTML = `<button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg">متابعة</button>`;
  modalButtons.firstElementChild.onclick = () => {
    messageModal.classList.add('hidden');
    showLesson(currentActivity.chunkId);
  };
  messageModal.classList.remove('hidden');
}

function showConfirmationModal(message, onConfirm) {
  modalMessage.textContent = message;
  modalButtons.innerHTML = `
    <div class="flex justify-center gap-4">
      <button id="modal-cancel-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg">إلغاء</button>
      <button id="modal-confirm-btn" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg">تأكيد</button>
    </div>`;
  document.getElementById('modal-cancel-btn').onclick = () => messageModal.classList.add('hidden');
  document.getElementById('modal-confirm-btn').onclick = () => { messageModal.classList.add('hidden'); onConfirm(); };
  messageModal.classList.remove('hidden');
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
  document.getElementById('report-points').textContent = userProgress.points;
  document.getElementById('report-streak').textContent = userProgress.streak;
  document.getElementById('report-time').textContent = formatTime(userProgress.timeSpent);

  const masteredLetters = new Set();
  userProgress.completedChunks.forEach(chunkId => {
    const chunk = appData.chunks.find(c => c.id === chunkId);
    if (chunk && chunk.letters) chunk.letters.forEach(l => masteredLetters.add(l));
  });

  const arr = Array.from(masteredLetters).sort();
  document.getElementById('report-letters-count').textContent = arr.length;
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
function startActivity(chunkId, activityType) {
  const chunk = appData.chunks.find(c => c.id === chunkId);
  let questions = [];
  let title = '';

  if (activityType === 'sound-match') {
    questions = chunk.letters || [];
    title = 'مطابقة صوت الحروف';
  } else if (activityType === 'combined-sound-match') {
    questions = [...(chunk.words || []), ...(chunk.letterPairs || [])];
    title = 'مطابقة أصوات الكلمات والمقاطع';
  } else if (['word-build','fill-in-the-blank','word-match','initial-sound'].includes(activityType)) {
    questions = chunk.words || [];
    if (activityType === 'word-build') title = 'بناء الكلمات';
    if (activityType === 'fill-in-the-blank') title = 'إكمال الكلمة';
    if (activityType === 'word-match') title = 'مطابقة الكلمات';
    if (activityType === 'initial-sound') title = 'أوجد الصوت الأول';
  } else if (activityType === 'sentence-build') {
    questions = chunk.sentences || [];
    title = 'بناء الجمل';
  } else if (activityType === 'capital-match') {
    questions = chunk.letters || [];
    title = 'مطابقة الحروف الكبيرة والصغيرة';
  }

  if (!questions || questions.length === 0) {
    showModal("لا توجد أسئلة لهذا النشاط.");
    return;
  }

  currentActivity = {
    chunkId,
    activityType,
    questions: shuffleArray(questions).slice(0, Math.min(5, questions.length)),
    currentIndex: 0
  };

  document.getElementById('activity-title').textContent = title;
  mainTitle.textContent = 'نشاط';
  showView('activity');
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
    const { chunkId, activityType } = currentActivity;
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
          showModal(`عمل رائع! لقد فتحت ${nextChunk.title}.`);
        } else {
          showModal("اكتملت المجموعة! أحسنت صنعًا.");
        }
      } else {
        showModal("اكتمل النشاط! عمل جيد.");
      }
    } else {
      showModal("اكتمل النشاط! استمر في التقدم.");
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

  document.getElementById('play-word-sound-btn').onclick = () => speak(word);
  document.getElementById('play-word-slow-sound-btn').onclick = () => speak(word, 0.5);

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'sound-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = letter;
    btn.onclick = () => {
      if (letter.toLowerCase() === correctLetter) {
        handleCorrectAnswer();
      } else {
        playFailureSound();
        btn.classList.add('incorrect');
        setTimeout(() => btn.classList.remove('incorrect'), 500);
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

  document.getElementById('play-sound-btn').onclick = () => speak(correctItem);
  document.getElementById('play-slow-sound-btn').onclick = () => speak(correctItem, 0.5);

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
      else { playFailureSound(); btn.classList.add('incorrect'); setTimeout(() => btn.classList.remove('incorrect'), 500); }
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

  document.getElementById('play-sound-btn').onclick = () => speak(correctWord);
  document.getElementById('play-slow-sound-btn').onclick = () => speak(correctWord, 0.5);

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'word-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = word;
    btn.onclick = () => {
      if (word === correctWord) handleCorrectAnswer();
      else { playFailureSound(); btn.classList.add('incorrect'); setTimeout(() => btn.classList.remove('incorrect'), 500); }
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

  document.getElementById('play-word-sound-btn').onclick = () => speak(word);
  document.getElementById('play-word-slow-sound-btn').onclick = () => speak(word, 0.5);

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'sound-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = letter;
    btn.onclick = () => {
      if (letter === correctLetter) handleCorrectAnswer();
      else { playFailureSound(); btn.classList.add('incorrect'); setTimeout(() => btn.classList.remove('incorrect'), 500); }
    };
    optionsContainer.appendChild(btn);
  });
}

function renderWordBuildUI(word, container) {
  const letters = shuffleArray(word.split(''));
  container.innerHTML = `
    <p class="text-xl mb-4">استمع للكلمة ثم كوّنها باستخدام هذه الحروف.</p>
    <div class="flex flex-col items-center gap-1 mb-8">
      <button id="play-word-sound-btn" class="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full" aria-label="Play word">
        ${PLAY_SVG}
      </button>
      <button id="play-word-slow-sound-btn" class="text-sm text-gray-500 hover:text-blue-600 font-medium">صوت بطيء</button>
    </div>
    <div id="answer-slots" class="flex justify-center gap-2 mb-8 english-content">
      ${word.split('').map((_, i) => `<div class="letter-slot w-16 h-16 bg-gray-200 rounded-lg" data-index="${i}"></div>`).join('')}
    </div>
    <div id="letter-choices" class="flex justify-center gap-2 english-content">
      ${letters.map((l, i) => `<button class="draggable-letter w-16 h-16 bg-blue-100 text-blue-800 text-3xl font-bold rounded-lg hover:bg-blue-200" data-letter="${l}" data-original-index="${i}">${l}</button>`).join('')}
    </div>
    <div id="retry-container" class="h-12 mt-4"></div>`;

  document.getElementById('play-word-sound-btn').onclick = () => speak(word);
  document.getElementById('play-word-slow-sound-btn').onclick = () => speak(word, 0.5);

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
            playFailureSound();
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

  document.getElementById('play-sentence-sound-btn').onclick = () => speak(sentence.text);
  document.getElementById('play-sentence-slow-sound-btn').onclick = () => speak(sentence.text, 0.5);

  const optionsContainer = document.getElementById('options-container');
  shuffleArray(options).forEach(word => {
    const btn = document.createElement('button');
    btn.className = 'word-option-btn font-bold bg-gray-100 text-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-200 english-content';
    btn.textContent = word;
    btn.onclick = () => {
      if (word === correctWord) handleCorrectAnswer();
      else { playFailureSound(); btn.classList.add('incorrect'); setTimeout(() => btn.classList.remove('incorrect'), 500); }
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
      else { playFailureSound(); btn.classList.add('incorrect'); setTimeout(() => btn.classList.remove('incorrect'), 500); }
    };
    optionsContainer.appendChild(btn);
  });
}

// -------------------- Event Listeners & Init --------------------
backButton.addEventListener('click', () => { showView('dashboard'); renderDashboard(); });

menuButton.addEventListener('click', (event) => { event.stopPropagation(); dropdownMenu.classList.toggle('hidden'); });
window.addEventListener('click', () => { if (!dropdownMenu.classList.contains('hidden')) dropdownMenu.classList.add('hidden'); });

document.getElementById('progress-report-button').addEventListener('click', () => { dropdownMenu.classList.add('hidden'); renderProgressReportPage(); });
document.getElementById('achievements-button').addEventListener('click', () => { dropdownMenu.classList.add('hidden'); renderAchievementsPage(); });
document.getElementById('important-note-button').addEventListener('click', () => { dropdownMenu.classList.add('hidden'); renderImportantNotePage(); });

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
    try { localStorage.removeItem('literacyAppProgress'); } catch (e) { console.warn('Cannot clear localStorage (private browsing?):', e); }
    userProgress = getDefaultProgress();
    updateHeaderStats();
    renderDashboard();
  });
});

document.getElementById('unlock-all').addEventListener('click', () => {
  dropdownMenu.classList.add('hidden');
  showConfirmationModal('هل أنت متأكد من رغبتك في فتح جميع الوحدات؟', () => {
    // unlock all by setting to the id of the last chunk
    const last = appData.chunks[appData.chunks.length - 1];
    userProgress.unlockedChunk = last ? last.id : userProgress.unlockedChunk;
    saveProgress();
    renderDashboard();
  });
});

document.getElementById('achievement-close-btn').addEventListener('click', () => {
  achievementUnlockedModal.classList.add('hidden');
  showNextAchievement();
});

function init() {
  loadProgress();
  handleStreak();
  updateHeaderStats();

  loadAndSetVoice();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadAndSetVoice;
  }

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

// Landing actions
document.getElementById('landing-year').textContent = new Date().getFullYear();

startLearningBtn.addEventListener('click', () => {
  document.getElementById('landing-year').textContent = new Date().getFullYear();
  landingPage.classList.add('hidden');
  appContainer.classList.remove('hidden');
  appContainer.classList.add('fade-in');
  init();
  initAudio();
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
