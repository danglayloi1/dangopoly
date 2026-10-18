import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { describeLog } from './logText';

/** Full history of the game, newest first. */
export function GameLog({ game }: { game: GameState }) {
  const { t, lang } = useLang();
  const entries = game.log
    .map((entry, i) => ({ entry, i }))
    .reverse()
    .slice(0, 60);

  return (
    <section className="game-log">
      <h2>{t.history}</h2>
      <ol>
        {entries.map(({ entry, i }) => (
          <li key={i} className={`log-${entry.type}`}>
            {describeLog(entry, game, lang)}
          </li>
        ))}
      </ol>
    </section>
  );
}
