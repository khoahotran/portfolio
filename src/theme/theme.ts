/**
 * Theme state, kept deliberately small and framework-free so the same logic can run from the
 * inline bootstrap script in index.html (which must execute before first paint, long before React
 * exists) and from the React toggle.
 *
 * Two states, not three. The initial value follows the operating system; once the visitor clicks
 * the toggle their choice is stored and wins from then on. A third explicit "system" state would
 * let them hand control back, but it costs a tri-state control in a 48px-tall header for a case
 * that is served well enough by clearing site data — so the simpler control wins here.
 */
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'portfolio-theme';

export function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Reads the stored preference, falling back to the OS setting.
 *
 * Wrapped in try/catch because localStorage throws outright — not returns null — in a browser
 * configured to block site data, and in that case the page must still render with a correct theme
 * rather than white-screen on a storage exception.
 */
export function resolveTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage unavailable — fall through to the OS preference.
  }
  return systemTheme();
}

/** Single place that knows how a theme is expressed in the DOM: a `dark` class on <html>. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Preference won't persist across reloads; the current page is still themed correctly.
  }
}
