// One online room: the seats, the lobby and the game. Plain TypeScript with no Cloudflare parts,
// so it can be tested like the engine; server/worker.ts stores it and connects it to the phones.

import { PLAYER_COLOR_IDS } from '../src/data/colors';
import { TOKENS } from '../src/data/tokens';
import { actorFor, applyAction, createGame, GameError, MAX_PLAYERS, MIN_PLAYERS } from '../src/engine/game';
import type { Action, Dice, GameState } from '../src/engine/types';
import type { ErrorCode, FirstTurn, FirstTurnRound, Profile, RoomView } from '../src/net/protocol';
import { orderFrom } from '../src/ui/firstTurn';

export interface Seat extends Profile {
  key: string; // secret: lets this seat's phone reconnect
}

/** Everything about a room that is stored between messages. */
export interface RoomState {
  code: string;
  host: number;
  seats: Seat[];
  game: GameState | null;
  firstTurn: FirstTurnRound[] | null;
}

/** Random numbers come from outside, so tests can fix them. */
export interface Randomness {
  die: () => number; // 1..6
  seed: () => number; // 32-bit
  key: () => string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: ErrorCode };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: ErrorCode): Result<never> => ({ ok: false, error });

export const MIN_STARTING_CASH = 1_000_000;
export const MAX_STARTING_CASH = 100_000_000;
const MAX_NAME_LENGTH = 16;
const TOKEN_IDS: readonly string[] = TOKENS.map((t) => t.id);

export function newRoom(code: string, host: Profile, random: Randomness): { room: RoomState; key: string } {
  const key = random.key();
  return { room: { code, host: 0, seats: [{ ...host, key }], game: null, firstTurn: null }, key };
}

/** A profile from a message, tidied up, or null if it can't be used. */
export function cleanProfile(raw: unknown): Profile | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { name, token, color } = raw as Record<string, unknown>;
  if (typeof name !== 'string' || typeof token !== 'string' || typeof color !== 'string') return null;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '' || [...trimmed].length > MAX_NAME_LENGTH) return null;
  if (!TOKEN_IDS.includes(token) || !PLAYER_COLOR_IDS.includes(color as never)) return null;
  return { name: trimmed, token, color } as Profile;
}

function profileProblem(room: RoomState, profile: Profile, except: number | null): ErrorCode | null {
  const others = room.seats.filter((_, i) => i !== except);
  if (others.some((s) => s.token === profile.token)) return 'tokenTaken';
  if (others.some((s) => s.color === profile.color)) return 'colorTaken';
  return null;
}

export function join(room: RoomState, profile: Profile, random: Randomness): Result<{ room: RoomState; seat: number; key: string }> {
  if (room.game) return fail('started');
  if (room.seats.length >= MAX_PLAYERS) return fail('full');
  const problem = profileProblem(room, profile, null);
  if (problem) return fail(problem);
  const key = random.key();
  return ok({ room: { ...room, seats: [...room.seats, { ...profile, key }] }, seat: room.seats.length, key });
}

/** The seat that belongs to a seat key, or null. */
export function seatOfKey(room: RoomState, key: string): number | null {
  const seat = room.seats.findIndex((s) => s.key === key);
  return seat === -1 ? null : seat;
}

export function changeProfile(room: RoomState, seat: number, profile: Profile): Result<RoomState> {
  if (room.game) return fail('started');
  const problem = profileProblem(room, profile, seat);
  if (problem) return fail(problem);
  return ok({ ...room, seats: room.seats.map((s, i) => (i === seat ? { ...profile, key: s.key } : s)) });
}

/**
 * Leaving the lobby frees the seat; the seats after it move up by one. If the host leaves, the
 * next player becomes host. Returns null when the room is now empty.
 */
export function leave(room: RoomState, seat: number): Result<RoomState | null> {
  if (room.game) return fail('started');
  const seats = room.seats.filter((_, i) => i !== seat);
  if (seats.length === 0) return ok(null);
  const host = room.host === seat ? 0 : room.host > seat ? room.host - 1 : room.host;
  return ok({ ...room, seats, host });
}

/**
 * The host starts the game. With 'roll', everyone rolls two dice and the highest total goes first
 * (those tied for highest roll again); the seats are then put in playing order.
 */
export function start(
  room: RoomState,
  seat: number,
  startingCash: unknown,
  firstTurn: FirstTurn,
  random: Randomness,
): Result<RoomState> {
  if (seat !== room.host) return fail('notHost');
  if (room.game) return fail('started');
  if (room.seats.length < MIN_PLAYERS) return fail('notEnoughPlayers');
  if (!Number.isInteger(startingCash) || (startingCash as number) < MIN_STARTING_CASH || (startingCash as number) > MAX_STARTING_CASH) {
    return fail('badMessage');
  }

  let first = 0;
  let rounds: { seat: number; dice: Dice }[][] = [];
  if (firstTurn === 'roll') {
    let contenders = room.seats.map((_, i) => i);
    while (contenders.length > 1) {
      const round = contenders.map((s) => ({ seat: s, dice: [random.die(), random.die()] as Dice }));
      rounds.push(round);
      const best = Math.max(...round.map((r) => r.dice[0] + r.dice[1]));
      contenders = round.filter((r) => r.dice[0] + r.dice[1] === best).map((r) => r.seat);
    }
    first = contenders[0];
  }

  const seats = orderFrom(room.seats, first);
  // Seat numbers in the rounds follow the new order: old seat s is now (s - first) mod n.
  const n = seats.length;
  rounds = rounds.map((round) => round.map((r) => ({ ...r, seat: (r.seat - first + n) % n })));
  const host = (room.host - first + n) % n;

  const game = createGame({
    players: seats.map(({ name, token, color }) => ({ name, token, color })),
    seed: random.seed(),
    startingCash: startingCash as number,
  });
  return ok({ ...room, seats, host, game, firstTurn: firstTurn === 'roll' ? rounds : null });
}

/** A move from the phone in `seat`. Dice always come from the server's own random numbers. */
export function act(room: RoomState, seat: number, raw: unknown): Result<RoomState> {
  if (!room.game) return fail('notAllowed');
  const action = cleanAction(raw);
  if (!action) return fail('badMessage');
  if (actorFor(room.game, action) !== seat) return fail('notYourMove');
  try {
    return ok({ ...room, game: applyAction(room.game, action) });
  } catch (e) {
    if (e instanceof GameError) return fail('notAllowed');
    throw e;
  }
}

export function view(room: RoomState, you: number | null, online: ReadonlySet<number>): RoomView {
  return {
    code: room.code,
    stage: room.game ? 'playing' : 'lobby',
    host: room.host,
    seats: room.seats.map(({ name, token, color }, i) => ({ name, token, color, online: online.has(i) })),
    you,
    game: room.game,
    firstTurn: room.firstTurn,
  };
}

// ---------------------------------------------------------------------------
// Checking moves from the network: only known shapes get through to the engine.

const SIMPLE = ['ROLL', 'BUY', 'DECLINE', 'PAY_DEBT', 'DECLARE_BANKRUPTCY', 'END_TURN', 'PAY_JAIL_FINE', 'USE_JAIL_CARD', 'ACCEPT_TRADE', 'REJECT_TRADE'] as const;
const ON_SPACE = ['BUILD_HOUSE', 'SELL_HOUSE', 'MORTGAGE', 'UNMORTGAGE'] as const;

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function cleanSide(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) return null;
  const { spaces, cash, jailCards } = raw as Record<string, unknown>;
  if (!Array.isArray(spaces) || spaces.length > 40 || !spaces.every((s) => isInt(s, 0, 39))) return null;
  if (!isInt(cash, 0, Number.MAX_SAFE_INTEGER) || !isInt(jailCards, 0, 2)) return null;
  return { spaces: [...spaces] as number[], cash, jailCards };
}

export function cleanAction(raw: unknown): Action | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if ((SIMPLE as readonly unknown[]).includes(a.type)) {
    return { type: a.type as (typeof SIMPLE)[number] }; // drops anything extra, such as chosen dice
  }
  if ((ON_SPACE as readonly unknown[]).includes(a.type)) {
    return isInt(a.space, 0, 39) ? { type: a.type as (typeof ON_SPACE)[number], space: a.space } : null;
  }
  if (a.type === 'PROPOSE_TRADE' && typeof a.offer === 'object' && a.offer !== null) {
    const o = a.offer as Record<string, unknown>;
    const give = cleanSide(o.give);
    const take = cleanSide(o.take);
    if (!isInt(o.from, 0, MAX_PLAYERS - 1) || !isInt(o.to, 0, MAX_PLAYERS - 1) || !give || !take) return null;
    return { type: 'PROPOSE_TRADE', offer: { from: o.from, to: o.to, give, take } };
  }
  return null;
}
