// Tiến lên (southern rules) as a pure state machine, like Dangopoly's engine:
// applyTienLen(state, action) -> new state, for whoever's move it is. The input is never changed.
//
// Each game: 13 cards each. In the first game of a match, whoever holds the lowest card dealt (3♠
// with four players) leads, and that first play must include it; after that the last game's winner
// leads. Players beat the play on the table with the same shape, higher (or with a bomb), or pass;
// passing leaves the round until everyone else has passed too, and the last to play leads the next.
// Whoever empties their hand finishes; the game goes on until one player is left (bét).

import type { PlayerColorId } from '../../data/colors';
import type { TokenId } from '../../data/tokens';
import { shuffledDeck } from '../../engine/deck';
import type { BotLevel } from '../../engine/types';
import { byStrength, DECK_SIZE, HAND_SIZE, rankOf, TWO, type Card } from './cards';
import { beats, comboOf, combosIn, isChop, type Combo, type ComboKind } from './combos';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
const LOG_LIMIT = 200;

/** Hands so strong they win on the deal (tới trắng). */
export type InstantWin = 'fourTwos' | 'dragon' | 'sixPairs' | 'fivePairRun';

export interface TienLenPlayer {
  name: string;
  token: TokenId;
  color: PlayerColorId;
  bot?: BotLevel;
  hand: Card[]; // weakest first
  place: number | null; // 1 for whoever went out first; null while still playing
  passed: boolean; // sitting out the current round
}

export type TienLenLog =
  | { type: 'dealt'; game: number; leader: number }
  | {
      type: 'played';
      player: number;
      cards: Card[];
      kind: ComboKind;
      chop: boolean;
    }
  | { type: 'passed'; player: number }
  | { type: 'roundWon'; player: number } // everyone else passed: this player leads the next round
  | { type: 'finished'; player: number; place: number }
  | { type: 'instantWin'; player: number; how: InstantWin }
  | { type: 'gameOver'; places: number[] };

export interface TienLenState {
  players: TienLenPlayer[];
  current: number; // whose move it is
  table: { combo: Combo; by: number } | null; // the play to beat; null when the current player leads
  mustInclude: Card | null; // the first play of a match must include this card
  phase: 'playing' | 'over';
  game: number; // 1 for the first game of the match
  scores: number[]; // points over the match: each game, n − place for everyone
  log: TienLenLog[];
  rngState: number;
}

export type TienLenAction = { type: 'PLAY'; cards: Card[] } | { type: 'PASS' } | { type: 'NEXT_GAME' };

export class TienLenError extends Error {}

export interface NewTienLenPlayer {
  name: string;
  token: TokenId;
  color: PlayerColorId;
  bot?: BotLevel;
}

export function createTienLen({ players, seed }: { players: NewTienLenPlayer[]; seed: number }): TienLenState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new TienLenError(`Tiến lên needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  const state: TienLenState = {
    players: players.map((p) => ({
      ...p,
      hand: [],
      place: null,
      passed: false,
    })),
    current: 0,
    table: null,
    mustInclude: null,
    phase: 'playing',
    game: 0,
    scores: players.map(() => 0),
    log: [],
    rngState: seed >>> 0,
  };
  deal(state, null);
  return state;
}

export function applyTienLen(state: TienLenState, action: TienLenAction): TienLenState {
  const s = copyState(state);
  switch (action.type) {
    case 'PLAY':
      play(s, action.cards);
      break;
    case 'PASS':
      pass(s);
      break;
    case 'NEXT_GAME':
      if (s.phase !== 'over') throw new TienLenError('The game is still going');
      deal(
        s,
        s.players.findIndex((p) => p.place === 1),
      );
      break;
  }
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
  return s;
}

/** The combos the current player may play now (empty once the game is over). */
export function legalPlays(state: TienLenState): Combo[] {
  if (state.phase !== 'playing') return [];
  return combosIn(state.players[state.current].hand).filter((c) => fits(state, c));
}

/** Whether the current player may pass: not when leading a round. */
export const canPass = (state: TienLenState): boolean => state.phase === 'playing' && state.table !== null;

function fits(state: TienLenState, combo: Combo): boolean {
  if (state.mustInclude !== null && !combo.cards.includes(state.mustInclude)) return false;
  return state.table === null || beats(combo, state.table.combo);
}

// ---------------------------------------------------------------------------

function copyState(state: TienLenState): TienLenState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    table: state.table && {
      ...state.table,
      combo: { ...state.table.combo, cards: [...state.table.combo.cards] },
    },
    scores: [...state.scores],
    log: [...state.log],
  };
}

/** A new game: shuffle, 13 cards each (with fewer than four players the rest stay in the box). */
function deal(s: TienLenState, winner: number | null): void {
  const [deck, rng] = shuffledDeck(DECK_SIZE, s.rngState);
  s.rngState = rng;
  s.game++;
  s.phase = 'playing';
  s.table = null;
  s.players.forEach((p, i) => {
    p.hand = deck.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE).sort(byStrength);
    p.place = null;
    p.passed = false;
  });
  if (winner !== null && winner >= 0) {
    s.current = winner;
    s.mustInclude = null;
  } else {
    const lowest = Math.min(...s.players.flatMap((p) => p.hand));
    s.current = s.players.findIndex((p) => p.hand.includes(lowest));
    s.mustInclude = lowest;
  }
  s.log.push({ type: 'dealt', game: s.game, leader: s.current });

  // Tới trắng: a hand that wins on the deal ends the game at once, starting from the leader.
  for (let k = 0; k < s.players.length; k++) {
    const i = (s.current + k) % s.players.length;
    const how = instantWin(s.players[i].hand);
    if (!how) continue;
    s.log.push({ type: 'instantWin', player: i, how });
    s.players.forEach((p, j) => (p.place = j === i ? 1 : s.players.length));
    endGame(s);
    return;
  }
}

/** Four 2s, a dragon (one of each rank from 3 to A), six pairs, or five pairs in a row. */
export function instantWin(hand: readonly Card[]): InstantWin | null {
  const counts = Array.from({ length: 13 }, (_, r) => hand.filter((c) => rankOf(c) === r).length);
  if (counts[TWO] === 4) return 'fourTwos';
  if (counts.slice(0, TWO).every((n) => n > 0)) return 'dragon';
  if (counts.reduce((sum, n) => sum + Math.floor(n / 2), 0) >= 6) return 'sixPairs';
  if (combosIn(hand).some((c) => c.kind === 'pairRun' && c.size >= 5)) return 'fivePairRun';
  return null;
}

function play(s: TienLenState, cards: Card[]): void {
  if (s.phase !== 'playing') throw new TienLenError('The game is over');
  const player = s.players[s.current];
  if (!cards.every((c) => player.hand.includes(c))) throw new TienLenError('Those cards are not in this hand');
  const combo = comboOf(cards);
  if (!combo) throw new TienLenError('Those cards do not make a combo');
  if (s.mustInclude !== null && !combo.cards.includes(s.mustInclude)) throw new TienLenError('The first play must include the lowest card');
  if (s.table && !beats(combo, s.table.combo)) throw new TienLenError('That does not beat the table');

  player.hand = player.hand.filter((c) => !cards.includes(c));
  s.log.push({
    type: 'played',
    player: s.current,
    cards: combo.cards,
    kind: combo.kind,
    chop: isChop(combo, s.table?.combo ?? null),
  });
  s.table = { combo, by: s.current };
  s.mustInclude = null;

  if (player.hand.length === 0) {
    player.place = s.players.filter((p) => p.place !== null).length + 1;
    s.log.push({ type: 'finished', player: s.current, place: player.place });
    const left = s.players.filter((p) => p.place === null);
    if (left.length === 1) {
      left[0].place = s.players.length;
      endGame(s);
      return;
    }
  }
  advance(s);
}

function pass(s: TienLenState): void {
  if (s.phase !== 'playing') throw new TienLenError('The game is over');
  if (!s.table) throw new TienLenError('The leader must play');
  s.players[s.current].passed = true;
  s.log.push({ type: 'passed', player: s.current });
  advance(s);
}

/** Next in turn: whoever is still in the round; if nobody is, the last to play wins the round and leads. */
function advance(s: TienLenState): void {
  const table = s.table!;
  const stillIn = s.players.filter((p, i) => i !== table.by && p.place === null && !p.passed);
  if (stillIn.length === 0) {
    for (const p of s.players) p.passed = false;
    // If the round's winner has gone out, the next player still in the game leads instead.
    const leader = s.players[table.by].place === null ? table.by : nextInGame(s, table.by);
    s.log.push({ type: 'roundWon', player: table.by });
    s.table = null;
    s.current = leader;
    return;
  }
  let i = s.current;
  do i = (i + 1) % s.players.length;
  while (s.players[i].place !== null || s.players[i].passed);
  s.current = i;
}

function nextInGame(s: TienLenState, from: number): number {
  let i = from;
  do i = (i + 1) % s.players.length;
  while (s.players[i].place !== null);
  return i;
}

function endGame(s: TienLenState): void {
  s.phase = 'over';
  s.table = null;
  const n = s.players.length;
  s.players.forEach((p, i) => (s.scores[i] += n - (p.place ?? n)));
  s.log.push({ type: 'gameOver', places: s.players.map((p) => p.place ?? n) });
}
