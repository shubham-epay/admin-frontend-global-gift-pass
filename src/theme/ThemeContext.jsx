import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Theme preference: 'light' | 'dark' | 'system'. The resolved theme is written to
 * <html data-theme="…">; index.html applies it before first paint to avoid a flash.
 * Stored per browser in localStorage (optional: everything works if storage is blocked).
 */
const KEY = 'ggp-admin-theme';
const ThemeContext = createContext(null);
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

const readPref = () => {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; }
};

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPref);
  const [systemDark, setSystemDark] = useState(() => Boolean(media?.matches));
  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    if (!media) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.dataset.theme = theme;
    // Suppress per-element transitions for one frame so the whole UI swaps at once.
    const t = setTimeout(() => root.classList.remove('theme-switching'), 60);
    return () => clearTimeout(t);
  }, [theme]);

  const setTheme = useCallback((pref) => {
    setPreference(pref);
    try { if (pref === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, pref); } catch { /* storage unavailable */ }
  }, []);
  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const value = useMemo(() => ({ preference, theme, setTheme, toggle }), [preference, theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
