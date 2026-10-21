import type { CSSProperties } from 'react';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { playerColor } from './look';
import { TokenIcon } from './TokenIcon';

// Paper confetti (pháo giấy) in the folk-print colors.
const CONFETTI_COLORS = ['#b8322a', '#d9ae4f', '#2f4f6f', '#4f7a3a', '#c95b7b', '#f6ecd4'];

/** Falling paper pieces in the board colors. Decorative; skipped for "reduce motion". */
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          style={
            {
              '--x': `${(i * 37) % 100}%`,
              '--delay': `${(i % 7) * 0.18}s`,
              '--spin': `${(i % 2 ? 1 : -1) * (200 + i * 15)}deg`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function WinnerPanel({ game, winner, onNewGame }: { game: GameState; winner: number; onNewGame: () => void }) {
  const { t } = useLang();
  const player = game.players[winner];
  const owned = Object.values(game.ownership).filter((o) => o.owner === winner);
  const houses = owned.reduce((sum, o) => sum + o.houses, 0);

  return (
    <div className="action-panel winner-panel">
      <Confetti />
      <div className="winner">
        <TokenIcon token={player.token} color={playerColor(player)} size={72} />
        <p className="winner-text">🏆 {t.winner(player.name)}</p>
        <p className="winner-stats">{t.winnerStats(formatMoney(player.cash), owned.length, houses)}</p>
      </div>
      <button className="primary big" onClick={onNewGame} autoFocus>
        {t.playAgain}
      </button>
    </div>
  );
}
