import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BOARD } from '../data/board';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { holdingsOf, type Holding } from './holdings';
import { Icon } from './icons';
import { groupFill, playerColor } from './look';
import { Buildings } from './PropertyButtons';
import { TokenIcon } from './TokenIcon';

interface Props {
  game: GameState;
  onShowSpace: (index: number) => void;
}

const SET_ICONS = { transport: 'train', utility: 'power' } as const;

function Swatch({ kind }: { kind: Holding['kind'] }) {
  if (kind === 'transport' || kind === 'utility') {
    return (
      <span className="holding-swatch icon" aria-hidden="true">
        <Icon name={SET_ICONS[kind]} />
      </span>
    );
  }
  return <span className="holding-swatch" style={{ background: groupFill(kind) }} aria-hidden="true" />;
}

/** A player's cash; when it changes, the difference floats up next to it for a moment. */
function Cash({ cash }: { cash: number }) {
  const previous = useRef(cash);
  const [delta, setDelta] = useState<{ amount: number; id: number } | null>(null);

  useEffect(() => {
    const amount = cash - previous.current;
    previous.current = cash;
    if (amount === 0) return;
    setDelta((d) => ({ amount, id: (d?.id ?? 0) + 1 }));
    const timer = setTimeout(() => setDelta(null), 1600);
    return () => clearTimeout(timer);
  }, [cash]);

  return (
    <span className="player-cash">
      {formatMoney(cash)}
      {delta && (
        <span key={delta.id} className={`cash-delta ${delta.amount > 0 ? 'up' : 'down'}`} aria-hidden="true">
          {delta.amount > 0 ? '+' : '−'}
          {formatMoney(Math.abs(delta.amount))}
        </span>
      )}
    </span>
  );
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
            style={{ '--player': playerColor(p) } as CSSProperties}
            aria-current={isCurrent ? 'true' : undefined}
          >
            <TokenIcon token={p.token} color={playerColor(p)} size={36} />
            <div className="player-info">
              <span className="player-name">
                {p.name}
                {p.inJail && (
                  <span className="badge-jail" title={t.inJailBadge}>
                    <Icon name="jail" /> {t.inJailBadge}
                  </span>
                )}
                {p.jailCards.length > 0 && (
                  <span className="badge-card" title={t.jailCards(p.jailCards.length)}>
                    <Icon name="ticket" />×{p.jailCards.length}
                  </span>
                )}
              </span>
              {p.bankrupt ? <span className="player-cash">{t.bankrupt}</span> : <Cash cash={p.cash} />}
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
