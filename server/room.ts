// One online room: the seats, the lobby and the game. Plain TypeScript with no Cloudflare parts,
// so it can be tested like the engine; server/worker.ts stores it and connects it to the phones.

import { PLAYER_COLOR_IDS, type PlayerColorId } from '../src/data/colors';
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
import { botAction, BOT_LEVELS, freeBotName } from '../src/engine/bot';
import type { Action, BotLevel, Dice, GameState, VietRules } from '../src/engine/types';
import { tienLenBotAction } from '../src/games/tienlen/bot';
import { DECK_SIZE } from '../src/games/tienlen/cards';
import { applyTienLen, createTienLen, TienLenError, type TienLenAction, type TienLenState } from '../src/games/tienlen/game';
import { eightsBotAction } from '../src/games/eights/bot';
import { applyEights, createEights, EightsError, type EightsAction, type EightsState } from '../src/games/eights/game';
import { mauMeBotAction } from '../src/games/maume/bot';
import { DECK_SIZE as MAUME_DECK_SIZE } from '../src/games/maume/cards';
import { applyMauMe, createMauMe, MauMeError, type MauMeAction, type MauMeState } from '../src/games/maume/game';
import { phaoBotAction } from '../src/games/phao/bot';
import { DECK_SIZE as PHAO_DECK_SIZE } from '../src/games/phao/cards';
import { applyPhao, createPhao, PhaoError, type PhaoAction, type PhaoState } from '../src/games/phao/game';
import {
  CHAT_KEEP,
  CHAT_MAX_LENGTH,
  HIDDEN_CARD,
  type ChatMessage,
  type ErrorCode,
  type GameKind,
  type FirstTurn,
  type FirstTurnRound,
  type Profile,
  type RoomListing,
  type RoomView,
} from '../src/net/protocol';
import { dealMissions } from '../src/engine/missions';
import { orderFrom } from '../src/ui/firstTurn';
import { botPauseMs, newLogEntries, showMs } from '../src/ui/motion';

export interface Seat extends Profile {
  key: string; // secret: lets this seat's phone reconnect (a computer player's is never given out)
  bot?: BotLevel; // played by the room itself, not by a phone
}

/** Everything about a room that is stored between messages. */
export interface RoomState {
  code: string;
  kind?: GameKind; // missing in rooms saved before Tiến lên: Dangopoly
  host: number;
  seats: Seat[];
  game: GameState | null; // Dangopoly
  tienlen?: TienLenState | null; // Tiến lên
  eights?: EightsState | null; // Crazy Eights
  maume?: MauMeState | null; // Màu Mè
  phao?: PhaoState | null; // Pháo Tết
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
const FIRST_BOT_MOVE_MS = 2_000; // a computer player going first: the board has just appeared
const FIRST_BOT_MOVE_AFTER_DICE_MS = 6_000; // ...and when people are reading who rolled what
const TIENLEN_FIRST_MOVE_MS = 2_000; // Tiến lên: the cards have just been dealt
const TIENLEN_BOT_MS = 1_100; // the last play lands on the table, then the usual pause

export const kindOf = (room: RoomState): GameKind => room.kind ?? 'dangopoly';
/** Whether a game is being played in the room (or has been, until the host takes it back to the lobby). */
export const started = (room: RoomState): boolean => room.game !== null || Boolean(room.tienlen) || Boolean(room.eights) || Boolean(room.maume) || Boolean(room.phao);

/** The game being played, whichever it is (the room's alarm compares it before and after a change). */
export const currentGame = (room: RoomState): GameState | TienLenState | EightsState | MauMeState | PhaoState | null =>
  room.tienlen ?? room.eights ?? room.maume ?? room.phao ?? room.game;

// Crazy Eights's, Màu Mè's and Pháo Tết's bots wait as long as Tiến lên's: the card lands, then the usual pause.
const CARD_FIRST_MOVE_MS = TIENLEN_FIRST_MOVE_MS;
const CARD_BOT_MS = TIENLEN_BOT_MS;
const PHAO_BANG_MS = 1_400; // Pháo Tết: a firecracker going off (or put out) plays out first

export function newRoom(code: string, host: Profile, random: Randomness, kind: GameKind = 'dangopoly'): { room: RoomState; key: string } {
  const key = random.key();
  return { room: { code, kind, host: 0, seats: [{ ...host, key }], game: null, tienlen: null, eights: null, maume: null, phao: null, firstTurn: null }, key };
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
  if (started(room)) return fail('started');
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
  if (started(room)) return fail('started');
  const problem = profileProblem(room, profile, seat);
  if (problem) return fail(problem);
  return ok({ ...room, seats: room.seats.map((s, i) => (i === seat ? { ...profile, key: s.key } : s)) });
}

const cleanLevel = (raw: unknown): BotLevel | null => (BOT_LEVELS.includes(raw as BotLevel) ? (raw as BotLevel) : null);

/** The host seats a computer player: it takes a free name, token and color. */
export function addBot(room: RoomState, seat: number, rawLevel: unknown, random: Randomness): Result<RoomState> {
  if (seat !== room.host) return fail('notHost');
  if (started(room)) return fail('started');
  if (room.seats.length >= MAX_PLAYERS) return fail('full');
  const bot = cleanLevel(rawLevel);
  if (!bot) return fail('badMessage');
  const token = TOKENS.find((t) => !room.seats.some((s) => s.token === t.id))!.id;
  const color = PLAYER_COLOR_IDS.find((c) => !room.seats.some((s) => s.color === c)) as PlayerColorId;
  const name = freeBotName(room.seats.map((s) => s.name));
  return ok({ ...room, seats: [...room.seats, { name, token, color, key: random.key(), bot }] });
}

/** The host takes a computer player out; the seats after it move up by one. */
export function removeBot(room: RoomState, seat: number, target: unknown): Result<RoomState> {
  if (seat !== room.host) return fail('notHost');
  if (started(room)) return fail('started');
  if (typeof target !== 'number' || !room.seats[target]?.bot) return fail('badMessage');
  return ok({ ...room, seats: room.seats.filter((_, i) => i !== target), host: room.host > target ? room.host - 1 : room.host });
}

export function setBotLevel(room: RoomState, seat: number, target: unknown, rawLevel: unknown): Result<RoomState> {
  if (seat !== room.host) return fail('notHost');
  if (started(room)) return fail('started');
  const bot = cleanLevel(rawLevel);
  if (!bot || typeof target !== 'number' || !room.seats[target]?.bot) return fail('badMessage');
  return ok({ ...room, seats: room.seats.map((s, i) => (i === target ? { ...s, bot } : s)) });
}

/**
 * Leaving the lobby frees the seat; the seats after it move up by one. If the host leaves, the
 * next person becomes host. Returns null when no people are left (computer players don't keep a room).
 */
export function leave(room: RoomState, seat: number): Result<RoomState | null> {
  if (started(room)) return fail('started');
  const seats = room.seats.filter((_, i) => i !== seat);
  if (seats.every((s) => s.bot)) return ok(null);
  const host = room.host === seat ? seats.findIndex((s) => !s.bot) : room.host > seat ? room.host - 1 : room.host;
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
  if (started(room)) return fail('started');
  if (room.seats.length < MIN_PLAYERS) return fail('notEnoughPlayers');
  if (kindOf(room) === 'tienlen') {
    // Tiến lên has no options: the seats as they are, and the lowest card leads.
    const players = room.seats.map(({ name, token, color, bot }) => ({ name, token, color, ...(bot ? { bot } : {}) }));
    return ok({ ...room, tienlen: createTienLen({ players, seed: random.seed() }), firstTurn: null });
  }
  if (kindOf(room) === 'eights') {
    const players = room.seats.map(({ name, token, color, bot }) => ({ name, token, color, ...(bot ? { bot } : {}) }));
    return ok({ ...room, eights: createEights({ players, seed: random.seed() }), firstTurn: null });
  }
  if (kindOf(room) === 'maume') {
    const players = room.seats.map(({ name, token, color, bot }) => ({ name, token, color, ...(bot ? { bot } : {}) }));
    return ok({ ...room, maume: createMauMe({ players, seed: random.seed() }), firstTurn: null });
  }
  if (kindOf(room) === 'phao') {
    const players = room.seats.map(({ name, token, color, bot }) => ({ name, token, color, ...(bot ? { bot } : {}) }));
    return ok({ ...room, phao: createPhao({ players, seed: random.seed() }), firstTurn: null });
  }
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
    players: seats.map(({ name, token, color, bot }) => ({ name, token, color, ...(bot ? { bot } : {}) })),
    seed: random.seed(),
    startingCash: startingCash as number,
    rules,
    now,
    // Dealt from the room's own secure randomness, not the game's: every phone receives the game's
    // random numbers, and the missions must not be worked out from them.
    missions: rules.viet?.missions ? dealMissions(seats.length, random.seed()) : undefined,
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
  const over = room.game?.phase.kind === 'gameOver' || room.tienlen?.phase === 'over' || room.eights?.phase === 'over' || room.maume?.phase === 'over' || room.phao?.phase.kind === 'over';
  if (!over) return fail('notAllowed');
  return ok({ ...room, game: null, tienlen: null, eights: null, maume: null, phao: null, firstTurn: null });
}

/** Pháo Tết: a card, a pair, a draw or hiding a firecracker from the phone whose turn it is; a new deal from the host. */
function actPhao(room: RoomState, state: PhaoState, seat: number, raw: unknown): Result<RoomState> {
  const action = cleanPhaoAction(raw);
  if (!action) return fail('badMessage');
  if (action.type === 'NEXT_GAME' ? seat !== room.host : seat !== state.current) return fail(action.type === 'NEXT_GAME' ? 'notHost' : 'notYourMove');
  try {
    return ok({ ...room, phao: applyPhao(state, action) });
  } catch (e) {
    if (e instanceof PhaoError) return fail('notAllowed');
    throw e;
  }
}

/** Màu Mè: a card, a draw or a pass from the phone whose turn it is; a new deal from the host, after a game. */
function actMauMe(room: RoomState, state: MauMeState, seat: number, raw: unknown): Result<RoomState> {
  const action = cleanMauMeAction(raw);
  if (!action) return fail('badMessage');
  if (action.type === 'NEXT_GAME' ? seat !== room.host : seat !== state.current) return fail(action.type === 'NEXT_GAME' ? 'notHost' : 'notYourMove');
  try {
    return ok({ ...room, maume: applyMauMe(state, action) });
  } catch (e) {
    if (e instanceof MauMeError) return fail('notAllowed');
    throw e;
  }
}

/** Crazy Eights: a card, a draw or a pass from the phone whose turn it is; a new deal from the host, after a game. */
function actEights(room: RoomState, state: EightsState, seat: number, raw: unknown): Result<RoomState> {
  const action = cleanEightsAction(raw);
  if (!action) return fail('badMessage');
  if (action.type === 'NEXT_GAME' ? seat !== room.host : seat !== state.current) return fail(action.type === 'NEXT_GAME' ? 'notHost' : 'notYourMove');
  try {
    return ok({ ...room, eights: applyEights(state, action) });
  } catch (e) {
    if (e instanceof EightsError) return fail('notAllowed');
    throw e;
  }
}

/** Tiến lên: a play or a pass from the phone whose turn it is; a new deal from the host, after a game. */
function actTienLen(room: RoomState, state: TienLenState, seat: number, raw: unknown): Result<RoomState> {
  const action = cleanTienLenAction(raw);
  if (!action) return fail('badMessage');
  if (action.type === 'NEXT_GAME' ? seat !== room.host : seat !== state.current) return fail(action.type === 'NEXT_GAME' ? 'notHost' : 'notYourMove');
  try {
    return ok({ ...room, tienlen: applyTienLen(state, action) });
  } catch (e) {
    if (e instanceof TienLenError) return fail('notAllowed');
    throw e;
  }
}

/**
 * A move from the phone in `seat`. Dice always come from the server's own random numbers. In timed
 * games anyone may say the time is up, but only the room's clock decides; and once it is up, the
 * game ends at the start of the next turn even if nobody says so.
 */
export function act(room: RoomState, seat: number, raw: unknown, now: number = Date.now()): Result<RoomState> {
  if (room.tienlen) return actTienLen(room, room.tienlen, seat, raw);
  if (room.eights) return actEights(room, room.eights, seat, raw);
  if (room.maume) return actMauMe(room, room.maume, seat, raw);
  if (room.phao) return actPhao(room, room.phao, seat, raw);
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

/**
 * The move of the computer player whose move it is, or null when it's a person's move. The time
 * limit works as it does for a move from a phone (see act).
 */
export function playBot(room: RoomState, now: number = Date.now()): RoomState | null {
  if (room.tienlen) {
    const move = tienLenBotAction(room.tienlen);
    return move ? { ...room, tienlen: applyTienLen(room.tienlen, move) } : null;
  }
  if (room.eights) {
    const move = eightsBotAction(room.eights);
    return move ? { ...room, eights: applyEights(room.eights, move) } : null;
  }
  if (room.maume) {
    const move = mauMeBotAction(room.maume);
    return move ? { ...room, maume: applyMauMe(room.maume, move) } : null;
  }
  if (room.phao) {
    const move = phaoBotAction(room.phao);
    return move ? { ...room, phao: applyPhao(room.phao, move) } : null;
  }
  const action = room.game && botAction(room.game);
  if (!room.game || !action) return null;
  const { mode } = room.game.rules;
  try {
    let game = applyAction(room.game, action);
    if (mode.kind === 'time' && now >= mode.endsAt && game.phase.kind === 'awaitRoll') game = applyAction(game, { type: 'TIME_UP' });
    return { ...room, game };
  } catch (e) {
    if (e instanceof GameError) return null;
    throw e;
  }
}

/**
 * How long the room waits before its computer player moves, or null when it's not a bot's move: the
 * last move has to play out on the phones first (`before` is the game before it), then a short pause,
 * just as on one device. Phones set to faster animations simply finish sooner.
 */
export function botWaitMs(room: RoomState, before: GameState | TienLenState | EightsState | MauMeState | PhaoState | null): number | null {
  if (room.phao) {
    if (!phaoBotAction(room.phao)) return null;
    if (before === null || (before as PhaoState).game !== room.phao.game) return CARD_FIRST_MOVE_MS;
    const last = room.phao.log.at(-1)?.type;
    return CARD_BOT_MS + (last === 'exploded' || last === 'putOut' ? PHAO_BANG_MS : 0);
  }
  if (room.maume) {
    if (!mauMeBotAction(room.maume)) return null;
    return before === null || (before as MauMeState).game !== room.maume.game ? CARD_FIRST_MOVE_MS : CARD_BOT_MS;
  }
  if (room.eights) {
    if (!eightsBotAction(room.eights)) return null;
    return before === null || (before as EightsState).game !== room.eights.game ? CARD_FIRST_MOVE_MS : CARD_BOT_MS;
  }
  if (room.tienlen) {
    if (!tienLenBotAction(room.tienlen)) return null;
    return before === null || (before as TienLenState).game !== room.tienlen.game ? TIENLEN_FIRST_MOVE_MS : TIENLEN_BOT_MS;
  }
  const action = room.game && botAction(room.game);
  if (!room.game || !action) return null;
  if (!before || !('round' in before)) return room.firstTurn ? FIRST_BOT_MOVE_AFTER_DICE_MS : FIRST_BOT_MOVE_MS;
  const entries = newLogEntries(before.log, room.game.log);
  return showMs(entries, before.players.map((p) => p.position)) + botPauseMs(action);
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
  const cards = room.tienlen ?? room.eights ?? room.maume ?? room.phao;
  if (cards) {
    return {
      code: room.code,
      kind: kindOf(room),
      stage: 'playing',
      host: room.seats[room.host]?.name ?? '',
      players: room.seats.map(({ name, token, color, bot }, i) => ({ name, token, color, online: online.has(i) || bot !== undefined })),
      watchers,
      round: cards.game,
      updatedAt: now,
    };
  }
  return {
    code: room.code,
    kind: kindOf(room),
    stage: !room.game ? 'lobby' : room.game.phase.kind === 'gameOver' ? 'over' : 'playing',
    host: room.seats[room.host]?.name ?? '',
    players: room.seats.map(({ name, token, color, bot }, i) => ({ name, token, color, online: online.has(i) || bot !== undefined })),
    watchers,
    round: room.game && room.game.phase.kind !== 'gameOver' ? room.game.round : null,
    updatedAt: now,
  };
}

/**
 * The game as one phone may see it: others' unfinished secret missions are blanked out (finished
 * ones are public). Once the game is over everything is shown, for the summary.
 */
function gameFor(game: GameState | null, you: number | null): GameState | null {
  if (!game || !game.rules.viet?.missions || game.phase.kind === 'gameOver') return game;
  return {
    ...game,
    players: game.players.map((p) =>
      p.id === you || !p.missions ? p : { ...p, missions: p.missions.map((m) => (m.done ? m : { id: null, done: false })) },
    ),
  };
}

/**
 * Tiến lên as one phone may see it: its own hand, and only how many cards everyone else holds. The
 * random state is left out too, since the next deal could be worked out from it.
 */
function tienLenFor(state: TienLenState | null | undefined, you: number | null): TienLenState | null {
  if (!state) return null;
  return {
    ...state,
    rngState: 0,
    players: state.players.map((p, i) => (i === you ? p : { ...p, hand: p.hand.map(() => HIDDEN_CARD) })),
  };
}

/**
 * Crazy Eights as one phone may see it: its own hand, how many cards everyone else holds and how many
 * are left to draw, and the face-up pile. The card someone just drew stays theirs.
 */
function eightsFor(state: EightsState | null | undefined, you: number | null): EightsState | null {
  if (!state) return null;
  const hide = (cards: number[]) => cards.map(() => HIDDEN_CARD);
  return {
    ...state,
    rngState: 0,
    deck: hide(state.deck),
    drawn: state.drawn === null || state.current === you ? state.drawn : HIDDEN_CARD,
    players: state.players.map((p, i) => (i === you ? p : { ...p, hand: hide(p.hand) })),
  };
}

/** Màu Mè as one phone may see it, hidden the same way as Crazy Eights. */
function mauMeFor(state: MauMeState | null | undefined, you: number | null): MauMeState | null {
  if (!state) return null;
  const hide = (cards: number[]) => cards.map(() => HIDDEN_CARD);
  return {
    ...state,
    rngState: 0,
    deck: hide(state.deck),
    drawn: state.drawn === null || state.current === you ? state.drawn : HIDDEN_CARD,
    players: state.players.map((p, i) => (i === you ? p : { ...p, hand: hide(p.hand) })),
  };
}

/**
 * Pháo Tết as one phone may see it: its own hand, how many cards everyone else holds and how many are
 * left to draw (never where the firecrackers are), and what a Nhòm showed only to whoever played it.
 */
function phaoFor(state: PhaoState | null | undefined, you: number | null): PhaoState | null {
  if (!state) return null;
  const hide = (cards: number[]) => cards.map(() => HIDDEN_CARD);
  return {
    ...state,
    rngState: 0,
    deck: hide(state.deck),
    peek: state.peek && state.peek.player === you ? state.peek : null,
    players: state.players.map((p, i) => (i === you ? p : { ...p, hand: hide(p.hand) })),
  };
}

export function view(room: RoomState, you: number | null, online: ReadonlySet<number>, watchers = 0): RoomView {
  return {
    code: room.code,
    kind: kindOf(room),
    stage: started(room) ? 'playing' : 'lobby',
    host: room.host,
    seats: room.seats.map(({ name, token, color, bot }, i) => ({ name, token, color, online: online.has(i) || bot !== undefined, ...(bot ? { bot } : {}) })),
    you,
    game: gameFor(room.game, you),
    tienlen: tienLenFor(room.tienlen, you),
    eights: eightsFor(room.eights, you),
    maume: mauMeFor(room.maume, you),
    phao: phaoFor(room.phao, you),
    firstTurn: room.firstTurn,
    chat: room.chat ?? [],
    listed: room.listed !== false,
    watchers,
  };
}

// ---------------------------------------------------------------------------
// Checking moves from the network: only known shapes get through to the engine.

const SIMPLE = ['ROLL', 'BUY', 'DECLINE', 'PAY_DEBT', 'DECLARE_BANKRUPTCY', 'END_TURN', 'PAY_JAIL_FINE', 'USE_JAIL_CARD', 'ACCEPT_TRADE', 'REJECT_TRADE', 'TIME_UP', 'HAGGLE', 'AN_VA', 'XE_OM', 'WAIT_IN_JAM', 'LEAD_BUFFALO', 'RIDE_BUFFALO'] as const;
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

/** A Tiến lên move from the network: a play of up to 13 different cards, a pass, or a new deal. */
export function cleanTienLenAction(raw: unknown): TienLenAction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (a.type === 'PASS' || a.type === 'NEXT_GAME') return { type: a.type };
  if (a.type !== 'PLAY' || !Array.isArray(a.cards) || a.cards.length === 0 || a.cards.length > 13) return null;
  if (!a.cards.every((c) => isInt(c, 0, DECK_SIZE - 1)) || new Set(a.cards).size !== a.cards.length) return null;
  return { type: 'PLAY', cards: [...(a.cards as number[])] };
}

/** A Crazy Eights move from the network: a card (an 8 with the suit it calls), a draw, a pass, or a new deal. */
export function cleanEightsAction(raw: unknown): EightsAction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (a.type === 'DRAW' || a.type === 'PASS' || a.type === 'NEXT_GAME') return { type: a.type };
  if (a.type !== 'PLAY' || !isInt(a.card, 0, DECK_SIZE - 1)) return null;
  if (a.suit !== undefined && !isInt(a.suit, 0, 3)) return null;
  return a.suit === undefined ? { type: 'PLAY', card: a.card } : { type: 'PLAY', card: a.card, suit: a.suit };
}

/** A Màu Mè move from the network: a card (a wild one with the color it names), a draw, a pass, or a new deal. */
export function cleanMauMeAction(raw: unknown): MauMeAction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (a.type === 'DRAW' || a.type === 'PASS' || a.type === 'NEXT_GAME') return { type: a.type };
  if (a.type !== 'PLAY' || !isInt(a.card, 0, MAUME_DECK_SIZE - 1)) return null;
  if (a.color !== undefined && !isInt(a.color, 0, 3)) return null;
  return a.color === undefined ? { type: 'PLAY', card: a.card } : { type: 'PLAY', card: a.card, color: a.color };
}

/** A Pháo Tết move from the network: a card (Xin with whom), a pair of foods and whom, a draw, a place to hide, a new deal. */
export function cleanPhaoAction(raw: unknown): PhaoAction | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (a.type === 'DRAW' || a.type === 'NEXT_GAME') return { type: a.type };
  if (a.type === 'HIDE') return isInt(a.position, 0, PHAO_DECK_SIZE) ? { type: 'HIDE', position: a.position } : null;
  if (a.type === 'PLAY') {
    if (!isInt(a.card, 0, PHAO_DECK_SIZE - 1)) return null;
    if (a.target === undefined) return { type: 'PLAY', card: a.card };
    return isInt(a.target, 0, MAX_PLAYERS - 1) ? { type: 'PLAY', card: a.card, target: a.target } : null;
  }
  if (a.type === 'PAIR') {
    const cards = a.cards;
    if (!Array.isArray(cards) || cards.length !== 2 || !cards.every((c) => isInt(c, 0, PHAO_DECK_SIZE - 1))) return null;
    if (!isInt(a.target, 0, MAX_PLAYERS - 1)) return null;
    return { type: 'PAIR', cards: [cards[0], cards[1]], target: a.target };
  }
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
