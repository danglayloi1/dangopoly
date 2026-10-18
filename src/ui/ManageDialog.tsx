import { BOARD } from '../data/board';
import { formatMoney } from '../engine/money';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { holdingsOf } from './holdings';
import { GROUP_COLORS, PLAYER_COLORS, spaceIcon } from './look';
import { Buildings, PropertyButtons } from './PropertyButtons';
import { useModalDialog } from './useModalDialog';

interface Props {
  game: GameState;
  player: number;
  dispatch: (action: Action) => void;
  onShowSpace: (index: number) => void;
  onClose: () => void;
}

/** All of one player's properties with build / sell / mortgage buttons. Stays open while they act. */
export function ManageDialog({ game, player, dispatch, onShowSpace, onClose }: Props) {
  const { t, lang } = useLang();
  const { dialogProps, close } = useModalDialog(onClose);
  const p = game.players[player];

  return (
    <dialog {...dialogProps} className="manage-dialog" aria-labelledby="manage-title">
      <header className="manage-header" style={{ borderTopColor: PLAYER_COLORS[player] }}>
        <h2 id="manage-title">{t.manageFor(p.name)}</h2>
        <span className="manage-cash">
          {t.cash}: <strong>{formatMoney(p.cash)}</strong>
        </span>
      </header>

      <div className="manage-body">
        <p className="muted manage-hint">{t.manageHint}</p>

        {holdingsOf(game, player).map((h) => (
          <section key={h.kind} className="manage-group">
            <h3>
              {h.kind === 'transport' || h.kind === 'utility' ? (
                <span className="holding-swatch icon">{h.kind === 'transport' ? '🚆' : '⚡'}</span>
              ) : (
                <span className="holding-swatch" style={{ background: GROUP_COLORS[h.kind] }} />
              )}
              {t.groupNames[h.kind]}{' '}
              <span className="holding-count">
                {h.owned.length}/{h.total}
              </span>
              {h.fullSet && <span className="full-set"> ★ {t.fullSet}</span>}
            </h3>
            <ul>
              {h.owned.map((space) => {
                const own = game.ownership[space];
                return (
                  <li key={space} className={`manage-row${own.mortgaged ? ' mortgaged' : ''}`}>
                    <button className="link manage-name" onClick={() => onShowSpace(space)}>
                      {BOARD[space].kind !== 'property' && <span>{spaceIcon(space)} </span>}
                      {BOARD[space].name[lang]}
                    </button>
                    <span className="manage-status">
                      {own.mortgaged ? (
                        <span className="mortgaged-tag">{t.mortgaged}</span>
                      ) : BOARD[space].kind === 'property' ? (
                        own.houses > 0 ? (
                          <span className="buildings-inline">
                            <Buildings houses={own.houses} />
                          </span>
                        ) : (
                          <span className="muted">{t.noBuildings}</span>
                        )
                      ) : null}
                    </span>
                    <PropertyButtons game={game} space={space} dispatch={dispatch} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <button className="primary" onClick={close} autoFocus>
          {t.close}
        </button>
      </div>
    </dialog>
  );
}
