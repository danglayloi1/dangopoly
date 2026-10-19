// The interactive tutorial: a scripted first game against Lan, where every roll and card is fixed
// so that each lesson comes up in order. Tested end to end in tests/tutorial.test.ts.

import { CARDS, type CardDeck, type CardEffect } from '../data/cards';
import type { Lang, LocalText } from '../data/text';
import { createGame } from '../engine/game';
import type { Action, Dice, GameState } from '../engine/types';

export interface TutorialStep {
  id: string;
  title: LocalText;
  text: LocalText;
  /** Names of the `data-tutorial` elements to highlight. */
  targets?: string[];
  /** The action this step waits for. Without it, the step is read-only and has a "Next" button. */
  expect?: (action: Action) => boolean;
  /** Shown when the player does something else. */
  wrong?: LocalText;
  /** Dice to use when this step's action is a roll. */
  dice?: Dice;
  /** Actions played automatically when the step starts (Lan's turn, Lan accepting a trade). */
  auto?: Action[];
  /** A valid action for this step: used by the tests to walk through the whole tutorial. */
  example?: Action;
}

export const YOU = 0;
export const LAN = 1;

const is = (type: Action['type']) => (a: Action) => a.type === type;

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    title: { vi: 'Chào mừng đến Dangopoly!', en: 'Welcome to Dangopoly!' },
    text: {
      vi: 'Bạn chơi với Lan. Mỗi lượt gieo xúc xắc, đi quanh bàn cờ từ Hà Tĩnh qua cầu Bến Thủy đến Vinh, mua đất và thu tiền thuê. Ai còn trụ lại cuối cùng sẽ thắng. Lan đã có sẵn vài mảnh đất rồi.',
      en: 'You play against Lan. Each turn you roll, travel round the board from Hà Tĩnh across Bến Thủy bridge to Vinh, buy land and collect rent. The last player who isn’t bankrupt wins. Lan already owns a few places.',
    },
  },
  {
    id: 'roll',
    title: { vi: 'Gieo xúc xắc', en: 'Roll the dice' },
    text: { vi: 'Bấm nút Gieo xúc xắc. Quân cờ của bạn sẽ đi theo tổng hai xúc xắc.', en: 'Press Roll dice. Your token moves by the total of the two dice.' },
    targets: ['roll'],
    expect: is('ROLL'),
    dice: [1, 2],
    example: { type: 'ROLL' },
  },
  {
    id: 'buy',
    title: { vi: 'Mua đất', en: 'Buy land' },
    text: {
      vi: 'Bạn đến Lò kẹo cu đơ, chưa ai sở hữu. Mua nó với giá 600k! Ai dừng ở đây sau này sẽ phải trả tiền thuê cho bạn.',
      en: 'You landed on Cu Đơ Candy Workshop, which nobody owns. Buy it for 600k! Anyone who stops here later pays you rent.',
    },
    targets: ['buy'],
    expect: is('BUY'),
    example: { type: 'BUY' },
  },
  {
    id: 'trade',
    title: { vi: 'Giao dịch để đủ bộ màu', en: 'Trade to complete a set' },
    text: {
      vi: 'Bộ màu Nâu có 2 ô. Lan đang giữ ô còn lại: Vườn bưởi Phúc Trạch. Bấm Giao dịch, tích Vườn bưởi Phúc Trạch bên phía Lan, nhập tiền bạn trả (ví dụ 1tr) rồi gửi đề nghị.',
      en: 'The brown set has 2 places. Lan has the other one: Phúc Trạch Pomelo Gardens. Press Trade, tick Phúc Trạch Pomelo Gardens on Lan’s side, type what you’ll pay (say 1tr) and send the offer.',
    },
    targets: ['trade', 'trade-space-1', 'sendOffer'],
    expect: (a) =>
      a.type === 'PROPOSE_TRADE' &&
      a.offer.take.spaces.includes(1) &&
      !a.offer.give.spaces.includes(3) &&
      a.offer.give.cash <= 5_000_000,
    wrong: {
      vi: 'Hãy đề nghị lấy Vườn bưởi Phúc Trạch của Lan, giữ lại Lò kẹo cu đơ, và trả không quá 5tr.',
      en: 'Ask for Lan’s Phúc Trạch Pomelo Gardens, keep your Cu Đơ Candy Workshop, and offer at most 5tr.',
    },
    example: {
      type: 'PROPOSE_TRADE',
      offer: { from: YOU, to: LAN, give: { spaces: [], cash: 1_000_000, jailCards: 0 }, take: { spaces: [1], cash: 0, jailCards: 0 } },
    },
  },
  {
    id: 'traded',
    title: { vi: 'Lan đồng ý!', en: 'Lan accepts!' },
    text: {
      vi: 'Giờ bạn có đủ bộ Nâu ★. Đủ bộ thì tiền thuê gấp đôi, và bạn được xây nhà. (Khi chơi thật, hãy đưa máy cho người kia tự quyết định.)',
      en: 'You now own the whole brown set ★. A full set doubles the rent and lets you build houses. (In a real game, hand the device to the other player to decide.)',
    },
    auto: [{ type: 'ACCEPT_TRADE' }],
  },
  {
    id: 'build',
    title: { vi: 'Xây nhà', en: 'Build a house' },
    text: {
      vi: 'Bấm Quản lý tài sản rồi bấm “+ Nhà” ở một ô Nâu. Mỗi nhà làm tiền thuê tăng mạnh. Phải xây đều: ô này chỉ hơn ô kia tối đa 1 nhà.',
      en: 'Press Manage properties, then “+ House” on a brown place. Each house raises the rent a lot. Build evenly: one place may be at most 1 house ahead of the other.',
    },
    targets: ['manage', 'build-1', 'build-3'],
    expect: is('BUILD_HOUSE'),
    example: { type: 'BUILD_HOUSE', space: 3 },
  },
  {
    id: 'endTurn1',
    title: { vi: 'Kết thúc lượt', en: 'End your turn' },
    text: { vi: 'Xong việc rồi thì bấm Kết thúc lượt. (Đóng bảng tài sản trước nếu nó đang mở.)', en: 'All done: press End turn. (Close the property list first if it’s open.)' },
    targets: ['endTurn'],
    expect: is('END_TURN'),
    example: { type: 'END_TURN' },
  },
  {
    id: 'lanPaysRent',
    title: { vi: 'Lượt của Lan', en: 'Lan’s turn' },
    text: {
      vi: 'Lan dừng ở Lò kẹo cu đơ của bạn và phải trả tiền thuê! Nhìn số tiền nổi lên bên cạnh tên bạn.',
      en: 'Lan stops on your Cu Đơ Candy Workshop and has to pay you rent! Watch the money float up next to your name.',
    },
    auto: [{ type: 'ROLL', dice: [1, 2] }, { type: 'END_TURN' }],
  },
  {
    id: 'rollCard',
    title: { vi: 'Lượt của bạn', en: 'Your turn' },
    text: { vi: 'Gieo xúc xắc lần nữa.', en: 'Roll again.' },
    targets: ['roll'],
    expect: is('ROLL'),
    dice: [1, 3],
    example: { type: 'ROLL' },
  },
  {
    id: 'card',
    title: { vi: 'Thẻ Cơ hội', en: 'A Chance card' },
    text: {
      vi: 'Ô Cơ hội và Khí vận cho bạn rút một thẻ. Thẻ này đưa bạn đến Cảng Vũng Áng của Lan, và bạn trả gấp đôi tiền thuê. Không phải thẻ nào cũng may mắn!',
      en: 'Chance and Community Chest spaces make you draw a card. This one sent you to Lan’s Vũng Áng Port, and you paid double rent. Not every card is lucky!',
    },
  },
  {
    id: 'endTurn2',
    title: { vi: 'Kết thúc lượt', en: 'End your turn' },
    text: { vi: 'Bấm Kết thúc lượt.', en: 'Press End turn.' },
    targets: ['endTurn'],
    expect: is('END_TURN'),
    example: { type: 'END_TURN' },
  },
  {
    id: 'lanTurn2',
    title: { vi: 'Lượt của Lan', en: 'Lan’s turn' },
    text: { vi: 'Lan đi đến đất của chính mình nên không mất tiền.', en: 'Lan lands on her own place, so she pays nothing.' },
    auto: [{ type: 'ROLL', dice: [2, 4] }, { type: 'END_TURN' }],
  },
  {
    id: 'rollJail',
    title: { vi: 'Lượt của bạn', en: 'Your turn' },
    text: { vi: 'Gieo xúc xắc.', en: 'Roll the dice.' },
    targets: ['roll'],
    expect: is('ROLL'),
    dice: [1, 1],
    example: { type: 'ROLL' },
  },
  {
    id: 'jail',
    title: { vi: 'Vào nhà tạm giữ!', en: 'Off to Jail!' },
    text: {
      vi: 'Thẻ Khí vận đưa bạn vào nhà tạm giữ. Dù vừa đổ đôi, lượt vẫn kết thúc. Ở trong vẫn thu được tiền thuê. Ngoài thẻ này, ô “Vào nhà tạm giữ” hoặc đổ đôi 3 lần liền cũng đưa bạn vào đây.',
      en: 'The Community Chest card sent you to Jail. Even though you rolled doubles, your turn ends. You still collect rent inside. The “Go to Jail” corner and rolling doubles 3 times in a row send you here too.',
    },
  },
  {
    id: 'endTurn3',
    title: { vi: 'Kết thúc lượt', en: 'End your turn' },
    text: { vi: 'Bấm Kết thúc lượt.', en: 'Press End turn.' },
    targets: ['endTurn'],
    expect: is('END_TURN'),
    example: { type: 'END_TURN' },
  },
  {
    id: 'lanTurn3',
    title: { vi: 'Lượt của Lan', en: 'Lan’s turn' },
    text: {
      vi: 'Lan không mua Nhiệt điện Vũng Áng. Không bắt buộc phải mua mọi thứ: muốn bỏ qua thì bấm Bỏ qua.',
      en: 'Lan doesn’t buy Vũng Áng Power Plant. You don’t have to buy everything: press Skip to pass.',
    },
    auto: [{ type: 'ROLL', dice: [1, 2] }, { type: 'DECLINE' }, { type: 'END_TURN' }],
  },
  {
    id: 'payFine',
    title: { vi: 'Ra khỏi nhà tạm giữ', en: 'Getting out of Jail' },
    text: {
      vi: 'Có 3 cách ra: gieo được đôi, nộp 500k, hoặc dùng thẻ Ra tù miễn phí. Lần này hãy nộp 500k.',
      en: 'There are 3 ways out: roll doubles, pay 500k, or use a Get Out of Jail Free card. This time, pay 500k.',
    },
    targets: ['payJailFine'],
    expect: is('PAY_JAIL_FINE'),
    example: { type: 'PAY_JAIL_FINE' },
  },
  {
    id: 'rollAfterJail',
    title: { vi: 'Tự do rồi!', en: 'Free!' },
    text: { vi: 'Giờ gieo xúc xắc như bình thường.', en: 'Now roll as usual.' },
    targets: ['roll'],
    expect: is('ROLL'),
    dice: [1, 3],
    example: { type: 'ROLL' },
  },
  {
    id: 'buy2',
    title: { vi: 'Mua thêm', en: 'Buy another one' },
    text: { vi: 'Hồng Lĩnh giá 1tr6. Mua luôn!', en: 'Hồng Lĩnh costs 1tr6. Buy it!' },
    targets: ['buy'],
    expect: is('BUY'),
    example: { type: 'BUY' },
  },
  {
    id: 'mortgage',
    title: { vi: 'Cầm cố khi cần tiền', en: 'Mortgage when you need cash' },
    text: {
      vi: 'Khi thiếu tiền, bạn có thể cầm cố đất để nhận một nửa giá, nhưng đất cầm cố không thu tiền thuê. Mở Quản lý tài sản và bấm “Cầm cố” ở Hồng Lĩnh. Chuộc lại sau với giá thêm 10%.',
      en: 'When you’re short of cash, mortgage a place for half its price, but it earns no rent while mortgaged. Open Manage properties and press “Mortgage” on Hồng Lĩnh. Lift it later for 10% more.',
    },
    targets: ['manage', 'mortgage-14'],
    expect: is('MORTGAGE'),
    example: { type: 'MORTGAGE', space: 14 },
  },
  {
    id: 'done',
    title: { vi: 'Bạn đã sẵn sàng! 🎉', en: 'You’re ready! 🎉' },
    text: {
      vi: 'Vậy là đủ để chơi rồi. Hết tiền mà không bán nhà hay cầm cố đủ để trả nợ thì phá sản; người cuối cùng còn lại sẽ thắng. Chơi tiếp ván này, hay bắt đầu một ván thật với bạn bè?',
      en: 'That’s all you need to play. If you can’t pay even after selling houses and mortgaging, you go bankrupt; the last player left wins. Keep playing this game, or start a real one with friends?',
    },
  },
];

function cardIndex(deck: CardDeck, match: (e: CardEffect) => boolean): number {
  return CARDS[deck].findIndex((c) => match(c.effect));
}

/** The tutorial's starting position: Lan already owns three places, and the right cards are on top. */
export function createTutorialGame(lang: Lang): GameState {
  const game = createGame({
    players: [
      { name: lang === 'vi' ? 'Bạn' : 'You', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
    ],
    seed: 2026,
  });
  for (const space of [1, 9, 15]) game.ownership[space] = { owner: LAN, houses: 0, mortgaged: false };

  const putOnTop = (deck: CardDeck, card: number) => {
    game.decks[deck] = [card, ...game.decks[deck].filter((c) => c !== card)];
  };
  putOnTop('chance', cardIndex('chance', (e) => e.kind === 'advanceToNearest' && e.target === 'transport'));
  putOnTop('community', cardIndex('community', (e) => e.kind === 'goToJail'));
  return game;
}

/** The action to really play: rolls in the tutorial use the step's dice. */
export function scriptedAction(step: TutorialStep, action: Action): Action {
  return action.type === 'ROLL' && step.dice ? { type: 'ROLL', dice: step.dice } : action;
}
