// Màu Mè, a color-matching card game, as a pure state machine like the other games:
// applyMauMe(state, action) -> new state, for whoever's move it is. The input is never changed.
//
// Play a card of the same color or the same face as the top of the pile. Chặn skips the next player,
// Quay turns the direction around (with two players it works like Chặn), +2 makes the next player
// draw two. Đổi màu goes on anything and names the next color; +4 does too, and the next player draws
// four. Draws add up: a +2 may be answered with another +2 or a +4, a +4 only with another +4; whoever
// can't (or won't) draws the lot and loses the turn. Otherwise, can't play? Draw one card; if it fits it
// may be played at once, or pass. Down to one card, a player calls "Báo!" (the game does it for them).
// First to empty their hand wins the game and scores the cards left in everyone else's.

import type { PlayerColorId } from '../../data/colors';
import type { TokenId } from '../../data/tokens';
import { shuffledDeck } from '../../engine/deck';
import type { BotLevel } from '../../engine/types';
import { byColor, cardPoints, colorOf, COLORS, DECK_SIZE, FACE_DRAW2, FACE_REVERSE, FACE_SKIP, FACE_WILD4, faceOf, isWild, type Card } from './cards';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const HAND_SIZE = 7;
const LOG_LIMIT = 200;

/** What `drawn` holds when a player wanted to draw but there was no card left anywhere: they may only pass. */
export const NOTHING_DRAWN = -1;

export interface MauMePlayer {
  name: string;
  token: TokenId;
  color: PlayerColorId;
  bot?: BotLevel;
  hand: Card[]; // by color, then face
}

export type MauMeLog =
  | { type: 'dealt'; game: number; first: Card }
  | { type: 'played'; player: number; card: Card; color?: number } // color: what a wild card named
  | { type: 'drew'; player: number; count: number; forced: boolean } // forced: the +2s and +4s piled on them
  | { type: 'passed'; player: number }
  | { type: 'skipped'; player: number }
  | { type: 'reversed' }
  | { type: 'lastCard'; player: number } // "Báo!": one card left
  | { type: 'reshuffled' } // the pile went back into the deck
  | { type: 'won'; player: number; points: number };

export interface MauMeState {
  players: MauMePlayer[];
  current: number;
  direction: 1 | -1;
  deck: Card[]; // face down; the next card drawn is the last
  pile: Card[]; // face up; the top is the last
  color: number; // the color to follow: the top card's, or what a wild card named
  draw: number; // cards the current player must draw unless they add to them (0 when nothing is waiting)
  drawn: Card | null; // the card just drawn this turn: only it may still be played, or pass (NOTHING_DRAWN: none was left)
  phase: 'playing' | 'over';
  game: number;
  scores: number[];
  log: MauMeLog[];
  rngState: number;
}

export type MauMeAction = { type: 'PLAY'; card: Card; color?: number } | { type: 'DRAW' } | { type: 'PASS' } | { type: 'NEXT_GAME' };

export class MauMeError extends Error {}

export interface NewMauMePlayer {
  name: string;
  token: TokenId;
  color: PlayerColorId;
  bot?: BotLevel;
}

export function createMauMe({ players, seed }: { players: NewMauMePlayer[]; seed: number }): MauMeState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new MauMeError(`Màu Mè needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  const state: MauMeState = {
    players: players.map((p) => ({ ...p, hand: [] })),
    current: 0,
    direction: 1,
    deck: [],
    pile: [],
    color: 0,
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

export function applyMauMe(state: MauMeState, action: MauMeAction): MauMeState {
  const s = copyState(state);
  if (action.type === 'NEXT_GAME') {
    if (s.phase !== 'over') throw new MauMeError('The game is still going');
    // The winner starts the next game.
    const winner = [...s.log].reverse().find((e) => e.type === 'won');
    deal(s, winner?.type === 'won' ? winner.player : 0);
  } else {
    if (s.phase !== 'playing') throw new MauMeError('The game is over');
    if (action.type === 'PLAY') play(s, action.card, action.color);
    else if (action.type === 'DRAW') draw(s);
    else pass(s);
  }
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
  return s;
}

/** The cards the current player may play now. */
export function playableCards(state: MauMeState): Card[] {
  if (state.phase !== 'playing') return [];
  if (state.drawn !== null) return state.drawn !== NOTHING_DRAWN && canPlay(state, state.drawn) ? [state.drawn] : [];
  return state.players[state.current].hand.filter((c) => canPlay(state, c));
}

/** Whether the current player may draw (once a turn; with draws waiting, taking them is the other choice). */
export const canDraw = (state: MauMeState): boolean => state.phase === 'playing' && state.drawn === null;

/** Whether the current player may pass: only after drawing a card that fits (or when there was nothing to draw). */
export const canPass = (state: MauMeState): boolean => state.phase === 'playing' && state.drawn !== null;

/** Whether `card` may go on the pile now. */
export function canPlay(state: MauMeState, card: Card): boolean {
  const top = state.pile[state.pile.length - 1];
  if (state.draw > 0) {
    // Only adding to the draws answers them: +2 or +4 on a +2, +4 on a +4.
    return faceOf(card) === FACE_WILD4 || (faceOf(card) === FACE_DRAW2 && faceOf(top) === FACE_DRAW2);
  }
  return isWild(card) || colorOf(card) === state.color || (!isWild(top) && faceOf(card) === faceOf(top));
}

// ---------------------------------------------------------------------------

function copyState(state: MauMeState): MauMeState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    pile: [...state.pile],
    scores: [...state.scores],
    log: [...state.log],
  };
}

/** A new game: shuffle, deal seven each, and turn up a number card to start on. */
function deal(s: MauMeState, first: number): void {
  const [deck, rng] = shuffledDeck(DECK_SIZE, s.rngState);
  s.rngState = rng;
  s.players.forEach((p, i) => (p.hand = deck.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE).sort(byColor)));
  s.deck = deck.slice(s.players.length * HAND_SIZE);
  const up = s.deck.findIndex((c) => faceOf(c) <= 9); // there are 72 number cards: one is always left
  s.pile = s.deck.splice(up, 1);
  s.color = colorOf(s.pile[0]);
  s.game++;
  s.phase = 'playing';
  s.direction = 1;
  s.draw = 0;
  s.drawn = null;
  s.current = first;
  s.log.push({ type: 'dealt', game: s.game, first: s.pile[0] });
}

function play(s: MauMeState, card: Card, named?: number): void {
  const player = s.players[s.current];
  if (!player.hand.includes(card)) throw new MauMeError('That card is not in this hand');
  if (s.drawn !== null && card !== s.drawn) throw new MauMeError('Only the card just drawn may be played');
  if (!canPlay(s, card)) throw new MauMeError('That card does not fit');
  const wild = isWild(card);
  if (wild && !(Number.isInteger(named) && named! >= 0 && named! < COLORS)) throw new MauMeError('A wild card must name a color');

  player.hand = player.hand.filter((c) => c !== card);
  s.pile.push(card);
  s.color = wild ? named! : colorOf(card);
  s.drawn = null;
  s.log.push(wild ? { type: 'played', player: s.current, card, color: named } : { type: 'played', player: s.current, card });

  if (player.hand.length === 0) {
    win(s, s.current);
    return;
  }
  if (player.hand.length === 1) s.log.push({ type: 'lastCard', player: s.current });

  const face = faceOf(card);
  if (face === FACE_DRAW2) s.draw += 2;
  if (face === FACE_WILD4) s.draw += 4;
  if (face === FACE_REVERSE) {
    s.direction = s.direction === 1 ? -1 : 1;
    s.log.push({ type: 'reversed' });
    // With two players, turning around means playing again: Quay works like Chặn.
    if (s.players.length === 2) {
      s.log.push({ type: 'skipped', player: next(s, s.current) });
      return;
    }
  }
  if (face === FACE_SKIP) {
    const skipped = next(s, s.current);
    s.log.push({ type: 'skipped', player: skipped });
    s.current = next(s, skipped);
    return;
  }
  s.current = next(s, s.current);
}

function draw(s: MauMeState): void {
  if (s.drawn !== null) throw new MauMeError('Only one card may be drawn a turn');
  const player = s.players[s.current];
  if (s.draw > 0) {
    // The draws piled up: take them all, and the turn is over.
    const got = take(s, s.draw);
    player.hand = [...player.hand, ...got].sort(byColor);
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
  player.hand = [...player.hand, card].sort(byColor);
  if (canPlay(s, card))
    s.drawn = card; // it fits: play it now, or pass
  else s.current = next(s, s.current);
}

function pass(s: MauMeState): void {
  if (s.drawn === null) throw new MauMeError('Draw a card before passing');
  s.drawn = null;
  s.log.push({ type: 'passed', player: s.current });
  s.current = next(s, s.current);
}

/** Up to `count` cards from the deck; when it runs out, the pile (all but its top card) is shuffled in. */
function take(s: MauMeState, count: number): Card[] {
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

export const nextPlayer = (s: Pick<MauMeState, 'direction' | 'players'>, from: number): number => (from + s.direction + s.players.length) % s.players.length;
const next = nextPlayer;

function win(s: MauMeState, player: number): void {
  const points = s.players.reduce((sum, p, i) => (i === player ? sum : sum + p.hand.reduce((t, c) => t + cardPoints(c), 0)), 0);
  s.scores[player] += points;
  s.phase = 'over';
  s.draw = 0;
  s.drawn = null;
  s.log.push({ type: 'won', player, points });
}
