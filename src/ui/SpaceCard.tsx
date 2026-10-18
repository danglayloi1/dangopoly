import { useEffect, useRef, type ReactNode } from 'react';
import { BOARD, START_SALARY, TRANSPORT_RENT } from '../data/board';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { GROUP_COLORS, PLAYER_COLORS, spaceIcon } from './look';

interface Props {
  index: number;
  game: GameState;
  onClose: () => void;
}

function Row({ label, value }: { label: ReactNode; value: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="num">{value}</td>
    </tr>
  );
}

/** A pop-up "title deed" with everything about one space. */
export function SpaceCard({ index, game, onClose }: Props) {
  const { t, lang } = useLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const space = BOARD[index];
  const own = game.ownership[index];
  const otherLang = lang === 'vi' ? 'en' : 'vi';

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const headerColor = space.kind === 'property' ? GROUP_COLORS[space.group] : 'var(--surface-2)';
  const icon = spaceIcon(index);

  let body: ReactNode;
  switch (space.kind) {
    case 'property':
      body = (
        <table className="deed-table">
          <tbody>
            <Row label={t.rent} value={formatMoney(space.rent[0])} />
            <Row label={t.rentFullSet} value={formatMoney(space.rent[0] * 2)} />
            {[1, 2, 3, 4].map((n) => (
              <Row key={n} label={t.rentHouses(n)} value={formatMoney(space.rent[n])} />
            ))}
            <Row label={t.rentHotel} value={formatMoney(space.rent[5])} />
            <Row label={t.houseCost} value={formatMoney(space.houseCost)} />
            <Row label={t.mortgageValue} value={formatMoney(space.price / 2)} />
          </tbody>
        </table>
      );
      break;
    case 'transport':
      body = (
        <table className="deed-table">
          <tbody>
            {TRANSPORT_RENT.map((rent, i) => (
              <Row key={i} label={t.transportRent(i + 1)} value={formatMoney(rent)} />
            ))}
            <Row label={t.mortgageValue} value={formatMoney(space.price / 2)} />
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
              <Row label={t.mortgageValue} value={formatMoney(space.price / 2)} />
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
      body = <p>{t.jailInfo}</p>;
      break;
    case 'rest':
      body = <p>{t.restInfo}</p>;
      break;
    case 'goToJail':
      body = <p>{t.goToJailInfo}</p>;
      break;
    case 'card':
      body = <p>{t.cardInfo}</p>;
      break;
  }

  const ownable = space.kind === 'property' || space.kind === 'transport' || space.kind === 'utility';

  return (
    <dialog
      ref={dialog}
      className="space-card"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current.close(); // click on the backdrop
      }}
      aria-labelledby="space-card-title"
    >
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
          <p className="deed-owner">
            {own ? (
              <>
                <span className="owner-dot" style={{ background: PLAYER_COLORS[own.owner] }} />
                {t.ownedBy(game.players[own.owner].name)}
              </>
            ) : (
              t.unowned
            )}
          </p>
        )}
        <button className="secondary" onClick={() => dialog.current?.close()} autoFocus>
          {t.close}
        </button>
      </div>
    </dialog>
  );
}
