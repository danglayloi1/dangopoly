// The game rules as a pure state machine: applyAction(state, action) -> new state.
// The input state is never modified, so the UI can keep history, save, and undo cheaply.

import {
  BOARD,
  BOARD_SIZE,
  isOwnable,
  JAIL_FINE,
  JAIL_SPACE,
  STARTING_CASH,
  UTILITY_CARD_MULTIPLIER,
} from '../data/board';
import { CARDS, CLASSIC_CARD_COUNT, type CardDeck } from '../data/cards';
import { defaultPlayerColor, type PlayerColorId } from '../data/colors';
import type { TokenId } from '../data/tokens';
import { houseRefund, isPropertyActionAllowed, mortgageValue } from './buildings';
import { jailFreeCardIndex, shuffledDeck } from './deck';
import { rentFor } from './rent';
import { checkMissions, dealMissions, type MissionId } from './missions';
import { BUFFALO_FEE, BUFFALO_RIDE, isRushHour, jamOnPath, XE_OM_FEE } from './roads';
import { diceFumbled, nextUint32, rollDie } from './rng';
import {
  buildCost,
  cardPrize,
  doublesPrize,
  emptyStats,
  endByWorth,
  festivalRentMultiplier,
  salaryFor,
  startNextRound,
  taxFree,
  unmortgagePrice,
  worthOfAll,
} from './rounds';
import { normalizeOffer, offerProblem, tradeProblem } from './trading';
import type {
  Action,
  BotLevel,
  Dice,
  FumbleKind,
  GameState,
  JailReason,
  PaymentReason,
  Player,
  PropertyAction,
  Rules,
  TradeOffer,
  VietRules,
  TurnActionType,
} from './types';

export class GameError extends Error {}

export interface NewPlayer {
  name: string;
  token: TokenId;
  color?: PlayerColorId; // the seat's default color if not given
  bot?: BotLevel; // played by the computer
}

/** How the game ends, whether festivals happen and which Chế độ Việt rules are on; the default is the classic game. */
export interface RulesChoice {
  mode: { kind: 'classic' } | { kind: 'rounds'; rounds: number } | { kind: 'time'; minutes: number };
  festivals: boolean;
  viet?: VietRules;
}

/** Chế độ Việt with every rule off. */
export const NO_VIET: VietRules = { tet: false, anVa: false, macCa: false, funnyCards: false, missions: false, traffic: false, buffalo: false };

/** Ăn vạ forgives this share of the debt; Mặc cả takes this much off, or adds the other. */
export const AN_VA_SHARE = 0.2;
export const HAGGLE_DISCOUNT = 0.2;
export const HAGGLE_MARKUP = 0.1;

export const CLASSIC_RULES: RulesChoice = { mode: { kind: 'classic' }, festivals: false };
export const MAX_ROUNDS = 100;
export const MAX_MINUTES = 240;

export interface NewGameOptions {
  players: NewPlayer[];
  seed?: number;
  startingCash?: number;
  rules?: RulesChoice;
  missions?: MissionId[][]; // secret missions dealt by the caller (online: the room, with its own randomness)
  now?: number; // when the game starts (ms since 1970), for a time limit; defaults to the clock
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
/** Only the most recent log entries are kept, so the state (copied on every action) stays small. */
export const LOG_LIMIT = 200;
/** Failed rolls for doubles allowed in jail; on the last one the fine must be paid. */
export const MAX_JAIL_ATTEMPTS = 3;

export function createGame({ players, seed, startingCash = STARTING_CASH, rules = CLASSIC_RULES, now, missions }: NewGameOptions): GameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new GameError(`A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
  }
  if (new Set(players.map((p) => p.token)).size !== players.length) {
    throw new GameError('Each player needs a different token');
  }
  const colors = players.map((p, seat) => p.color ?? defaultPlayerColor(seat));
  if (new Set(colors).size !== players.length) {
    throw new GameError('Each player needs a different color');
  }
  if (players.some((p) => p.name.trim() === '')) {
    throw new GameError('Every player needs a name');
  }
  if (!Number.isInteger(startingCash) || startingCash <= 0) {
    throw new GameError(`Starting money must be a positive whole number of đồng, got ${startingCash}`);
  }

  const { mode } = rules;
  if (mode.kind === 'rounds' && !(Number.isInteger(mode.rounds) && mode.rounds >= 1 && mode.rounds <= MAX_ROUNDS)) {
    throw new GameError(`A round limit must be 1 to ${MAX_ROUNDS}, got ${mode.rounds}`);
  }
  if (mode.kind === 'time' && !(Number.isInteger(mode.minutes) && mode.minutes >= 1 && mode.minutes <= MAX_MINUTES)) {
    throw new GameError(`A time limit must be 1 to ${MAX_MINUTES} minutes, got ${mode.minutes}`);
  }
  const gameRules: Rules = {
    mode: mode.kind === 'time' ? { ...mode, endsAt: (now ?? Date.now()) + mode.minutes * 60_000 } : { ...mode },
    festivals: rules.festivals,
    // Only kept when something is on, so a classic game looks just as before.
    ...(rules.viet && Object.values(rules.viet).some(Boolean) ? { viet: { ...rules.viet } } : {}),
  };

  let rngState = (seed ?? Date.now()) >>> 0;
  // The funny cards come after the classic ones, so without them a deck shuffles exactly as before.
  const deckSize = (deck: CardDeck) => (rules.viet?.funnyCards ? CARDS[deck].length : CLASSIC_CARD_COUNT[deck]);
  const [chance, afterChance] = shuffledDeck(deckSize('chance'), rngState);
  const [community, afterCommunity] = shuffledDeck(deckSize('community'), afterChance);
  rngState = afterCommunity;
  // Secret missions: dealt by the caller online, otherwise from this game's own random numbers.
  let dealt: MissionId[][] | null = null;
  if (rules.viet?.missions) {
    if (missions) dealt = missions;
    else {
      const [r, next] = nextUint32(rngState);
      rngState = next;
      dealt = dealMissions(players.length, r);
    }
  }

  return {
    players: players.map((p, id) => ({
      id,
      name: p.name.trim(),
      ...(p.bot ? { bot: p.bot } : {}),
      token: p.token,
      color: colors[id],
      cash: startingCash,
      position: 0,
      bankrupt: false,
      inJail: false,
      jailAttempts: 0,
      jailCards: [],
      ...(dealt ? { missions: dealt[id].map((m) => ({ id: m, done: false })) } : {}),
    })),
    current: 0,
    ownership: {},
    phase: { kind: 'awaitRoll' },
    dice: null,
    doublesCount: 0,
    extraRoll: false,
    decks: { chance, community },
    lastCard: null,
    rngState,
    log: [{ type: 'turnStarted', player: 0 }],
    rules: gameRules,
    round: 1,
    festival: null,
    stats: players.map(() => emptyStats()),
    worth: [players.map(() => startingCash)],
    endReason: null,
  };
}

/**
 * The turn actions allowed right now (the UI shows a button for each). Property actions
 * (build, sell, mortgage) depend on the space; see propertyActions() in buildings.ts.
 */
export function legalActions(state: GameState): TurnActionType[] {
  const { phase } = state;
  switch (phase.kind) {
    case 'awaitRoll': {
      const player = state.players[state.current];
      if (!player.inJail) return ['ROLL'];
      const actions: TurnActionType[] = ['ROLL'];
      if (player.cash >= JAIL_FINE) actions.push('PAY_JAIL_FINE');
      if (player.jailCards.length > 0) actions.push('USE_JAIL_CARD');
      return actions;
    }
    case 'awaitBuy': {
      const canAfford = state.players[state.current].cash >= buyPrice(state);
      const actions: TurnActionType[] = canAfford ? ['BUY', 'DECLINE'] : ['DECLINE'];
      if (state.rules.viet?.macCa && !phase.haggled) actions.splice(actions.length - 1, 0, 'HAGGLE');
      return actions;
    }
    case 'awaitEndTurn':
      return ['END_TURN'];
    case 'inDebt': {
      const debtor = state.players[phase.debtor];
      if (debtor.cash >= phase.amount) return ['PAY_DEBT', 'DECLARE_BANKRUPTCY'];
      // Ăn vạ: once a game, only when the money really isn't there.
      return state.rules.viet?.anVa && !debtor.anVaUsed ? ['AN_VA', 'DECLARE_BANKRUPTCY'] : ['DECLARE_BANKRUPTCY'];
    }
    case 'tradeOffer':
      return ['ACCEPT_TRADE', 'REJECT_TRADE'];
    case 'inJam':
      return state.players[state.current].cash >= XE_OM_FEE ? ['XE_OM', 'WAIT_IN_JAM'] : ['WAIT_IN_JAM'];
    case 'buffalo':
      return state.players[state.current].cash >= BUFFALO_FEE ? ['LEAD_BUFFALO', 'RIDE_BUFFALO'] : ['RIDE_BUFFALO'];
    case 'gameOver':
      return [];
  }
}

/**
 * Whose move it is, for games where each player is on their own device: the player a trade is
 * offered to (to answer it); while a debt is open, the debtor (to pay, sell, mortgage or give up);
 * otherwise the player whose turn it is. Null once the game is over.
 */
export function whoseMove(state: GameState): number | null {
  const { phase } = state;
  switch (phase.kind) {
    case 'gameOver':
      return null;
    case 'tradeOffer':
      return phase.offer.to;
    case 'inDebt':
      return phase.debtor;
    default:
      return state.current;
  }
}

/**
 * Which player may send `action` now (see whoseMove); null if nobody may. While a trade offer
 * waits, only the answer can be sent. Whether the action itself is allowed is up to applyAction.
 */
export function actorFor(state: GameState, action: Action): number | null {
  if (state.phase.kind === 'tradeOffer' && action.type !== 'ACCEPT_TRADE' && action.type !== 'REJECT_TRADE') return null;
  return whoseMove(state);
}

function isAllowed(state: GameState, action: Action): boolean {
  if (action.type === 'TIME_UP') return state.rules.mode.kind === 'time' && state.phase.kind === 'awaitRoll';
  if ('space' in action) return isPropertyActionAllowed(state, action);
  if (action.type === 'PROPOSE_TRADE') return tradeProblem(state, action.offer) === null;
  return legalActions(state).includes(action.type);
}

export function applyAction(state: GameState, action: Action): GameState {
  if (!isAllowed(state, action)) {
    const where = 'space' in action ? ` on space ${action.space}` : '';
    throw new GameError(`${action.type}${where} is not allowed now (phase: ${state.phase.kind})`);
  }
  const s = copyState(state);
  const logBefore = s.log.length;

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
    case 'PAY_JAIL_FINE':
      payJailFine(s);
      break;
    case 'USE_JAIL_CARD':
      useJailCard(s);
      break;
    case 'BUILD_HOUSE':
    case 'SELL_HOUSE':
    case 'MORTGAGE':
    case 'UNMORTGAGE':
      manageProperty(s, action);
      break;
    case 'PROPOSE_TRADE':
      proposeTrade(s, action.offer);
      break;
    case 'ACCEPT_TRADE':
      acceptTrade(s);
      break;
    case 'REJECT_TRADE':
      rejectTrade(s);
      break;
    case 'TIME_UP':
      endByWorth(s, 'time');
      break;
    case 'HAGGLE':
      haggle(s);
      break;
    case 'AN_VA':
      anVa(s);
      break;
    case 'XE_OM':
      xeOm(s);
      break;
    case 'WAIT_IN_JAM':
      resolveLanding(s, s.players[s.current]); // stuck here: this is where the move ends
      break;
    case 'LEAD_BUFFALO':
      leadBuffalo(s);
      break;
    case 'RIDE_BUFFALO':
      rideBuffalo(s);
      break;
  }
  // Secret missions finished by this move (before the log is trimmed, so nothing new is missed).
  if (s.rules.viet?.missions && s.phase.kind !== 'gameOver') checkMissions(s, s.log.slice(logBefore));
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
    if (diceFumbled(s.rngState)) {
      fumble(s);
      return;
    }
    const [d1, afterFirst] = rollDie(s.rngState);
    const [d2, afterSecond] = rollDie(afterFirst);
    s.rngState = afterSecond;
    dice = [d1, d2];
  }

  const player = s.players[s.current];
  const doubles = dice[0] === dice[1];
  if (doubles) s.stats[player.id].doubles++;
  s.dice = dice;
  s.lastCard = null;
  s.log.push({ type: 'rolled', player: player.id, dice });
  const prize = doubles ? doublesPrize(s) : 0;
  if (prize > 0) {
    player.cash += prize;
    s.log.push({ type: 'festivalBonus', player: player.id, amount: prize, reason: 'doubles' });
  }

  if (player.inJail) {
    rollInJail(s, player, doubles);
    return;
  }

  if (doubles) s.doublesCount++;
  if (s.doublesCount === 3) {
    goToJail(s, player, 'doubles'); // three doubles in a row: straight to jail, no move
    return;
  }
  s.extraRoll = doubles;
  moveByDice(s, player); // every dice move goes through moveByDice (rush-hour jams are checked there)
}

const FUMBLES: readonly FumbleKind[] = ['table', 'dog', 'chicken'];

/**
 * The dice rolled off the table (under it, or a dog or a chicken got them): the roll doesn't count
 * and the same player rolls again. Only random rolls fumble; dice chosen by the tutorial never do.
 */
function fumble(s: GameState): void {
  const [r, next] = nextUint32(s.rngState);
  s.rngState = next;
  s.lastCard = null;
  s.log.push({ type: 'diceFumbled', player: s.current, how: FUMBLES[r % FUMBLES.length] });
}

/** In jail, the roll is an attempt to get out with doubles. Leaving jail never earns an extra roll. */
function rollInJail(s: GameState, player: Player, doubles: boolean): void {
  s.extraRoll = false;
  if (doubles) {
    leaveJail(s, player, 'doubles');
    moveByDice(s, player);
    return;
  }

  player.jailAttempts++;
  if (player.jailAttempts < MAX_JAIL_ATTEMPTS) {
    s.log.push({ type: 'stayedInJail', player: player.id, attempt: player.jailAttempts });
    s.phase = { kind: 'awaitEndTurn' };
    return;
  }
  // Third failure: pay the fine, then move by this roll. If they can't pay, payDebt() continues later.
  if (!charge(s, player.id, null, JAIL_FINE, { kind: 'jailFine' })) return;
  leaveJail(s, player, 'forcedFine');
  moveByDice(s, player);
}

function payJailFine(s: GameState): void {
  const player = s.players[s.current];
  player.cash -= JAIL_FINE;
  leaveJail(s, player, 'fine'); // then they roll as usual
}

function useJailCard(s: GameState): void {
  const player = s.players[s.current];
  const deck = player.jailCards.pop()!;
  s.decks[deck].push(jailFreeCardIndex(deck)); // the card goes back under its deck
  leaveJail(s, player, 'card');
}

function buy(s: GameState): void {
  if (s.phase.kind !== 'awaitBuy') return;
  const index = s.phase.space;
  const space = BOARD[index];
  if (!isOwnable(space)) return;

  const player = s.players[s.current];
  const price = buyPrice(s);
  player.cash -= price;
  s.ownership[index] = { owner: player.id, houses: 0, mortgaged: false };
  s.stats[player.id].bought++;
  s.log.push({ type: 'bought', player: player.id, space: index, price });
  finishLanding(s);
}

/** What the space on offer costs now: its price, or what haggling made of it. */
export function buyPrice(state: GameState): number {
  if (state.phase.kind !== 'awaitBuy') return 0;
  const space = BOARD[state.phase.space];
  return state.phase.price ?? (isOwnable(space) ? space.price : 0);
}

/** Mặc cả: once per landing, half the time 20% off, half the time the seller sulks and adds 10%. */
function haggle(s: GameState): void {
  if (s.phase.kind !== 'awaitBuy') return;
  const space = BOARD[s.phase.space];
  if (!isOwnable(space)) return;
  const [r, next] = nextUint32(s.rngState);
  s.rngState = next;
  const won = r % 2 === 0;
  const factor = won ? 1 - HAGGLE_DISCOUNT : 1 + HAGGLE_MARKUP;
  const price = Math.round((space.price * factor) / 10_000) * 10_000;
  s.phase = { kind: 'awaitBuy', space: s.phase.space, price, haggled: true };
  s.log.push({ type: 'haggled', player: s.current, space: s.phase.space, price, won });
}

/** Ăn vạ: the debtor's once-a-game tantrum; whoever is owed lets 20% of the debt go. */
function anVa(s: GameState): void {
  if (s.phase.kind !== 'inDebt') return;
  const player = s.players[s.phase.debtor];
  const forgiven = Math.round((s.phase.amount * AN_VA_SHARE) / 10_000) * 10_000;
  player.anVaUsed = true;
  s.phase = { ...s.phase, amount: s.phase.amount - forgiven };
  s.log.push({ type: 'anVa', player: player.id, forgiven });
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

  if (reason.kind === 'jailFine') {
    // The forced fine is paid: now leave jail and move by the roll that failed.
    const player = s.players[debtor];
    leaveJail(s, player, 'forcedFine');
    moveByDice(s, player);
    return;
  }
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
  if (creditor !== null) {
    s.players[creditor].cash += assets;
    s.players[creditor].jailCards.push(...player.jailCards);
  } else {
    for (const deck of player.jailCards) s.decks[deck].push(jailFreeCardIndex(deck));
  }
  player.cash = 0;
  player.jailCards = [];
  player.inJail = false;
  player.jailAttempts = 0;
  player.bankrupt = true;
  s.log.push({ type: 'bankrupt', player: debtor, creditor });

  const remaining = s.players.filter((p) => !p.bankrupt);
  if (remaining.length === 1) {
    s.worth.push(worthOfAll(s));
    s.festival = null;
    s.endReason = 'lastStanding';
    s.phase = { kind: 'gameOver', winner: remaining[0].id };
    s.log.push({ type: 'won', player: remaining[0].id });
  } else {
    advanceTurn(s);
  }
}

/** Build, sell, mortgage or unmortgage. Already checked by isPropertyActionAllowed; the phase stays the same. */
function manageProperty(s: GameState, action: PropertyAction): void {
  const { space } = action;
  const own = s.ownership[space];
  const player = s.players[own.owner];

  switch (action.type) {
    case 'BUILD_HOUSE': {
      const cost = buildCost(s, space);
      player.cash -= cost;
      own.houses++;
      s.stats[player.id].housesBuilt++;
      s.log.push({ type: 'builtHouse', player: player.id, space, houses: own.houses, cost });
      break;
    }
    case 'SELL_HOUSE': {
      const refund = houseRefund(space);
      player.cash += refund;
      own.houses--;
      s.log.push({ type: 'soldHouse', player: player.id, space, houses: own.houses, refund });
      break;
    }
    case 'MORTGAGE': {
      const amount = mortgageValue(space);
      player.cash += amount;
      own.mortgaged = true;
      s.log.push({ type: 'mortgaged', player: player.id, space, amount });
      break;
    }
    case 'UNMORTGAGE': {
      const amount = unmortgagePrice(s, space);
      player.cash -= amount;
      own.mortgaged = false;
      s.log.push({ type: 'unmortgaged', player: player.id, space, amount });
      break;
    }
  }
}

function proposeTrade(s: GameState, offer: TradeOffer): void {
  if (s.phase.kind !== 'awaitRoll' && s.phase.kind !== 'awaitEndTurn') return;
  const stored = normalizeOffer(offer);
  s.phase = { kind: 'tradeOffer', offer: stored, resume: s.phase };
  s.log.push({ type: 'tradeProposed', offer: stored });
}

function acceptTrade(s: GameState): void {
  if (s.phase.kind !== 'tradeOffer') return;
  const { offer, resume } = s.phase;
  // Nothing can change while an offer waits, but check again rather than trust it.
  if (offerProblem(s, offer) !== null) throw new GameError('The offer is no longer valid');

  const from = s.players[offer.from];
  const to = s.players[offer.to];
  from.cash += offer.take.cash - offer.give.cash;
  to.cash += offer.give.cash - offer.take.cash;
  for (const space of offer.give.spaces) s.ownership[space].owner = to.id;
  for (const space of offer.take.spaces) s.ownership[space].owner = from.id;
  for (let i = 0; i < offer.give.jailCards; i++) to.jailCards.push(from.jailCards.pop()!);
  for (let i = 0; i < offer.take.jailCards; i++) from.jailCards.push(to.jailCards.pop()!);
  s.stats[from.id].trades++;
  s.stats[to.id].trades++;

  s.log.push({ type: 'tradeAccepted', offer });
  s.phase = resume;
}

function rejectTrade(s: GameState): void {
  if (s.phase.kind !== 'tradeOffer') return;
  s.log.push({ type: 'tradeRejected', offer: s.phase.offer });
  s.phase = s.phase.resume;
}

function advanceTurn(s: GameState): void {
  let next = s.current;
  do {
    next = (next + 1) % s.players.length;
  } while (s.players[next].bankrupt);

  // Back around to the start of the playing order: a new round (which may end the game).
  if (next <= s.current) {
    startNextRound(s);
    if (s.phase.kind === 'gameOver') return;
  }

  s.current = next;
  s.phase = { kind: 'awaitRoll' };
  s.dice = null;
  s.doublesCount = 0;
  s.extraRoll = false;
  s.lastCard = null;
  s.log.push({ type: 'turnStarted', player: next });
}

// ---------------------------------------------------------------------------
// Jail and cards

function goToJail(s: GameState, player: Player, reason: JailReason): void {
  player.position = JAIL_SPACE;
  player.inJail = true;
  player.jailAttempts = 0;
  s.extraRoll = false; // going to jail ends the turn, even after doubles
  s.stats[player.id].jailed++;
  s.log.push({ type: 'wentToJail', player: player.id, reason });
  s.phase = { kind: 'awaitEndTurn' };
}

function leaveJail(s: GameState, player: Player, how: 'doubles' | 'fine' | 'card' | 'forcedFine'): void {
  player.inJail = false;
  player.jailAttempts = 0;
  s.log.push({ type: 'leftJail', player: player.id, how });
}

function drawCard(s: GameState, player: Player, deck: CardDeck): void {
  const card = s.decks[deck].shift()!;
  const { effect } = CARDS[deck][card];
  s.lastCard = { deck, card };
  s.stats[player.id].cards++;
  s.log.push({ type: 'drewCard', player: player.id, deck, card });
  const prize = cardPrize(s);
  if (prize > 0) {
    player.cash += prize;
    s.log.push({ type: 'festivalBonus', player: player.id, amount: prize, reason: 'card' });
  }
  if (effect.kind !== 'jailFree') s.decks[deck].push(card); // back under the deck

  const others = s.players.filter((p) => p.id !== player.id && !p.bankrupt);
  switch (effect.kind) {
    case 'collect':
      player.cash += effect.amount;
      s.log.push({ type: 'cardCollected', player: player.id, amount: effect.amount });
      break;
    case 'pay':
      if (!charge(s, player.id, null, effect.amount, { kind: 'card' })) return;
      break;
    case 'collectFromEach': {
      // Players who can't afford it give what they have (they can't go bankrupt on someone else's turn).
      let total = 0;
      for (const other of others) {
        const paid = Math.min(effect.amount, other.cash);
        other.cash -= paid;
        total += paid;
      }
      player.cash += total;
      s.log.push({ type: 'collectedFromEach', player: player.id, total });
      break;
    }
    case 'payEach': {
      const total = effect.amount * others.length;
      if (!charge(s, player.id, null, total, { kind: 'payEach', each: effect.amount })) return;
      break;
    }
    case 'advanceTo':
      moveBy(s, player, (effect.space - player.position + BOARD_SIZE) % BOARD_SIZE);
      resolveLanding(s, player);
      return;
    case 'advanceToNearest': {
      let steps = 1;
      while (BOARD[(player.position + steps) % BOARD_SIZE].kind !== effect.target) steps++;
      moveBy(s, player, steps);
      resolveLanding(s, player, effect.target === 'transport' ? { rentMultiplier: 2 } : { utilityPerPip: UTILITY_CARD_MULTIPLIER });
      return;
    }
    case 'moveBack':
      player.position = (player.position - effect.steps + BOARD_SIZE) % BOARD_SIZE;
      s.log.push({ type: 'moved', player: player.id, to: player.position });
      resolveLanding(s, player);
      return;
    case 'goToJail':
      goToJail(s, player, 'card');
      return;
    case 'jailFree':
      player.jailCards.push(deck);
      break;
    case 'moveForward':
      moveBy(s, player, effect.steps);
      resolveLanding(s, player);
      return;
    case 'goHome':
      // Mum calls: straight home, without passing Xuất phát (so no salary).
      player.position = 0;
      s.log.push({ type: 'moved', player: player.id, to: 0 });
      break;
    case 'payNeighbour': {
      // The player before you in the playing order (skipping anyone bankrupt).
      let n = player.id;
      do n = (n - 1 + s.players.length) % s.players.length;
      while (s.players[n].bankrupt && n !== player.id);
      if (n !== player.id && !charge(s, player.id, n, effect.amount, { kind: 'card' })) return;
      break;
    }
    case 'nothing':
      break;
    case 'repairs': {
      let amount = 0;
      for (const own of Object.values(s.ownership)) {
        if (own.owner !== player.id) continue;
        amount += own.houses === 5 ? effect.perHotel : own.houses * effect.perHouse;
      }
      if (amount > 0 && !charge(s, player.id, null, amount, { kind: 'card' })) return;
      break;
    }
  }
  finishLanding(s);
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
    // Missions too: finishing one marks its slot done, and that mustn't reach back into the old state.
    players: state.players.map((p) => ({
      ...p,
      jailCards: [...p.jailCards],
      ...(p.missions ? { missions: p.missions.map((m) => ({ ...m })) } : {}),
    })),
    stats: state.stats.map((st) => ({ ...st })),
    worth: state.worth.slice(), // the rows themselves are never changed
    ownership,
    decks: { chance: [...state.decks.chance], community: [...state.decks.community] },
    log: state.log.slice(),
  };
}

function moveBy(s: GameState, player: Player, steps: number): void {
  const target = player.position + steps;
  if (target >= BOARD_SIZE) {
    const salary = salaryFor(s);
    player.cash += salary;
    s.stats[player.id].laps++;
    s.log.push({ type: 'passedStart', player: player.id, amount: salary });
  }
  player.position = target % BOARD_SIZE;
  s.log.push({ type: 'moved', player: player.id, to: player.position });
}

function moveByDice(s: GameState, player: Player): void {
  const steps = s.dice![0] + s.dice![1];
  // Rush hour (Chế độ Việt): a jam on the way stops the move there, until the player decides.
  const jam = isRushHour(s) ? jamOnPath(player.position, steps) : null;
  if (jam !== null) {
    const toJam = (jam - player.position + BOARD_SIZE) % BOARD_SIZE;
    moveBy(s, player, toJam);
    s.phase = { kind: 'inJam', space: jam, remaining: steps - toJam };
    s.log.push({ type: 'jam', player: player.id, space: jam, remaining: steps - toJam });
    return;
  }
  moveBy(s, player, steps);
  resolveLanding(s, player);
}

/** A xe ôm weaves through the jam: pay the fee, go the rest of the way. */
function xeOm(s: GameState): void {
  if (s.phase.kind !== 'inJam') return;
  const player = s.players[s.current];
  const { remaining } = s.phase;
  player.cash -= XE_OM_FEE;
  s.log.push({ type: 'xeOm', player: player.id, fee: XE_OM_FEE });
  moveBy(s, player, remaining);
  resolveLanding(s, player);
}

/** Pay someone to lead the buffalo home; then the landing goes on as usual. */
function leadBuffalo(s: GameState): void {
  if (s.phase.kind !== 'buffalo') return;
  const { rentMultiplier, utilityPerPip } = s.phase;
  const player = s.players[s.current];
  player.cash -= BUFFALO_FEE;
  s.buffalo = null;
  s.log.push({ type: 'buffaloLed', player: player.id, fee: BUFFALO_FEE });
  resolveLanding(s, player, { rentMultiplier, utilityPerPip });
}

/** Climb on the buffalo: it wanders off with you, a few spaces on. */
function rideBuffalo(s: GameState): void {
  if (s.phase.kind !== 'buffalo') return;
  const player = s.players[s.current];
  const [r, next] = nextUint32(s.rngState);
  s.rngState = next;
  const steps = BUFFALO_RIDE.min + (r % (BUFFALO_RIDE.max - BUFFALO_RIDE.min + 1));
  s.buffalo = null;
  s.log.push({ type: 'buffaloRide', player: player.id, steps });
  moveBy(s, player, steps);
  resolveLanding(s, player);
}

interface RentOptions {
  rentMultiplier?: number; // "pay double rent" cards
  utilityPerPip?: number; // "pay the dice total × 100k" card
}

function resolveLanding(s: GameState, player: Player, options: RentOptions = {}): void {
  const index = player.position;
  const space = BOARD[index];

  // Chế độ Việt: a buffalo stands here and has to be dealt with first.
  if (s.rules.viet?.buffalo && s.buffalo === index) {
    s.phase = { kind: 'buffalo', space: index, ...options };
    s.log.push({ type: 'buffaloMet', player: player.id, space: index });
    return;
  }

  switch (space.kind) {
    case 'property':
    case 'transport':
    case 'utility': {
      const own = s.ownership[index];
      if (!own) {
        s.phase = { kind: 'awaitBuy', space: index };
        return;
      }
      if (own.owner !== player.id && !own.mortgaged) {
        const diceTotal = s.dice![0] + s.dice![1];
        const rent =
          space.kind === 'utility' && options.utilityPerPip
            ? diceTotal * options.utilityPerPip
            : Math.round(rentFor(s, index, diceTotal) * (options.rentMultiplier ?? 1) * festivalRentMultiplier(s, index));
        if (rent > 0 && !charge(s, player.id, own.owner, rent, { kind: 'rent', space: index })) return;
      }
      break;
    }
    case 'tax':
      if (taxFree(s)) {
        s.log.push({ type: 'festivalTaxFree', player: player.id, space: index });
        break;
      }
      if (!charge(s, player.id, null, space.amount, { kind: 'tax', space: index })) return;
      break;
    case 'goToJail':
      goToJail(s, player, 'space');
      return;
    case 'card':
      drawCard(s, player, space.deck);
      return;
    case 'start':
    case 'jail':
    case 'rest':
      break;
  }
  finishLanding(s);
}

/**
 * Makes `debtor` pay. Returns false if they can't afford it; the game then waits in the
 * inDebt phase until they pay (after selling or mortgaging) or go bankrupt.
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

  switch (reason.kind) {
    case 'rent':
      s.stats[debtor].rentPaid += amount;
      s.stats[creditor!].rentReceived += amount;
      s.log.push({ type: 'paidRent', player: debtor, to: creditor!, space: reason.space, amount });
      break;
    case 'tax':
      s.log.push({ type: 'paidTax', player: debtor, space: reason.space, amount });
      break;
    case 'card':
      s.log.push({ type: 'cardPaid', player: debtor, amount });
      break;
    case 'payEach':
      for (const other of s.players) {
        if (other.id !== debtor && !other.bankrupt) other.cash += reason.each;
      }
      s.log.push({ type: 'paidEach', player: debtor, each: reason.each });
      break;
    case 'jailFine':
      break; // logged as leftJail 'forcedFine'
  }
}

/** After the landing is fully resolved: roll again after doubles, otherwise wait for End turn. */
function finishLanding(s: GameState): void {
  s.phase = s.extraRoll ? { kind: 'awaitRoll' } : { kind: 'awaitEndTurn' };
}
