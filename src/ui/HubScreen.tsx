import bannerArt from '../assets/art/banner.webp';
import type { SaveFile } from '../engine/save';
import { useLang } from '../i18n/LangContext';
import { LangSwitch, ThemeButton } from './Header';
import { Icon } from './icons';
import { MenuChoice } from './MenuScreen';

interface Props {
  saved: SaveFile | null; // an unfinished Dangopoly game, so its card can say so
  onDangopoly: () => void;
  onSettings: () => void;
  onBack: () => void; // to the entry screen
}

/**
 * Sân nhởi, the hub: pick a game. Each game has its own menu behind its card; the settings
 * (sound, animations, language, colors) are shared by all of them.
 */
export function HubScreen({ saved, onDangopoly, onSettings, onBack }: Props) {
  const { t } = useLang();
  return (
    <main className="setup menu hub">
      <header className="menu-top">
        <button className="secondary small back-button" onClick={onBack} aria-label={t.back}>
          ← <span className="back-text">{t.back}</span>
        </button>
        <span className="logo-word">{t.hubName}</span>
        <span className="spacer" />
        <ThemeButton />
        <LangSwitch />
      </header>

      <h1 className="menu-title">{t.hubPick}</h1>
      <div className="hub-games">
        <button className="hub-game" onClick={onDangopoly}>
          <img className="hub-game-art" src={bannerArt} alt="" width={1600} height={900} />
          <span className="hub-game-text">
            <strong>Dangopoly</strong>
            <span>{t.dangopolyBlurb}</span>
            {saved && <span className="badge hub-saved">{t.hubSaved}</span>}
          </span>
        </button>
        <div className="hub-game soon" aria-disabled="true">
          <span className="hub-game-art hub-soon-art" aria-hidden="true">
            <Icon name="chicken" size={44} />
            <Icon name="lantern" size={44} />
            <Icon name="dice" size={44} />
          </span>
          <span className="hub-game-text">
            <strong>{t.moreGames}</strong>
            <span>{t.moreGamesHint}</span>
            <span className="badge">{t.comingSoon}</span>
          </span>
        </div>
      </div>

      <nav className="menu-choices" aria-label={t.settings}>
        <MenuChoice icon="gear" title={t.settings} hint={t.settingsHint} onClick={onSettings} />
      </nav>

      <footer>
        {t.footer} · v{__APP_VERSION__}
      </footer>
    </main>
  );
}
