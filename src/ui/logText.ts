import { BOARD } from '../data/board';
import type { Lang } from '../data/text';
import { formatMoney } from '../engine/money';
import type { GameState, LogEntry } from '../engine/types';
import { STRINGS } from '../i18n/strings';

/** One log entry as a sentence in the chosen language. */
export function describeLog(entry: LogEntry, state: GameState, lang: Lang): string {
  const t = STRINGS[lang].log;
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
    case 'bankrupt':
      return entry.creditor === null
        ? t.bankruptToBank(name(entry.player))
        : t.bankruptToPlayer(name(entry.player), name(entry.creditor));
    case 'won':
      return t.won(name(entry.player));
  }
}
