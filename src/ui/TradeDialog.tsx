import { useState, type CSSProperties } from 'react';
import { BOARD } from '../data/board';
import { formatMoney } from '../engine/money';
import { canTradeSpace, tradeProblem } from '../engine/trading';
import type { Action, GameState, TradeOffer } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { holdingsOf } from './holdings';
import { Icon } from './icons';
import { groupFill, playerColor, spaceIcon } from './look';
import { parseMoney } from './moneyInput';
import { TokenIcon } from './TokenIcon';
import { useModalDialog } from './useModalDialog';

interface Props {
  game: GameState;
  dispatch: (action: Action) => void;
  onClose: () => void;
}

interface SideProps {
  game: GameState;
  player: number;
  selected: Set<number>;
  onToggle: (space: number) => void;
  cashText: string;
  onCashText: (text: string) => void;
  cards: number;
  onCards: (count: number) => void;
}

/** One column of the trade: what one player puts in (properties, jail cards and cash). */
function TradeSideEditor({ game, player, selected, onToggle, cashText, onCashText, cards, onCards }: SideProps) {
  const { t, lang } = useLang();
  const p = game.players[player];
  const holdings = holdingsOf(game, player);
  const cash = parseMoney(cashText);

  return (
    <section className="trade-side" style={{ '--player': playerColor(p) } as CSSProperties}>
      <h3>
        <TokenIcon token={p.token} color={playerColor(p)} size={24} />
        {t.sideGives(p.name)}
      </h3>

      {holdings.length === 0 && p.jailCards.length === 0 && <p className="muted">{t.noTradables}</p>}
      <ul className="trade-spaces">
        {holdings.flatMap((h) =>
          h.owned.map((space) => {
            const s = BOARD[space];
            const own = game.ownership[space];
            const tradable = canTradeSpace(game, space);
            return (
              <li key={space}>
                <label className={`trade-space${tradable ? '' : ' disabled'}`} data-tutorial={`trade-space-${space}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(space)}
                    disabled={!tradable}
                    onChange={() => onToggle(space)}
                  />
                  {s.kind === 'property' ? (
                    <span className="holding-swatch" style={{ background: groupFill(s.group) }} />
                  ) : (
                    <span className="holding-swatch icon">{spaceIcon(space)}</span>
                  )}
                  <span className="trade-space-name">{s.name[lang]}</span>
                  {own.mortgaged && <span className="mortgaged-tag">{t.mortgaged}</span>}
                  {!tradable && <span className="muted small-note">{t.setHasBuildings}</span>}
                </label>
              </li>
            );
          }),
        )}
        {/* Jail cards are all alike, so the boxes just count how many are offered. */}
        {p.jailCards.map((_, i) => (
          <li key={`card-${i}`}>
            <label className="trade-space">
              <input type="checkbox" checked={i < cards} onChange={(e) => onCards(e.target.checked ? i + 1 : i)} />
              <span className="holding-swatch icon">
                <Icon name="ticket" />
              </span>
              <span className="trade-space-name">{t.jailCardName}</span>
            </label>
          </li>
        ))}
      </ul>

      <label className="trade-cash">
        <span>{t.cashLabel}</span>
        <input
          value={cashText}
          placeholder={t.cashPlaceholder}
          inputMode="text"
          maxLength={10}
          className={cash === null ? 'invalid' : ''}
          aria-invalid={cash === null}
          onChange={(e) => onCashText(e.target.value)}
        />
        <span className="muted">
          {cash !== null && cash > 0 ? `= ${formatMoney(cash)} · ` : ''}
          {t.cashHas(formatMoney(p.cash))}
        </span>
      </label>
    </section>
  );
}

/** The current player builds an offer for another player. */
export function TradeDialog({ game, dispatch, onClose }: Props) {
  const { t } = useLang();
  const { dialogProps, close } = useModalDialog(onClose);
  const me = game.current;
  const partners = game.players.filter((p) => p.id !== me && !p.bankrupt);

  const [partner, setPartner] = useState(partners[0]?.id ?? -1);
  const [give, setGive] = useState<Set<number>>(new Set());
  const [take, setTake] = useState<Set<number>>(new Set());
  const [giveCash, setGiveCash] = useState('');
  const [takeCash, setTakeCash] = useState('');
  const [giveCards, setGiveCards] = useState(0);
  const [takeCards, setTakeCards] = useState(0);

  const toggle = (set: Set<number>, update: (s: Set<number>) => void) => (space: number) => {
    const next = new Set(set);
    if (next.has(space)) next.delete(space);
    else next.add(space);
    update(next);
  };

  const choosePartner = (id: number) => {
    setPartner(id);
    setTake(new Set()); // their properties differ
    setTakeCash('');
    setTakeCards(0);
  };

  const giveAmount = parseMoney(giveCash);
  const takeAmount = parseMoney(takeCash);
  const offer: TradeOffer | null =
    giveAmount === null || takeAmount === null
      ? null
      : {
          from: me,
          to: partner,
          give: { spaces: [...give], cash: giveAmount, jailCards: giveCards },
          take: { spaces: [...take], cash: takeAmount, jailCards: takeCards },
        };
  const problem = offer ? tradeProblem(game, offer) : 'badCash';
  const partnerName = game.players[partner]?.name ?? '';

  const send = () => {
    if (!offer || problem) return;
    dispatch({ type: 'PROPOSE_TRADE', offer });
    close();
  };

  return (
    <dialog {...dialogProps} className="trade-dialog" aria-labelledby="trade-title">
      <header className="trade-header" style={{ borderTopColor: playerColor(game.players[me]) }}>
        <h2 id="trade-title">🤝 {t.trade}</h2>
        {partners.length > 1 && (
          <div className="partner-picker" role="radiogroup" aria-label={t.tradeWith}>
            <span className="muted">{t.tradeWith}</span>
            {partners.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === partner}
                className={`partner${p.id === partner ? ' selected' : ''}`}
                style={{ '--player': playerColor(p) } as CSSProperties}
                onClick={() => choosePartner(p.id)}
              >
                <TokenIcon token={p.token} color={playerColor(p)} size={20} />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="trade-body">
        <div className="trade-columns">
          <TradeSideEditor
            game={game}
            player={me}
            selected={give}
            onToggle={toggle(give, setGive)}
            cashText={giveCash}
            onCashText={setGiveCash}
            cards={giveCards}
            onCards={setGiveCards}
          />
          <div className="trade-arrows" aria-hidden="true">
            ⇄
          </div>
          {partner >= 0 && (
            <TradeSideEditor
              key={partner}
              game={game}
              player={partner}
              selected={take}
              onToggle={toggle(take, setTake)}
              cashText={takeCash}
              onCashText={setTakeCash}
              cards={takeCards}
              onCards={setTakeCards}
            />
          )}
        </div>

        {problem && (
          // Nothing picked yet isn't an error, just a hint.
          <p className={problem === 'empty' ? 'muted' : 'form-error'} role={problem === 'empty' ? undefined : 'alert'}>
            {t.tradeProblems[problem]}
          </p>
        )}

        <div className="trade-actions">
          <button className="secondary" onClick={close}>
            {t.cancel}
          </button>
          <button className="primary" data-tutorial="sendOffer" disabled={problem !== null} onClick={send}>
            {t.sendOffer(partnerName)}
          </button>
        </div>
      </div>
    </dialog>
  );
}
