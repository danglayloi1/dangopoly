// Turning a game into text for storage and back. Anything read back is checked first,
// because stored data can be old, cut off, or edited by hand; a bad save is ignored, never trusted.

import { BOARD, BOARD_SIZE, isOwnable } from '../data/board';
import { CARDS, type CardDeck } from '../data/cards';
import { defaultPlayerColor, PLAYER_COLOR_IDS } from '../data/colors';
import { TOKENS } from '../data/tokens';
import type { GameState } from './types';

/** Bump this when GameState changes shape; older saves are then ignored. */
export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  savedAt: string; // ISO date
  game: GameState;
}

export function serializeGame(game: GameState, now: Date = new Date()): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: now.toISOString(), game };
  return JSON.stringify(file);
}

/** The saved game, or null if there is none or it can't be used. */
export function parseSave(text: string | null): SaveFile | null {
  if (!text) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== SAVE_VERSION || typeof data.savedAt !== 'string') return null;
  if (Number.isNaN(Date.parse(data.savedAt)) || !isValidGame(data.game)) return null;
  // Saves from before players picked colors have none: give each seat its default color.
  const players = data.game.players.map((p) => ({ ...p, color: p.color ?? defaultPlayerColor(p.id) }));
  if (new Set(players.map((p) => p.color)).size !== players.length) return null;
  return { version: data.version, savedAt: data.savedAt, game: { ...data.game, players } };
}

// ---------------------------------------------------------------------------
// Checks

type Rec = Record<string, unknown>;

const isRecord = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isDeck = (v: unknown): v is CardDeck => v === 'chance' || v === 'community';
const TOKEN_IDS: readonly string[] = TOKENS.map((t) => t.id);
const PHASE_KINDS = ['awaitRoll', 'awaitBuy', 'awaitEndTurn', 'inDebt', 'gameOver', 'tradeOffer'];

function isValidPlayer(v: unknown, index: number): boolean {
  return (
    isRecord(v) &&
    v.id === index &&
    typeof v.name === 'string' &&
    v.name.trim() !== '' &&
    typeof v.token === 'string' &&
    TOKEN_IDS.includes(v.token) &&
    (v.color === undefined || PLAYER_COLOR_IDS.includes(v.color as never)) &&
    isInt(v.cash, 0, Number.MAX_SAFE_INTEGER) &&
    isInt(v.position, 0, BOARD_SIZE - 1) &&
    isBool(v.bankrupt) &&
    isBool(v.inJail) &&
    isInt(v.jailAttempts, 0, 3) &&
    Array.isArray(v.jailCards) &&
    v.jailCards.every(isDeck)
  );
}

function isValidDeck(v: unknown, deck: CardDeck): v is number[] {
  const size = CARDS[deck].length;
  return Array.isArray(v) && v.every((c) => isInt(c, 0, size - 1)) && new Set(v).size === v.length;
}

function isValidGame(v: unknown): v is GameState {
  if (!isRecord(v)) return false;
  const { players } = v;
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) return false;
  if (!players.every(isValidPlayer)) return false;
  const playerCount = players.length;
  if (!isInt(v.current, 0, playerCount - 1)) return false;

  if (!isRecord(v.ownership)) return false;
  for (const [key, own] of Object.entries(v.ownership)) {
    const space = Number(key);
    if (!isInt(space, 0, BOARD_SIZE - 1) || !isOwnable(BOARD[space])) return false;
    if (!isRecord(own) || !isInt(own.owner, 0, playerCount - 1) || !isInt(own.houses, 0, 5) || !isBool(own.mortgaged)) {
      return false;
    }
  }

  if (!isRecord(v.phase) || !PHASE_KINDS.includes(v.phase.kind as string)) return false;
  if (v.dice !== null && !(Array.isArray(v.dice) && v.dice.length === 2 && v.dice.every((d) => isInt(d, 1, 6)))) {
    return false;
  }
  if (!isInt(v.doublesCount, 0, 3) || !isBool(v.extraRoll) || !isInt(v.rngState, 0, 0xffffffff)) return false;

  if (!isRecord(v.decks) || !isValidDeck(v.decks.chance, 'chance') || !isValidDeck(v.decks.community, 'community')) {
    return false;
  }
  if (v.lastCard !== null && !(isRecord(v.lastCard) && isDeck(v.lastCard.deck) && Number.isInteger(v.lastCard.card))) {
    return false;
  }
  return Array.isArray(v.log);
}
