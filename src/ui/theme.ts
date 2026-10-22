// The colors: follow the device, Giấy dó (light), Sơn mài (dark), Tết, Chàm, or high contrast.
// The choice is a data-theme attribute on <html>, which the styles read (styles.css, themes.css);
// index.html applies the saved choice before the page draws, so there's no flash.

export type Theme = 'auto' | 'light' | 'dark' | 'tet' | 'cham' | 'contrast';

export const THEMES: readonly Theme[] = ['auto', 'light', 'dark', 'tet', 'cham', 'contrast'];

const KEY = 'dangopoly.theme';

export function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (value && value !== 'auto' && THEMES.includes(value as Theme)) return value as Theme;
  } catch {
    // storage unavailable: follow the device
  }
  return 'auto';
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  try {
    if (theme === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // the choice just won't be remembered
  }
}

/** The theme button goes through them in order: auto → light → dark → Tết → Chàm → contrast → auto. */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}
