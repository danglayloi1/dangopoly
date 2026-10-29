import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { formatMoney } from '../engine/money';
import { worthOfAll } from '../engine/rounds';
import type { GameState, PlayerStats } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { playerColor } from './look';
import { BADGES, type NewBadges } from './records';
import { awards } from './summary';
import { canCopyPictures, canSharePictures, copyPicture, drawSummary, savePicture, sharePicture } from './summaryPicture';
import { TokenIcon } from './TokenIcon';
import { useModalDialog } from './useModalDialog';
import { WorthChart } from './WorthChart';
import { Icon, type IconName } from './icons';

const MEDALS: IconName[] = ['medalGold', 'medalSilver', 'medalBronze'];
const MONEY_STATS: readonly (keyof PlayerStats)[] = ['rentReceived', 'rentPaid'];
const STAT_ORDER: readonly (keyof PlayerStats)[] = ['rentReceived', 'rentPaid', 'bought', 'housesBuilt', 'laps', 'doubles', 'jailed', 'trades', 'cards'];

/** After the game: how it ended, the ranking, the wealth chart, titles and stats. */
export function SummaryDialog({ game, newBadges = [], onClose }: { game: GameState; newBadges?: NewBadges[]; onClose: () => void }) {
  const { t } = useLang();
  const rankingRef = useRef<HTMLOListElement>(null);
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

  // The summary as a picture to share, copy or keep (see summaryPicture.ts). It's drawn as soon as
  // the summary opens: browsers only let a page share or copy right after a tap, so it must be ready.
  const FILE = 'dangopoly-tong-ket.png';
  const [canShare] = useState(canSharePictures);
  const [canCopy] = useState(canCopyPictures);
  const [picture, setPicture] = useState<Blob | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    // The tokens as drawn in the ranking above, so the picture shows the same ones.
    const tokens = new Map<number, SVGSVGElement>();
    rankingRef.current?.querySelectorAll('li').forEach((li, i) => {
      const svg = li.querySelector<SVGSVGElement>('svg.token-icon');
      if (svg) tokens.set(ranking[i].id, svg);
    });
    void drawSummary(game, ranking.map((p) => p.id), worth, tokens, {
      title: t.pictureTitle,
      edition: t.edition,
      how,
      rounds: t.summaryRounds(game.round),
      bankrupt: t.bankrupt,
      titlesHeading: t.titlesHeading,
      titles: awards(game).map((a) => `${t.titles[a.title].name}: ${game.players[a.player].name}`),
      newBadges: t.newBadges,
      badges: newBadges.flatMap(({ player, badges }) => badges.map((id) => `${game.players[player].name}: ${t.badges[id].name}`)),
      site: 'danglayloi1.github.io/dangopoly',
    }).then((blob) => !cancelled && setPicture(blob));
    return () => {
      cancelled = true;
    };
  }, [newBadges, t]);

  const share = async () => {
    if (!picture) return;
    if (!(await sharePicture(picture, FILE, t.pictureTitle))) {
      savePicture(picture, FILE);
      setNote(t.pictureSaved);
    }
  };
  const copy = async () => {
    if (!picture) return;
    setNote((await copyPicture(picture)) ? t.pictureCopied : t.pictureCopyFailed);
  };
  const save = () => {
    if (!picture) return;
    savePicture(picture, FILE);
    setNote(t.pictureSaved);
  };

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

        <ol className="summary-ranking" ref={rankingRef}>
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

        {/* Right under the ranking: the picture is what people share first. */}
        <div className="summary-share">
          {canShare && (
            <button className="primary" disabled={!picture} onClick={share}>
              {t.sharePicture}
            </button>
          )}
          {canCopy && (
            <button className={canShare ? 'secondary' : 'primary'} disabled={!picture} onClick={copy}>
              {t.copyPicture}
            </button>
          )}
          <button className="secondary" disabled={!picture} onClick={save}>
            <Icon name="save" /> {t.savePicture}
          </button>
        </div>
        <p className="summary-share-note muted center" role="status">
          {picture ? note : t.picturePreparing}
        </p>

        {newBadges.length > 0 && (
          <section className="summary-badges">
            <h3>{t.newBadges}</h3>
            <ul>
              {newBadges.flatMap(({ player, badges }) =>
                badges.map((id) => (
                  <li key={`${player}-${id}`} style={{ '--player': playerColor(game.players[player]) } as CSSProperties}>
                    <span className="badge-seal">
                      <Icon name={BADGES.find((b) => b.id === id)!.icon} size={28} />
                    </span>
                    <span>
                      <strong>{t.badges[id].name}</strong>
                      <span className="muted">
                        {game.players[player].name} · {t.badges[id].how}
                      </span>
                    </span>
                  </li>
                )),
              )}
            </ul>
          </section>
        )}

        <WorthChart game={game} />

        {/* Secret missions, all revealed now the game is over. */}
        {game.players.some((p) => p.missions) && (
          <section className="summary-missions">
            <h3>{t.missionsSummary}</h3>
            <ul>
              {game.players.map((p) => (
                <li key={p.id} style={{ '--player': playerColor(p) } as CSSProperties}>
                  <TokenIcon token={p.token} color={playerColor(p)} size={24} />
                  <strong>{p.name}</strong>
                  <span>
                    {(p.missions ?? []).map((m, i) =>
                      m.id === null ? null : (
                        <span key={i} className={`summary-mission${m.done ? ' done' : ''}`}>
                          {m.done ? '✓' : '✗'} {t.missions[m.id].name}
                        </span>
                      ),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

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
