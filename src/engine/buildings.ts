// Rules for building houses/hotels and for mortgages: who may do what, and what it costs.

import { BOARD, GROUP_SPACES, isOwnable } from '../data/board';
import { ownsWholeGroup } from './rent';
import type { GameState, PropertyAction } from './types';

/** `houses` value meaning a hotel (4 houses, then one more step). */
export const HOTEL = 5;

/** Cash the bank pays when a property is mortgaged: half its price. */
export function mortgageValue(space: number): number {
  const s = BOARD[space];
  return isOwnable(s) ? s.price / 2 : 0;
}

/** Cost to lift a mortgage: the mortgage value plus 10% interest. */
export function unmortgageCost(space: number): number {
  return Math.round((mortgageValue(space) * 11) / 10);
}

/** Cost of one house (a hotel costs one more house on top of 4). */
export function houseCost(space: number): number {
  const s = BOARD[space];
  return s.kind === 'property' ? s.houseCost : 0;
}

/** Selling a building back to the bank refunds half its cost. */
export function houseRefund(space: number): number {
  return houseCost(space) / 2;
}

/**
 * The player who may manage properties right now: the debtor while a debt is open,
 * otherwise the player whose turn it is. Nobody once the game is over.
 */
export function actingPlayer(state: GameState): number | null {
  switch (state.phase.kind) {
    case 'gameOver':
      return null;
    case 'inDebt':
      return state.phase.debtor;
    default:
      return state.current;
  }
}

function ownedByActor(state: GameState, space: number): boolean {
  const actor = actingPlayer(state);
  return actor !== null && state.ownership[space]?.owner === actor;
}

function groupOf(space: number): readonly number[] {
  const s = BOARD[space];
  return s.kind === 'property' ? GROUP_SPACES[s.group] : [space];
}

function housesIn(state: GameState, spaces: readonly number[]): number[] {
  return spaces.map((i) => state.ownership[i]?.houses ?? 0);
}

/**
 * Build one house (or turn 4 houses into a hotel): needs the whole color set, nothing in it
 * mortgaged, and even building (never more than one house ahead of the rest of the set).
 */
export function canBuildHouse(state: GameState, space: number): boolean {
  if (state.phase.kind === 'inDebt' || !ownedByActor(state, space)) return false;
  const s = BOARD[space];
  if (s.kind !== 'property') return false;
  const own = state.ownership[space];
  if (!ownsWholeGroup(state, own.owner, space)) return false;

  const group = groupOf(space);
  if (group.some((i) => state.ownership[i].mortgaged)) return false;
  if (own.houses >= HOTEL) return false;
  if (own.houses > Math.min(...housesIn(state, group))) return false;
  return state.players[own.owner].cash >= s.houseCost;
}

/** Sell one house (or turn a hotel back into 4 houses), selling evenly across the set. */
export function canSellHouse(state: GameState, space: number): boolean {
  if (!ownedByActor(state, space) || BOARD[space].kind !== 'property') return false;
  const own = state.ownership[space];
  if (own.houses === 0) return false;
  return own.houses >= Math.max(...housesIn(state, groupOf(space)));
}

/** Mortgage a property: not already mortgaged, and no buildings anywhere in its color set. */
export function canMortgage(state: GameState, space: number): boolean {
  if (!ownedByActor(state, space)) return false;
  if (state.ownership[space].mortgaged) return false;
  return housesIn(state, groupOf(space)).every((h) => h === 0);
}

/** Lift a mortgage: pay the value + 10%. Not while settling a debt. */
export function canUnmortgage(state: GameState, space: number): boolean {
  if (state.phase.kind === 'inDebt' || !ownedByActor(state, space)) return false;
  const own = state.ownership[space];
  return own.mortgaged && state.players[own.owner].cash >= unmortgageCost(space);
}

export function isPropertyActionAllowed(state: GameState, action: PropertyAction): boolean {
  switch (action.type) {
    case 'BUILD_HOUSE':
      return canBuildHouse(state, action.space);
    case 'SELL_HOUSE':
      return canSellHouse(state, action.space);
    case 'MORTGAGE':
      return canMortgage(state, action.space);
    case 'UNMORTGAGE':
      return canUnmortgage(state, action.space);
  }
}

/** Every property action the acting player could take right now. */
export function propertyActions(state: GameState): PropertyAction[] {
  const actor = actingPlayer(state);
  if (actor === null) return [];
  const actions: PropertyAction[] = [];
  for (const [key, own] of Object.entries(state.ownership)) {
    if (own.owner !== actor) continue;
    const space = Number(key);
    for (const type of ['BUILD_HOUSE', 'SELL_HOUSE', 'MORTGAGE', 'UNMORTGAGE'] as const) {
      const action = { type, space };
      if (isPropertyActionAllowed(state, action)) actions.push(action);
    }
  }
  return actions;
}
