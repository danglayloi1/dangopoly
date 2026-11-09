import type { CSSProperties } from 'react';
import { cardName, isRed, RANKS, rankOf, SUITS, suitOf, type Card } from '../../games/tienlen/cards';

interface Props {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * A playing card, printed like the rest of the game: cream paper, an ink border, red or black.
 * Clickable cards (in your hand) are buttons; the others are pictures.
 */
export function PlayingCard({ card, selected = false, onClick, style }: Props) {
  const rank = RANKS[rankOf(card)];
  const suit = SUITS[suitOf(card)];
  const className = `pcard${isRed(card) ? ' red' : ''}${selected ? ' selected' : ''}`;
  const face = (
    <>
      <span className="pcard-corner">
        {rank}
        <br />
        {suit}
      </span>
      <span className="pcard-middle" aria-hidden="true">
        {suit}
      </span>
    </>
  );
  if (!onClick) {
    return (
      <span className={className} style={style} role="img" aria-label={cardName(card)}>
        {face}
      </span>
    );
  }
  return (
    <button type="button" className={className} style={style} aria-pressed={selected} aria-label={cardName(card)} onClick={onClick}>
      {face}
    </button>
  );
}

/** The back of a card: what everyone sees of the others' hands. */
export function CardBack({ style }: { style?: CSSProperties }) {
  return <span className="pcard back" style={style} aria-hidden="true" />;
}
