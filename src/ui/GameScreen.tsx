import { useEffect, useRef, useState } from 'react';
import { CARDS } from '../data/cards';
import { actingPlayer } from '../engine/buildings';
import { applyAction, GameError } from '../engine/game';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { ActionPanel } from './ActionPanel';
import { Board } from './Board';
import { GameLog } from './GameLog';
import { GameHeader } from './Header';
import { ManageDialog } from './ManageDialog';
import { PlayerList } from './PlayerList';
import { clearSavedGame, saveGame } from './savedGame';
import { SpaceCard } from './SpaceCard';
import { TradeDialog } from './TradeDialog';
import { usePresentation } from './usePresentation';

interface Props {
  initialGame: GameState;
  onNewGame: () => void;
}

export function GameScreen({ initialGame, onNewGame }: Props) {
  const { t } = useLang();
  const [game, setGame] = useState(initialGame);
  const [shownSpace, setShownSpace] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const [trading, setTrading] = useState(false);
  const [saving, setSaving] = useState(true); // false if this browser won't let us store the game
  const actor = actingPlayer(game);
  const { positions, rolling, busy } = usePresentation(game);
  // While a move plays out, the side panel keeps showing money as it was until the token arrives.
  const settled = useRef(game);
  if (!busy) settled.current = game;

  // Auto-save after every change; a finished game is removed so it isn't offered again.
  useEffect(() => {
    if (game.phase.kind === 'gameOver') clearSavedGame();
    else setSaving(saveGame(game));
  }, [game]);

  // Development only (removed from the published build): lets scripts/screenshots.mjs read the
  // game and jump straight to a situation, e.g. "Đăng owns these properties".
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __dangopoly?: unknown };
    w.__dangopoly = {
      getGame: () => gameRef.current,
      setGame,
      // e.g. { type: 'ROLL', dice: [2, 3] } to land on an exact space
      dispatch: (action: Action) => setGame((current) => applyAction(current, action)),
      cards: CARDS,
    };
    return () => {
      delete w.__dangopoly;
    };
  }, []);

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
        {saving && game.phase.kind !== 'gameOver' && (
          <span className="autosave muted" title={t.autoSaved}>
            💾 <span className="autosave-text">{t.autoSaved}</span>
          </span>
        )}
        <button className="secondary small" onClick={confirmNewGame}>
          {t.newGame}
        </button>
      </GameHeader>

      <div className="game-layout">
        <Board game={game} positions={positions} busy={busy} onSelectSpace={setShownSpace}>
          <ActionPanel
            game={game}
            dispatch={dispatch}
            onShowSpace={setShownSpace}
            onManage={() => setManaging(true)}
            onTrade={() => setTrading(true)}
            onNewGame={onNewGame}
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
      {shownSpace !== null && (
        <SpaceCard index={shownSpace} game={game} dispatch={dispatch} onClose={() => setShownSpace(null)} />
      )}
    </div>
  );
}
