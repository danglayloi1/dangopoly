import { createContext, useContext } from 'react';
import { whoseMove } from '../engine/game';
import type { GameState } from '../engine/types';

/**
 * Who is looking at this screen. On one shared device anyone may press the buttons; online, each
 * phone has one seat (or none, when only watching) and gets buttons only when it's that seat's move.
 */
export type Viewer = { online: false } | { online: true; seat: number | null; connected: readonly boolean[] };

const ViewerContext = createContext<Viewer>({ online: false });

export const ViewerProvider = ViewerContext.Provider;

export const useViewer = (): Viewer => useContext(ViewerContext);

/** Whether this screen may make the move that's due now. */
export function useMayAct(game: GameState): boolean {
  const viewer = useViewer();
  return !viewer.online || (viewer.seat !== null && whoseMove(game) === viewer.seat);
}
