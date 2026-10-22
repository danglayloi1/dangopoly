// Turning what just happened (new log entries) into animation steps and sounds. Pure functions, tested.

import { BOARD_SIZE, JAIL_SPACE } from '../data/board';
import { CARDS } from '../data/cards';
import type { Festival, GameState, LogEntry } from '../engine/types';
import type { SoundName } from './sound';

/** How many old entries must match, and how far back from the end of the new log to look for them. */
const MATCH_ENTRIES = 6;
const MATCH_WINDOW = 100;

/**
 * Entries added to the log since `prev`. On one device entries are never copied (only appended), so
 * the last old entry is found by identity. Online, every update arrives as a fresh copy, so then the
 * last few old entries are looked for by value near the end of the new log. Unknown history (a
 * different game) gives nothing.
 */
export function newLogEntries(prev: readonly LogEntry[], next: readonly LogEntry[]): LogEntry[] {
  if (prev === next) return [];
  const last = prev[prev.length - 1];
  if (!last) return [];
  const i = next.lastIndexOf(last);
  if (i >= 0) return next.slice(i + 1);

  const k = Math.min(prev.length, MATCH_ENTRIES);
  const tail = prev.slice(-k).map((e) => JSON.stringify(e));
  const lowest = Math.max(k - 1, next.length - 1 - MATCH_WINDOW);
  for (let end = next.length - 1; end >= lowest; end--) {
    if (tail.every((key, j) => JSON.stringify(next[end - k + 1 + j]) === key)) return next.slice(end + 1);
  }
  return [];
}

/** One token's trip: the spaces it visits one by one, or a jump straight to the end (going to jail). */
export interface Move {
  player: number;
  path: number[]; // positions after each step; the last one is where it ends up
  jump: boolean;
}

/** Spaces visited going from `from` to `to`, one step at a time, forwards or backwards. */
export function stepPath(from: number, to: number, backwards: boolean): number[] {
  const path: number[] = [];
  let pos = from;
  while (pos !== to) {
    pos = (pos + (backwards ? -1 : 1) + BOARD_SIZE) % BOARD_SIZE;
    path.push(pos);
  }
  return path;
}

/** The token moves described by `entries`, starting from the positions currently shown. */
export function planMoves(entries: readonly LogEntry[], shownPositions: readonly number[]): Move[] {
  const at = [...shownPositions];
  const moves: Move[] = [];
  entries.forEach((entry, i) => {
    if (entry.type === 'moved') {
      // "Lùi lại 3 ô" is the only backwards move; it comes right after drawing that card.
      const before = entries[i - 1];
      const backwards =
        before?.type === 'drewCard' && CARDS[before.deck][before.card].effect.kind === 'moveBack';
      const path = stepPath(at[entry.player], entry.to, backwards);
      if (path.length > 0) moves.push({ player: entry.player, path, jump: false });
      at[entry.player] = entry.to;
    } else if (entry.type === 'wentToJail') {
      if (at[entry.player] !== JAIL_SPACE) moves.push({ player: entry.player, path: [JAIL_SPACE], jump: true });
      at[entry.player] = JAIL_SPACE;
    }
  });
  return moves;
}

/** True if these entries need the dice or a token to animate. */
export function hasMotion(entries: readonly LogEntry[]): boolean {
  return entries.some((e) => e.type === 'rolled' || e.type === 'moved' || e.type === 'wentToJail');
}

/** The sound for an event, if any. Moving and passing Start are played during the hops instead. */
export function soundFor(entry: LogEntry): SoundName | null {
  switch (entry.type) {
    case 'bought':
      return 'buy';
    case 'paidRent':
    case 'paidTax':
    case 'cardPaid':
    case 'paidEach':
    case 'unmortgaged':
      return 'pay';
    case 'cardCollected':
    case 'collectedFromEach':
    case 'soldHouse':
    case 'mortgaged':
      return 'coins';
    case 'drewCard':
      return 'card';
    case 'builtHouse':
      return 'build';
    case 'wentToJail':
    case 'stayedInJail':
      return 'jail';
    case 'leftJail':
      return 'unlock';
    case 'tradeAccepted':
      return 'trade';
    case 'bankrupt':
      return 'bankrupt';
    case 'won':
      return 'win';
    default:
      return null;
  }
}

/** Where money flies from or to: a board space, or the bank in the middle of the board. */
export type Spot = number | 'bank';

/** A short visual effect on the board, played when a move has finished. */
export type Effect =
  | { kind: 'seal'; space: number } // bought: a red seal stamped on the space
  | { kind: 'money'; from: Spot; to: Spot; amount: number } // coins fly, the amount pops up
  | { kind: 'build'; space: number } // a house or the đình goes up, with a puff of dust
  | { kind: 'jail'; space: number } // bars come down
  | { kind: 'bankrupt'; space: number; player: number } // the token tears like paper
  | { kind: 'festival'; festival: Festival } // a lantern banner across the screen
  | { kind: 'coinRain' }; // lucky money for everyone

/** At most this many coin flights per move, so a big card ("pay everyone") stays readable. */
const MAX_MONEY = 4;

/** The effects for what just happened. `game` is the state after it, for where players stand. */
export function effectsFor(entries: readonly LogEntry[], game: GameState): Effect[] {
  const at = (player: number): number => game.players[player].position;
  const others = (player: number) => game.players.filter((p) => p.id !== player && !p.bankrupt).map((p) => p.id);
  const effects: Effect[] = [];
  const money = (from: Spot, to: Spot, amount: number) => {
    if (amount > 0 && effects.filter((e) => e.kind === 'money').length < MAX_MONEY) effects.push({ kind: 'money', from, to, amount });
  };

  for (const e of entries) {
    switch (e.type) {
      case 'bought':
        effects.push({ kind: 'seal', space: e.space }); // the price shows on the player card already
        break;
      case 'paidRent':
        money(at(e.player), at(e.to), e.amount);
        break;
      case 'paidTax':
      case 'cardPaid':
        money(at(e.player), 'bank', e.amount);
        break;
      case 'passedStart':
        money(0, at(e.player), e.amount);
        break;
      case 'cardCollected':
      case 'festivalBonus':
        money('bank', at(e.player), e.amount);
        break;
      case 'paidEach':
        for (const o of others(e.player)) money(at(e.player), at(o), e.each);
        break;
      case 'collectedFromEach':
        for (const o of others(e.player)) money(at(o), at(e.player), e.total / Math.max(1, others(e.player).length));
        break;
      case 'builtHouse':
        effects.push({ kind: 'build', space: e.space });
        break;
      case 'wentToJail':
        effects.push({ kind: 'jail', space: JAIL_SPACE });
        break;
      case 'bankrupt':
        effects.push({ kind: 'bankrupt', space: at(e.player), player: e.player });
        break;
      case 'festival':
        effects.push({ kind: 'festival', festival: e.festival });
        break;
      case 'festivalGift':
        effects.push({ kind: 'coinRain' });
        break;
      default:
        break;
    }
  }
  return effects;
}

/** How long each effect stays on screen at normal speed (ms). */
export const EFFECT_MS: Record<Effect['kind'], number> = {
  seal: 1400,
  money: 1300,
  build: 1000,
  jail: 1600,
  bankrupt: 1600,
  festival: 3200,
  coinRain: 2000,
};
