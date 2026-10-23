import type { SaveFile } from '../engine/save';
import { useLang } from '../i18n/LangContext';
import { LangSwitch, ThemeButton } from './Header';
import { SavedGameCard } from './SavedGameCard';
import { Icon, type IconName } from './icons';

interface Props {
  saved: SaveFile | null;
  onContinue: () => void;
  onDiscard: () => void;
  onLocal: () => void;
  onBots: () => void;
  onOnline: () => void;
  onTutorial: () => void;
  onSettings: () => void;
  onBack: () => void; // to the entry screen
}

/** The main menu: continue a saved game, or choose how to play. */
export function MenuScreen({ saved, onContinue, onDiscard, onLocal, onBots, onOnline, onTutorial, onSettings, onBack }: Props) {
  const { t } = useLang();
  return (
    <main className="setup menu">
      <header className="menu-top">
        <button className="secondary small back-button" onClick={onBack} aria-label={t.back}>
          ← <span className="back-text">{t.back}</span>
        </button>
        <span className="logo-word">Dangopoly</span>
        <span className="spacer" />
        <ThemeButton />
        <LangSwitch />
      </header>

      {saved && <SavedGameCard saved={saved} onContinue={onContinue} onDiscard={onDiscard} />}

      <h1 className="menu-title">{t.menuTitle}</h1>
      <nav className="menu-choices" aria-label={t.menuTitle}>
        <MenuChoice icon="dice" title={t.playLocal} hint={t.playLocalHint} onClick={onLocal} />
        <MenuChoice icon="bot" title={t.playBots} hint={t.playBotsHint} onClick={onBots} />
        <MenuChoice icon="globe" title={t.online} hint={t.onlineIntro} onClick={onOnline} />
        <MenuChoice icon="scroll" title={t.tutorialStart} hint={t.tutorialIntro} onClick={onTutorial} />
        <MenuChoice icon="gear" title={t.settings} hint={t.settingsHint} onClick={onSettings} />
      </nav>

      <footer>
        {t.footer} · v{__APP_VERSION__}
      </footer>
    </main>
  );
}

function MenuChoice({ icon, title, hint, onClick }: { icon: IconName; title: string; hint: string; onClick: () => void }) {
  return (
    <button className="menu-choice" onClick={onClick}>
      <span className="menu-icon" aria-hidden="true">
        <Icon name={icon} size={30} />
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
