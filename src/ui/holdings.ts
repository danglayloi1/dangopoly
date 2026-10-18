import { BOARD, GROUP_SPACES, type ColorGroup } from '../data/board';
import type { GameState } from '../engine/types';

export type HoldingKind = ColorGroup | 'transport' | 'utility';

/** What a player owns of one color set (or of the transport / utility spaces). */
export interface Holding {
  kind: HoldingKind;
  owned: number[]; // board indices, in board order
  total: number;
  fullSet: boolean; // whole color set owned: rent doubles, houses can be built
}

const indicesOfKind = (kind: 'transport' | 'utility') =>
  BOARD.flatMap((space, i) => (space.kind === kind ? [i] : []));

const SETS: [HoldingKind, readonly number[]][] = [
  ...(Object.entries(GROUP_SPACES) as [ColorGroup, readonly number[]][]),
  ['transport', indicesOfKind('transport')],
  ['utility', indicesOfKind('utility')],
];

/** The player's properties grouped by set, cheapest set first. Sets they own nothing of are left out. */
export function holdingsOf(game: GameState, player: number): Holding[] {
  return SETS.flatMap(([kind, spaces]) => {
    const owned = spaces.filter((i) => game.ownership[i]?.owner === player);
    if (owned.length === 0) return [];
    const isColor = kind !== 'transport' && kind !== 'utility';
    return [{ kind, owned, total: spaces.length, fullSet: isColor && owned.length === spaces.length }];
  });
}
