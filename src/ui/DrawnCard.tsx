import { useState } from 'react';
import { CARDS, DECK_NAMES, type CardDeck } from '../data/cards';
import chanceArt from '../assets/art/chance.webp';
import communityArt from '../assets/art/community.webp';
import { useLang } from '../i18n/LangContext';

export const CARD_ART: Record<CardDeck, string> = { chance: chanceArt, community: communityArt };

/**
 * Loads both card pictures as soon as a game opens. A page left open across a new release would
 * otherwise ask for picture files that no longer exist when the first card is drawn.
 */
export function preloadCardArt() {
  for (const src of Object.values(CARD_ART)) new Image().src = src;
}

/** The Cơ hội / Khí vận card just drawn, printed like a folk card: picture on the left, words on the right. */
export function DrawnCard({ deck, card }: { deck: CardDeck; card: number }) {
  const { lang } = useLang();
  // If the picture can't load, the frame keeps its drawn pattern instead of a broken image.
  const [artFailed, setArtFailed] = useState(false);
  return (
    <div className={`drawn-card deck-${deck}`} role="note">
      <div className="drawn-card-art" aria-hidden="true">
        {!artFailed && <img src={CARD_ART[deck]} alt="" onError={() => setArtFailed(true)} />}
      </div>
      <div className="drawn-card-body">
        <div className="drawn-card-head">{DECK_NAMES[deck][lang]}</div>
        <p>{CARDS[deck][card].text[lang]}</p>
      </div>
    </div>
  );
}
