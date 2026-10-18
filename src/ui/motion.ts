// Turning what just happened (new log entries) into animation steps and sounds. Pure functions, tested.

import { BOARD_SIZE, JAIL_SPACE } from '../data/board';
import { CARDS } from '../data/cards';
import type { LogEntry } from '../engine/types';
import type { SoundName } from './sound';

/**
 * Entries added to the log since `prev`. Log entries are never copied (only appended), so the last
 * old entry can be found by identity. Unknown history (a different game) gives nothing.
 */
export function newLogEntries(prev: readonly LogEntry[], next: readonly LogEntry[]): LogEntry[] {
  if (prev === next) return [];
  const last = prev[prev.length - 1];
  if (!last) return [];
  const i = next.lastIndexOf(last);
  return i >= 0 ? next.slice(i + 1) : [];
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
