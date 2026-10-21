import { CARDS, DECK_NAMES, type CardDeck } from '../data/cards';
import chanceArt from '../assets/art/chance.webp';
import communityArt from '../assets/art/community.webp';
import { useLang } from '../i18n/LangContext';

/** The Cơ hội / Khí vận card just drawn, shown like a real card. */
export function DrawnCard({ deck, card }: { deck: CardDeck; card: number }) {
  const { lang } = useLang();
  return (
    <div className={`drawn-card deck-${deck}`} role="note">
      <img className="drawn-card-art" src={deck === 'chance' ? chanceArt : communityArt} alt="" />
      <div className="drawn-card-head">
        {DECK_NAMES[deck][lang]}
      </div>
      <p>{CARDS[deck][card].text[lang]}</p>
    </div>
  );
}
