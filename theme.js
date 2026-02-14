const THEME_STORAGE_KEY = 'literacyAppTheme';

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
  } catch (e) {
    console.warn('Cannot read theme preference:', e);
  }
  return getSystemTheme();
}

let currentTheme = getInitialTheme();

function applyTheme(theme) {
  currentTheme = theme === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('dark-mode', currentTheme === 'dark');
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeToggleLabels();
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.warn('Cannot save theme preference:', e);
  }
}

function toggleTheme() {
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  persistTheme(nextTheme);
}

function updateThemeToggleLabels() {
  const isDark = currentTheme === 'dark';
  const menuToggle = document.getElementById('theme-toggle');
  const headerToggle = document.getElementById('theme-toggle-header');

  if (menuToggle) {
    menuToggle.textContent = isDark ? '☀️ تفعيل الوضع الفاتح' : '🌙 تفعيل الوضع الداكن';
    menuToggle.setAttribute('aria-pressed', String(isDark));
  }

  if (headerToggle) {
    headerToggle.textContent = isDark ? '☀️' : '🌙';
    headerToggle.setAttribute('aria-pressed', String(isDark));
    headerToggle.setAttribute('aria-label', isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن');
  }
}

function ensureThemeControls() {
  const backButton = document.getElementById('back-button');
  const headerActions = backButton?.parentElement;

  if (headerActions && !document.getElementById('theme-toggle-header')) {
    const headerToggle = document.createElement('button');
    headerToggle.id = 'theme-toggle-header';
    headerToggle.type = 'button';
    headerToggle.className = 'bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-3 rounded-lg';
    headerToggle.textContent = '🌙';
    headerToggle.setAttribute('aria-pressed', 'false');
    headerToggle.setAttribute('aria-label', 'تبديل الوضع الداكن');
    headerActions.classList.add('gap-2');
    headerActions.insertBefore(headerToggle, backButton);
  }

  const menuActions = document.querySelector('#dropdown-menu .py-1');
  if (menuActions && !document.getElementById('theme-toggle')) {
    const menuToggle = document.createElement('button');
    menuToggle.id = 'theme-toggle';
    menuToggle.type = 'button';
    menuToggle.className = 'block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
    menuToggle.setAttribute('aria-pressed', 'false');
    menuToggle.textContent = '🌙 تفعيل الوضع الداكن';

    const unlockAllBtn = document.getElementById('unlock-all');
    if (unlockAllBtn) menuActions.insertBefore(menuToggle, unlockAllBtn);
    else menuActions.appendChild(menuToggle);
  }
}

function attachThemeEvents() {
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    document.getElementById('dropdown-menu')?.classList.add('hidden');
    toggleTheme();
  });

  document.getElementById('theme-toggle-header')?.addEventListener('click', toggleTheme);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    let hasSavedTheme = false;
    try {
      hasSavedTheme = !!localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      hasSavedTheme = false;
    }

    if (!hasSavedTheme) {
      applyTheme(getSystemTheme());
    }
  });
}

ensureThemeControls();
attachThemeEvents();
applyTheme(currentTheme);
