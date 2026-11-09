import { TIENLEN_TEXT } from '../../games/tienlen/text';
import { useLang } from '../../i18n/LangContext';
import { LangSwitch, ThemeButton } from '../Header';
import { MenuChoice } from '../MenuScreen';

/** Tiến lên's menu, reached from the hub: against the computer, or online. */
export function TienLenMenu({ onBots, onOnline, onBack }: { onBots: () => void; onOnline: () => void; onBack: () => void }) {
  const { t, uiLang } = useLang();
  const tl = TIENLEN_TEXT[uiLang];
  return (
    <main className="setup menu">
      <header className="menu-top">
        <button className="secondary small back-button" onClick={onBack} aria-label={t.back}>
          ← <span className="back-text">{t.back}</span>
        </button>
        <span className="logo-word">{tl.name}</span>
        <span className="spacer" />
        <ThemeButton />
        <LangSwitch />
      </header>
      <h1 className="menu-title">{t.menuTitle}</h1>
      <nav className="menu-choices" aria-label={t.menuTitle}>
        <MenuChoice icon="bot" title={tl.vsBots} hint={tl.vsBotsHint} onClick={onBots} />
        <MenuChoice icon="globe" title={tl.online} hint={tl.onlineHint} onClick={onOnline} />
      </nav>
    </main>
  );
}
