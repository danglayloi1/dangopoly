import type { ReactNode } from 'react';
import { useLang } from '../i18n/LangContext';

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
        <LangSwitch />
      </div>
    </header>
  );
}
