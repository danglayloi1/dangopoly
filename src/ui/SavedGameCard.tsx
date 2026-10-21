import { formatMoney } from '../engine/money';
import type { SaveFile } from '../engine/save';
import { useLang } from '../i18n/LangContext';
import { playerColor } from './look';
import { TokenIcon } from './TokenIcon';

interface Props {
  saved: SaveFile;
  onContinue: () => void;
  onDiscard: () => void;
}

/** "You have an unfinished game": who's playing, their cash, whose turn, and when it was saved. */
export function SavedGameCard({ saved, onContinue, onDiscard }: Props) {
  const { t, lang } = useLang();
  const { game } = saved;
  const when = new Date(saved.savedAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'numeric',
  });

  return (
    <section className="saved-card" aria-labelledby="saved-title">
      <div className="saved-head">
        <h2 id="saved-title">💾 {t.savedGameTitle}</h2>
        <span className="muted">{t.savedAt(when)}</span>
      </div>

      <ul className="saved-players">
        {game.players.map((p) => (
          <li key={p.id} className={p.bankrupt ? 'bankrupt' : undefined}>
            <TokenIcon token={p.token} color={playerColor(p)} size={28} />
            <span className="saved-name">
              {p.name}
              {p.id === game.current && <span className="saved-turn"> · {t.turnOf(p.name)}</span>}
            </span>
            <span className="saved-cash">{p.bankrupt ? t.bankrupt : formatMoney(p.cash)}</span>
          </li>
        ))}
      </ul>

      <div className="saved-actions">
        <button
          className="secondary"
          onClick={() => {
            if (window.confirm(t.confirmDiscard)) onDiscard();
          }}
        >
          {t.discardGame}
        </button>
        <button className="primary big" onClick={onContinue} autoFocus>
          ▶ {t.continueGame}
        </button>
      </div>
    </section>
  );
}
