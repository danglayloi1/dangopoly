import bannerArt from '../assets/art/banner.webp';
import { useLang } from '../i18n/LangContext';
import { LangSwitch, ThemeButton } from './Header';
import { playSound } from './sound';

/**
 * The first screen: the picture, the name, and one button. The tap also lets the browser play
 * sound from then on (browsers only allow it after the player has touched the page).
 */
export function TitleScreen({ onEnter }: { onEnter: () => void }) {
  const { t } = useLang();
  return (
    <main className="title-screen">
      <div className="title-top">
        <ThemeButton />
        <LangSwitch />
      </div>
      <img className="title-art" src={bannerArt} alt={t.heroAlt} width={1600} height={900} />
      <div className="title-text">
        <h1>Dangopoly</h1>
        <p className="edition">{t.edition}</p>
        <p className="tagline">{t.tagline}</p>
        <button
          className="primary big enter-button"
          onClick={() => {
            playSound('enter');
            onEnter();
          }}
          autoFocus
        >
          {t.enterGame} →
        </button>
      </div>
      <footer>
        {t.footer} · v{__APP_VERSION__}
      </footer>
    </main>
  );
}
