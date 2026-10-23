import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../engine/types';
import { recordGame, type NewBadges } from './records';

/**
 * Adds the game to this device's records the moment it ends (once: a game that was already over
 * when the screen opened isn't counted again). `seats` are the people whose records this device
 * keeps (null: none, e.g. the tutorial). Returns the badges earned for the first time.
 */
export function useRecordGame(game: GameState, seats: readonly number[] | null, online = false): NewBadges[] {
  const [earned, setEarned] = useState<NewBadges[]>([]);
  const wasOver = useRef(game.phase.kind === 'gameOver');
  useEffect(() => {
    const over = game.phase.kind === 'gameOver';
    if (over && !wasOver.current && seats) setEarned(recordGame(game, seats, online));
    if (!over) setEarned([]);
    wasOver.current = over;
  }, [game]);
  return earned;
}
