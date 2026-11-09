// Tiến lên's guided first game: you against Cu Đơ, seven cards each, dealt so every lesson comes up:
// the lowest card leads, beating a play, passing, the 2s, a straight, and a pair to go out.

import type { Lesson } from '../lesson';
import { parseCards } from './cards';
import { applyTienLen, createTienLen, type TienLenAction, type TienLenState } from './game';

const play = (cards: string): TienLenAction => ({ type: 'PLAY', cards: parseCards(cards) });
const PASS: TienLenAction = { type: 'PASS' };

export const TIENLEN_LESSON: Lesson<TienLenState, TienLenAction> = {
  start: (lang) => {
    const s = createTienLen({
      players: [
        { name: lang === 'en' ? 'You' : 'Bạn', token: 'nonLa', color: 'red' },
        { name: 'Cu Đơ', token: 'conTrau', color: 'indigo', bot: 'normal' },
      ],
      seed: 1,
    });
    const hands = ['3♠ 6♣ 7♥ 8♠ 9♠ 9♥ 2♠', '4♣ 5♦ 10♠ J♣ J♥ K♦ A♥'];
    return {
      ...s,
      players: s.players.map((p, i) => ({ ...p, hand: parseCards(hands[i]) })),
      current: 0,
      table: null,
      mustInclude: parseCards('3♠')[0],
      phase: 'playing',
      log: s.log.filter((e) => e.type === 'dealt'),
    };
  },
  apply: applyTienLen,
  same: (made, expected) =>
    made.type === expected.type &&
    (made.type !== 'PLAY' || (expected.type === 'PLAY' && made.cards.length === expected.cards.length && made.cards.every((c) => expected.cards.includes(c)))),
  steps: [
    {
      text: {
        vi: 'Tiến lên: ai đánh hết bài trước là thắng. Bài xếp từ thấp đến cao: 3, 4 … 10, J, Q, K, A, và 2 (heo) là lớn nhất. Cùng số thì so chất: ♠ < ♣ < ♦ < ♥.',
        en: 'Tiến lên: the first to get rid of all their cards wins. From lowest to highest: 3, 4 … 10, J, Q, K, A, and the 2s (heo) are the highest. Same number? The suit decides: ♠ < ♣ < ♦ < ♥.',
      },
    },
    {
      text: {
        vi: 'Ván đầu, ai có lá thấp nhất (3♠) đi trước, và phải đánh lá đó. Chạm vào 3♠ để chọn, rồi bấm Đánh.',
        en: 'In the first game, whoever holds the lowest card (3♠) starts, and must play it. Tap the 3♠ to choose it, then press Play.',
      },
      expect: play('3♠'),
      replies: [play('4♣')],
      glow: parseCards('3♠'),
    },
    {
      text: {
        vi: 'Cu Đơ chặn bằng 4♣. Muốn chặn lại phải đánh lá cao hơn, cùng kiểu. Không muốn thì bỏ lượt: lần này bấm Bỏ lượt.',
        en: 'Cu Đơ beats it with the 4♣. To beat that you need a higher card of the same kind, or you can pass. This time, press Pass.',
      },
      expect: PASS,
      replies: [play('K♦')],
    },
    {
      text: {
        vi: 'Bạn bỏ lượt nên Cu Đơ thắng vòng và đi tiếp: đánh K♦. Heo (lá 2) chặn được mọi lá lẻ: chọn 2♠ rồi Đánh.',
        en: 'You passed, so Cu Đơ won the round and starts the next: the K♦. A 2 (heo) beats any single card: choose the 2♠ and play it.',
      },
      expect: play('2♠'),
      replies: [PASS],
      glow: parseCards('2♠'),
    },
    {
      text: {
        vi: 'Cu Đơ không chặn được heo, nên bạn thắng vòng và đi trước, đánh bộ nào cũng được. Sảnh là 3 lá liên tiếp trở lên: chọn 6♣ 7♥ 8♠ rồi Đánh.',
        en: "Cu Đơ can't beat a 2, so you win the round and start the next with anything. A straight is 3 or more cards in a row: choose 6♣ 7♥ 8♠ and play them.",
      },
      expect: play('6♣ 7♥ 8♠'),
      replies: [PASS],
      glow: parseCards('6♣ 7♥ 8♠'),
    },
    {
      text: {
        vi: 'Lại tới bạn. Còn đôi 9 (hai lá cùng số): đánh 9♠ 9♥ là hết bài!',
        en: "Your lead again. You've a pair of 9s left (two cards of the same number): play the 9♠ and 9♥ and you're out!",
      },
      expect: play('9♠ 9♥'),
      glow: parseCards('9♠ 9♥'),
    },
    {
      text: {
        vi: 'Về Nhất! Còn nữa: sám (3 lá cùng số), tứ quý (4 lá), đôi thông (3 đôi liền nhau trở lên). Chặt heo: 3 đôi thông chặt được một heo; tứ quý chặt được heo, đôi heo và 3 đôi thông. Chơi ván thật thôi!',
        en: "You're first! There's more: three of a kind, four of a kind, and pairs in a row (3 or more). Bombs: 3 pairs in a row beat a single 2; four of a kind beats a 2, a pair of 2s, or 3 pairs in a row. Time for a real game!",
      },
    },
  ],
};
