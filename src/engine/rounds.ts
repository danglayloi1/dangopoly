// Rounds, festivals, the round and time limits, and what each player is worth.
// A round ends when play comes back around to the first player.

import { BOARD, GROUP_SPACES, isOwnable, START_SALARY, type ColorGroup } from '../data/board';
import { nextUint32 } from './rng';
import type { EndReason, Festival, FestivalId, GameState, PlayerStats } from './types';

/** With festival mode on, rounds 3, 6, 9… each have a festival. It lasts that one round. */
export const FESTIVAL_EVERY = 3;
/** Chế độ Việt: Tết comes every this many rounds; the lì xì is this share of the wealth gap, up to a cap. */
export const TET_EVERY = 5;
export const TET_SHARE = 0.1;
export const TET_MAX = 3_000_000;
export const FESTIVALS: readonly FestivalId[] = [
  'denCuong', // rent ×2 on one random color set
  'langSen', // double salary at Xuất phát
  'gioLao', // no building
  'chieuTrung', // the bank gives everyone FESTIVAL_GIFT
  'cuaLo', // rent ×2 on the beaches
  'muaCuoi', // transport rent ×2 (wedding season: everyone travels)
  'nangNong', // utility rent ×2 (June heat)
  'muaBao', // all rent halved (storm season)
  'choPhien', // houses cost half (market day)
  'hoiVat', // rolling doubles wins FESTIVAL_BONUS (wrestling festival)
  'anXa', // everyone in jail is set free (amnesty)
  'duocMua', // no taxes (bumper harvest)
  'hongSon', // drawing a card also gives FESTIVAL_BONUS
  'dongGop', // everyone gives FESTIVAL_LEVY to the bank (village hall repairs)
  'tuongThan', // everyone gives FESTIVAL_SHARE to the poorest player
  'luaChin', // lifting a mortgage costs no interest (harvest time)
];
/** Lễ hội Đền Chiêu Trưng: the bank gives every player this at the start of the round. */
export const FESTIVAL_GIFT = 1_000_000;
/** Hội vật làng (doubles) and Lễ hội Đền Hồng Sơn (cards): the prize. */
export const FESTIVAL_BONUS = 500_000;
/** Góp tiền sửa đình làng: what each player gives the bank (or all they have). */
export const FESTIVAL_LEVY = 500_000;
/** Tương thân tương ái: what each player gives the poorest one (or all they have). */
export const FESTIVAL_SHARE = 300_000;

/** The six beaches, for the Cửa Lò festival. */
const BEACHES: readonly number[] = BOARD.flatMap((s, i) => (s.name.vi.startsWith('Biển ') ? [i] : []));

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

/** How this round's festival changes the rent on `space` (×2, ×0.5 or ×1). */
export function festivalRentMultiplier(state: GameState, space: number): number {
  const s = BOARD[space];
  switch (state.festival?.id) {
    case 'denCuong':
      return s.kind === 'property' && s.group === state.festival.group ? 2 : 1;
    case 'cuaLo':
      return BEACHES.includes(space) ? 2 : 1;
    case 'muaCuoi':
      return s.kind === 'transport' ? 2 : 1;
    case 'nangNong':
      return s.kind === 'utility' ? 2 : 1;
    case 'muaBao':
      return 0.5;
    default:
      return 1;
  }
}

/** One house on `space` costs this; half during Chợ phiên. */
export function buildCost(state: GameState, space: number): number {
  const s = BOARD[space];
  const cost = s.kind === 'property' ? s.houseCost : 0;
  return state.festival?.id === 'choPhien' ? cost / 2 : cost;
}

/** Lifting a mortgage costs the mortgage value plus 10% interest; no interest during Mùa lúa chín. */
export function unmortgagePrice(state: GameState, space: number): number {
  const s = BOARD[space];
  const loan = isOwnable(s) ? s.price / 2 : 0;
  return state.festival?.id === 'luaChin' ? loan : Math.round((loan * 11) / 10);
}

/** Năm được mùa: nobody pays tax this round. */
export const taxFree = (state: GameState): boolean => state.festival?.id === 'duocMua';

/** Hội vật làng: rolling doubles wins a prize. */
export const doublesPrize = (state: GameState): number => (state.festival?.id === 'hoiVat' ? FESTIVAL_BONUS : 0);

/** Lễ hội Đền Hồng Sơn: drawing a card comes with a prize. */
export const cardPrize = (state: GameState): number => (state.festival?.id === 'hongSon' ? FESTIVAL_BONUS : 0);

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
  if (s.rules.viet?.tet && s.round % TET_EVERY === 0) tet(s);
  if (s.rules.festivals && s.round % FESTIVAL_EVERY === 0) {
    const id = FESTIVALS[randomBelow(s, FESTIVALS.length)];
    const festival: Festival = { id, group: id === 'denCuong' ? COLOR_GROUPS[randomBelow(s, COLOR_GROUPS.length)] : null };
    s.festival = festival;
    s.log.push({ type: 'festival', festival, round: s.round });
    startFestival(s, id);
  }
}

/**
 * Tết (Chế độ Việt): the richest player gives the poorest lì xì: a tenth of the gap in their wealth,
 * at most TET_MAX and no more than the cash they hold. A catch-up rule dressed as a custom.
 */
function tet(s: GameState): void {
  const active = s.players.filter((p) => !p.bankrupt);
  if (active.length < 2) return;
  const worth = worthOfAll(s);
  const richest = active.reduce((hi, p) => (worth[p.id] > worth[hi.id] ? p : hi));
  const poorest = active.reduce((low, p) => (worth[p.id] < worth[low.id] ? p : low));
  if (richest === poorest) return;
  const gift = Math.round((Math.min(TET_MAX, (worth[richest.id] - worth[poorest.id]) * TET_SHARE) / 100_000)) * 100_000;
  const amount = Math.min(gift, richest.cash);
  if (amount <= 0) return;
  richest.cash -= amount;
  poorest.cash += amount;
  s.log.push({ type: 'tetLiXi', from: richest.id, to: poorest.id, amount, round: s.round });
}

/** What some festivals do once, as their round starts. */
function startFestival(s: GameState, id: FestivalId): void {
  const active = s.players.filter((p) => !p.bankrupt);
  switch (id) {
    case 'chieuTrung':
      for (const p of active) p.cash += FESTIVAL_GIFT;
      s.log.push({ type: 'festivalGift', amount: FESTIVAL_GIFT });
      break;
    case 'anXa': {
      const freed = active.filter((p) => p.inJail);
      for (const p of freed) {
        p.inJail = false;
        p.jailAttempts = 0;
      }
      if (freed.length > 0) s.log.push({ type: 'festivalAmnesty', players: freed.map((p) => p.id) });
      break;
    }
    case 'dongGop': {
      // Like a card that collects from everyone: nobody goes bankrupt over it, they give what they have.
      let total = 0;
      for (const p of active) {
        const paid = Math.min(FESTIVAL_LEVY, p.cash);
        p.cash -= paid;
        total += paid;
      }
      s.log.push({ type: 'festivalLevy', total });
      break;
    }
    case 'tuongThan': {
      // The poorest player by wealth gets help (less cash, then earlier in the order, breaks a tie).
      const worth = worthOfAll(s);
      const poorest = active.reduce((low, p) =>
        worth[p.id] < worth[low.id] || (worth[p.id] === worth[low.id] && p.cash < low.cash) ? p : low,
      );
      let total = 0;
      for (const p of active) {
        if (p === poorest) continue;
        const given = Math.min(FESTIVAL_SHARE, p.cash);
        p.cash -= given;
        total += given;
      }
      poorest.cash += total;
      s.log.push({ type: 'festivalShare', to: poorest.id, total });
      break;
    }
    default:
      break; // the others change a rule while their round lasts (see the functions above)
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
