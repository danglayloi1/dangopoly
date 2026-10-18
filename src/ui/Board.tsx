import type { CSSProperties, ReactNode } from 'react';
import { BOARD, isOwnable } from '../data/board';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { cellPosition } from './geometry';
import { GROUP_COLORS, PLAYER_COLORS, spaceIcon } from './look';
import { TokenIcon } from './TokenIcon';

interface Props {
  game: GameState;
  onSelectSpace: (index: number) => void;
  children: ReactNode; // shown in the middle of the board
}

export function Board({ game, onSelectSpace, children }: Props) {
  const { lang, t } = useLang();

  return (
    <div className="board">
      {BOARD.map((space, index) => {
        const { row, col, side } = cellPosition(index);
        const own = game.ownership[index];
        const icon = spaceIcon(index);
        const here = game.players.filter((p) => !p.bankrupt && p.position === index);
        const name = space.name[lang];
        const ownerName = own ? game.players[own.owner].name : null;

        const style = {
          gridRow: row + 1,
          gridColumn: col + 1,
          '--group': space.kind === 'property' ? GROUP_COLORS[space.group] : undefined,
          '--owner': own ? PLAYER_COLORS[own.owner] : undefined,
        } as CSSProperties;

        return (
          <button
            key={index}
            className={`cell side-${side} kind-${space.kind}${own ? ' owned' : ''}`}
            style={style}
            onClick={() => onSelectSpace(index)}
            aria-label={ownerName ? `${name}, ${t.ownedBy(ownerName)}` : name}
          >
            {space.kind === 'property' && <span className="strip" aria-hidden="true" />}
            <span className="cell-body">
              {icon && <span className="cell-icon">{icon}</span>}
              <span className="cell-name">{name}</span>
              {isOwnable(space) && <span className="cell-price">{formatMoney(space.price)}</span>}
            </span>
            {own && <span className="owner-mark" aria-hidden="true" />}
            {here.length > 0 && (
              <span className="cell-tokens">
                {here.map((p) => (
                  <span key={p.id} className={`cell-token${p.id === game.current ? ' current' : ''}`}>
                    <TokenIcon token={p.token} color={PLAYER_COLORS[p.id]} size="100%" title={p.name} />
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
      <div className="board-center">{children}</div>
    </div>
  );
}
