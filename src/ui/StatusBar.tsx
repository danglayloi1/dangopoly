import { useState } from 'react';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { festivalText } from './logText';
import { clockText, useNow } from './useNow';
import { Icon } from './icons';
import { MissionsDialog } from './MissionsDialog';
import { useViewer } from './viewer';

/** Under the top bar: the round ("Vòng 3/20"), the time left in timed games, this round's festival, and the secret missions. */
export function StatusBar({ game }: { game: GameState }) {
  const { t, uiLang } = useLang();
  const { mode } = game.rules;
  const over = game.phase.kind === 'gameOver';
  const timed = mode.kind === 'time' && !over;
  const now = useNow(timed);
  const left = mode.kind === 'time' ? mode.endsAt - now : 0;
  const viewer = useViewer();
  const [missions, setMissions] = useState(false);
  // Secret missions: on one device for whoever asks; online for this phone's own player (not a watcher).
  const hasMissions = Boolean(game.rules.viet?.missions) && !over && (!viewer.online || viewer.seat !== null);

  return (
    <div className="status-bar">
      <span className="status-round">{t.roundOf(game.round, mode.kind === 'rounds' ? mode.rounds : null)}</span>
      {timed && (
        <span className={`status-clock${left <= 60_000 ? ' ending' : ''}`} role="timer" aria-label={`${t.timeLeft}: ${clockText(left)}`}>
          <Icon name="clock" /> {clockText(left)}
        </span>
      )}
      {game.festival && !over && (
        <span className="status-festival">
          <Icon name="lantern" /> <strong>{t.festivalNames[game.festival.id]}</strong> · {festivalText(game.festival, uiLang)}
        </span>
      )}
      {hasMissions && (
        <button type="button" className="secondary small status-missions" onClick={() => setMissions(true)}>
          <Icon name="scroll" /> {t.missionsButton}
        </button>
      )}
      {missions && <MissionsDialog game={game} onClose={() => setMissions(false)} />}
    </div>
  );
}
