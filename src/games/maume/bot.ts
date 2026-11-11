// Computer players for Màu Mè: the move for the bot whose turn it is. Pure and deterministic, like
// the other games' bots.
//
// Pass the draws on when possible, keep the wild cards for when nothing else fits, stay in the color
// you hold most of, and hit the next player with Chặn, +2 or +4 when they're about to go out. Easy bots
// just play any card that fits.

import { cardPoints, colorOf, COLORS, FACE_DRAW2, FACE_REVERSE, FACE_SKIP, FACE_WILD4, faceOf, isWild, type Card } from './cards';
import { nextPlayer, playableCards, type MauMeAction, type MauMeState } from './game';

/** A number in [0, 1) that depends only on the game: the same game, the same choice. */
function mood(state: MauMeState, salt: number): number {
  let h = Math.imul((state.rngState ^ (state.log.length * 0x9e3779b1) ^ salt) >>> 0, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32; // unsigned: the XOR on its own can come out negative
}

/** The color this hand holds most of (ties: the lowest), not counting `except`. */
function bestColor(hand: readonly Card[], except?: Card): number {
  const counts = new Array<number>(COLORS).fill(0);
  for (const c of hand) if (c !== except && !isWild(c)) counts[colorOf(c)]++;
  return counts.indexOf(Math.max(...counts));
}

/** The move for the bot whose turn it is, or null when it's a person's turn (or the game is over). */
export function mauMeBotAction(state: MauMeState): MauMeAction | null {
  if (state.phase !== 'playing') return null;
  const me = state.players[state.current];
  if (!me.bot) return null;
  const plays = playableCards(state);
  const named = (card: Card): MauMeAction =>
    isWild(card) ? { type: 'PLAY', card, color: me.bot === 'easy' ? Math.floor(mood(state, 7) * COLORS) : bestColor(me.hand, card) } : { type: 'PLAY', card };

  if (state.drawn !== null) return plays.length > 0 ? named(plays[0]) : { type: 'PASS' };
  if (plays.length === 0) return { type: 'DRAW' };
  if (me.bot === 'easy') return named(plays[Math.floor(mood(state, 1) * plays.length)]);

  // Draws waiting: pass them on, the cheaper card first (a +2 before a +4).
  if (state.draw > 0) return named(plays.reduce((best, c) => (faceOf(c) === FACE_DRAW2 && faceOf(best) !== FACE_DRAW2 ? c : best)));

  // The next player is close to going out: slow them down if possible.
  const attack = state.players[nextPlayer(state, state.current)].hand.length <= 2;
  const mostColor = bestColor(me.hand);
  const cost = (card: Card): number => {
    const face = faceOf(card);
    let c = 0;
    if (isWild(card)) c += face === FACE_WILD4 && attack ? 20 : 100; // keep the wild cards for when nothing else fits
    if (attack && (face === FACE_SKIP || face === FACE_DRAW2 || face === FACE_REVERSE)) c -= 50;
    if (!isWild(card) && colorOf(card) !== mostColor) c += 10; // stay in the color you have most of
    return c - cardPoints(card) * 0.1; // and get rid of the cards that would score most against you
  };
  return named(plays.reduce((best, card) => (cost(card) < cost(best) ? card : best)));
}
