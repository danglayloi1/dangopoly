import { BOARD, isOwnable, JAIL_FINE } from '../data/board';
import { actingPlayer } from '../engine/buildings';
import { legalActions } from '../engine/game';
import { formatMoney } from '../engine/money';
import { canStartTrade } from '../engine/trading';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { Dice } from './Dice';
import { DrawnCard } from './DrawnCard';
import { describeLog } from './logText';
import { GROUP_COLORS, PLAYER_COLORS, spaceIcon } from './look';
import { TokenIcon } from './TokenIcon';
import { TradeOfferPanel } from './TradeOfferPanel';

interface Props {
  game: GameState;
  dispatch: (action: Action) => void;
  onShowSpace: (index: number) => void;
  onManage: () => void;
  onTrade: () => void;
  onNewGame: () => void;
  busy: boolean; // a move is being animated: show only the turn and the dice
  rolling: boolean;
}

/** The middle of the board: whose turn it is, the dice, what just happened, and the buttons. */
export function ActionPanel({ game, dispatch, onShowSpace, onManage, onTrade, onNewGame, busy, rolling }: Props) {
  const { t, lang } = useLang();
  const { phase } = game;
  const player = game.players[game.current];
  const allowed = legalActions(game);
  const actor = actingPlayer(game);
  const actorOwnsSomething = actor !== null && Object.values(game.ownership).some((o) => o.owner === actor);

  // What happened since this turn started (most recent last).
  const turnStart = game.log.findLastIndex((e) => e.type === 'turnStarted');
  // The drawn card is shown on its own, so leave it out of this short list.
  const events = game.log
    .slice(turnStart + 1)
    .filter((e) => e.type !== 'drewCard')
    .slice(-3);
  const waitingInJail = phase.kind === 'awaitRoll' && player.inJail;

  const offerSpace = phase.kind === 'awaitBuy' ? BOARD[phase.space] : null;
  const offer = offerSpace && isOwnable(offerSpace) ? offerSpace : null;

  const turnBanner = (
    <div className="turn-banner" style={{ color: PLAYER_COLORS[player.id] }}>
      <TokenIcon token={player.token} color={PLAYER_COLORS[player.id]} size={28} />
      <span>{t.turnOf(player.name)}</span>
    </div>
  );

  // While the dice tumble and the token hops, results and buttons wait until it arrives.
  if (busy) {
    return (
      <div className="action-panel" aria-busy="true">
        {turnBanner}
        <Dice dice={game.dice} rolling={rolling} />
      </div>
    );
  }

  if (phase.kind === 'tradeOffer') {
    return <TradeOfferPanel game={game} offer={phase.offer} dispatch={dispatch} onShowSpace={onShowSpace} />;
  }

  if (phase.kind === 'gameOver') {
    const winner = game.players[phase.winner];
    return (
      <div className="action-panel">
        <div className="winner">
          <TokenIcon token={winner.token} color={PLAYER_COLORS[winner.id]} size={64} />
          <p className="winner-text">🏆 {t.winner(winner.name)}</p>
        </div>
        <button className="primary big" onClick={onNewGame}>
          {t.playAgain}
        </button>
      </div>
    );
  }

  return (
    <div className="action-panel">
      {turnBanner}

      <Dice dice={game.dice} />

      {game.lastCard && <DrawnCard deck={game.lastCard.deck} card={game.lastCard.card} />}

      {waitingInJail && (
        <div className="jail-box">
          <strong>🔒 {t.inJailTitle(player.name)}</strong>
          <span>{t.jailAttempt(player.jailAttempts)}</span>
        </div>
      )}

      {events.length > 0 && (
        <ul className="turn-events" aria-live="polite">
          {events.map((e, i) => (
            <li key={i}>{describeLog(e, game, lang)}</li>
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
          <span className="offer-price">{formatMoney(offer.price)}</span>
        </button>
      )}

      {phase.kind === 'inDebt' && (
        <div className="debt">
          <strong>{t.debtTitle(game.players[phase.debtor].name, formatMoney(phase.amount))}</strong>
          <span>{t.debtHint(formatMoney(game.players[phase.debtor].cash))}</span>
        </div>
      )}

      <div className="action-buttons">
        {allowed.includes('ROLL') && (
          <button className="primary big" onClick={() => dispatch({ type: 'ROLL' })} autoFocus>
            🎲{' '}
            {waitingInJail ? t.rollForDoubles : game.dice && game.dice[0] === game.dice[1] ? t.rollAgain : t.roll}
          </button>
        )}
        {allowed.includes('PAY_JAIL_FINE') && (
          <button className="secondary" onClick={() => dispatch({ type: 'PAY_JAIL_FINE' })}>
            {t.payJailFine(formatMoney(JAIL_FINE))}
          </button>
        )}
        {allowed.includes('USE_JAIL_CARD') && (
          <button className="secondary" onClick={() => dispatch({ type: 'USE_JAIL_CARD' })}>
            🎫 {t.useJailCard}
          </button>
        )}
        {offer && (
          <>
            {allowed.includes('BUY') ? (
              <button className="primary" onClick={() => dispatch({ type: 'BUY' })} autoFocus>
                {t.buy(formatMoney(offer.price))}
              </button>
            ) : (
              <span className="muted">{t.cannotAfford}</span>
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
          <button className="primary big" onClick={() => dispatch({ type: 'END_TURN' })} autoFocus>
            {t.endTurn} →
          </button>
        )}
      </div>

      {(actorOwnsSomething || canStartTrade(game)) && (
        <div className="side-actions">
          {actorOwnsSomething && (
            <button
              className={phase.kind === 'inDebt' && !allowed.includes('PAY_DEBT') ? 'primary' : 'secondary small'}
              onClick={onManage}
            >
              🏠 {t.manage}
            </button>
          )}
          {canStartTrade(game) && (
            <button className="secondary small" onClick={onTrade}>
              🤝 {t.trade}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
