import { BOARD, JAIL_FINE } from '../data/board';
import { CARDS, DECK_NAMES } from '../data/cards';
import { dataLang, type UiLang } from '../data/text';
import { formatMoney } from '../engine/money';
import { FESTIVAL_BONUS, FESTIVAL_GIFT, FESTIVAL_LEVY, FESTIVAL_SHARE } from '../engine/rounds';
import type { Festival, GameState, LogEntry, TradeSide } from '../engine/types';
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
    case 'diceFumbled':
      return t.diceFumbled(name(entry.player), entry.how);
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
    case 'roundStarted':
      return t.roundStarted(entry.round);
    case 'festival':
      return t.festival(STRINGS[ui].festivalNames[entry.festival.id], festivalText(entry.festival, ui));
    case 'festivalGift':
      return t.festivalGift(formatMoney(entry.amount));
    case 'festivalBonus':
      return t.festivalBonus(name(entry.player), formatMoney(entry.amount), entry.reason);
    case 'festivalTaxFree':
      return t.festivalTaxFree(name(entry.player), space(entry.space));
    case 'festivalAmnesty':
      return t.festivalAmnesty(entry.players.map(name).join(', '));
    case 'festivalLevy':
      return t.festivalLevy(formatMoney(entry.total));
    case 'festivalShare':
      return t.festivalShare(name(entry.to), formatMoney(entry.total));
    case 'limitReached':
      return t.limitReached(entry.reason);
    case 'tetLiXi':
      return t.tetLiXi(name(entry.from), name(entry.to), formatMoney(entry.amount));
    case 'haggled':
      return t.haggled(name(entry.player), space(entry.space), formatMoney(entry.price), entry.won);
    case 'anVa':
      return t.anVa(name(entry.player), formatMoney(entry.forgiven));
    case 'jam':
      return t.jam(name(entry.player), space(entry.space), entry.remaining);
    case 'xeOm':
      return t.xeOm(name(entry.player), formatMoney(entry.fee));
    case 'buffaloArrived':
      return t.buffaloArrived(space(entry.space));
    case 'buffaloMet':
      return t.buffaloMet(name(entry.player));
    case 'buffaloLed':
      return t.buffaloLed(name(entry.player), formatMoney(entry.fee));
    case 'buffaloRide':
      return t.buffaloRide(name(entry.player), entry.steps);
    case 'missionDone':
      return t.missionDone(name(entry.player), STRINGS[ui].missions[entry.mission].name, formatMoney(entry.reward));
  }
}

/** What a festival does, e.g. "Rent on the Red set is doubled this round." */
export function festivalText(festival: Festival, ui: UiLang): string {
  const s = STRINGS[ui];
  return s.festivalEffect(festival.id, festival.group ? s.groupNames[festival.group] : '', {
    gift: formatMoney(FESTIVAL_GIFT),
    bonus: formatMoney(FESTIVAL_BONUS),
    levy: formatMoney(FESTIVAL_LEVY),
    share: formatMoney(FESTIVAL_SHARE),
  });
}
