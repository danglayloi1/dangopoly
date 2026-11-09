import { useLang } from '../i18n/LangContext';
import { LangSwitch, ThemeButton } from './Header';
import { MenuChoice } from './MenuScreen';

/** The words a card game's menu needs. */
export interface CardGameMenuText {
  name: string;
  vsBots: string;
  vsBotsHint: string;
  online: string;
  onlineHint: string;
}

/** A card game's menu, reached from the hub: against the computer, online, or the guided first game. */
interface Props {
  text: CardGameMenuText;
  onBots: () => void;
  onOnline: () => void;
  onTutorial: () => void;
  onBack: () => void;
}

export function CardGameMenu({ text, onBots, onOnline, onTutorial, onBack }: Props) {
  const { t } = useLang();
  return (
    <main className="setup menu">
      <header className="menu-top">
        <button className="secondary small back-button" onClick={onBack} aria-label={t.back}>
          ← <span className="back-text">{t.back}</span>
        </button>
        <span className="logo-word">{text.name}</span>
        <span className="spacer" />
        <ThemeButton />
        <LangSwitch />
      </header>
      <h1 className="menu-title">{t.menuTitle}</h1>
      <nav className="menu-choices" aria-label={t.menuTitle}>
        <MenuChoice icon="bot" title={text.vsBots} hint={text.vsBotsHint} onClick={onBots} />
        <MenuChoice icon="globe" title={text.online} hint={text.onlineHint} onClick={onOnline} />
        <MenuChoice icon="scroll" title={t.tutorialStart} hint={t.tutorialIntro} onClick={onTutorial} />
      </nav>
    </main>
  );
}
