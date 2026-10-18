import { CARDS, type CardDeck } from '../data/cards';
import { nextUint32 } from './rng';

/** The cards 0..size-1 in random order (Fisher–Yates). Returns [deck, next RNG state]. */
export function shuffledDeck(size: number, rngState: number): [number[], number] {
  const deck = Array.from({ length: size }, (_, i) => i);
  let state = rngState;
  for (let i = size - 1; i > 0; i--) {
    const [r, next] = nextUint32(state);
    state = next;
    const j = r % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return [deck, state];
}

/** Index of the "Ra tù miễn phí" card in a deck. */
export function jailFreeCardIndex(deck: CardDeck): number {
  return CARDS[deck].findIndex((card) => card.effect.kind === 'jailFree');
}
