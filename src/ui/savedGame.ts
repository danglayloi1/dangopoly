import { parseSave, serializeGame, type SaveFile } from '../engine/save';
import type { GameState } from '../engine/types';

// The game is kept in this browser's localStorage. Storage can be unavailable (private windows,
// blocked site data) or full, so every call is wrapped: the game keeps working, just without saving.

const KEY = 'dangopoly.savedGame';

export function loadSavedGame(): SaveFile | null {
  try {
    const save = parseSave(localStorage.getItem(KEY));
    if (!save) localStorage.removeItem(KEY); // drop anything unusable
    return save;
  } catch {
    return null;
  }
}

export function saveGame(game: GameState): boolean {
  try {
    localStorage.setItem(KEY, serializeGame(game));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}

/**
 * A saved game to continue. A time limit doesn't run while the game is closed: the end moves
 * later by however long it was away (since the last save, i.e. the last move).
 */
export function resumeClock(save: SaveFile, now: number = Date.now()): GameState {
  const { game } = save;
  const { mode } = game.rules;
  if (mode.kind !== 'time' || game.phase.kind === 'gameOver') return game;
  const away = Math.max(0, now - Date.parse(save.savedAt));
  return { ...game, rules: { ...game.rules, mode: { ...mode, endsAt: mode.endsAt + away } } };
}
