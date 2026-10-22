import type { SaveFile } from '../engine/save';
import { useLang } from '../i18n/LangContext';
import { LangSwitch, ThemeButton } from './Header';
import { SavedGameCard } from './SavedGameCard';

interface Props {
  saved: SaveFile | null;
  onContinue: () => void;
  onDiscard: () => void;
  onLocal: () => void;
  onOnline: () => void;
  onTutorial: () => void;
  onSettings: () => void;
}

/** The main menu: continue a saved game, or choose how to play. */
export function MenuScreen({ saved, onContinue, onDiscard, onLocal, onOnline, onTutorial, onSettings }: Props) {
  const { t } = useLang();
  return (
    <main className="setup menu">
      <header className="menu-top">
        <span className="logo-word">Dangopoly</span>
        <span className="spacer" />
        <ThemeButton />
        <LangSwitch />
      </header>

      {saved && <SavedGameCard saved={saved} onContinue={onContinue} onDiscard={onDiscard} />}

      <h1 className="menu-title">{t.menuTitle}</h1>
      <nav className="menu-choices" aria-label={t.menuTitle}>
        <MenuChoice icon="🎲" title={t.playLocal} hint={t.playLocalHint} onClick={onLocal} />
        <MenuChoice icon="🌐" title={t.online} hint={t.onlineIntro} onClick={onOnline} />
        <MenuChoice icon="🎓" title={t.tutorialStart} hint={t.tutorialIntro} onClick={onTutorial} />
        <MenuChoice icon="⚙️" title={t.settings} hint={t.settingsHint} onClick={onSettings} />
      </nav>

      <footer>
        {t.footer} · v{__APP_VERSION__}
      </footer>
    </main>
  );
}

function MenuChoice({ icon, title, hint, onClick }: { icon: string; title: string; hint: string; onClick: () => void }) {
  return (
    <button className="menu-choice" onClick={onClick}>
      <span className="menu-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="menu-text">
        <strong>{title}</strong>
        <span>{hint}</span>
      </span>
      <span className="menu-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
