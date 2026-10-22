// The messages between a phone and the room server (online play), as JSON over a WebSocket.
// Shared by the browser (src/) and the server (server/), so both sides agree on the shapes.

import type { PlayerColorId } from '../data/colors';
import type { TokenId } from '../data/tokens';
import type { RulesChoice } from '../engine/game';
import type { Action, Dice, GameState } from '../engine/types';

/** What a player chooses in the lobby. */
export interface Profile {
  name: string;
  token: TokenId;
  color: PlayerColorId;
}

export type FirstTurn = 'roll' | 'inOrder';

/** Phone → server */
export type ClientMessage =
  | { t: 'create'; profile: Profile } // a new room, with this phone as the host
  | { t: 'look' } // see the room before joining (who's in, which tokens are free)
  | { t: 'join'; profile: Profile }
  | { t: 'rejoin'; key: string } // take back a seat after reconnecting
  | { t: 'profile'; profile: Profile } // change name, token or color in the lobby
  | { t: 'leave' } // give up the seat (lobby only)
  | { t: 'start'; startingCash: number; firstTurn: FirstTurn; rules: RulesChoice } // host only
  | { t: 'act'; action: Action }
  | { t: 'react'; reaction: ReactionId } // a quick reaction, shown on every phone
  | { t: 'rematch' }; // host, after the game: back to the lobby with everyone still seated

/** One round of the "who goes first" dice; seats are numbered in the final playing order. */
export type FirstTurnRound = { seat: number; dice: Dice }[];

export interface SeatView extends Profile {
  online: boolean;
}

/** The room as one phone sees it. */
export interface RoomView {
  code: string;
  stage: 'lobby' | 'playing';
  host: number; // seat of the host
  seats: SeatView[]; // in playing order once the game starts (seat = player id)
  you: number | null; // this phone's seat, or null when only watching
  game: GameState | null;
  firstTurn: FirstTurnRound[] | null; // the dice that decided the order, if they were rolled
}

export type ErrorCode =
  | 'noRoom' // no room with this code
  | 'codeTaken' // creating: the code is in use, try another
  | 'full'
  | 'started' // too late to join
  | 'badSeatKey' // rejoin: the seat key isn't known here
  | 'badMessage'
  | 'badProfile'
  | 'tokenTaken'
  | 'colorTaken'
  | 'notHost'
  | 'notEnoughPlayers'
  | 'notYourMove'
  | 'notAllowed'
  | 'tooFast';

/** Server → phone */
export type ServerMessage =
  | { t: 'welcome'; seat: number; key: string } // keep the key to rejoin this seat
  | { t: 'room'; room: RoomView }
  | { t: 'error'; code: ErrorCode }
  | { t: 'reaction'; seat: number; reaction: ReactionId };

/** Quick reactions: a few emoji and some Nghệ phrases. */
export const REACTIONS = {
  laugh: '😂',
  clap: '👏',
  shock: '😱',
  cry: '😭',
  fire: '🔥',
  rangRua: 'Răng rứa?',
  gioiRua: 'Giỏi rứa!',
  meOi: 'Mệ ơi!',
  chiRua: 'Chi rứa trời!',
} as const;

export type ReactionId = keyof typeof REACTIONS;

export const isReactionId = (v: unknown): v is ReactionId => typeof v === 'string' && Object.hasOwn(REACTIONS, v);

export const MAX_MESSAGE_BYTES = 8 * 1024;

// Room codes: 6 letters and digits without look-alikes (no I, L, O, 0, 1).
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function isRoomCode(text: string): boolean {
  return text.length === CODE_LENGTH && [...text].every((c) => CODE_ALPHABET.includes(c));
}

/** A fresh random room code. */
export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** What a player types, made into a code: upper case, spaces and dashes dropped. */
export function normalizeRoomCode(text: string): string {
  return text.toUpperCase().replace(/[\s-]/g, '');
}
