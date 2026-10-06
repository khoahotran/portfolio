import { useCallback, useEffect, useState } from 'react';
import { applyTheme, resolveTheme, storeTheme, systemTheme, THEME_STORAGE_KEY, type Theme } from './theme';

/**
 * Reads and writes the active theme.
 *
 * The initial state re-derives from the DOM rather than assuming a default, because the inline
 * bootstrap in index.html has already applied the correct theme before React mounts — starting
 * from a guess here would make the toggle show the wrong icon on first paint for anyone whose
 * theme isn't the default.
 *
 * Also follows the OS setting live, but only while the visitor has made no explicit choice: once
 * they've picked, changing the system theme must not override them.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === 'undefined' ? 'light' : document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;

    const onChange = () => {
      let hasExplicitChoice = false;
      try {
        hasExplicitChoice = localStorage.getItem(THEME_STORAGE_KEY) !== null;
      } catch {
        // Storage unreadable — treat as no explicit choice and follow the OS.
      }
      if (hasExplicitChoice) return;

      const next = systemTheme();
      applyTheme(next);
      setTheme(next);
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      storeTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}

/**
 * Re-applies the resolved theme on mount. The inline bootstrap already did this, so this is a
 * safety net for the one case the bootstrap can't cover: a prerendered page is served with
 * whatever class the build machine had (forced to light — see scripts/prerender.mjs), and if the
 * inline script were ever removed or blocked, this keeps the page correct one frame later.
 */
export function useThemeBootstrap(): void {
  useEffect(() => {
    applyTheme(resolveTheme());
  }, []);
}
