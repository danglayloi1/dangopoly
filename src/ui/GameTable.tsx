import { useEffect, useRef, useState, type ReactNode } from 'react';
import { actingPlayer } from '../engine/buildings';
import type { Action, GameState } from '../engine/types';
import { ActionPanel } from './ActionPanel';
import { Board } from './Board';
import { GameLog } from './GameLog';
import { GameHeader } from './Header';
import { ManageDialog } from './ManageDialog';
import { PlayerList } from './PlayerList';
import { SpaceCard } from './SpaceCard';
import { StatusBar } from './StatusBar';
import { SummaryDialog } from './SummaryDialog';
import { TradeDialog } from './TradeDialog';
import type { Presentation } from './usePresentation';
import type { NextGame } from './WinnerPanel';

interface Props {
  game: GameState;
  dispatch: (action: Action) => void;
  presentation: Presentation; // from usePresentation(game), which the caller may also need
  onLeave: () => void;
  headerExtra?: ReactNode; // shown in the top bar, e.g. "auto-saved" or the room code
  next?: NextGame; // after the game; by default a button back to the menu
  children?: ReactNode; // shown above everything, e.g. the tutorial hint
}

/** The game on screen: board, turn panel, players, history and the pop-ups. Used for local and online games. */
export function GameTable({ game, dispatch, presentation, onLeave, headerExtra, next = { onClick: onLeave }, children }: Props) {
  const [shownSpace, setShownSpace] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const [trading, setTrading] = useState(false);
  const [summary, setSummary] = useState(false);
  const actor = actingPlayer(game);
  const { positions, rolling, busy } = presentation;
  // While a move plays out, the side panel keeps showing money as it was until the token arrives.
  const settled = useRef(game);
  if (!busy) settled.current = game;

  // When the game ends (once the last move has played out), the summary opens by itself.
  const over = game.phase.kind === 'gameOver' && !busy;
  useEffect(() => {
    if (over) setSummary(true);
  }, [over]);

  return (
    <div className="game">
      <GameHeader onBack={onLeave}>{headerExtra}</GameHeader>
      <StatusBar game={game} />

      <div className="game-layout">
        <Board game={game} positions={positions} busy={busy} onSelectSpace={setShownSpace}>
          <ActionPanel
            game={game}
            dispatch={dispatch}
            onShowSpace={setShownSpace}
            onManage={() => setManaging(true)}
            onTrade={() => setTrading(true)}
            next={next}
            onSummary={() => setSummary(true)}
            busy={busy}
            rolling={rolling}
          />
        </Board>

        <aside className="sidebar">
          <PlayerList game={busy ? settled.current : game} onShowSpace={setShownSpace} />
          <GameLog game={busy ? settled.current : game} />
        </aside>
      </div>

      {managing && actor !== null && (
        <ManageDialog
          game={game}
          player={actor}
          dispatch={dispatch}
          onShowSpace={setShownSpace}
          onClose={() => setManaging(false)}
        />
      )}
      {trading && <TradeDialog game={game} dispatch={dispatch} onClose={() => setTrading(false)} />}
      {children}
      {summary && game.phase.kind === 'gameOver' && <SummaryDialog game={game} onClose={() => setSummary(false)} />}
      {shownSpace !== null && (
        <SpaceCard index={shownSpace} game={game} dispatch={dispatch} onClose={() => setShownSpace(null)} />
      )}
    </div>
  );
}
