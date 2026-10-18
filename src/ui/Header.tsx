import { useState, type ReactNode } from 'react';
import { useLang } from '../i18n/LangContext';
import { isMuted, setMuted } from './sound';

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

/** Top bar used during a game: small logo, extra buttons, language switch. */
export function GameHeader({ children }: { children?: ReactNode }) {
  const { t } = useLang();
  return (
    <header className="game-header">
      <div className="logo-small">
        <span className="logo-word">Dangopoly</span>
        <span className="logo-edition">{t.edition}</span>
      </div>
      <div className="header-actions">
        {children}
        <MuteButton />
        <LangSwitch />
      </div>
    </header>
  );
}
