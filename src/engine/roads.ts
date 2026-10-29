// On the roads of Nghệ Tĩnh (Chế độ Việt): rush-hour traffic jams and a wandering buffalo.
// Pure helpers; game.ts applies them (see moveByDice, resolveLanding and the four actions).

import { BOARD, BOARD_SIZE } from '../data/board';
import type { GameState } from './types';

const named = (name: string) => BOARD.findIndex((s) => s.name.vi === name);

/** Where the traffic jams up at rush hour. */
export const JAM_SPACES: readonly number[] = [named('Bến xe Hà Tĩnh'), named('Cầu Bến Thủy'), named('Chợ Vinh')];
/** A xe ôm through the jam. */
export const XE_OM_FEE = 300_000;
/** Paying someone to lead the buffalo home. */
export const BUFFALO_FEE = 200_000;
/** Riding the buffalo: it carries you this many spaces on, at random. */
export const BUFFALO_RIDE = { min: 2, max: 11 };

/** Rush hour: two rounds in every four (rounds 2–3, 6–7, …), with the traffic rule on. */
export function isRushHour(state: GameState): boolean {
  return Boolean(state.rules.viet?.traffic) && (state.round % 4 === 2 || state.round % 4 === 3);
}

/**
 * The first jam spot a dice move of `steps` from `from` passes through on the way (not the space it
 * ends on: landing there is just landing), or null.
 */
export function jamOnPath(from: number, steps: number): number | null {
  for (let k = 1; k < steps; k++) {
    const space = (from + k) % BOARD_SIZE;
    if (JAM_SPACES.includes(space)) return space;
  }
  return null;
}

/** Where a buffalo may wander: any space but the four corners. */
export const BUFFALO_SPACES: readonly number[] = BOARD.flatMap((_, i) => (i % 10 === 0 ? [] : [i]));

/** How often a buffalo turns up as a round starts (out of 5). */
export const BUFFALO_CHANCE_IN_5 = 2;
