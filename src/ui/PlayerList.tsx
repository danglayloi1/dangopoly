import type { CSSProperties } from 'react';
import { BOARD } from '../data/board';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { holdingsOf, type Holding } from './holdings';
import { GROUP_COLORS, PLAYER_COLORS } from './look';
import { Buildings } from './PropertyButtons';
import { TokenIcon } from './TokenIcon';

interface Props {
  game: GameState;
  onShowSpace: (index: number) => void;
}

const SET_ICONS = { transport: '🚆', utility: '⚡' } as const;

function Swatch({ kind }: { kind: Holding['kind'] }) {
  if (kind === 'transport' || kind === 'utility') {
    return (
      <span className="holding-swatch icon" aria-hidden="true">
        {SET_ICONS[kind]}
      </span>
    );
  }
  return <span className="holding-swatch" style={{ background: GROUP_COLORS[kind] }} aria-hidden="true" />;
}

export function PlayerList({ game, onShowSpace }: Props) {
  const { t, lang } = useLang();

  return (
    <ul className="player-list">
      {game.players.map((p) => {
        const holdings = holdingsOf(game, p.id);
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

            {!p.bankrupt && (
              <ul className="holdings">
                {holdings.length === 0 && <li className="muted">{t.noProperties}</li>}
                {holdings.map((h) => (
                  <li key={h.kind} className={`holding${h.fullSet ? ' full' : ''}`}>
                    <Swatch kind={h.kind} />
                    <span className="holding-title">
                      {t.groupNames[h.kind]}{' '}
                      <span className="holding-count">
                        {h.owned.length}/{h.total}
                      </span>
                      {h.fullSet && (
                        <span className="full-set" title={t.fullSet}>
                          {' '}
                          ★ {t.fullSet}
                        </span>
                      )}
                    </span>
                    <span className="holding-names">
                      {h.owned.map((index) => {
                        const own = game.ownership[index];
                        return (
                          <button
                            key={index}
                            className={`link${own.mortgaged ? ' is-mortgaged' : ''}`}
                            title={own.mortgaged ? t.mortgaged : own.houses > 0 ? t.buildings(own.houses) : undefined}
                            onClick={() => onShowSpace(index)}
                          >
                            {BOARD[index].name[lang]}
                            {own.houses > 0 && (
                              <span className="buildings-inline">
                                <Buildings houses={own.houses} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
