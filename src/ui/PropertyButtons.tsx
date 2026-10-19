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
export function Buildings({ houses }: { houses: number }) {
  if (houses === 0) return null;
  if (houses === HOTEL) return <span className="building hotel" aria-hidden="true" />;
  return (
    <>
      {Array.from({ length: houses }, (_, i) => (
        <span key={i} className="building house" aria-hidden="true" />
      ))}
    </>
  );
}
