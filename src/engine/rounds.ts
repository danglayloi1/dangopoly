// Rounds, festivals, the round and time limits, and what each player is worth.
// A round ends when play comes back around to the first player.

import { BOARD, GROUP_SPACES, isOwnable, START_SALARY, type ColorGroup } from '../data/board';
import { nextUint32 } from './rng';
import type { EndReason, Festival, FestivalId, GameState, PlayerStats } from './types';

/** With festival mode on, rounds 3, 6, 9… each have a festival. It lasts that one round. */
export const FESTIVAL_EVERY = 3;
export const FESTIVALS: readonly FestivalId[] = ['denCuong', 'langSen', 'gioLao', 'chieuTrung'];
/** Lễ hội Đền Chiêu Trưng: the bank gives every player this at the start of the round. */
export const FESTIVAL_GIFT = 1_000_000;

const COLOR_GROUPS = Object.keys(GROUP_SPACES) as ColorGroup[];

export function emptyStats(): PlayerStats {
  return { rentPaid: 0, rentReceived: 0, jailed: 0, doubles: 0, bought: 0, housesBuilt: 0, laps: 0, trades: 0, cards: 0 };
}

/**
 * What a player would be worth if everything were counted: cash, land at its price (half if
 * mortgaged, like the bank's loan), and buildings at what they cost. Bankrupt players are worth 0.
 */
export function worthOf(state: GameState, player: number): number {
  const p = state.players[player];
  if (p.bankrupt) return 0;
  let worth = p.cash;
  for (const [key, own] of Object.entries(state.ownership)) {
    if (own.owner !== player) continue;
    const space = BOARD[Number(key)];
    if (!isOwnable(space)) continue;
    worth += own.mortgaged ? space.price / 2 : space.price;
    if (space.kind === 'property') worth += own.houses * space.houseCost;
  }
  return worth;
}

export const worthOfAll = (state: GameState): number[] => state.players.map((p) => worthOf(state, p.id));

/** Passing Xuất phát pays double during Lễ hội Làng Sen. */
export function salaryFor(state: GameState): number {
  return state.festival?.id === 'langSen' ? START_SALARY * 2 : START_SALARY;
}

/** Lễ hội Đền Cuông doubles the rent of one color set for the round. */
export function festivalRentMultiplier(state: GameState, space: number): number {
  const s = BOARD[space];
  return state.festival?.id === 'denCuong' && s.kind === 'property' && s.group === state.festival.group ? 2 : 1;
}

/** Mùa gió Lào: nobody builds this round. */
export const buildingBlocked = (state: GameState): boolean => state.festival?.id === 'gioLao';

function randomBelow(s: GameState, n: number): number {
  const [r, next] = nextUint32(s.rngState);
  s.rngState = next;
  return r % n;
}

/**
 * Play has come back to the first player: the next round starts. It may end the game (round
 * limit), and with festival mode it ends the old festival and may start a new one.
 */
export function startNextRound(s: GameState): void {
  s.worth.push(worthOfAll(s));
  if (s.rules.mode.kind === 'rounds' && s.round >= s.rules.mode.rounds) {
    endByWorth(s, 'rounds');
    return;
  }
  s.round++;
  s.festival = null;
  s.log.push({ type: 'roundStarted', round: s.round });
  if (s.rules.festivals && s.round % FESTIVAL_EVERY === 0) {
    const id = FESTIVALS[randomBelow(s, FESTIVALS.length)];
    const festival: Festival = { id, group: id === 'denCuong' ? COLOR_GROUPS[randomBelow(s, COLOR_GROUPS.length)] : null };
    s.festival = festival;
    s.log.push({ type: 'festival', festival, round: s.round });
    if (id === 'chieuTrung') {
      for (const p of s.players) if (!p.bankrupt) p.cash += FESTIVAL_GIFT;
      s.log.push({ type: 'festivalGift', amount: FESTIVAL_GIFT });
    }
  }
}

/**
 * A limit was reached: the richest player still in the game wins (more cash breaks a tie, then
 * whoever comes first in the playing order).
 */
export function endByWorth(s: GameState, reason: Exclude<EndReason, 'lastStanding'>): void {
  const worth = worthOfAll(s);
  const winner = s.players
    .filter((p) => !p.bankrupt)
    .reduce((best, p) =>
      worth[p.id] > worth[best.id] || (worth[p.id] === worth[best.id] && p.cash > best.cash) ? p : best,
    );
  if (s.worth.length === 0 || s.worth[s.worth.length - 1].join() !== worth.join()) s.worth.push(worth);
  s.festival = null;
  s.endReason = reason;
  s.phase = { kind: 'gameOver', winner: winner.id };
  s.log.push({ type: 'limitReached', reason });
  s.log.push({ type: 'won', player: winner.id });
}
