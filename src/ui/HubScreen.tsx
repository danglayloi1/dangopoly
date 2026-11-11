import type { CSSProperties } from 'react';
import bannerArt from '../assets/art/banner.webp';
import type { SaveFile } from '../engine/save';
import { useLang } from '../i18n/LangContext';
import { LangSwitch, ThemeButton } from './Header';
import { TIENLEN_TEXT } from '../games/tienlen/text';
import { EIGHTS_TEXT } from '../games/eights/text';
import './eights/eights.css';
import { parseCard } from '../games/tienlen/cards';
import { parseCards as parseColorCards } from '../games/maume/cards';
import { MAUME_TEXT } from '../games/maume/text';
import { ColorCard } from './maume/ColorCard';
import './maume/maume.css';
import { Icon } from './icons';
import { MenuChoice } from './MenuScreen';
import { PlayingCard } from './tienlen/PlayingCard';
import './tienlen/tienlen.css';

// The fan of cards on the Tiến lên card.
const FAN = ['A♠', '2♥', 'K♦'].map(parseCard);
// …and the four 8s on the Crazy Eights card.
const EIGHTS = ['8♠', '8♥', '8♣', '8♦'].map(parseCard);
// …and a fan of colors on the Màu Mè card.
const COLOR_FAN = parseColorCards('son 7, nghe skip, la +2, wild');

interface Props {
  saved: SaveFile | null; // an unfinished Dangopoly game, so its card can say so
  onDangopoly: () => void;
  onTienLen: () => void;
  onEights: () => void;
  onMauMe: () => void;
  onSettings: () => void;
  onBack: () => void; // to the entry screen
}

/**
 * Sân nhởi, the hub: pick a game. Each game has its own menu behind its card; the settings
 * (sound, animations, language, colors) are shared by all of them.
 */
export function HubScreen({ saved, onDangopoly, onTienLen, onEights, onMauMe, onSettings, onBack }: Props) {
  const { t, uiLang } = useLang();
  const tl = TIENLEN_TEXT[uiLang];
  const e8 = EIGHTS_TEXT[uiLang];
  const mm = MAUME_TEXT[uiLang];
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
        <button className="hub-game" onClick={onTienLen}>
          <span className="hub-game-art tl-hub-art" aria-hidden="true">
            {FAN.map((c, k) => (
              <PlayingCard key={c} card={c} style={{ '--k': k } as CSSProperties} />
            ))}
          </span>
          <span className="hub-game-text">
            <strong>{tl.name}</strong>
            <span>{tl.blurb}</span>
          </span>
        </button>
        <button className="hub-game" onClick={onEights}>
          <span className="hub-game-art e8-hub-art" aria-hidden="true">
            {EIGHTS.map((c, k) => (
              <PlayingCard key={c} card={c} style={{ '--k': k } as CSSProperties} />
            ))}
          </span>
          <span className="hub-game-text">
            <strong>{e8.name}</strong>
            <span>{e8.blurb}</span>
          </span>
        </button>
        <button className="hub-game" onClick={onMauMe}>
          <span className="hub-game-art mm-hub-art" aria-hidden="true">
            {COLOR_FAN.map((c, k) => (
              <ColorCard key={c} card={c} style={{ '--k': k } as CSSProperties} />
            ))}
          </span>
          <span className="hub-game-text">
            <strong>{mm.name}</strong>
            <span>{mm.blurb}</span>
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
