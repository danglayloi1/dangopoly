// Crazy Eights (Tám Điên) as a pure state machine, like the other games: applyEights(state, action)
// -> new state, for whoever's move it is. The input is never changed.
//
// The classic game with the usual action cards. Play a card of the same suit or rank as the top of the
// pile; 8s are wild (and name the next suit); a 2 makes the next player draw two unless they add a 2 of
// their own (the draws add up); a queen skips the next player; an ace turns the direction around.
// Can't (or won't) play? Draw one card; if it fits it may be played at once, otherwise the turn ends.
// First to empty their hand wins the game and scores the cards left in everyone else's.
//
// It uses the same 52 cards as Tiến lên (see ../tienlen/cards.ts): only ranks and suits matter here.

import type { PlayerColorId } from '../../data/colors';
import type { TokenId } from '../../data/tokens';
import { shuffledDeck } from '../../engine/deck';
import type { BotLevel } from '../../engine/types';
import { byStrength, DECK_SIZE, rankOf, suitOf, type Card } from '../tienlen/cards';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
const LOG_LIMIT = 200;

// Ranks as numbered in ../tienlen/cards.ts (0 is the 3, 12 the 2).
export const RANK_EIGHT = 5;
export const RANK_QUEEN = 9;
export const RANK_ACE = 11;
export const RANK_TWO = 12;

/** What `drawn` holds when a player wanted to draw but there was no card left anywhere: they may only pass. */
export const NOTHING_DRAWN = -1;

/** Seven cards each between two players, five each with more. */
export const handSize = (players: number): number => (players === 2 ? 7 : 5);

export interface EightsPlayer {
  name: string;
  token: TokenId;
  color: PlayerColorId;
  bot?: BotLevel;
  hand: Card[]; // weakest first, as in Tiến lên, which also groups each rank
}

export type EightsLog =
  | { type: 'dealt'; game: number; first: Card }
  | { type: 'played'; player: number; card: Card; suit?: number } // suit: what an 8 called for
  | { type: 'drew'; player: number; count: number; forced: boolean } // forced: the 2s piled on them
  | { type: 'passed'; player: number }
  | { type: 'skipped'; player: number } // by a queen
  | { type: 'reversed' } // by an ace
  | { type: 'reshuffled' } // the pile went back into the deck
  | { type: 'won'; player: number; points: number };

export interface EightsState {
  players: EightsPlayer[];
  current: number;
  direction: 1 | -1;
  deck: Card[]; // face down; the next card drawn is the last
  pile: Card[]; // face up; the top is the last
  suit: number; // the suit to follow: the top card's, or what an 8 called for
  draw: number; // cards the current player must draw unless they add a 2 (0 when there's no 2 waiting)
  drawn: Card | null; // the card just drawn this turn: only it may still be played, or pass (NOTHING_DRAWN: none was left)
  phase: 'playing' | 'over';
  game: number;
  scores: number[];
  log: EightsLog[];
  rngState: number;
}

export type EightsAction = { type: 'PLAY'; card: Card; suit?: number } | { type: 'DRAW' } | { type: 'PASS' } | { type: 'NEXT_GAME' };

export class EightsError extends Error {}

export interface NewEightsPlayer {
  name: string;
  token: TokenId;
  color: PlayerColorId;
  bot?: BotLevel;
}

/** What a card left in a hand is worth to the winner: 8s 50, pictures and 10s 10, aces 1, the rest their number. */
export function cardPoints(card: Card): number {
  const rank = rankOf(card);
  if (rank === RANK_EIGHT) return 50;
  if (rank === RANK_ACE) return 1;
  if (rank === RANK_TWO) return 2;
  return rank >= 7 ? 10 : rank + 3; // 7 is the 10; below it, 3…9
}

export function createEights({ players, seed }: { players: NewEightsPlayer[]; seed: number }): EightsState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new EightsError(`Crazy Eights needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  const state: EightsState = {
    players: players.map((p) => ({ ...p, hand: [] })),
    current: 0,
    direction: 1,
    deck: [],
    pile: [],
    suit: 0,
    draw: 0,
    drawn: null,
    phase: 'playing',
    game: 0,
    scores: players.map(() => 0),
    log: [],
    rngState: seed >>> 0,
  };
  deal(state, 0);
  return state;
}

export function applyEights(state: EightsState, action: EightsAction): EightsState {
  const s = copyState(state);
  if (action.type === 'NEXT_GAME') {
    if (s.phase !== 'over') throw new EightsError('The game is still going');
    // The winner starts the next game.
    const winner = [...s.log].reverse().find((e) => e.type === 'won');
    deal(s, winner?.type === 'won' ? winner.player : 0);
  } else {
    if (s.phase !== 'playing') throw new EightsError('The game is over');
    if (action.type === 'PLAY') play(s, action.card, action.suit);
    else if (action.type === 'DRAW') draw(s);
    else pass(s);
  }
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
  return s;
}

/** The cards the current player may play now. */
export function playableCards(state: EightsState): Card[] {
  if (state.phase !== 'playing') return [];
  const hand = state.players[state.current].hand;
  if (state.drawn !== null) return canPlay(state, state.drawn) ? [state.drawn] : [];
  return hand.filter((c) => canPlay(state, c));
}

/** Whether the current player may draw (once a turn; with 2s waiting, drawing them is the other choice). */
export const canDraw = (state: EightsState): boolean => state.phase === 'playing' && state.drawn === null;

/** Whether the current player may pass: only after drawing a card that fits (or when there was nothing to draw). */
export const canPass = (state: EightsState): boolean => state.phase === 'playing' && state.drawn !== null;

function canPlay(state: EightsState, card: Card): boolean {
  if (state.draw > 0) return rankOf(card) === RANK_TWO; // only another 2 answers a 2
  const top = state.pile[state.pile.length - 1];
  return rankOf(card) === RANK_EIGHT || suitOf(card) === state.suit || rankOf(card) === rankOf(top);
}

// ---------------------------------------------------------------------------

function copyState(state: EightsState): EightsState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    pile: [...state.pile],
    scores: [...state.scores],
    log: [...state.log],
  };
}

/** A new game: shuffle, deal, and turn up the first card (an 8 there goes back in the deck). */
function deal(s: EightsState, first: number): void {
  const [deck, rng] = shuffledDeck(DECK_SIZE, s.rngState);
  s.rngState = rng;
  const n = handSize(s.players.length);
  s.players.forEach((p, i) => (p.hand = deck.slice(i * n, (i + 1) * n).sort(byStrength)));
  s.deck = deck.slice(s.players.length * n);
  let up = s.deck.findIndex((c) => rankOf(c) !== RANK_EIGHT);
  if (up < 0) up = 0;
  s.pile = s.deck.splice(up, 1);
  s.suit = suitOf(s.pile[0]);
  s.game++;
  s.phase = 'playing';
  s.direction = 1;
  s.draw = 0;
  s.drawn = null;
  s.current = first;
  s.log.push({ type: 'dealt', game: s.game, first: s.pile[0] });
}

function play(s: EightsState, card: Card, called?: number): void {
  const player = s.players[s.current];
  if (!player.hand.includes(card)) throw new EightsError('That card is not in this hand');
  if (s.drawn !== null && card !== s.drawn) throw new EightsError('Only the card just drawn may be played');
  if (!canPlay(s, card)) throw new EightsError('That card does not fit');
  const eight = rankOf(card) === RANK_EIGHT;
  if (eight && !(Number.isInteger(called) && called! >= 0 && called! <= 3)) throw new EightsError('An 8 must name a suit');

  player.hand = player.hand.filter((c) => c !== card);
  s.pile.push(card);
  s.suit = eight ? called! : suitOf(card);
  s.drawn = null;
  s.log.push(eight ? { type: 'played', player: s.current, card, suit: called } : { type: 'played', player: s.current, card });

  if (player.hand.length === 0) {
    win(s, s.current);
    return;
  }
  const rank = rankOf(card);
  if (rank === RANK_TWO) s.draw += 2;
  if (rank === RANK_ACE) {
    s.direction = s.direction === 1 ? -1 : 1;
    s.log.push({ type: 'reversed' });
    // With two players, turning around means playing again: an ace works like a queen.
    if (s.players.length === 2) {
      s.log.push({ type: 'skipped', player: next(s, s.current) });
      return;
    }
  }
  if (rank === RANK_QUEEN) {
    const skipped = next(s, s.current);
    s.log.push({ type: 'skipped', player: skipped });
    s.current = next(s, skipped);
    return;
  }
  s.current = next(s, s.current);
}

function draw(s: EightsState): void {
  if (s.drawn !== null) throw new EightsError('Only one card may be drawn a turn');
  const player = s.players[s.current];
  if (s.draw > 0) {
    // The 2s piled up: draw them all, and the turn is over.
    const count = s.draw;
    const got = take(s, count);
    player.hand = [...player.hand, ...got].sort(byStrength);
    s.log.push({ type: 'drew', player: s.current, count: got.length, forced: true });
    s.draw = 0;
    s.current = next(s, s.current);
    return;
  }
  const [card] = take(s, 1);
  s.log.push({ type: 'drew', player: s.current, count: card === undefined ? 0 : 1, forced: false });
  if (card === undefined) {
    // Nothing left anywhere to draw: the player may only pass.
    s.drawn = NOTHING_DRAWN;
    return;
  }
  player.hand = [...player.hand, card].sort(byStrength);
  if (canPlay(s, card)) s.drawn = card; // it fits: play it now, or pass
  else s.current = next(s, s.current);
}

function pass(s: EightsState): void {
  if (s.drawn === null) throw new EightsError('Draw a card before passing');
  s.drawn = null;
  s.log.push({ type: 'passed', player: s.current });
  s.current = next(s, s.current);
}

/** Up to `count` cards from the deck; when it runs out, the pile (all but its top card) is shuffled in. */
function take(s: EightsState, count: number): Card[] {
  const got: Card[] = [];
  while (got.length < count) {
    if (s.deck.length === 0) {
      if (s.pile.length <= 1) break;
      const top = s.pile.pop()!;
      const [order, rng] = shuffledDeck(s.pile.length, s.rngState);
      s.rngState = rng;
      s.deck = order.map((i) => s.pile[i]);
      s.pile = [top];
      s.log.push({ type: 'reshuffled' });
    }
    got.push(s.deck.pop()!);
  }
  return got;
}

const next = (s: EightsState, from: number): number => (from + s.direction + s.players.length) % s.players.length;

function win(s: EightsState, player: number): void {
  const points = s.players.reduce((sum, p, i) => (i === player ? sum : sum + p.hand.reduce((t, c) => t + cardPoints(c), 0)), 0);
  s.scores[player] += points;
  s.phase = 'over';
  s.draw = 0;
  s.drawn = null;
  s.log.push({ type: 'won', player, points });
}
