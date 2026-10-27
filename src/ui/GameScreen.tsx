import { useCallback, useEffect, useRef, useState } from 'react';
import { CARDS } from '../data/cards';
import { applyAction, GameError } from '../engine/game';
import { diceFumbled } from './motion';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { GameTable } from './GameTable';
import { clearSavedGame, saveGame } from './savedGame';
import { useNow } from './useNow';
import { BotTalk } from './BotTalk';
import { useBots } from './useBots';
import { useRecordGame } from './useRecordGame';
import { usePresentation } from './usePresentation';
import { TutorialBubble } from '../tutorial/TutorialBubble';
import { useTutorial } from '../tutorial/useTutorial';
import { Icon } from './icons';

interface Props {
  initialGame: GameState;
  onLeave: () => void; // back to the start screen (the game stays saved)
  tutorial?: boolean; // play the guided first game
}

/** A game on this one device: players take turns with it. Saved after every move. */
export function GameScreen({ initialGame, onLeave, tutorial: tutorialMode = false }: Props) {
  const { t } = useLang();
  const [game, setGame] = useState(initialGame);
  const [saving, setSaving] = useState(true); // false if this browser won't let us store the game
  const presentation = usePresentation(game);

  const play = useCallback((action: Action) => {
    setGame((current) => {
      try {
        return applyAction(current, action);
      } catch (error) {
        // A button for an action that's no longer allowed (e.g. a double click): ignore it.
        if (error instanceof GameError) return current;
        throw error;
      }
    });
  }, []);
  // In the tutorial, every move goes through it: it only lets through what the lesson asks for.
  const tutorial = useTutorial(tutorialMode, play, presentation.busy);
  useBots(game, presentation.busy, play);
  // Everyone at this device (the records skip computer players); the tutorial doesn't count.
  const newBadges = useRecordGame(game, tutorial.active ? null : game.players.map((p) => p.id));

  // Timed games: once the time is up, the game ends at the start of the next turn.
  const timed = game.rules.mode.kind === 'time' && game.phase.kind !== 'gameOver';
  const now = useNow(timed);
  useEffect(() => {
    const { mode } = game.rules;
    if (mode.kind === 'time' && now >= mode.endsAt && game.phase.kind === 'awaitRoll' && !presentation.busy) {
      play({ type: 'TIME_UP' });
    }
  }, [now, game, presentation.busy, play]);

  // Auto-save after every change (not during the tutorial); a finished game is removed.
  useEffect(() => {
    if (tutorial.active) return;
    if (game.phase.kind === 'gameOver') clearSavedGame();
    else setSaving(saveGame(game));
  }, [game, tutorial.active]);

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
      // to find a game where the dice roll under the table (see diceFumbled)
      applyAction,
      diceFumbled,
    };
    return () => {
      delete w.__dangopoly;
    };
  }, []);

  const autosave = saving && !tutorial.active && game.phase.kind !== 'gameOver' && (
    <span className="autosave muted" title={t.autoSaved}>
      <Icon name="save" /> <span className="autosave-text">{t.autoSaved}</span>
    </span>
  );

  return (
    <GameTable game={game} dispatch={tutorial.dispatch} presentation={presentation} onLeave={onLeave} headerExtra={autosave} newBadges={newBadges}>
      {tutorial.active && <TutorialBubble tutorial={tutorial} onExit={onLeave} />}
      <BotTalk game={game} busy={presentation.busy} />
    </GameTable>
  );
}
