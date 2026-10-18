import { useState } from 'react';
import { applyAction, GameError } from '../engine/game';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { ActionPanel } from './ActionPanel';
import { Board } from './Board';
import { GameLog } from './GameLog';
import { GameHeader } from './Header';
import { PlayerList } from './PlayerList';
import { SpaceCard } from './SpaceCard';

interface Props {
  initialGame: GameState;
  onNewGame: () => void;
}

export function GameScreen({ initialGame, onNewGame }: Props) {
  const { t } = useLang();
  const [game, setGame] = useState(initialGame);
  const [shownSpace, setShownSpace] = useState<number | null>(null);

  const dispatch = (action: Action) => {
    setGame((current) => {
      try {
        return applyAction(current, action);
      } catch (error) {
        // A button for an action that's no longer allowed (e.g. a double click): ignore it.
        if (error instanceof GameError) return current;
        throw error;
      }
    });
  };

  const confirmNewGame = () => {
    if (game.phase.kind === 'gameOver' || window.confirm(t.confirmNewGame)) onNewGame();
  };

  return (
    <div className="game">
      <GameHeader>
        <button className="secondary small" onClick={confirmNewGame}>
          {t.newGame}
        </button>
      </GameHeader>

      <div className="game-layout">
        <Board game={game} onSelectSpace={setShownSpace}>
          <ActionPanel game={game} dispatch={dispatch} onShowSpace={setShownSpace} onNewGame={onNewGame} />
        </Board>

        <aside className="sidebar">
          <PlayerList game={game} onShowSpace={setShownSpace} />
          <GameLog game={game} />
        </aside>
      </div>

      {shownSpace !== null && <SpaceCard index={shownSpace} game={game} onClose={() => setShownSpace(null)} />}
    </div>
  );
}
