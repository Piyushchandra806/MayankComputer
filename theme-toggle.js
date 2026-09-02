/**
 * Theme Toggle — Light / Dark Mode System
 *
 * Reads user preference from localStorage, falls back to system
 * prefers-color-scheme, sets data-theme on <html>.
 *
 * Usage:
 *   import { initThemeToggle } from '/theme-toggle.js';
 *   initThemeToggle();
 */

/**
 * Returns the resolved theme ('light' | 'dark').
 * Priority: localStorage > system preference > 'dark' default.
 */
function getPreferredTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

/** Apply theme to <html> */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/** Toggle and persist */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
  updateToggleLabels(next);
}

/** Update aria-labels on all toggle buttons */
function updateToggleLabels(theme) {
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-label', label);
  });
}

/**
 * Initialize the theme system.
 * Call after DOMContentLoaded.
 */
export function initThemeToggle() {
  const theme = getPreferredTheme();
  applyTheme(theme);
  updateToggleLabels(theme);

  // Bind click on all toggle buttons (supports multiple pages / navbars)
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });

  // Listen for system preference changes (when no localStorage override)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
      updateToggleLabels(e.matches ? 'dark' : 'light');
    }
  });
}
