// What computer players say: each has a personality and reacts, in Nghệ dialect (or English), to
// what just happened to it. Pure functions, tested: the screen shows the lines (see BotTalk.tsx); kept apart from it because file names here ignore case.

import type { GameState, LogEntry, Player } from '../engine/types';

export type Personality = 'boastful' | 'stingy' | 'jumpy' | 'kind';

export type TalkEvent =
  | 'bankrupt'
  | 'won'
  | 'jailed'
  | 'tradeYes'
  | 'tradeNo'
  | 'paidRent'
  | 'gotRent'
  | 'bought'
  | 'built'
  | 'doubles'
  | 'leftJail';

/** The four bot nicknames each have a character; a renamed bot gets one by its seat. */
const BY_NAME: Record<string, Personality> = { 'Cu Đơ': 'boastful', Hến: 'stingy', Nhút: 'jumpy', Bưởi: 'kind' };
const ORDER: Personality[] = ['boastful', 'stingy', 'jumpy', 'kind'];

export function personalityOf(player: Player): Personality {
  return BY_NAME[player.name] ?? ORDER[player.id % ORDER.length];
}

type Lines = Record<TalkEvent, { vi: string[]; en: string[] }>;

/** vi lines are in Nghệ dialect on purpose: it's how these characters talk. */
export const LINES: Record<Personality, Lines> = {
  // Cu Đơ: sure of himself, loves to show off
  boastful: {
    bought: { vi: ['Mua luôn! Đất ni là của tau.', 'Ngon lành, thêm miếng đất nữa!', 'Có tiền là phải mua, chơ răng!'], en: ['Bought it! This land is mine now.', 'Lovely, another plot for me!', 'Got money? Buy land. Simple.'] },
    gotRent: { vi: ['Trả tiền cho tau đi mi ơi!', 'Cảm ơn nha, lần sau ghé nữa hè!', 'Tiền về túi tau rồi.'], en: ['Pay up, friend!', 'Thanks! Do come again!', 'Straight into my pocket.'] },
    paidRent: { vi: ['Ít thôi mà, tau giàu lắm.', 'Trả thì trả, có chi mô.'], en: ["Pocket change. I'm rich.", 'Fine, fine, no big deal.'] },
    jailed: { vi: ['Vô đây nghỉ mệt chút thôi.', 'Tau vô đây chơi cho biết!'], en: ['Just taking a little rest.', "I'm only here to see what it's like!"] },
    leftJail: { vi: ['Tau ra rồi, tránh đường!'], en: ["I'm out, make way!"] },
    doubles: { vi: ['Đổ đôi! Tay tau vàng thiệt!'], en: ['Doubles! Golden hands!'] },
    built: { vi: ['Xây nhà to nhất xóm!', 'Nhà tau cao hơn nhà mi.'], en: ['Biggest house on the street!', 'My house is taller than yours.'] },
    won: { vi: ['Tau nói rồi mà, tau thắng!'], en: ['Told you so. I win!'] },
    bankrupt: { vi: ['Răng lại rứa được hè…'], en: ['How did this even happen…'] },
    tradeYes: { vi: ['Chốt! Mi hời rồi đó.'], en: ['Deal! You got lucky.'] },
    tradeNo: { vi: ['Nỏ đổi! Tau khôn lắm.'], en: ["No deal! I'm too clever for that."] },
  },
  // Hến: counts every đồng
  stingy: {
    bought: { vi: ['Mắc quá… nhưng thôi, mua.', 'Tiền ơi, tạm biệt mi.'], en: ['So pricey… fine, I’ll buy.', 'Goodbye, my dear money.'] },
    gotRent: { vi: ['Đếm lại coi đủ chưa nờ.', 'Thiếu một đồng tau cũng nỏ chịu.'], en: ["Let me count that again.", "Not a đồng short, mind you."] },
    paidRent: { vi: ['Răng mắc rứa trời!', 'Lấy ít thôi, tau nghèo lắm.', 'Trả tiền mà đau cả ruột.'], en: ['Why so expensive?!', "Take less, I'm poor.", 'Paying hurts my soul.'] },
    jailed: { vi: ['Ở trong ni khỏi tốn tiền thuê, cũng được.'], en: ['No rent in here. Not bad.'] },
    leftJail: { vi: ['Ra rồi, mà tiếc cấy chỗ ở miễn phí.'], en: ['Out. I’ll miss the free room.'] },
    doubles: { vi: ['Đổ đôi mà nỏ được thêm đồng mô.'], en: ["Doubles, and still not a đồng more."] },
    built: { vi: ['Xây cấy chòi nhỏ thôi, tiết kiệm.'], en: ['Just a small hut. Saving money.'] },
    won: { vi: ['Tiết kiệm là thắng, thấy chưa!'], en: ['Saving wins. See?'] },
    bankrupt: { vi: ['Tiền tau… tiền tau đi mô hết rồi…'], en: ['My money… where did it all go…'] },
    tradeYes: { vi: ['Được, nhưng mi đừng đổi ý nha.'], en: ["Fine. No backing out."] },
    tradeNo: { vi: ['Rẻ rứa ai mà bán!'], en: ['That cheap? Never!'] },
  },
  // Nhút: scared of everything
  jumpy: {
    bought: { vi: ['Mua rồi… có sai không hè?', 'Thôi kệ, mua liều!'], en: ['Bought it… was that a mistake?', 'Oh well, risking it!'] },
    gotRent: { vi: ['Ơ, tau được tiền thiệt à?'], en: ['Wait, I actually got paid?'] },
    paidRent: { vi: ['Thôi chết rồi!', 'Mệ ơi, mất tiền rồi!'], en: ['Oh no!', 'Mum! My money!'] },
    jailed: { vi: ['Mệ ơi! Cứu tui với!', 'Tau vô tội mà!'], en: ['Mum! Help me!', "I'm innocent!"] },
    leftJail: { vi: ['Phù… thoát rồi.'], en: ['Phew… free at last.'] },
    doubles: { vi: ['Đổ đôi! Tim tau muốn rớt ra ngoài.'], en: ['Doubles! My heart nearly jumped out.'] },
    built: { vi: ['Xây nhà… mong đừng ai tới.'], en: ['Built a house… please nobody come.'] },
    won: { vi: ['Tau… tau thắng thiệt à?!'], en: ['I… I actually won?!'] },
    bankrupt: { vi: ['Biết ngay mà! Hu hu…'], en: ['I knew it! Waaah…'] },
    tradeYes: { vi: ['Ừ… ừ thì đổi.'], en: ['Um… okay, deal.'] },
    tradeNo: { vi: ['Thôi, tau sợ bị lừa lắm.'], en: ["No, I'm scared of being tricked."] },
  },
  // Bưởi: kind to everyone
  kind: {
    bought: { vi: ['Mua miếng đất trồng bưởi.', 'Đất đẹp ghê.'], en: ['A nice plot for my pomelo trees.', 'What a pretty place.'] },
    gotRent: { vi: ['Ngại quá, cảm ơn mi nha.'], en: ['Oh, thank you, how kind.'] },
    paidRent: { vi: ['Thôi, cho mi đó.', 'Tiền đi rồi tiền lại về.'], en: ['Here, take it.', 'Money comes and goes.'] },
    jailed: { vi: ['Ở trong ni cũng mát.'], en: ["It's quite cool in here."] },
    leftJail: { vi: ['Ra rồi, chào cả nhà!'], en: ['Out again, hello everyone!'] },
    doubles: { vi: ['Hên ghê!'], en: ['How lucky!'] },
    built: { vi: ['Xây nhà cho cả xóm ở.'], en: ['A house for the whole village.'] },
    won: { vi: ['Thắng rồi, mời cả nhà ăn bưởi!'], en: ['I won! Pomelos for everyone!'] },
    bankrupt: { vi: ['Thôi, chơi vui là chính.'], en: ['Oh well, it’s all for fun.'] },
    tradeYes: { vi: ['Đổi đi, giúp nhau mà.'], en: ['Sure, we help each other.'] },
    tradeNo: { vi: ['Xin lỗi nha, cấy ni tau thương lắm.'], en: ["Sorry, I'm too fond of that one."] },
  },
};

/** Most important first: a bot says one thing per move, about the biggest thing that happened. */
const PRIORITY: TalkEvent[] = ['bankrupt', 'won', 'jailed', 'tradeYes', 'tradeNo', 'paidRent', 'gotRent', 'leftJail', 'bought', 'built', 'doubles'];
/** Small things are only remarked on now and then. */
const SOMETIMES: TalkEvent[] = ['bought', 'built', 'doubles', 'gotRent', 'leftJail'];

export interface Talk {
  player: number;
  event: TalkEvent;
  text: string;
}

/** A number from 0 to 1 that depends only on the inputs (so every replay says the same). */
function chance(...parts: number[]): number {
  let h = 2166136261;
  for (const p of parts) h = Math.imul(h ^ p, 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 0x1_0000_0000; // >>> 0: XOR gives a signed number
}

/** What the bots say about the new log entries: at most one line each. */
export function botTalk(entries: readonly LogEntry[], game: GameState, lang: 'vi' | 'en'): Talk[] {
  const events = new Map<number, Set<TalkEvent>>();
  const add = (player: number, event: TalkEvent) => {
    if (!game.players[player]?.bot) return;
    if (!events.has(player)) events.set(player, new Set());
    events.get(player)!.add(event);
  };
  for (const e of entries) {
    switch (e.type) {
      case 'bought':
        add(e.player, 'bought');
        break;
      case 'paidRent':
        add(e.player, 'paidRent');
        add(e.to, 'gotRent');
        break;
      case 'wentToJail':
        add(e.player, 'jailed');
        break;
      case 'leftJail':
        add(e.player, 'leftJail');
        break;
      case 'rolled':
        if (e.dice[0] === e.dice[1]) add(e.player, 'doubles');
        break;
      case 'builtHouse':
        add(e.player, 'built');
        break;
      case 'won':
        add(e.player, 'won');
        break;
      case 'bankrupt':
        add(e.player, 'bankrupt');
        break;
      case 'tradeAccepted':
        add(e.offer.to, 'tradeYes');
        break;
      case 'tradeRejected':
        add(e.offer.to, 'tradeNo');
        break;
    }
  }

  const talks: Talk[] = [];
  for (const [player, happened] of events) {
    const event = PRIORITY.find((p) => happened.has(p))!;
    if (SOMETIMES.includes(event) && chance(game.log.length, player, PRIORITY.indexOf(event)) < 0.5) continue;
    const lines = LINES[personalityOf(game.players[player])][event][lang];
    const pick = Math.floor(chance(game.log.length, player, 99) * lines.length);
    talks.push({ player, event, text: lines[pick] });
  }
  return talks;
}
