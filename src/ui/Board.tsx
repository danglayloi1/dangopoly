import type { CSSProperties, ReactNode } from 'react';
import { BOARD, isOwnable } from '../data/board';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { BoardEffects } from './Effects';
import { cellPosition } from './geometry';
import { groupFill, playerColor, spaceIcon } from './look';
import { Buildings } from './PropertyButtons';
import { TokenIcon } from './TokenIcon';
import type { ShownEffect } from './usePresentation';

interface Props {
  game: GameState;
  positions: number[]; // where to draw each token (it lags behind the game while hopping)
  busy: boolean; // a move is being animated
  onSelectSpace: (index: number) => void;
  effects: ShownEffect[]; // seals, flying coins… drawn over the spaces
  children: ReactNode; // shown in the middle of the board
}

export function Board({ game, positions, busy, onSelectSpace, effects, children }: Props) {
  const { lang, t } = useLang();

  return (
    <div className="board" data-busy={busy}>
      {BOARD.map((space, index) => {
        const { row, col, side } = cellPosition(index);
        const own = game.ownership[index];
        const icon = spaceIcon(index);
        const here = game.players.filter((p) => !p.bankrupt && positions[p.id] === index);
        const name = space.name[lang];
        const ownerName = own ? game.players[own.owner].name : null;

        const style = {
          gridRow: row + 1,
          gridColumn: col + 1,
          '--group': space.kind === 'property' ? groupFill(space.group) : undefined,
          '--owner': own ? playerColor(game.players[own.owner]) : undefined,
        } as CSSProperties;

        return (
          <button
            key={index}
            className={`cell side-${side} kind-${space.kind}${own ? ' owned' : ''}${own?.mortgaged ? ' mortgaged' : ''}`}
            style={style}
            data-space={index}
            onClick={() => onSelectSpace(index)}
            aria-label={ownerName ? `${name}, ${t.ownedBy(ownerName)}` : name}
          >
            {space.kind === 'property' && (
              <span className="strip" aria-hidden="true">
                <Buildings houses={own?.houses ?? 0} />
              </span>
            )}
            <span className="cell-body">
              {icon && <span className="cell-icon">{icon}</span>}
              <span className="cell-name">{name}</span>
              {isOwnable(space) && (
                <span className="cell-price">
                  <span className="price-amount">{formatMoney(space.price)}</span>
                  {own?.mortgaged && <span className="mortgaged-label">{t.mortgaged}</span>}
                </span>
              )}
            </span>
            {own && <span className="owner-mark" aria-hidden="true" />}
            {here.length > 0 && (
              <span className="cell-tokens">
                {here.map((p) => (
                  <span
                    key={p.id}
                    data-player={p.id} // where online throws land (see Throws.tsx)
                    className={`cell-token${p.id === game.current ? ' current' : ''}${p.inJail ? ' jailed' : ''}`}
                  >
                    <TokenIcon token={p.token} color={playerColor(p)} size="100%" title={p.name} />
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
      <div className="board-center">{children}</div>
      <BoardEffects effects={effects} game={game} />
    </div>
  );
}
