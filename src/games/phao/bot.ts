// Computer players for Pháo Tết: the move for the bot whose turn it is. Pure and deterministic, like the
// other games' bots, and fair: a bot only knows its own hand, what everyone can count, and what its own
// Nhòm showed it. It never looks at the deck.
//
// Take cards from others when it can, look before drawing when the odds are bad, and get out of drawing
// when a firecracker is known to be on top (or the odds are very bad without a bucket). A put-out
// firecracker goes back on top for the next player (hard), near the top (normal), or anywhere (easy).

import { kindOf, type Card, type CardKind } from './cards';
import { canPlay, firecrackersLeft, foodPairs, targets, type PhaoAction, type PhaoState } from './game';

/** A number in [0, 1) that depends only on the game: the same game, the same choice. */
function mood(state: PhaoState, salt: number): number {
  let h = Math.imul((state.rngState ^ (state.log.length * 0x9e3779b1) ^ salt) >>> 0, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32; // unsigned: the XOR on its own can come out negative
}

/** The move for the bot whose move it is, or null when it's a person's move (or the game is over). */
export function phaoBotAction(state: PhaoState): PhaoAction | null {
  if (state.phase.kind === 'over') return null;
  const me = state.players[state.current];
  if (!me.bot) return null;

  if (state.phase.kind === 'hide') {
    const size = state.deck.length;
    if (me.bot === 'hard' || size === 0) return { type: 'HIDE', position: 0 };
    if (me.bot === 'normal') return { type: 'HIDE', position: Math.floor(mood(state, 3) * Math.min(3, size + 1)) };
    return { type: 'HIDE', position: Math.floor(mood(state, 3) * (size + 1)) };
  }

  const hand = me.hand;
  const card = (kind: CardKind): Card | undefined => hand.find((c) => kindOf(c) === kind && canPlay(state, c));
  const richest = (): number => targets(state).reduce((best, i) => (state.players[i].hand.length > state.players[best].hand.length ? i : best));
  const pick = (from: number[]): number => from[Math.floor(mood(state, 5) * from.length)];

  if (me.bot === 'easy') {
    // Plays a card now and then, otherwise draws.
    const playable = hand.filter((c) => canPlay(state, c));
    if (playable.length > 0 && mood(state, 1) < 0.35) {
      const c = playable[Math.floor(mood(state, 2) * playable.length)];
      return kindOf(c) === 'xin' ? { type: 'PLAY', card: c, target: pick(targets(state)) } : { type: 'PLAY', card: c };
    }
    return { type: 'DRAW' };
  }

  // Take cards from the others first: more cards, more ways out.
  const pairs = foodPairs(state);
  if (pairs.length > 0) return { type: 'PAIR', cards: pairs[0], target: richest() };
  const xin = card('xin');
  if (xin !== undefined) return { type: 'PLAY', card: xin, target: richest() };

  const hasBucket = hand.some((c) => kindOf(c) === 'xo');
  const seen = state.peek?.player === state.current ? state.peek.cards : null;
  const odds = state.deck.length === 0 ? 0 : firecrackersLeft(state) / state.deck.length;
  const escape = (): PhaoAction | null => {
    for (const kind of ['day', 'ne'] as const) {
      const c = card(kind);
      if (c !== undefined) return { type: 'PLAY', card: c };
    }
    const shuffle = card('xoc');
    if (shuffle !== undefined) return { type: 'PLAY', card: shuffle };
    const bottom = card('day2');
    if (bottom !== undefined && !(seen && seen.length === state.deck.length && kindOf(seen[seen.length - 1]) === 'phao')) {
      return { type: 'PLAY', card: bottom };
    }
    return null;
  };

  if (seen) {
    if (kindOf(seen[0]) === 'phao') return escape() ?? { type: 'DRAW' };
    return { type: 'DRAW' }; // the top card is safe
  }
  const worried = hasBucket ? odds >= (me.bot === 'hard' ? 0.3 : 0.4) : odds >= (me.bot === 'hard' ? 0.12 : 0.2);
  if (worried) {
    const look = card('nhom');
    if (look !== undefined) return { type: 'PLAY', card: look };
    if (!hasBucket) return escape() ?? { type: 'DRAW' };
  }
  return { type: 'DRAW' };
}
