import type { CSSProperties } from 'react';
import { BOARD } from '../data/board';
import { formatMoney } from '../engine/money';
import type { Action, GameState, TradeOffer, TradeSide } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { Icon } from './icons';
import { groupFill, playerColor, spaceIcon } from './look';
import { TokenIcon } from './TokenIcon';
import { useMayAct, useViewer } from './viewer';

interface Props {
  game: GameState;
  offer: TradeOffer;
  dispatch: (action: Action) => void;
  onShowSpace: (index: number) => void;
}

function SideList({ side, onShowSpace }: { side: TradeSide; onShowSpace: (index: number) => void }) {
  const { t, lang } = useLang();
  if (side.spaces.length === 0 && side.cash === 0 && side.jailCards === 0) {
    return <p className="muted">{t.log.nothing}</p>;
  }
  return (
    <ul className="offer-items">
      {side.spaces.map((space) => {
        const s = BOARD[space];
        return (
          <li key={space}>
            {s.kind === 'property' ? (
              <span className="holding-swatch" style={{ background: groupFill(s.group) }} />
            ) : (
              <span className="holding-swatch icon">{spaceIcon(space)}</span>
            )}
            <button className="link" onClick={() => onShowSpace(space)}>
              {s.name[lang]}
            </button>
          </li>
        );
      })}
      {side.jailCards > 0 && (
        <li>
          <span className="holding-swatch icon">
            <Icon name="ticket" />
          </span>
          {side.jailCards > 1 ? t.jailCards(side.jailCards) : t.jailCardName}
        </li>
      )}
      {side.cash > 0 && (
        <li className="offer-cash">
          <span className="holding-swatch icon">
            <Icon name="coins" />
          </span>
          {formatMoney(side.cash)}
        </li>
      )}
    </ul>
  );
}

/**
 * Shown in the middle of the board while an offer waits: written for the player who must answer,
 * since on a shared device they're the one looking now.
 */
export function TradeOfferPanel({ game, offer, dispatch, onShowSpace }: Props) {
  const { t } = useLang();
  const from = game.players[offer.from];
  const to = game.players[offer.to];
  const mayAct = useMayAct(game); // online: only the player the offer is for can answer
  const { online } = useViewer();

  return (
    <div className="action-panel trade-offer" style={{ '--player': playerColor(to) } as CSSProperties}>
      <div className="turn-banner" style={{ color: playerColor(to) }}>
        <TokenIcon token={to.token} color={playerColor(to)} size={28} />
        <span>🤝 {t.offerTitle(to.name, from.name)}</span>
      </div>
      {!online && <p className="muted pass-device">{t.passDevice(to.name)}</p>}

      <div className="offer-sides">
        <div className="offer-side">
          <h3>{t.sideGets(to.name)}</h3>
          <SideList side={offer.give} onShowSpace={onShowSpace} />
        </div>
        <div className="offer-side">
          <h3>{t.sideGives(to.name)}</h3>
          <SideList side={offer.take} onShowSpace={onShowSpace} />
        </div>
      </div>

      {!mayAct && <p className="waiting-note">{t.waitingAnswer(to.name)}</p>}
      {mayAct && (
        <div className="action-buttons">
          <button className="primary big" onClick={() => dispatch({ type: 'ACCEPT_TRADE' })}>
            ✓ {t.accept}
          </button>
          <button className="danger" onClick={() => dispatch({ type: 'REJECT_TRADE' })}>
            ✕ {t.reject}
          </button>
        </div>
      )}
    </div>
  );
}
