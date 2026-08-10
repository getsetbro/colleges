// @ts-check
// Light/dark theme switcher shown below the footer on every page. The chosen
// theme is stored in localStorage and applied by setting data-theme on <html>;
// an inline <head> script in each page applies it before first paint to avoid a
// flash, and this module re-applies on load in case that script is absent.

const STORAGE_KEY = 'college-theme';

/** @typedef {'light' | 'dark'} Theme */

/** @param {Theme} theme */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

/** The active theme: a stored choice, else the OS preference. @returns {Theme} */
function resolveTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Apply as early as this module executes (belt-and-braces with the inline script).
applyTheme(resolveTheme());

class ThemeToggle extends HTMLElement {
  connectedCallback() {
    this.className = 'theme-toggle';
    this.#render();
    this.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      this.#render();
    });
  }

  #render() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    // The button offers the theme you'd switch *to*.
    const label = isDark ? 'Light theme' : 'Dark theme';
    const icon = isDark ? '☀' : '☾';
    this.innerHTML = `<button type="button" aria-pressed="${isDark}"><span class="theme-toggle-icon" aria-hidden="true">${icon}</span>${label}</button>`;
  }
}

customElements.define('theme-toggle', ThemeToggle);
