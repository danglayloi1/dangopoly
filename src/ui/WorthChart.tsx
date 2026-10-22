import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { playerColor } from './look';

const W = 320;
const H = 170;
const PAD = { left: 44, right: 10, top: 10, bottom: 22 };

/** Each player's total wealth at the start of every round and at the end (🏁), as lines in their color. */
export function WorthChart({ game }: { game: GameState }) {
  const { t } = useLang();
  const rows = game.worth;
  if (rows.length < 2) return null;

  const max = Math.max(1, ...rows.flat()) * 1.05;
  const x = (i: number) => PAD.left + (i / (rows.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const ticks = [0, max / 2, max];
  const roundLabels = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])];

  return (
    <figure className="worth-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.worthChart}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={PAD.left - 4} y={y(v) + 3} textAnchor="end" className="chart-label">
              {formatMoney(Math.round(v / 100_000) * 100_000)}
            </text>
          </g>
        ))}
        {roundLabels.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="chart-label">
            {i === rows.length - 1 ? '🏁' : i + 1}
          </text>
        ))}
        {game.players.map((p) => (
          <g key={p.id}>
            <polyline
              points={rows.map((row, i) => `${x(i)},${y(row[p.id])}`).join(' ')}
              fill="none"
              stroke={playerColor(p)}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={x(rows.length - 1)} cy={y(rows[rows.length - 1][p.id])} r={3.5} fill={playerColor(p)} />
          </g>
        ))}
      </svg>
      <figcaption className="muted small-note">{t.worthChart}</figcaption>
    </figure>
  );
}
