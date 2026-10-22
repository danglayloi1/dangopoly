import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { festivalText } from './logText';
import { clockText, useNow } from './useNow';

/** Under the top bar: the round ("Vòng 3/20"), the time left in timed games, and this round's festival. */
export function StatusBar({ game }: { game: GameState }) {
  const { t, uiLang } = useLang();
  const { mode } = game.rules;
  const over = game.phase.kind === 'gameOver';
  const timed = mode.kind === 'time' && !over;
  const now = useNow(timed);
  const left = mode.kind === 'time' ? mode.endsAt - now : 0;

  return (
    <div className="status-bar">
      <span className="status-round">{t.roundOf(game.round, mode.kind === 'rounds' ? mode.rounds : null)}</span>
      {timed && (
        <span className={`status-clock${left <= 60_000 ? ' ending' : ''}`} role="timer" aria-label={`${t.timeLeft}: ${clockText(left)}`}>
          ⏱ {clockText(left)}
        </span>
      )}
      {game.festival && !over && (
        <span className="status-festival">
          🏮 <strong>{t.festivalNames[game.festival.id]}</strong> · {festivalText(game.festival, uiLang)}
        </span>
      )}
    </div>
  );
}
