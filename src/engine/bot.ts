// Computer players: given the game, the next action for the bot whose move it is. Pure and
// deterministic (the same game always gives the same choice), so bots can be tested like the rules.

import { BOARD, GROUP_SPACES, isOwnable, JAIL_FINE } from '../data/board';
import { canBuildHouse, canMortgage, canSellHouse, canUnmortgage, HOTEL, houseRefund, mortgageValue } from './buildings';
import { buyPrice, HAGGLE_MARKUP, legalActions, whoseMove } from './game';
import { BUFFALO_FEE, XE_OM_FEE } from './roads';
import { buildCost, unmortgagePrice } from './rounds';
import { canTradeSpace, tradeProblem } from './trading';
import type { Action, BotLevel, GameState, TradeOffer } from './types';

export const BOT_LEVELS: readonly BotLevel[] = ['easy', 'normal', 'hard'];

const TR = 1_000_000;

/** How each level plays. */
interface Style {
  reserve: number; // cash it tries to keep after buying or building
  buyChance: number; // how often it buys a place it can afford without a reason (0..1)
  maxHouses: number; // builds up to this many per property (5 = hotel)
  buildChance: number; // how often it builds when it could
  tradeWeight: number; // how much it minds what the other player gains in a trade (0..1)
  tradeMargin: number; // how much better than even a trade must be for it to say yes (đồng)
  premium: number; // what it offers a person for the places it's missing, times their price
}

const STYLES: Record<BotLevel, Style> = {
  easy: { reserve: 0.5 * TR, buyChance: 0.75, maxHouses: 3, buildChance: 0.4, tradeWeight: 0.3, tradeMargin: -1 * TR, premium: 1.2 },
  normal: { reserve: 1.5 * TR, buyChance: 1, maxHouses: 4, buildChance: 1, tradeWeight: 0.8, tradeMargin: 0, premium: 1.5 },
  hard: { reserve: 2 * TR, buyChance: 1, maxHouses: HOTEL, buildChance: 1, tradeWeight: 1, tradeMargin: 0.5 * TR, premium: 1.4 },
};

/** The bot that must act now and its level, or null when it's a person's move (or the game is over). */
export function botToMove(state: GameState): { player: number; level: BotLevel } | null {
  const player = whoseMove(state);
  const level = player === null ? undefined : state.players[player].bot;
  return player !== null && level ? { player, level } : null;
}

/** The next action for the bot whose move it is, or null when it's a person's move. */
export function botAction(state: GameState): Action | null {
  const mover = botToMove(state);
  if (!mover) return null;
  const { player, level } = mover;
  const style = STYLES[level];
  const { phase } = state;

  switch (phase.kind) {
    case 'tradeOffer':
      return { type: acceptsTrade(state, phase.offer, style) ? 'ACCEPT_TRADE' : 'REJECT_TRADE' };

    case 'inDebt':
      return payDebt(state, player, phase.amount, level);

    case 'awaitBuy': {
      const allowed = legalActions(state);
      const price = buyPrice(state);
      const wants = allowed.includes('BUY') && wantsToBuy(state, player, phase.space, price, style, level);
      // Mặc cả: worth a try when it wants the place and could still pay if the seller sulks
      // (on average it saves money). Easy bots just haggle now and then.
      const sulkPrice = Math.round(price * (1 + HAGGLE_MARKUP));
      if (allowed.includes('HAGGLE') && (wants || level === 'easy') && state.players[player].cash >= sulkPrice) {
        if (level !== 'easy' || mood(state, 2000 + phase.space) < 0.5) return { type: 'HAGGLE' };
      }
      return { type: wants ? 'BUY' : 'DECLINE' };
    }

    case 'awaitRoll': {
      const manage = improve(state, player, style, level);
      if (manage) return manage;
      const offer = proposeTrade(state, player, style, level);
      if (offer) return { type: 'PROPOSE_TRADE', offer };
      return leaveJail(state, player, level) ?? { type: 'ROLL' };
    }

    case 'awaitEndTurn':
      return improve(state, player, style, level) ?? { type: 'END_TURN' };

    case 'inJam': {
      // A xe ôm through the jam, if the money can be spared (easy bots: on a whim).
      const pays = legalActions(state).includes('XE_OM') && (level === 'easy' ? mood(state, 3000) < 0.5 : state.players[player].cash - XE_OM_FEE >= reserveFor(state, player, style, level));
      return { type: pays ? 'XE_OM' : 'WAIT_IN_JAM' };
    }

    case 'buffalo': {
      // Lead it home if the money can be spared; otherwise (or on a whim) climb on.
      const leads = legalActions(state).includes('LEAD_BUFFALO') && (level === 'easy' ? mood(state, 4000) < 0.5 : state.players[player].cash - BUFFALO_FEE >= reserveFor(state, player, style, level));
      return { type: leads ? 'LEAD_BUFFALO' : 'RIDE_BUFFALO' };
    }

    case 'gameOver':
      return null;
  }
}

/**
 * A number from 0 to 1 that depends only on the game and `salt`: the bot's "mood", so easy bots
 * vary without making the game depend on anything but its own state.
 */
function mood(state: GameState, salt: number): number {
  let h = (state.rngState ^ Math.imul(state.log.length + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0x1_0000_0000;
}

/** The highest rent another player could charge right now: hard bots keep that much in hand. */
function worstRent(state: GameState, player: number): number {
  let worst = 0;
  for (const [index, own] of Object.entries(state.ownership)) {
    const space = BOARD[Number(index)];
    if (own.owner === player || own.mortgaged || space.kind !== 'property') continue;
    worst = Math.max(worst, space.rent[own.houses]);
  }
  return worst;
}

function reserveFor(state: GameState, player: number, style: Style, level: BotLevel): number {
  if (level !== 'hard') return style.reserve;
  return Math.min(6 * TR, Math.max(style.reserve, worstRent(state, player) * 0.6));
}

/** Who owns how many of a color set, after an optional change of owners. */
function setOwners(state: GameState, space: number, owners: Record<number, number> = {}): number[] {
  const s = BOARD[space];
  if (s.kind !== 'property') return [];
  return GROUP_SPACES[s.group].map((i) => owners[i] ?? state.ownership[i]?.owner ?? -1);
}

/** Buying this space would give `player` the whole color set. */
function completesSet(state: GameState, player: number, space: number): boolean {
  const owners = setOwners(state, space, { [space]: player });
  return owners.length > 0 && owners.every((o) => o === player);
}

/** Another player holds the rest of this space's set, so buying it stops them from completing it. */
function blocksSet(state: GameState, player: number, space: number): boolean {
  const s = BOARD[space];
  if (s.kind !== 'property') return false;
  const others = GROUP_SPACES[s.group].filter((i) => i !== space).map((i) => state.ownership[i]?.owner ?? -1);
  return others[0] >= 0 && others[0] !== player && others.every((o) => o === others[0]);
}

function wantsToBuy(state: GameState, player: number, space: number, price: number, style: Style, level: BotLevel): boolean {
  const s = BOARD[space];
  if (!isOwnable(s)) return false;
  const left = state.players[player].cash - price;
  if (left < 0) return false;
  // Easy bots don't think about sets; the others stretch their budget for them.
  if (level !== 'easy' && (completesSet(state, player, space) || blocksSet(state, player, space))) return left >= 0.3 * TR;
  if (left < reserveFor(state, player, style, level)) return false;
  return mood(state, space) < style.buyChance;
}

/** Before rolling or ending the turn: lift a mortgage or build, if the bot can spare the money. */
function improve(state: GameState, player: number, style: Style, level: BotLevel): Action | null {
  const cash = state.players[player].cash;
  const reserve = reserveFor(state, player, style, level);
  const mine = Object.keys(state.ownership)
    .map(Number)
    .filter((i) => state.ownership[i].owner === player);

  // Mortgages first, so sets can be built on again; the dearest set first.
  const toLift = mine
    .filter((i) => canUnmortgage(state, i) && cash - unmortgagePrice(state, i) >= reserve * 2)
    .sort((a, b) => (BOARD[b] as { price: number }).price - (BOARD[a] as { price: number }).price);
  if (toLift.length) return { type: 'UNMORTGAGE', space: toLift[0] };

  if (mood(state, 1000 + player) >= style.buildChance) return null;
  // Build evenly: the property with the fewest houses, dearest set first (more rent per house).
  const toBuild = mine
    .filter((i) => canBuildHouse(state, i) && state.ownership[i].houses < style.maxHouses && cash - buildCost(state, i) >= reserve)
    .sort((a, b) => state.ownership[a].houses - state.ownership[b].houses || b - a);
  return toBuild.length ? { type: 'BUILD_HOUSE', space: toBuild[0] } : null;
}

/** In jail: hard bots leave early in the game (to buy) and stay late (to dodge rent); others mostly roll. */
function leaveJail(state: GameState, player: number, level: BotLevel): Action | null {
  const p = state.players[player];
  if (!p.inJail) return null;
  const allowed = legalActions(state);
  const forSale = BOARD.filter((s, i) => isOwnable(s) && !state.ownership[i]).length;
  const early = forSale >= 8;
  if (level === 'easy') return null;
  if (level === 'hard' && !early) return null;
  if (allowed.includes('USE_JAIL_CARD')) return { type: 'USE_JAIL_CARD' };
  if (allowed.includes('PAY_JAIL_FINE') && p.cash - JAIL_FINE >= (level === 'hard' ? 2 * TR : 5 * TR)) return { type: 'PAY_JAIL_FINE' };
  return null;
}

/**
 * Settling a debt: pay if it can; otherwise raise money (mortgage loose places first, then sell
 * houses, then mortgage the rest); give up only when even all of that wouldn't cover it.
 */
function payDebt(state: GameState, player: number, amount: number, level: BotLevel): Action {
  const cash = state.players[player].cash;
  if (cash >= amount) return { type: 'PAY_DEBT' };
  const canTantrum = legalActions(state).includes('AN_VA');

  const mine = Object.keys(state.ownership)
    .map(Number)
    .filter((i) => state.ownership[i].owner === player);
  const raisable =
    cash +
    mine.reduce((sum, i) => {
      const own = state.ownership[i];
      const houses = own.houses * houseRefund(i);
      return sum + houses + (own.mortgaged ? 0 : mortgageValue(i));
    }, 0);
  // Ăn vạ (Chế độ Việt), once a game: Khó saves it for when it would otherwise go bankrupt; the
  // others throw it the first time they're short.
  if (canTantrum && (raisable < amount || level !== 'hard')) return { type: 'AN_VA' };
  if (raisable < amount) return { type: 'DECLARE_BANKRUPTCY' };

  const inFullSet = (i: number) => {
    const owners = setOwners(state, i);
    return owners.length > 0 && owners.every((o) => o === player);
  };
  const cheapestFirst = (a: number, b: number) => mortgageValue(a) - mortgageValue(b);
  const loose = mine.filter((i) => canMortgage(state, i) && !inFullSet(i)).sort(cheapestFirst);
  if (loose.length) return { type: 'MORTGAGE', space: loose[0] };
  const houses = mine.filter((i) => canSellHouse(state, i)).sort((a, b) => houseRefund(a) - houseRefund(b));
  if (houses.length) return { type: 'SELL_HOUSE', space: houses[0] };
  const rest = mine.filter((i) => canMortgage(state, i)).sort(cheapestFirst);
  if (rest.length) return { type: 'MORTGAGE', space: rest[0] };
  return { type: 'DECLARE_BANKRUPTCY' };
}

/**
 * What a player's holdings are worth to them: cash, plus each place at its price (half if
 * mortgaged), doubled for a whole color set, plus what was spent on buildings.
 */
function holdingsValue(state: GameState, player: number, owners: Record<number, number>, cashChange: number): number {
  let value = state.players[player].cash + cashChange;
  const all = new Set([...Object.keys(state.ownership).map(Number), ...Object.keys(owners).map(Number)]);
  for (const i of all) {
    const owner = owners[i] ?? state.ownership[i]?.owner;
    if (owner !== player) continue;
    const s = BOARD[i];
    if (!isOwnable(s)) continue;
    const own = state.ownership[i];
    let worth = own?.mortgaged ? s.price / 2 : s.price;
    const set = setOwners(state, i, owners);
    if (set.length > 0 && set.every((o) => o === player)) worth *= 2;
    value += worth + (own?.houses ?? 0) * (s.kind === 'property' ? s.houseCost : 0);
  }
  return value;
}

/** A bot says yes when it comes out ahead, counting (by level) how much the other side gains. */
function acceptsTrade(state: GameState, offer: TradeOffer, style: Style): boolean {
  const me = offer.to;
  const them = offer.from;
  const owners: Record<number, number> = {};
  for (const i of offer.give.spaces) owners[i] = me;
  for (const i of offer.take.spaces) owners[i] = them;
  const JAIL_CARD = JAIL_FINE; // a free way out of jail is worth about the fine
  const myCash = offer.give.cash - offer.take.cash + (offer.give.jailCards - offer.take.jailCards) * JAIL_CARD;

  const myGain = holdingsValue(state, me, owners, myCash) - holdingsValue(state, me, {}, 0);
  const theirGain = holdingsValue(state, them, owners, -myCash) - holdingsValue(state, them, {}, 0);
  return myGain - style.tradeWeight * Math.max(0, theirGain) > style.tradeMargin;
}

/** Log entries to look back over before offering another trade (about two rounds). */
const TRADE_COOLDOWN = 60;
const STEP = 100_000; // offers are in whole hundreds of thousands

/**
 * At the start of its turn, a bot that is missing part of a color set held by one other player
 * offers to buy it: cash, or cash plus a place of its own that it doesn't need. Another bot is
 * offered the least it would take; a person gets a fair premium. Not again for a while after an offer.
 */
function proposeTrade(state: GameState, player: number, style: Style, level: BotLevel): TradeOffer | null {
  if (state.log.slice(-TRADE_COOLDOWN).some((e) => e.type === 'tradeProposed' && e.offer.from === player)) return null;
  const me = state.players[player];
  const reserve = reserveFor(state, player, style, level);

  for (const spaces of Object.values(GROUP_SPACES)) {
    const owners = spaces.map((i) => state.ownership[i]?.owner ?? -1);
    const missing = spaces.filter((_, k) => owners[k] !== player);
    const holders = new Set(missing.map((i) => state.ownership[i]?.owner ?? -1));
    // It must own part of the set, and one other (still playing) player must hold all the rest.
    if (missing.length === 0 || missing.length === spaces.length || holders.size !== 1) continue;
    const them = [...holders][0];
    if (them < 0 || state.players[them].bankrupt || !spaces.every((i) => canTradeSpace(state, i))) continue;

    const price = missing.reduce((sum, i) => sum + (BOARD[i] as { price: number }).price, 0);
    // Something to swap: one of its own places that is no use to its sets and wouldn't complete theirs.
    const spare = Object.keys(state.ownership)
      .map(Number)
      .filter((i) => state.ownership[i].owner === player && canTradeSpace(state, i) && !groupSpacesOf(i).some((j) => spaces.includes(j)))
      .filter((i) => !completesSet(state, them, i) && !nearSet(state, player, i))
      .sort((a, b) => (BOARD[b] as { price: number }).price - (BOARD[a] as { price: number }).price)[0];

    for (const give of spare === undefined ? [[]] : [[], [spare]]) {
      const value = give.reduce((sum, i) => sum + (BOARD[i] as { price: number }).price, 0);
      const budget = Math.floor((me.cash - reserve) / STEP) * STEP;
      const offerFor = (cash: number): TradeOffer => ({
        from: player,
        to: them,
        give: { spaces: give, cash, jailCards: 0 },
        take: { spaces: missing, cash: 0, jailCards: 0 },
      });
      let cash: number | null = null;
      const partner = state.players[them].bot;
      if (partner) {
        // The least the other bot would say yes to.
        for (let c = 0; c <= budget; c += STEP) {
          if (acceptsTrade(state, offerFor(c), STYLES[partner])) {
            cash = c;
            break;
          }
        }
      } else {
        const asked = Math.max(0, Math.ceil((price * style.premium - value) / STEP) * STEP);
        if (asked <= budget) cash = asked;
      }
      if (cash === null) continue;
      const offer = offerFor(cash);
      if (tradeProblem(state, offer) === null) return offer;
    }
  }
  return null;
}

/** The spaces of the color set `space` belongs to (just itself for transport and utilities). */
function groupSpacesOf(space: number): readonly number[] {
  const s = BOARD[space];
  return s.kind === 'property' ? GROUP_SPACES[s.group] : [space];
}

/** The player owns some of this space's set, so it is worth keeping. */
function nearSet(state: GameState, player: number, space: number): boolean {
  return groupSpacesOf(space).some((i) => i !== space && state.ownership[i]?.owner === player);
}
