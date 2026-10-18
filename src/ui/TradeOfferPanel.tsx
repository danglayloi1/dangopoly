import type { CSSProperties } from 'react';
import { BOARD } from '../data/board';
import { formatMoney } from '../engine/money';
import type { Action, GameState, TradeOffer, TradeSide } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { GROUP_COLORS, PLAYER_COLORS, spaceIcon } from './look';
import { TokenIcon } from './TokenIcon';

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
              <span className="holding-swatch" style={{ background: GROUP_COLORS[s.group] }} />
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
          <span className="holding-swatch icon">🎫</span>
          {side.jailCards > 1 ? t.jailCards(side.jailCards) : t.jailCardName}
        </li>
      )}
      {side.cash > 0 && (
        <li className="offer-cash">
          <span className="holding-swatch icon">💰</span>
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

  return (
    <div className="action-panel trade-offer" style={{ '--player': PLAYER_COLORS[to.id] } as CSSProperties}>
      <div className="turn-banner" style={{ color: PLAYER_COLORS[to.id] }}>
        <TokenIcon token={to.token} color={PLAYER_COLORS[to.id]} size={28} />
        <span>🤝 {t.offerTitle(to.name, from.name)}</span>
      </div>
      <p className="muted pass-device">{t.passDevice(to.name)}</p>

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

      <div className="action-buttons">
        <button className="primary big" onClick={() => dispatch({ type: 'ACCEPT_TRADE' })}>
          ✓ {t.accept}
        </button>
        <button className="danger" onClick={() => dispatch({ type: 'REJECT_TRADE' })}>
          ✕ {t.reject}
        </button>
      </div>
    </div>
  );
}
