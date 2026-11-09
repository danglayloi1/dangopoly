// Crazy Eights' guided first game: you against Cu Đơ, dealt (and the deck stacked) so every lesson
// comes up: following the number, the suit, a queen, a 2, drawing, and an 8 to go out.

import type { Lesson } from '../lesson';
import { parseCard, parseCards, suitOf } from '../tienlen/cards';
import { applyEights, createEights, type EightsAction, type EightsState } from './game';

const play = (card: string): EightsAction => ({ type: 'PLAY', card: parseCard(card) });
const DRAW: EightsAction = { type: 'DRAW' };

export const EIGHTS_LESSON: Lesson<EightsState, EightsAction> = {
  start: (lang) => {
    const s = createEights({
      players: [
        { name: lang === 'en' ? 'You' : 'Bạn', token: 'nonLa', color: 'red' },
        { name: 'Cu Đơ', token: 'conTrau', color: 'indigo', bot: 'normal' },
      ],
      seed: 1,
    });
    const hands = ['5♥ 9♥ Q♣ 2♣ 4♦ 8♠', 'K♥ 9♣ 6♦ J♦ 3♠ 7♠'];
    const pile = parseCards('5♣');
    return {
      ...s,
      players: s.players.map((p, i) => ({ ...p, hand: parseCards(hands[i]) })),
      // Drawn from the end: Cu Đơ's two penalty cards first, then the 6♣ for you.
      deck: parseCards('A♠ K♣ 6♣ 10♠ 3♥'),
      pile,
      suit: suitOf(pile[0]),
      current: 0,
      direction: 1,
      draw: 0,
      drawn: null,
      phase: 'playing',
      log: [{ type: 'dealt', game: 1, first: pile[0] }],
    };
  },
  apply: applyEights,
  // An 8 may call any suit: only the card has to be the one asked for.
  same: (made, expected) => made.type === expected.type && (made.type !== 'PLAY' || (expected.type === 'PLAY' && made.card === expected.card)),
  steps: [
    {
      text: {
        vi: 'Tám Điên: ai đánh hết bài trước là thắng. Mỗi lượt, đánh một lá cùng chất hoặc cùng số với lá trên cùng của chồng bài.',
        en: 'Crazy Eights: the first to get rid of all their cards wins. Each turn, play a card of the same suit or the same number as the top card of the pile.',
      },
    },
    {
      text: {
        vi: 'Lá trên bàn là 5♣. Bạn có 5♥, cùng số 5: chạm vào 5♥ để đánh.',
        en: 'The top card is the 5♣. You have the 5♥, the same number: tap it to play it.',
      },
      expect: play('5♥'),
      replies: [play('K♥')],
      glow: parseCards('5♥'),
    },
    {
      text: {
        vi: 'Cu Đơ đánh K♥. Giờ đánh cùng chất ♥: đánh 9♥.',
        en: 'Cu Đơ played the K♥. Now follow the suit, ♥: play the 9♥.',
      },
      expect: play('9♥'),
      replies: [play('9♣')],
      glow: parseCards('9♥'),
    },
    {
      text: {
        vi: 'Cu Đơ đánh 9♣ (cùng số 9) nên chất đổi sang ♣. Lá Q chặn lượt người sau: đánh Q♣, Cu Đơ mất lượt và bạn đi tiếp.',
        en: 'Cu Đơ played the 9♣ (the same number), so the suit is now ♣. A queen skips the next player: play the Q♣, Cu Đơ misses a turn and you go again.',
      },
      expect: play('Q♣'),
      glow: parseCards('Q♣'),
    },
    {
      text: {
        vi: 'Lá 2 bắt người sau rút 2 lá, trừ khi họ chặn bằng một lá 2 khác (khi đó người kế tiếp rút 4). Đánh 2♣.',
        en: 'A 2 makes the next player draw two, unless they add a 2 of their own (then the one after draws four). Play the 2♣.',
      },
      expect: play('2♣'),
      replies: [DRAW],
      glow: parseCards('2♣'),
    },
    {
      text: {
        vi: 'Cu Đơ không có lá 2 nên phải rút 2. Còn bạn: 4♦ không hợp, lá 8 thì nên để dành. Bấm Rút bài.',
        en: "Cu Đơ had no 2, so he drew two. Your turn: the 4♦ doesn't fit, and an 8 is worth keeping for later. Press Draw.",
      },
      expect: DRAW,
    },
    {
      text: {
        vi: 'Rút được 6♣, hợp chất ♣: đánh luôn được! (Lá rút không hợp thì lượt kết thúc.)',
        en: "You drew the 6♣, which fits the ♣: you may play it straight away! (If the card you draw doesn't fit, your turn ends.)",
      },
      expect: play('6♣'),
      replies: [play('6♦')],
      glow: parseCards('6♣'),
    },
    {
      text: {
        vi: 'Cu Đơ đổi sang ♦ bằng lá 6♦. Đánh 4♦.',
        en: 'Cu Đơ switched to ♦ with the 6♦. Play your 4♦.',
      },
      expect: play('4♦'),
      replies: [play('J♦')],
      glow: parseCards('4♦'),
    },
    {
      text: {
        vi: 'Lá cuối là 8♠. Lá 8 đánh lên lá nào cũng được, và bạn chọn chất tiếp theo. Đánh 8♠, chọn chất nào cũng được: hết bài!',
        en: "Your last card is the 8♠. An 8 can go on anything, and you choose the next suit. Play it, pick any suit, and you're out!",
      },
      expect: play('8♠'),
      glow: parseCards('8♠'),
    },
    {
      text: {
        vi: 'Thắng rồi! Còn lá A đổi chiều đánh (hai người chơi thì như được đánh thêm). Người thắng ăn điểm từ bài còn lại của mọi người: lá 8 là 50, 10 và J Q K là 10. Chơi ván thật thôi!',
        en: "You win! There's also the ace, which turns the direction around (with two players it means you go again). The winner scores the cards left in everyone's hands: 8s are 50, 10s and pictures 10. Time for a real game!",
      },
    },
  ],
};
