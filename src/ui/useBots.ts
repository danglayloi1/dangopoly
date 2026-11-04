import { useEffect } from 'react';
import { botAction } from '../engine/bot';
import type { Action, GameState } from '../engine/types';
import { speedFactor } from './animation';
import { botPauseMs } from './motion';

/**
 * Computer players on this device (online, the room server plays them): when it's a bot's move and the last move has played out on
 * screen, the bot makes its move after a short pause, so the people at the table can follow it.
 */
export function useBots(game: GameState, busy: boolean, play: (action: Action) => void): void {
  useEffect(() => {
    if (busy) return;
    const action = botAction(game);
    if (!action) return;
    // Even with animations off, wait a moment: otherwise a bot's whole turn flashes past.
    const pause = botPauseMs(action) * Math.max(speedFactor(), 0.3);
    const timer = setTimeout(() => play(action), pause);
    return () => clearTimeout(timer);
  }, [game, busy, play]);
}
