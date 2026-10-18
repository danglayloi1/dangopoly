import type { CSSProperties } from 'react';
import { BOARD } from '../data/board';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { GROUP_COLORS, PLAYER_COLORS, spaceIcon } from './look';
import { TokenIcon } from './TokenIcon';

interface Props {
  game: GameState;
  onShowSpace: (index: number) => void;
}

export function PlayerList({ game, onShowSpace }: Props) {
  const { t, lang } = useLang();

  return (
    <ul className="player-list">
      {game.players.map((p) => {
        const owned = Object.entries(game.ownership)
          .filter(([, own]) => own.owner === p.id)
          .map(([index]) => Number(index))
          .sort((a, b) => a - b);
        const isCurrent = p.id === game.current && game.phase.kind !== 'gameOver';

        return (
          <li
            key={p.id}
            className={`player-card${isCurrent ? ' current' : ''}${p.bankrupt ? ' bankrupt' : ''}`}
            style={{ '--player': PLAYER_COLORS[p.id] } as CSSProperties}
            aria-current={isCurrent ? 'true' : undefined}
          >
            <TokenIcon token={p.token} color={PLAYER_COLORS[p.id]} size={36} />
            <div className="player-info">
              <span className="player-name">{p.name}</span>
              <span className="player-cash">{p.bankrupt ? t.bankrupt : formatMoney(p.cash)}</span>
            </div>
            {owned.length > 0 && (
              <div className="owned-list">
                {owned.map((index) => {
                  const space = BOARD[index];
                  return (
                    <button
                      key={index}
                      className="owned-chip"
                      title={space.name[lang]}
                      aria-label={space.name[lang]}
                      style={{ background: space.kind === 'property' ? GROUP_COLORS[space.group] : 'var(--surface-2)' }}
                      onClick={() => onShowSpace(index)}
                    >
                      {space.kind === 'property' ? '' : spaceIcon(index)}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
