// One online room: the seats, the lobby and the game. Plain TypeScript with no Cloudflare parts,
// so it can be tested like the engine; server/worker.ts stores it and connects it to the phones.

import { PLAYER_COLOR_IDS } from '../src/data/colors';
import { TOKENS } from '../src/data/tokens';
import {
  actorFor,
  applyAction,
  CLASSIC_RULES,
  createGame,
  GameError,
  MAX_MINUTES,
  MAX_PLAYERS,
  MAX_ROUNDS,
  MIN_PLAYERS,
  NO_VIET,
  type RulesChoice,
} from '../src/engine/game';
import type { Action, Dice, GameState, VietRules } from '../src/engine/types';
import {
  CHAT_KEEP,
  CHAT_MAX_LENGTH,
  type ChatMessage,
  type ErrorCode,
  type FirstTurn,
  type FirstTurnRound,
  type Profile,
  type RoomListing,
  type RoomView,
} from '../src/net/protocol';
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
  chat?: ChatMessage[]; // missing in rooms saved before chat
  listed?: boolean; // in the public room list; missing means yes (rooms are listed unless the host hides them)
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
  rawRules: unknown = CLASSIC_RULES,
  now: number = Date.now(),
): Result<RoomState> {
  if (seat !== room.host) return fail('notHost');
  if (room.game) return fail('started');
  if (room.seats.length < MIN_PLAYERS) return fail('notEnoughPlayers');
  if (!Number.isInteger(startingCash) || (startingCash as number) < MIN_STARTING_CASH || (startingCash as number) > MAX_STARTING_CASH) {
    return fail('badMessage');
  }
  const rules = cleanRules(rawRules);
  if (!rules) return fail('badMessage');

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
    rules,
    now,
  });
  return ok({ ...room, seats, host, game, firstTurn: firstTurn === 'roll' ? rounds : null });
}

/**
 * Chat text, tidied: control characters dropped, spaces collapsed, at most CHAT_MAX_LENGTH
 * characters. Null if nothing is left. (It's shown as plain text, never as HTML.)
 */
export function cleanChat(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  return [...text].slice(0, CHAT_MAX_LENGTH).join('');
}

/** A chat message from the phone in `seat`; the room keeps the last CHAT_KEEP. */
export function chat(room: RoomState, seat: number, raw: unknown, now: number = Date.now()): Result<RoomState> {
  const text = cleanChat(raw);
  if (!text) return fail('badMessage');
  const old = room.chat ?? [];
  const { name, color } = room.seats[seat];
  const message: ChatMessage = { id: (old.at(-1)?.id ?? 0) + 1, seat, name, color, text, at: now };
  return ok({ ...room, chat: [...old, message].slice(-CHAT_KEEP) });
}

/** After a game, the host takes the room back to the lobby: same seats, choices and host; a new game can start. */
export function rematch(room: RoomState, seat: number): Result<RoomState> {
  if (seat !== room.host) return fail('notHost');
  if (room.game?.phase.kind !== 'gameOver') return fail('notAllowed');
  return ok({ ...room, game: null, firstTurn: null });
}

/**
 * A move from the phone in `seat`. Dice always come from the server's own random numbers. In timed
 * games anyone may say the time is up, but only the room's clock decides; and once it is up, the
 * game ends at the start of the next turn even if nobody says so.
 */
export function act(room: RoomState, seat: number, raw: unknown, now: number = Date.now()): Result<RoomState> {
  if (!room.game) return fail('notAllowed');
  const action = cleanAction(raw);
  if (!action) return fail('badMessage');
  const { mode } = room.game.rules;
  const timeIsUp = mode.kind === 'time' && now >= mode.endsAt;
  if (action.type === 'TIME_UP') {
    if (!timeIsUp) return fail('notAllowed');
  } else if (actorFor(room.game, action) !== seat) {
    return fail('notYourMove');
  }
  try {
    let game = applyAction(room.game, action);
    if (timeIsUp && game.phase.kind === 'awaitRoll') game = applyAction(game, { type: 'TIME_UP' });
    return ok({ ...room, game });
  } catch (e) {
    if (e instanceof GameError) return fail('notAllowed');
    throw e;
  }
}

/** The host shows the room in the public room list, or hides it (then only its link opens it). */
export function setListed(room: RoomState, seat: number, listed: unknown): Result<RoomState> {
  if (seat !== room.host) return fail('notHost');
  if (typeof listed !== 'boolean') return fail('badMessage');
  return ok({ ...room, listed });
}

/**
 * What the public room list shows about this room, or null when it shouldn't be listed: the host
 * hid it, or nobody is connected (a room nobody is in isn't worth showing).
 */
export function listing(room: RoomState, online: ReadonlySet<number>, watchers: number, now: number = Date.now()): RoomListing | null {
  if (room.listed === false || online.size === 0) return null;
  return {
    code: room.code,
    stage: !room.game ? 'lobby' : room.game.phase.kind === 'gameOver' ? 'over' : 'playing',
    host: room.seats[room.host]?.name ?? '',
    players: room.seats.map(({ name, token, color }, i) => ({ name, token, color, online: online.has(i) })),
    watchers,
    round: room.game && room.game.phase.kind !== 'gameOver' ? room.game.round : null,
    updatedAt: now,
  };
}

export function view(room: RoomState, you: number | null, online: ReadonlySet<number>, watchers = 0): RoomView {
  return {
    code: room.code,
    stage: room.game ? 'playing' : 'lobby',
    host: room.host,
    seats: room.seats.map(({ name, token, color }, i) => ({ name, token, color, online: online.has(i) })),
    you,
    game: room.game,
    firstTurn: room.firstTurn,
    chat: room.chat ?? [],
    listed: room.listed !== false,
    watchers,
  };
}

// ---------------------------------------------------------------------------
// Checking moves from the network: only known shapes get through to the engine.

const SIMPLE = ['ROLL', 'BUY', 'DECLINE', 'PAY_DEBT', 'DECLARE_BANKRUPTCY', 'END_TURN', 'PAY_JAIL_FINE', 'USE_JAIL_CARD', 'ACCEPT_TRADE', 'REJECT_TRADE', 'TIME_UP', 'HAGGLE', 'AN_VA'] as const;
const ON_SPACE = ['BUILD_HOUSE', 'SELL_HOUSE', 'MORTGAGE', 'UNMORTGAGE'] as const;

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

function cleanSide(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) return null;
  const { spaces, cash, jailCards } = raw as Record<string, unknown>;
  if (!Array.isArray(spaces) || spaces.length > 40 || !spaces.every((s) => isInt(s, 0, 39))) return null;
  if (!isInt(cash, 0, Number.MAX_SAFE_INTEGER) || !isInt(jailCards, 0, 2)) return null;
  return { spaces: [...spaces] as number[], cash, jailCards };
}

/** The Chế độ Việt rules the host chose (missing: all off), or null if the shape is wrong. */
function cleanViet(raw: unknown): VietRules | null {
  if (raw === undefined) return { ...NO_VIET };
  if (typeof raw !== 'object' || raw === null) return null;
  const v = raw as Record<string, unknown>;
  const keys = Object.keys(NO_VIET) as (keyof VietRules)[];
  if (!keys.every((k) => v[k] === undefined || typeof v[k] === 'boolean')) return null;
  return Object.fromEntries(keys.map((k) => [k, v[k] === true])) as unknown as VietRules;
}

/** The game type the host chose, or null if it isn't one the game offers. */
export function cleanRules(raw: unknown): RulesChoice | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { mode, festivals } = raw as Record<string, unknown>;
  const viet = cleanViet((raw as Record<string, unknown>).viet);
  if (typeof festivals !== 'boolean' || typeof mode !== 'object' || mode === null || !viet) return null;
  const m = mode as Record<string, unknown>;
  if (m.kind === 'classic') return { mode: { kind: 'classic' }, festivals, viet };
  if (m.kind === 'rounds' && isInt(m.rounds, 1, MAX_ROUNDS)) return { mode: { kind: 'rounds', rounds: m.rounds }, festivals, viet };
  if (m.kind === 'time' && isInt(m.minutes, 1, MAX_MINUTES)) return { mode: { kind: 'time', minutes: m.minutes }, festivals, viet };
  return null;
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
