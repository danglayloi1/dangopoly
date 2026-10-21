import {
  actingPlayer,
  canBuildHouse,
  canMortgage,
  canSellHouse,
  canUnmortgage,
  HOTEL,
  houseCost,
  houseRefund,
  mortgageValue,
  unmortgageCost,
} from '../engine/buildings';
import { BOARD } from '../data/board';
import { formatMoney } from '../engine/money';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';

interface Props {
  game: GameState;
  space: number;
  dispatch: (action: Action) => void;
}

/**
 * Build / sell / mortgage / unmortgage buttons for one space owned by the player who may act now.
 * Buttons that don't apply are hidden; ones that apply but aren't possible right now are disabled.
 */
export function PropertyButtons({ game, space, dispatch }: Props) {
  const { t } = useLang();
  const own = game.ownership[space];
  if (!own || own.owner !== actingPlayer(game)) return null;

  const isProperty = BOARD[space].kind === 'property';
  const buttons = [];

  if (isProperty && !own.mortgaged) {
    if (own.houses < HOTEL) {
      const cost = formatMoney(houseCost(space));
      buttons.push(
        <button
          key="build"
          className="secondary small"
          disabled={!canBuildHouse(game, space)}
          data-tutorial={`build-${space}`}
          onClick={() => dispatch({ type: 'BUILD_HOUSE', space })}
        >
          {own.houses === HOTEL - 1 ? t.buildHotel(cost) : t.buildHouse(cost)}
        </button>,
      );
    }
    if (own.houses > 0) {
      const refund = formatMoney(houseRefund(space));
      buttons.push(
        <button
          key="sell"
          className="secondary small"
          disabled={!canSellHouse(game, space)}
          onClick={() => dispatch({ type: 'SELL_HOUSE', space })}
        >
          {own.houses === HOTEL ? t.sellHotel(refund) : t.sellHouse(refund)}
        </button>,
      );
    }
  }

  if (own.mortgaged) {
    buttons.push(
      <button
        key="unmortgage"
        className="secondary small"
        disabled={!canUnmortgage(game, space)}
        onClick={() => dispatch({ type: 'UNMORTGAGE', space })}
      >
        {t.unmortgage(formatMoney(unmortgageCost(space)))}
      </button>,
    );
  } else {
    buttons.push(
      <button
        key="mortgage"
        className="secondary small"
        disabled={!canMortgage(game, space)}
        data-tutorial={`mortgage-${space}`}
        onClick={() => dispatch({ type: 'MORTGAGE', space })}
      >
        {t.mortgage(formatMoney(mortgageValue(space)))}
      </button>,
    );
  }

  return <div className="property-buttons">{buttons}</div>;
}

/** A small picture of the buildings on a property: green houses or one red hotel. */
// A house is a cottage with a red tile roof; a hotel is a đình (village hall) with upturned eaves.
const HOUSE = (
  <>
    <rect x="2.5" y="5.5" width="7" height="5.5" fill="#f6ecd4" />
    <path d="M0.8 6 L6 1.2 L11.2 6 Z" fill="#a3271f" />
    <rect x="5" y="7.6" width="2" height="3.4" fill="#2b2420" stroke="none" />
  </>
);
const DINH = (
  <>
    <rect x="4.5" y="7.5" width="15" height="5.5" fill="#d9ae4f" />
    <path d="M0.8 5.6 Q3 6.4 4.4 4.8 L8 1.4 H16 L19.6 4.8 Q21 6.4 23.2 5.6 L21 8 H3 Z" fill="#a3271f" />
    <path d="M8.5 8 V13 M12 8 V13 M15.5 8 V13" fill="none" strokeWidth="0.9" />
  </>
);

export function Buildings({ houses }: { houses: number }) {
  if (houses === 0) return null;
  const drawing = (kind: 'house' | 'hotel', key?: number) => (
    <svg
      key={key}
      className={`building ${kind}`}
      viewBox={kind === 'house' ? '0 0 12 12' : '0 0 24 14'}
      stroke="#2b2420"
      strokeWidth="1"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'house' ? HOUSE : DINH}
    </svg>
  );
  if (houses === HOTEL) return drawing('hotel');
  return <>{Array.from({ length: houses }, (_, i) => drawing('house', i))}</>;
}
