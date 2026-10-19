import { useState, type ReactNode } from 'react';
import { useLang } from '../i18n/LangContext';
import { isMuted, setMuted } from './sound';
import { applyTheme, nextTheme, savedTheme, type Theme } from './theme';

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language / Ngôn ngữ">
      {(['vi', 'en'] as const).map((l) => (
        <button key={l} className={l === lang ? 'active' : ''} aria-pressed={l === lang} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** Turns sound effects on or off; the choice is remembered. */
export function MuteButton() {
  const { t } = useLang();
  const [muted, setMutedState] = useState(isMuted);
  const toggle = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  const label = muted ? t.soundOn : t.soundOff;
  return (
    <button className="secondary small icon-only" onClick={toggle} aria-label={label} title={label} aria-pressed={muted}>
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

const THEME_ICONS: Record<Theme, string> = { auto: '🌓', light: '☀️', dark: '🌙' };

/** Cycles the colors: follow the device → light → dark. The choice is remembered. */
export function ThemeButton() {
  const { t } = useLang();
  const [theme, setTheme] = useState(savedTheme);
  const change = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    setTheme(next);
  };
  const label = t.themeLabel(t.themeNames[theme]);
  return (
    <button className="secondary small icon-only" onClick={change} aria-label={label} title={label}>
      {THEME_ICONS[theme]}
    </button>
  );
}

/** Top bar used during a game: back button, small logo, extra buttons, sound, theme and language. */
export function GameHeader({ children, onBack }: { children?: ReactNode; onBack: () => void }) {
  const { t } = useLang();
  return (
    <header className="game-header">
      <div className="logo-small">
        <button className="secondary small back-button" onClick={onBack} title={t.backToMenuHint}>
          ← <span className="back-text">{t.backToMenu}</span>
        </button>
        <span className="logo-word">Dangopoly</span>
        <span className="logo-edition">{t.edition}</span>
      </div>
      <div className="header-actions">
        {children}
        <MuteButton />
        <ThemeButton />
        <LangSwitch />
      </div>
    </header>
  );
}
