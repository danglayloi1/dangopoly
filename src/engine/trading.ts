// Rules for trading properties and money between players.

import { BOARD, GROUP_SPACES, isOwnable } from '../data/board';
import type { GameState, TradeOffer, TradeSide } from './types';

/** Why an offer can't be made. The UI shows a message for each. */
export type TradeProblem =
  | 'notNow' // only the current player, before rolling or before ending the turn
  | 'badPartner' // must be another player still in the game
  | 'empty' // nothing offered and nothing asked for
  | 'badCash' // amounts must be whole, non-negative đồng
  | 'notEnoughCash' // can't offer more cash than you have
  | 'notOwned' // a listed space doesn't belong to that side
  | 'hasBuildings'; // sell the buildings in that color set first

/**
 * A space can change hands only if its color set has no buildings
 * (transport and utilities never do). Mortgaged spaces can be traded and stay mortgaged.
 */
export function canTradeSpace(state: GameState, space: number): boolean {
  const s = BOARD[space];
  if (!isOwnable(s)) return false;
  if (s.kind !== 'property') return true;
  return GROUP_SPACES[s.group].every((i) => (state.ownership[i]?.houses ?? 0) === 0);
}

function sideProblem(state: GameState, player: number, side: TradeSide): TradeProblem | null {
  if (!Number.isInteger(side.cash) || side.cash < 0) return 'badCash';
  if (side.cash > state.players[player].cash) return 'notEnoughCash';
  if (new Set(side.spaces).size !== side.spaces.length) return 'notOwned';
  for (const space of side.spaces) {
    if (state.ownership[space]?.owner !== player) return 'notOwned';
    if (!canTradeSpace(state, space)) return 'hasBuildings';
  }
  return null;
}

/** Checks the contents of an offer against the current owners and cash (not whose turn it is). */
export function offerProblem(state: GameState, offer: TradeOffer): TradeProblem | null {
  const partner = state.players[offer.to];
  if (!partner || partner.bankrupt || offer.to === offer.from) return 'badPartner';
  const { give, take } = offer;
  if (give.spaces.length + take.spaces.length === 0 && give.cash === 0 && take.cash === 0) return 'empty';
  return sideProblem(state, offer.from, give) ?? sideProblem(state, offer.to, take);
}

/** Null if the current player may propose this offer right now, otherwise the reason they can't. */
export function tradeProblem(state: GameState, offer: TradeOffer): TradeProblem | null {
  const { phase } = state;
  if (phase.kind !== 'awaitRoll' && phase.kind !== 'awaitEndTurn') return 'notNow';
  if (offer.from !== state.current || state.players[offer.from].bankrupt) return 'notNow';
  return offerProblem(state, offer);
}

/** True if the current player could trade with someone at all right now (to show the button). */
export function canStartTrade(state: GameState): boolean {
  const { phase } = state;
  if (phase.kind !== 'awaitRoll' && phase.kind !== 'awaitEndTurn') return false;
  return state.players.some((p) => p.id !== state.current && !p.bankrupt);
}

/** A tidy private copy of an offer: spaces sorted, so the stored offer can't be changed later by the caller. */
export function normalizeOffer(offer: TradeOffer): TradeOffer {
  const side = (s: TradeSide): TradeSide => ({ spaces: [...s.spaces].sort((a, b) => a - b), cash: s.cash });
  return { from: offer.from, to: offer.to, give: side(offer.give), take: side(offer.take) };
}
