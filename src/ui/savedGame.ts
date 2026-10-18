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
