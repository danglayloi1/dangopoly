import type { ReactNode } from 'react';
import { BOARD, JAIL_FINE, START_SALARY, TRANSPORT_RENT } from '../data/board';
import { DECK_NAMES } from '../data/cards';
import { mortgageValue } from '../engine/buildings';
import { formatMoney } from '../engine/money';
import { ownsWholeGroup } from '../engine/rent';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { GROUP_COLORS, PLAYER_COLORS, spaceIcon } from './look';
import { Buildings, PropertyButtons } from './PropertyButtons';
import { useModalDialog } from './useModalDialog';

interface Props {
  index: number;
  game: GameState;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

function Row({ label, value, current = false }: { label: ReactNode; value: string; current?: boolean }) {
  return (
    <tr className={current ? 'current' : undefined}>
      <td>{label}</td>
      <td className="num">{value}</td>
    </tr>
  );
}

/** A pop-up "title deed" with everything about one space, and buttons to manage it if it's yours. */
export function SpaceCard({ index, game, dispatch, onClose }: Props) {
  const { t, lang } = useLang();
  const { dialogProps, close } = useModalDialog(onClose);
  const space = BOARD[index];
  const own = game.ownership[index];
  const otherLang = lang === 'vi' ? 'en' : 'vi';

  const headerColor = space.kind === 'property' ? GROUP_COLORS[space.group] : 'var(--surface-2)';
  const icon = spaceIcon(index);

  // Which rent row applies right now: base, full set, 1–4 houses, or hotel (-1: none / mortgaged).
  let currentRentRow = -1;
  if (own && !own.mortgaged) {
    if (space.kind === 'property') {
      currentRentRow = own.houses > 0 ? own.houses + 1 : ownsWholeGroup(game, own.owner, index) ? 1 : 0;
    } else if (space.kind === 'transport') {
      currentRentRow = BOARD.filter((s, i) => s.kind === 'transport' && game.ownership[i]?.owner === own.owner).length - 1;
    }
  }

  let body: ReactNode;
  switch (space.kind) {
    case 'property':
      body = (
        <table className="deed-table">
          <tbody>
            <Row label={t.rent} value={formatMoney(space.rent[0])} current={currentRentRow === 0} />
            <Row label={t.rentFullSet} value={formatMoney(space.rent[0] * 2)} current={currentRentRow === 1} />
            {[1, 2, 3, 4].map((n) => (
              <Row key={n} label={t.rentHouses(n)} value={formatMoney(space.rent[n])} current={currentRentRow === n + 1} />
            ))}
            <Row label={t.rentHotel} value={formatMoney(space.rent[5])} current={currentRentRow === 6} />
            <Row label={t.houseCost} value={formatMoney(space.houseCost)} />
            <Row label={t.mortgageValue} value={formatMoney(mortgageValue(index))} />
          </tbody>
        </table>
      );
      break;
    case 'transport':
      body = (
        <table className="deed-table">
          <tbody>
            {TRANSPORT_RENT.map((rent, i) => (
              <Row key={i} label={t.transportRent(i + 1)} value={formatMoney(rent)} current={currentRentRow === i} />
            ))}
            <Row label={t.mortgageValue} value={formatMoney(mortgageValue(index))} />
          </tbody>
        </table>
      );
      break;
    case 'utility':
      body = (
        <>
          <p>{t.utilityRent1}</p>
          <p>{t.utilityRent2}</p>
          <table className="deed-table">
            <tbody>
              <Row label={t.mortgageValue} value={formatMoney(mortgageValue(index))} />
            </tbody>
          </table>
        </>
      );
      break;
    case 'tax':
      body = <p>{t.taxPay(formatMoney(space.amount))}</p>;
      break;
    case 'start':
      body = <p>{t.startInfo(formatMoney(START_SALARY))}</p>;
      break;
    case 'jail':
      body = <p>{t.jailInfo(formatMoney(JAIL_FINE))}</p>;
      break;
    case 'rest':
      body = <p>{t.restInfo}</p>;
      break;
    case 'goToJail':
      body = <p>{t.goToJailInfo}</p>;
      break;
    case 'card':
      body = <p>{t.cardInfo(DECK_NAMES[space.deck][lang])}</p>;
      break;
  }

  const ownable = space.kind === 'property' || space.kind === 'transport' || space.kind === 'utility';

  return (
    <dialog {...dialogProps} className="space-card" aria-labelledby="space-card-title">
      <div className="deed-header" style={{ borderTopColor: headerColor }}>
        {icon && <span className="deed-icon">{icon}</span>}
        <h2 id="space-card-title">{space.name[lang]}</h2>
        {space.name[otherLang] !== space.name[lang] && <p className="deed-subtitle">{space.name[otherLang]}</p>}
      </div>
      <div className="deed-body">
        {ownable && (
          <p className="deed-price">
            {t.price}: <strong>{formatMoney(space.price)}</strong>
          </p>
        )}
        {body}
        {ownable && (
          <div className="deed-owner">
            {own ? (
              <>
                <span className="owner-dot" style={{ background: PLAYER_COLORS[own.owner] }} />
                {t.ownedBy(game.players[own.owner].name)}
                {own.mortgaged && <span className="mortgaged-tag">{t.mortgaged}</span>}
                {own.houses > 0 && (
                  <span className="buildings-inline" title={t.buildings(own.houses)}>
                    <Buildings houses={own.houses} />
                  </span>
                )}
              </>
            ) : (
              t.unowned
            )}
          </div>
        )}
        <PropertyButtons game={game} space={index} dispatch={dispatch} />
        <button className="secondary" onClick={close} autoFocus>
          {t.close}
        </button>
      </div>
    </dialog>
  );
}
