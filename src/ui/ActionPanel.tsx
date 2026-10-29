import { BOARD, isOwnable, JAIL_FINE } from '../data/board';
import { actingPlayer } from '../engine/buildings';
import { buyPrice, legalActions, whoseMove } from '../engine/game';
import { formatMoney } from '../engine/money';
import { canStartTrade } from '../engine/trading';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { Dice } from './Dice';
import { DrawnCard } from './DrawnCard';
import { Icon } from './icons';
import { describeLog } from './logText';
import { GROUP_COLORS, playerColor, spaceIcon } from './look';
import { TokenIcon } from './TokenIcon';
import { TradeOfferPanel } from './TradeOfferPanel';
import { useMayAct, useViewer } from './viewer';
import { WinnerPanel, type NextGame } from './WinnerPanel';

interface Props {
  game: GameState;
  dispatch: (action: Action) => void;
  onShowSpace: (index: number) => void;
  onManage: () => void;
  onTrade: () => void;
  next: NextGame;
  onSummary: () => void;
  busy: boolean; // a move is being animated: show only the turn and the dice
  rolling: boolean;
  fumbled?: boolean; // the dice rolled off the table first (just for show)
}

/** The middle of the board: whose turn it is, the dice, what just happened, and the buttons. */
export function ActionPanel({ game, dispatch, onShowSpace, onManage, onTrade, next, onSummary, busy, rolling, fumbled = false }: Props) {
  const { t, lang, uiLang } = useLang();
  const { phase } = game;
  const player = game.players[game.current];
  const allowed = legalActions(game);
  const actor = actingPlayer(game);
  const actorOwnsSomething = actor !== null && Object.values(game.ownership).some((o) => o.owner === actor);
  // Online, only the phone whose move it is gets the buttons; the others see who they're waiting for.
  const mayAct = useMayAct(game);
  const viewer = useViewer();
  const mine = viewer.online && viewer.seat === game.current;
  const waitingOn = whoseMove(game);

  // What happened since this turn started (most recent last).
  const turnStart = game.log.findLastIndex((e) => e.type === 'turnStarted');
  // The drawn card is shown on its own, so leave it out of this short list; with a card on show
  // (which tells most of the story) two lines are enough, so both fit on a small board.
  const events = game.log
    .slice(turnStart + 1)
    .filter((e) => e.type !== 'drewCard')
    .slice(game.lastCard ? -2 : -3);
  const waitingInJail = phase.kind === 'awaitRoll' && player.inJail;

  const offerSpace = phase.kind === 'awaitBuy' ? BOARD[phase.space] : null;
  const offer = offerSpace && isOwnable(offerSpace) ? offerSpace : null;

  const turnBanner = (
    <div className="turn-banner" style={{ color: playerColor(player) }}>
      <TokenIcon token={player.token} color={playerColor(player)} size={28} />
      <span>{mine ? t.yourTurn : t.turnOf(player.name)}</span>
    </div>
  );

  // While the dice tumble and the token hops, results and buttons wait until it arrives.
  if (busy) {
    return (
      <div className="action-panel" aria-busy="true">
        <div className="panel-top">
          {turnBanner}
          <Dice dice={game.dice} rolling={rolling} />
        </div>
        {fumbled && (
          <p className="dice-fumble" role="status">
            {t.diceFumble}
          </p>
        )}
      </div>
    );
  }

  if (phase.kind === 'tradeOffer') {
    return <TradeOfferPanel game={game} offer={phase.offer} dispatch={dispatch} onShowSpace={onShowSpace} />;
  }

  if (phase.kind === 'gameOver') {
    return <WinnerPanel game={game} winner={phase.winner} next={next} onSummary={onSummary} />;
  }

  return (
    <div className="action-panel">
      <div className="panel-top">
        {turnBanner}
        <Dice dice={game.dice} />
      </div>

      {game.lastCard && <DrawnCard deck={game.lastCard.deck} card={game.lastCard.card} />}

      {waitingInJail && (
        <div className="jail-box">
          <strong>
            <Icon name="jail" /> {t.inJailTitle(player.name)}
          </strong>
          <span>{t.jailAttempt(player.jailAttempts)}</span>
        </div>
      )}

      {events.length > 0 && (
        <ul className="turn-events" aria-live="polite">
          {events.map((e, i) => (
            <li key={i}>{describeLog(e, game, uiLang)}</li>
          ))}
        </ul>
      )}

      {phase.kind === 'awaitBuy' && offer && (
        <button
          className="offer"
          style={{ borderTopColor: offer.kind === 'property' ? GROUP_COLORS[offer.group] : 'var(--border)' }}
          onClick={() => onShowSpace(phase.space)}
        >
          <span className="offer-icon">{spaceIcon(phase.space)}</span>
          <span className="offer-name">{offer.name[lang]}</span>
          <span className="offer-price">
            {/* After haggling: the old price struck through, the new one beside it. */}
            {phase.price !== undefined && phase.price !== offer.price && <s className="offer-old-price">{formatMoney(offer.price)}</s>}
            {formatMoney(buyPrice(game))}
          </span>
        </button>
      )}

      {phase.kind === 'inDebt' && (
        <div className="debt">
          <strong>{t.debtTitle(game.players[phase.debtor].name, formatMoney(phase.amount))}</strong>
          <span>{t.debtHint(formatMoney(game.players[phase.debtor].cash))}</span>
        </div>
      )}

      {!mayAct && waitingOn !== null && (
        <p className="waiting-note">
          {game.players[waitingOn].bot ? t.botThinking(game.players[waitingOn].name) : t.waitingFor(game.players[waitingOn].name)}
        </p>
      )}

      {mayAct && (
        <div className="action-buttons">
          {allowed.includes('ROLL') && (
            <button className="primary big" data-tutorial="roll" onClick={() => dispatch({ type: 'ROLL' })} autoFocus>
              <Icon name="dice" />{' '}
              {waitingInJail ? t.rollForDoubles : game.dice && game.dice[0] === game.dice[1] ? t.rollAgain : t.roll}
            </button>
          )}
          {allowed.includes('PAY_JAIL_FINE') && (
            <button className="secondary" data-tutorial="payJailFine" onClick={() => dispatch({ type: 'PAY_JAIL_FINE' })}>
              {t.payJailFine(formatMoney(JAIL_FINE))}
            </button>
          )}
          {allowed.includes('USE_JAIL_CARD') && (
            <button className="secondary" onClick={() => dispatch({ type: 'USE_JAIL_CARD' })}>
              <Icon name="ticket" /> {t.useJailCard}
            </button>
          )}
          {offer && (
            <>
              {allowed.includes('BUY') ? (
                <button className="primary" data-tutorial="buy" onClick={() => dispatch({ type: 'BUY' })} autoFocus>
                  {t.buy(formatMoney(buyPrice(game)))}
                </button>
              ) : (
                <span className="muted">{t.cannotAfford}</span>
              )}
              {allowed.includes('HAGGLE') && (
                <button className="secondary" onClick={() => dispatch({ type: 'HAGGLE' })}>
                  <Icon name="handshake" /> {t.haggle}
                </button>
              )}
              <button className="secondary" onClick={() => dispatch({ type: 'DECLINE' })}>
                {t.skip}
              </button>
            </>
          )}
          {allowed.includes('PAY_DEBT') && phase.kind === 'inDebt' && (
            <button className="primary" onClick={() => dispatch({ type: 'PAY_DEBT' })}>
              {t.payDebt(formatMoney(phase.amount))}
            </button>
          )}
          {allowed.includes('AN_VA') && (
            <button className="primary" onClick={() => dispatch({ type: 'AN_VA' })}>
              {t.anVaButton}
            </button>
          )}
          {allowed.includes('DECLARE_BANKRUPTCY') && (
            <button
              className="danger"
              onClick={() => {
                if (window.confirm(t.confirmBankruptcy)) dispatch({ type: 'DECLARE_BANKRUPTCY' });
              }}
            >
              {t.declareBankruptcy}
            </button>
          )}
          {allowed.includes('END_TURN') && (
            <button className="primary big" data-tutorial="endTurn" onClick={() => dispatch({ type: 'END_TURN' })} autoFocus>
              {t.endTurn} →
            </button>
          )}
        </div>
      )}

      {mayAct && (actorOwnsSomething || canStartTrade(game)) && (
        <div className="side-actions">
          {actorOwnsSomething && (
            <button
              className={phase.kind === 'inDebt' && !allowed.includes('PAY_DEBT') ? 'primary' : 'secondary small'}
              data-tutorial="manage"
              onClick={onManage}
            >
              <Icon name="house" /> {t.manage}
            </button>
          )}
          {canStartTrade(game) && (
            <button className="secondary small" data-tutorial="trade" onClick={onTrade}>
              <Icon name="handshake" /> {t.trade}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
