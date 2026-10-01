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

// The settings switch reflects the current theme
function updateThemeToggleLabels() {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.setAttribute('aria-checked', String(currentTheme === 'dark'));
}

function attachThemeEvents() {
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

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

attachThemeEvents();
applyTheme(currentTheme);
