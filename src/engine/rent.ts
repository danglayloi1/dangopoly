import { BOARD, GROUP_SPACES, TRANSPORT_RENT, UTILITY_MULTIPLIER } from '../data/board';
import type { GameState } from './types';

/** Rent owed for landing on `index`. 0 if unowned or mortgaged. */
export function rentFor(state: GameState, index: number, diceTotal: number): number {
  const space = BOARD[index];
  const own = state.ownership[index];
  if (!own || own.mortgaged) return 0;

  switch (space.kind) {
    case 'property': {
      if (own.houses > 0) return space.rent[own.houses];
      return ownsWholeGroup(state, own.owner, index) ? space.rent[0] * 2 : space.rent[0];
    }
    case 'transport':
      return TRANSPORT_RENT[countOwned(state, own.owner, 'transport') - 1];
    case 'utility':
      return diceTotal * UTILITY_MULTIPLIER[countOwned(state, own.owner, 'utility') - 1];
    default:
      return 0;
  }
}

/** True if `player` owns every property in the color group of the property at `index`. */
export function ownsWholeGroup(state: GameState, player: number, index: number): boolean {
  const space = BOARD[index];
  if (space.kind !== 'property') return false;
  return GROUP_SPACES[space.group].every((i) => state.ownership[i]?.owner === player);
}

function countOwned(state: GameState, player: number, kind: 'transport' | 'utility'): number {
  let count = 0;
  BOARD.forEach((space, i) => {
    if (space.kind === kind && state.ownership[i]?.owner === player) count++;
  });
  return count;
}
