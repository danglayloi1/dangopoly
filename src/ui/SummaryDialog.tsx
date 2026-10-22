import type { CSSProperties } from 'react';
import { formatMoney } from '../engine/money';
import { worthOfAll } from '../engine/rounds';
import type { GameState, PlayerStats } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { playerColor } from './look';
import { awards } from './summary';
import { TokenIcon } from './TokenIcon';
import { useModalDialog } from './useModalDialog';
import { WorthChart } from './WorthChart';
import { Icon, type IconName } from './icons';

const MEDALS: IconName[] = ['medalGold', 'medalSilver', 'medalBronze'];
const MONEY_STATS: readonly (keyof PlayerStats)[] = ['rentReceived', 'rentPaid'];
const STAT_ORDER: readonly (keyof PlayerStats)[] = ['rentReceived', 'rentPaid', 'bought', 'housesBuilt', 'laps', 'doubles', 'jailed', 'trades', 'cards'];

/** After the game: how it ended, the ranking, the wealth chart, titles and stats. */
export function SummaryDialog({ game, onClose }: { game: GameState; onClose: () => void }) {
  const { t } = useLang();
  const { dialogProps, close } = useModalDialog(onClose);
  const winner = game.phase.kind === 'gameOver' ? game.players[game.phase.winner] : null;
  const worth = worthOfAll(game);
  const ranking = [...game.players].sort((a, b) => Number(a.bankrupt) - Number(b.bankrupt) || worth[b.id] - worth[a.id]);
  const value = (stat: keyof PlayerStats, v: number) => (MONEY_STATS.includes(stat) ? formatMoney(v) : String(v));

  const how =
    game.endReason === 'rounds' && game.rules.mode.kind === 'rounds'
      ? `${t.endByRounds(game.rules.mode.rounds)} ${winner ? t.richestWins(winner.name) : ''}`
      : game.endReason === 'time' && winner
        ? `${t.endByTime} ${t.richestWins(winner.name)}`
        : winner
          ? t.winner(winner.name)
          : '';

  return (
    <dialog {...dialogProps} className="summary-dialog" aria-labelledby="summary-title">
      <header className="summary-header">
        <h2 id="summary-title">{t.summaryTitle}</h2>
        <button className="icon-button" aria-label={t.close} title={t.close} onClick={close}>
          ✕
        </button>
      </header>
      <div className="summary-body">
        <p className="summary-how">
          <Icon name="trophy" /> {how} <span className="muted">· {t.summaryRounds(game.round)}</span>
        </p>

        <ol className="summary-ranking">
          {ranking.map((p, i) => (
            <li key={p.id} style={{ '--player': playerColor(p) } as CSSProperties}>
              <span className="summary-medal">
                {p.bankrupt ? <Icon name="purse" /> : MEDALS[i] ? <Icon name={MEDALS[i]} /> : `${i + 1}.`}
              </span>
              <TokenIcon token={p.token} color={playerColor(p)} size={30} />
              <span className="summary-name">{p.name}</span>
              <span className="summary-worth">{p.bankrupt ? t.bankrupt : formatMoney(worth[p.id])}</span>
            </li>
          ))}
        </ol>

        <WorthChart game={game} />

        {awards(game).length > 0 && (
          <section>
            <h3>{t.titlesHeading}</h3>
            <ul className="summary-titles">
              {awards(game).map((a) => {
                const p = game.players[a.player];
                return (
                  <li key={a.title} style={{ '--player': playerColor(p) } as CSSProperties}>
                    <strong>{t.titles[a.title].name}</strong>
                    <span>
                      {p.name}: {t.titles[a.title].why}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h3>{t.statsHeading}</h3>
          <div className="summary-table-wrap">
            <table className="summary-table">
              <thead>
                <tr>
                  <th />
                  {/* Tokens instead of names keep four columns narrow enough for a phone. */}
                  {game.players.map((p) => (
                    <th key={p.id} title={p.name}>
                      <TokenIcon token={p.token} color={playerColor(p)} size={26} />
                      <span className="visually-hidden">{p.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STAT_ORDER.map((stat) => (
                  <tr key={stat}>
                    <th scope="row">{t.statNames[stat]}</th>
                    {game.stats.map((s, i) => (
                      <td key={i}>{value(stat, s[stat])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </dialog>
  );
}
