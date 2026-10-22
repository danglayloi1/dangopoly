import { BOARD, JAIL_FINE } from '../data/board';
import { CARDS, DECK_NAMES } from '../data/cards';
import { dataLang, type UiLang } from '../data/text';
import { formatMoney } from '../engine/money';
import type { GameState, LogEntry, TradeSide } from '../engine/types';
import { STRINGS } from '../i18n/strings';

/** One side of a trade as text: "Hồ Kẻ Gỗ + Kỳ Anh + 500k", or "nothing". */
export function describeTradeSide(side: TradeSide, ui: UiLang): string {
  const parts = side.spaces.map((i) => BOARD[i].name[dataLang(ui)]);
  if (side.jailCards > 0) parts.push(STRINGS[ui].jailCards(side.jailCards));
  if (side.cash > 0) parts.push(formatMoney(side.cash));
  return parts.length > 0 ? parts.join(' + ') : STRINGS[ui].log.nothing;
}

/** One log entry as a sentence in the chosen language. */
export function describeLog(entry: LogEntry, state: GameState, ui: UiLang): string {
  const t = STRINGS[ui].log;
  const lang = dataLang(ui);
  const name = (id: number) => state.players[id].name;
  const space = (index: number) => BOARD[index].name[lang];

  switch (entry.type) {
    case 'turnStarted':
      return t.turnStarted(name(entry.player));
    case 'rolled':
      return t.rolled(name(entry.player), entry.dice[0], entry.dice[1]);
    case 'moved':
      return t.moved(name(entry.player), space(entry.to));
    case 'passedStart':
      return t.passedStart(name(entry.player), formatMoney(entry.amount));
    case 'bought':
      return t.bought(name(entry.player), space(entry.space), formatMoney(entry.price));
    case 'declined':
      return t.declined(name(entry.player), space(entry.space));
    case 'paidRent':
      return t.paidRent(name(entry.player), name(entry.to), formatMoney(entry.amount));
    case 'paidTax':
      return t.paidTax(name(entry.player), space(entry.space), formatMoney(entry.amount));
    case 'cannotPay':
      return t.cannotPay(name(entry.player), formatMoney(entry.amount));
    case 'builtHouse':
      return t.builtHouse(name(entry.player), space(entry.space), entry.houses, formatMoney(entry.cost));
    case 'soldHouse':
      return t.soldHouse(name(entry.player), space(entry.space), entry.houses, formatMoney(entry.refund));
    case 'mortgaged':
      return t.mortgaged(name(entry.player), space(entry.space), formatMoney(entry.amount));
    case 'unmortgaged':
      return t.unmortgaged(name(entry.player), space(entry.space), formatMoney(entry.amount));
    case 'tradeProposed':
    case 'tradeAccepted': {
      const { from, to, give, take } = entry.offer;
      const describe = entry.type === 'tradeProposed' ? t.tradeProposed : t.tradeAccepted;
      return describe(name(from), name(to), describeTradeSide(give, ui), describeTradeSide(take, ui));
    }
    case 'tradeRejected':
      return t.tradeRejected(name(entry.offer.from), name(entry.offer.to));
    case 'drewCard':
      return t.drewCard(name(entry.player), DECK_NAMES[entry.deck][lang], CARDS[entry.deck][entry.card].text[lang]);
    case 'cardCollected':
      return t.cardCollected(name(entry.player), formatMoney(entry.amount));
    case 'cardPaid':
      return t.cardPaid(name(entry.player), formatMoney(entry.amount));
    case 'paidEach':
      return t.paidEach(name(entry.player), formatMoney(entry.each));
    case 'collectedFromEach':
      return t.collectedFromEach(name(entry.player), formatMoney(entry.total));
    case 'wentToJail':
      return t.wentToJail(name(entry.player), entry.reason);
    case 'stayedInJail':
      return t.stayedInJail(name(entry.player), entry.attempt);
    case 'leftJail':
      return t.leftJail(name(entry.player), entry.how, formatMoney(JAIL_FINE));
    case 'bankrupt':
      return entry.creditor === null
        ? t.bankruptToBank(name(entry.player))
        : t.bankruptToPlayer(name(entry.player), name(entry.creditor));
    case 'won':
      return t.won(name(entry.player));
  }
}
