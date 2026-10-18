// The game rules as a pure state machine: applyAction(state, action) -> new state.
// The input state is never modified, so the UI can keep history, save, and undo cheaply.

import { BOARD, BOARD_SIZE, isOwnable, START_SALARY, STARTING_CASH } from '../data/board';
import type { TokenId } from '../data/tokens';
import { rollDie } from './rng';
import { rentFor } from './rent';
import type { Action, ActionType, Dice, GameState, PaymentReason, Player } from './types';

export class GameError extends Error {}

export interface NewPlayer {
  name: string;
  token: TokenId;
}

export interface NewGameOptions {
  players: NewPlayer[];
  seed?: number;
  startingCash?: number;
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
/** Only the most recent log entries are kept, so the state (copied on every action) stays small. */
export const LOG_LIMIT = 200;

export function createGame({ players, seed, startingCash = STARTING_CASH }: NewGameOptions): GameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new GameError(`A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
  }
  if (new Set(players.map((p) => p.token)).size !== players.length) {
    throw new GameError('Each player needs a different token');
  }
  if (players.some((p) => p.name.trim() === '')) {
    throw new GameError('Every player needs a name');
  }
  if (!Number.isInteger(startingCash) || startingCash <= 0) {
    throw new GameError(`Starting money must be a positive whole number of đồng, got ${startingCash}`);
  }

  return {
    players: players.map((p, id) => ({
      id,
      name: p.name.trim(),
      token: p.token,
      cash: startingCash,
      position: 0,
      bankrupt: false,
    })),
    current: 0,
    ownership: {},
    phase: { kind: 'awaitRoll' },
    dice: null,
    doublesCount: 0,
    rngState: (seed ?? Date.now()) >>> 0,
    log: [{ type: 'turnStarted', player: 0 }],
  };
}

/** The actions allowed right now. The UI shows a button for each. */
export function legalActions(state: GameState): ActionType[] {
  const { phase } = state;
  switch (phase.kind) {
    case 'awaitRoll':
      return ['ROLL'];
    case 'awaitBuy': {
      const space = BOARD[phase.space];
      const canAfford = isOwnable(space) && state.players[state.current].cash >= space.price;
      return canAfford ? ['BUY', 'DECLINE'] : ['DECLINE'];
    }
    case 'awaitEndTurn':
      return ['END_TURN'];
    case 'inDebt':
      return state.players[phase.debtor].cash >= phase.amount
        ? ['PAY_DEBT', 'DECLARE_BANKRUPTCY']
        : ['DECLARE_BANKRUPTCY'];
    case 'gameOver':
      return [];
  }
}

export function applyAction(state: GameState, action: Action): GameState {
  if (!legalActions(state).includes(action.type)) {
    throw new GameError(`${action.type} is not allowed now (phase: ${state.phase.kind})`);
  }
  const s = copyState(state);

  switch (action.type) {
    case 'ROLL':
      roll(s, action.dice);
      break;
    case 'BUY':
      buy(s);
      break;
    case 'DECLINE':
      decline(s);
      break;
    case 'PAY_DEBT':
      payDebt(s);
      break;
    case 'DECLARE_BANKRUPTCY':
      declareBankruptcy(s);
      break;
    case 'END_TURN':
      advanceTurn(s);
      break;
  }
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
  return s;
}

// ---------------------------------------------------------------------------
// Actions. Each one mutates `s`, which is already a private copy.

function roll(s: GameState, forced?: Dice): void {
  let dice: Dice;
  if (forced) {
    if (!forced.every((d) => Number.isInteger(d) && d >= 1 && d <= 6)) {
      throw new GameError(`Invalid dice ${JSON.stringify(forced)}`);
    }
    dice = [forced[0], forced[1]];
  } else {
    const [d1, afterFirst] = rollDie(s.rngState);
    const [d2, afterSecond] = rollDie(afterFirst);
    s.rngState = afterSecond;
    dice = [d1, d2];
  }

  const player = s.players[s.current];
  s.dice = dice;
  if (dice[0] === dice[1]) s.doublesCount++;
  s.log.push({ type: 'rolled', player: player.id, dice });

  // TODO(milestone 5): a third double in a row sends the player to jail.
  moveBy(s, player, dice[0] + dice[1]);
  resolveLanding(s, player);
}

function buy(s: GameState): void {
  if (s.phase.kind !== 'awaitBuy') return;
  const index = s.phase.space;
  const space = BOARD[index];
  if (!isOwnable(space)) return;

  const player = s.players[s.current];
  player.cash -= space.price;
  s.ownership[index] = { owner: player.id, houses: 0, mortgaged: false };
  s.log.push({ type: 'bought', player: player.id, space: index, price: space.price });
  finishLanding(s);
}

function decline(s: GameState): void {
  if (s.phase.kind !== 'awaitBuy') return;
  // No auctions in this edition: the property simply stays with the bank.
  s.log.push({ type: 'declined', player: s.current, space: s.phase.space });
  finishLanding(s);
}

function payDebt(s: GameState): void {
  if (s.phase.kind !== 'inDebt') return;
  const { debtor, creditor, amount, reason } = s.phase;
  transfer(s, debtor, creditor, amount, reason);
  finishLanding(s);
}

function declareBankruptcy(s: GameState): void {
  if (s.phase.kind !== 'inDebt') return;
  const { debtor, creditor } = s.phase;
  const player = s.players[debtor];

  // Everything the player has goes to the creditor. Buildings are sold to the bank at half price first.
  let assets = player.cash;
  for (const [key, own] of Object.entries(s.ownership)) {
    if (own.owner !== debtor) continue;
    const index = Number(key);
    const space = BOARD[index];
    if (space.kind === 'property') assets += (own.houses * space.houseCost) / 2;

    if (creditor === null) {
      delete s.ownership[index]; // back to the bank, unowned
    } else {
      s.ownership[index] = { owner: creditor, houses: 0, mortgaged: own.mortgaged };
    }
  }
  if (creditor !== null) s.players[creditor].cash += assets;
  player.cash = 0;
  player.bankrupt = true;
  s.log.push({ type: 'bankrupt', player: debtor, creditor });

  const remaining = s.players.filter((p) => !p.bankrupt);
  if (remaining.length === 1) {
    s.phase = { kind: 'gameOver', winner: remaining[0].id };
    s.log.push({ type: 'won', player: remaining[0].id });
  } else {
    advanceTurn(s);
  }
}

function advanceTurn(s: GameState): void {
  let next = s.current;
  do {
    next = (next + 1) % s.players.length;
  } while (s.players[next].bankrupt);

  s.current = next;
  s.phase = { kind: 'awaitRoll' };
  s.dice = null;
  s.doublesCount = 0;
  s.log.push({ type: 'turnStarted', player: next });
}

// ---------------------------------------------------------------------------
// Helpers

/**
 * Copies everything an action may modify. Phase objects and log entries are never
 * modified in place (only replaced or appended), so they can be shared.
 */
function copyState(state: GameState): GameState {
  const ownership: GameState['ownership'] = {};
  for (const [index, own] of Object.entries(state.ownership)) ownership[Number(index)] = { ...own };
  return {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    ownership,
    log: state.log.slice(),
  };
}

function moveBy(s: GameState, player: Player, steps: number): void {
  const target = player.position + steps;
  if (target >= BOARD_SIZE) {
    player.cash += START_SALARY;
    s.log.push({ type: 'passedStart', player: player.id, amount: START_SALARY });
  }
  player.position = target % BOARD_SIZE;
  s.log.push({ type: 'moved', player: player.id, to: player.position });
}

function resolveLanding(s: GameState, player: Player): void {
  const index = player.position;
  const space = BOARD[index];

  switch (space.kind) {
    case 'property':
    case 'transport':
    case 'utility': {
      const own = s.ownership[index];
      if (!own) {
        s.phase = { kind: 'awaitBuy', space: index };
        return;
      }
      if (own.owner !== player.id) {
        const dice = s.dice!;
        const rent = rentFor(s, index, dice[0] + dice[1]);
        if (rent > 0 && !charge(s, player.id, own.owner, rent, { kind: 'rent', space: index })) return;
      }
      break;
    }
    case 'tax':
      if (!charge(s, player.id, null, space.amount, { kind: 'tax', space: index })) return;
      break;
    case 'start':
    case 'jail':
    case 'rest':
      break;
    case 'goToJail': // TODO(milestone 5): send the player to jail.
    case 'card': // TODO(milestone 5): draw a card.
      break;
  }
  finishLanding(s);
}

/**
 * Makes `debtor` pay. Returns false if they can't afford it; the game then waits in the
 * inDebt phase until they pay (after raising money, milestone 4) or go bankrupt.
 */
function charge(
  s: GameState,
  debtor: number,
  creditor: number | null,
  amount: number,
  reason: PaymentReason,
): boolean {
  if (s.players[debtor].cash >= amount) {
    transfer(s, debtor, creditor, amount, reason);
    return true;
  }
  s.phase = { kind: 'inDebt', debtor, creditor, amount, reason };
  s.log.push({ type: 'cannotPay', player: debtor, amount });
  return false;
}

function transfer(
  s: GameState,
  debtor: number,
  creditor: number | null,
  amount: number,
  reason: PaymentReason,
): void {
  s.players[debtor].cash -= amount;
  if (creditor !== null) s.players[creditor].cash += amount;

  if (reason.kind === 'rent' && creditor !== null) {
    s.log.push({ type: 'paidRent', player: debtor, to: creditor, space: reason.space, amount });
  } else {
    s.log.push({ type: 'paidTax', player: debtor, space: reason.space, amount });
  }
}

/** After the landing is fully resolved: roll again on doubles, otherwise wait for End turn. */
function finishLanding(s: GameState): void {
  const rolledDoubles = s.dice !== null && s.dice[0] === s.dice[1];
  s.phase = rolledDoubles && s.doublesCount < 3 ? { kind: 'awaitRoll' } : { kind: 'awaitEndTurn' };
}
