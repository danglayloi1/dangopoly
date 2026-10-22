import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { UiLang } from '../data/text';
import { useLang } from '../i18n/LangContext';
import { getVolume, isMuted, playSound, setMuted, setVolume } from './sound';
import { applyTheme, nextTheme, savedTheme, type Theme } from './theme';

const LANG_LABELS: Record<UiLang, { short: string; full: string }> = {
  vi: { short: 'VI', full: 'Tiếng Việt' },
  nghe: { short: 'NGHỆ', full: 'Tiếng Nghệ' },
  en: { short: 'EN', full: 'English' },
};

/** Tiếng Việt, Tiếng Nghệ (the local dialect) or English; the choice is remembered. */
export function LangSwitch() {
  const { uiLang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language / Ngôn ngữ">
      {(['vi', 'nghe', 'en'] as const).map((l) => (
        <button
          key={l}
          className={l === uiLang ? 'active' : ''}
          aria-pressed={l === uiLang}
          aria-label={LANG_LABELS[l].full}
          title={LANG_LABELS[l].full}
          onClick={() => setLang(l)}
        >
          {LANG_LABELS[l].short}
        </button>
      ))}
    </div>
  );
}

/** Sound effects on or off, and their volume; both are remembered. Used in the top bar and in Settings. */
export function SoundSettings({ onChange }: { onChange?: (silent: boolean) => void }) {
  const { t } = useLang();
  const [muted, setMutedState] = useState(isMuted);
  const [volume, setVolumeState] = useState(getVolume);
  useEffect(() => onChange?.(muted || volume === 0), [muted, volume, onChange]);

  const toggle = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };
  return (
    <div className="sound-settings">
      <button type="button" className="secondary small" onClick={toggle} aria-pressed={muted}>
        {muted ? `🔇 ${t.soundOn}` : `🔊 ${t.soundOff}`}
      </button>
      <label className="volume">
        <span>{t.effectsVolume}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={volume}
          disabled={muted}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            setVolumeState(Number(e.target.value));
          }}
        />
        <output>{volume}%</output>
      </label>
      <button type="button" className="secondary small" disabled={muted} onClick={() => playSound('coins')}>
        ▶ {t.testSound}
      </button>
      <p className="muted small-note">{t.musicVolumeNote}</p>
    </div>
  );
}

/** The 🔊 button in the top bar: opens a small panel with SoundSettings. */
export function SoundButton() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [silent, setSilent] = useState(() => isMuted() || getVolume() === 0);
  const box = useRef<HTMLDivElement>(null);

  // Close when tapping anywhere else, or with Esc.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="sound-control" ref={box}>
      <button
        className="secondary small icon-only"
        onClick={() => setOpen((o) => !o)}
        aria-label={t.soundSettings}
        title={t.soundSettings}
        aria-expanded={open}
      >
        {silent ? '🔇' : '🔊'}
      </button>
      {open && (
        <div className="sound-popover" role="group" aria-label={t.soundSettings}>
          <SoundSettings onChange={setSilent} />
        </div>
      )}
    </div>
  );
}

const THEME_ICONS: Record<Theme, string> = { auto: '🌓', light: '☀️', dark: '🌙' };

/** For Settings: the three color choices side by side. */
export function ThemePicker() {
  const { t } = useLang();
  const [theme, setTheme] = useState(savedTheme);
  return (
    <div className="segmented" role="radiogroup" aria-label={t.theme}>
      {(['auto', 'light', 'dark'] as const).map((choice) => (
        <button
          key={choice}
          type="button"
          role="radio"
          aria-checked={theme === choice}
          className={theme === choice ? 'selected' : ''}
          onClick={() => {
            applyTheme(choice);
            setTheme(choice);
          }}
        >
          {THEME_ICONS[choice]} {t.themeNames[choice]}
        </button>
      ))}
    </div>
  );
}

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

/** Top bar of the menu's screens: back to the menu, the screen's name, then colors and language. */
export function ScreenTop({ title, onBack, controls = true }: { title: string; onBack: () => void; controls?: boolean }) {
  const { t } = useLang();
  return (
    <header className="screen-top">
      <button className="secondary small back-button" onClick={onBack}>
        ← <span className="back-text">{t.back}</span>
      </button>
      <h1 className="screen-title">{title}</h1>
      {controls && (
        <div className="screen-top-actions">
          <ThemeButton />
          <LangSwitch />
        </div>
      )}
    </header>
  );
}

/** Top bar used during a game: back button, small logo, extra buttons, sound, theme and language. */
export function GameHeader({ children, onBack }: { children?: ReactNode; onBack: () => void }) {
  const { t } = useLang();
  return (
    <header className="game-header">
      <div className="logo-small">
        <button className="secondary small back-button" onClick={onBack} title={t.backToMenuHint} aria-label={t.backToMenu}>
          ← <span className="back-text">{t.backToMenu}</span>
        </button>
        <span className="logo-word">Dangopoly</span>
        <span className="logo-edition">{t.edition}</span>
      </div>
      <div className="header-actions">
        {children}
        <SoundButton />
        <ThemeButton />
        <LangSwitch />
      </div>
    </header>
  );
}
