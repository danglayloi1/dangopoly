// Light / dark / follow the device. The choice is a data-theme attribute on <html>, which the
// styles read; index.html applies the saved choice before the page draws, so there's no flash.

export type Theme = 'auto' | 'light' | 'dark';

const KEY = 'dangopoly.theme';

export function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'light' || value === 'dark') return value;
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

/** auto → light → dark → auto */
export function nextTheme(theme: Theme): Theme {
  return theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto';
}
