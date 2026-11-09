// Computer players for Tiến lên: given the game, the move for the bot whose turn it is. Pure and
// deterministic, like Dangopoly's bots, so they can be tested and replayed.
//
// The idea: get rid of low cards first, in as few plays as possible, keep 2s and bombs for when
// they matter, and don't break up pairs and runs for a single. Easy bots are careless about it.

import type { BotLevel } from '../../engine/types';
import { rankOf, TWO } from './cards';
import type { Combo } from './combos';
import { legalPlays, type TienLenAction, type TienLenState } from './game';

const SPLIT_COST = 25; // what breaking up a pair, triple or four costs, in card numbers

const isBomb = (c: Combo): boolean => c.kind === 'quad' || c.kind === 'pairRun';
const hasTwo = (c: Combo): boolean => c.cards.some((card) => rankOf(card) === TWO);

/** A number in [0, 1) that depends only on the game: the same game, the same choice. */
function mood(state: TienLenState, salt: number): number {
  let h = Math.imul((state.rngState ^ (state.log.length * 0x9e3779b1) ^ salt) >>> 0, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32; // unsigned: the XOR on its own can come out negative
}

/** The move for the bot whose turn it is, or null when it's a person's turn (or the game is over). */
export function tienLenBotAction(state: TienLenState): TienLenAction | null {
  if (state.phase !== 'playing') return null;
  const me = state.players[state.current];
  if (!me.bot) return null;
  const level = me.bot;
  const plays = legalPlays(state);
  // Someone about to go out: no more saving the strong cards.
  const danger = state.players.some((p, i) => i !== state.current && p.place === null && p.hand.length <= 3);

  if (!state.table) {
    const best = pick(plays, (c) => leadCost(c, me.hand.length, level, danger));
    return { type: 'PLAY', cards: best.cards };
  }

  const usable = plays.filter((c) => level === 'easy' || danger || !(hasTwo(c) || isBomb(c)) || rankOf(state.table!.combo.top) === TWO);
  if (usable.length === 0 || (level === 'easy' && mood(state, 1) < 0.15)) return { type: 'PASS' }; // with a play on the table, passing is always allowed
  const best = pick(usable, (c) => answerCost(c, state, level));
  return { type: 'PLAY', cards: best.cards };
}

function pick(combos: Combo[], cost: (c: Combo) => number): Combo {
  return combos.reduce((best, c) => (cost(c) < cost(best) ? c : best));
}

/** Leading: the lowest cards, as many at once as possible; 2s and bombs only at the end. */
function leadCost(c: Combo, handSize: number, level: BotLevel, danger: boolean): number {
  if (c.cards.length === handSize) return -1000; // the whole hand in one go: done
  let cost = rankOf(c.top) * 10 - c.cards.length * (level === 'easy' ? 2 : 9);
  if (hasTwo(c) || isBomb(c)) cost += danger ? 40 : 200;
  return cost;
}

/** Answering: the cheapest play that beats the table, without breaking up what's worth keeping. */
function answerCost(c: Combo, state: TienLenState, level: BotLevel): number {
  const hand = state.players[state.current].hand;
  let cost = c.top;
  if (level !== 'easy') {
    // Splitting a pair, triple or four for a single (or a pair) wastes it.
    for (const card of c.cards) {
      const sameRank = hand.filter((h) => rankOf(h) === rankOf(card)).length;
      if (sameRank > c.cards.filter((x) => rankOf(x) === rankOf(card)).length) cost += SPLIT_COST;
    }
    if (hasTwo(c) || isBomb(c)) cost += 60;
  }
  return cost;
}
