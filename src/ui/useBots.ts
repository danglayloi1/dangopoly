import { useEffect } from 'react';
import { botAction } from '../engine/bot';
import type { Action, GameState } from '../engine/types';
import { speedFactor } from './animation';

const THINK_MS = 900; // before a decision: rolling, buying, answering a trade
const QUICK_MS = 450; // one more house, one more mortgage

/**
 * Computer players on this device: when it's a bot's move and the last move has played out on
 * screen, the bot makes its move after a short pause, so the people at the table can follow it.
 */
export function useBots(game: GameState, busy: boolean, play: (action: Action) => void): void {
  useEffect(() => {
    if (busy) return;
    const action = botAction(game);
    if (!action) return;
    const quick = action.type === 'BUILD_HOUSE' || action.type === 'MORTGAGE' || action.type === 'SELL_HOUSE' || action.type === 'UNMORTGAGE';
    // Even with animations off, wait a moment: otherwise a bot's whole turn flashes past.
    const pause = (quick ? QUICK_MS : THINK_MS) * Math.max(speedFactor(), 0.3);
    const timer = setTimeout(() => play(action), pause);
    return () => clearTimeout(timer);
  }, [game, busy, play]);
}
