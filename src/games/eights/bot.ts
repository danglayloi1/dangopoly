// Computer players for Crazy Eights: the move for the bot whose turn it is. Pure and deterministic,
// like the other games' bots.
//
// Keep the 8s for when nothing else fits, follow with the suit you hold most of (so the next turns
// fit too), and hit the next player with a 2 or a queen when they're about to go out. Easy bots just
// play the first card that fits.

import { rankOf, suitOf, type Card } from '../tienlen/cards';
import { cardPoints, playableCards, RANK_EIGHT, RANK_QUEEN, RANK_TWO, type EightsAction, type EightsState } from './game';

/** A number in [0, 1) that depends only on the game: the same game, the same choice. */
function mood(state: EightsState, salt: number): number {
  let h = Math.imul((state.rngState ^ (state.log.length * 0x9e3779b1) ^ salt) >>> 0, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32; // unsigned: the XOR on its own can come out negative
}

/** The suit this hand holds most of (ties: the lowest suit), not counting `except`. */
function bestSuit(hand: readonly Card[], except?: Card): number {
  const counts = [0, 0, 0, 0];
  for (const c of hand) if (c !== except && rankOf(c) !== RANK_EIGHT) counts[suitOf(c)]++;
  return counts.indexOf(Math.max(...counts));
}

/** The move for the bot whose turn it is, or null when it's a person's turn (or the game is over). */
export function eightsBotAction(state: EightsState): EightsAction | null {
  if (state.phase !== 'playing') return null;
  const me = state.players[state.current];
  if (!me.bot) return null;
  const plays = playableCards(state);
  const withSuit = (card: Card): EightsAction =>
    rankOf(card) === RANK_EIGHT
      ? { type: 'PLAY', card, suit: me.bot === 'easy' ? Math.floor(mood(state, 7) * 4) : bestSuit(me.hand, card) }
      : { type: 'PLAY', card };

  if (state.drawn !== null) return plays.length > 0 ? withSuit(plays[0]) : { type: 'PASS' };
  if (plays.length === 0) return { type: 'DRAW' };
  if (me.bot === 'easy') return withSuit(plays[Math.floor(mood(state, 1) * plays.length)]);

  // The next player is close to going out: slow them down if possible.
  const nextPlayer = state.players[(state.current + state.direction + state.players.length) % state.players.length];
  const attack = nextPlayer.hand.length <= 2;
  const mostSuit = bestSuit(me.hand);
  const cost = (card: Card): number => {
    const rank = rankOf(card);
    let c = 0;
    if (rank === RANK_EIGHT) c += 100; // keep the wild cards for when nothing else fits
    if (attack && (rank === RANK_TWO || rank === RANK_QUEEN)) c -= 50;
    if (suitOf(card) !== mostSuit) c += 10; // stay in the suit you have most of
    return c - cardPoints(card) * 0.1; // and get rid of the cards that would score most against you
  };
  return withSuit(plays.reduce((best, card) => (cost(card) < cost(best) ? card : best)));
}
