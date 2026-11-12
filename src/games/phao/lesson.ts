// Pháo Tết's guided first game: you against Cu Đơ, dealt (and the deck stacked) so every lesson comes
// up: peeking, dodging, a bucket putting a firecracker out, taking a card with a pair, drawing safely,
// and Cu Đơ blowing up.

import type { Lesson } from '../lesson';
import { pick, type Card } from './cards';
import { applyPhao, createPhao, type PhaoAction, type PhaoState } from './game';

// Every card is picked from one set, so the same kind always means the same card.
const taken = new Set<Card>();
const YOURS = pick('xo, nhom, ne, banhChung, banhChung, day', taken);
const CU_DO = pick('xo, ne', taken);
const DECK = pick('cuDo, camVinh, nhut, xoc, phao', taken); // the top card last: the firecracker

const play = (card: Card, target?: number): PhaoAction => ({ type: 'PLAY', card, ...(target === undefined ? {} : { target }) });
const [, NHOM, NE, BANH_1, BANH_2] = YOURS;

export const PHAO_LESSON: Lesson<PhaoState, PhaoAction> = {
  start: (lang) => {
    const s = createPhao({
      players: [
        { name: lang === 'en' ? 'You' : 'Bạn', token: 'nonLa', color: 'red' },
        { name: 'Cu Đơ', token: 'conTrau', color: 'indigo', bot: 'normal' },
      ],
      seed: 1,
    });
    return {
      ...s,
      players: s.players.map((p, i) => ({ ...p, hand: [...(i === 0 ? YOURS : CU_DO)], out: false })),
      deck: [...DECK],
      discard: [],
      current: 0,
      turns: 1,
      phase: { kind: 'turn' },
      peek: null,
      log: [{ type: 'dealt', game: 1 }],
    };
  },
  apply: applyPhao,
  same: (made, expected) => {
    if (made.type !== expected.type) return false;
    if (made.type === 'PLAY' && expected.type === 'PLAY') return made.card === expected.card && made.target === expected.target;
    if (made.type === 'PAIR' && expected.type === 'PAIR')
      return made.target === expected.target && [...made.cards].sort().join() === [...expected.cards].sort().join();
    return true;
  },
  steps: [
    {
      text: {
        vi: 'Pháo Tết: trong nọc bài có giấu pháo (ít hơn số người chơi một quả). Mỗi lượt, đánh bài nếu muốn, rồi rút một lá. Rút trúng pháo là nổ, trừ khi có Xô nước. Ai còn lại cuối cùng thì thắng!',
        en: 'Pháo Tết: firecrackers are hidden in the deck (one fewer than the players). On your turn, play cards if you like, then draw one. Draw a firecracker and you blow up, unless you have a Bucket. The last one standing wins!',
      },
    },
    {
      text: {
        vi: 'Trên bàn có ghi: 1 pháo trong 5 lá. Nhòm trước cho chắc: chạm lá Nhòm rồi bấm Đánh để xem 3 lá trên cùng.',
        en: 'The table says: 1 firecracker in 5 cards. Better look first: tap Peek, then Play, to see the top 3 cards.',
      },
      expect: play(NHOM),
      glow: [NHOM],
    },
    {
      text: {
        vi: 'Lá trên cùng là pháo! Đánh lá Né: hết lượt mà khỏi phải rút.',
        en: "The top card is a firecracker! Play Dodge: your turn ends and you don't have to draw.",
      },
      expect: play(NE),
      replies: [{ type: 'DRAW' }, { type: 'HIDE', position: 1 }],
      glow: [NE],
    },
    {
      text: {
        vi: 'Cu Đơ rút trúng pháo nhưng có Xô nước nên dập được, rồi giấu pháo lại vào nọc. Giấu ở đâu thì chỉ Cu Đơ biết! Giờ lấy bớt bài của Cu Đơ: chọn hai lá Bánh chưng, đánh đôi với Cu Đơ.',
        en: 'Cu Đơ drew the firecracker, but he had a Bucket, so he put it out and hid it back in the deck. Only he knows where! Now take one of his cards: pick your two Bánh chưng and play the pair on Cu Đơ.',
      },
      expect: { type: 'PAIR', cards: [BANH_1, BANH_2], target: 1 },
      glow: [BANH_1, BANH_2],
    },
    {
      text: {
        vi: 'Bạn lấy được lá Né của Cu Đơ: giờ Cu Đơ hết bài, hết đường né. Bấm Rút bài để hết lượt.',
        en: 'You took his Dodge: now Cu Đơ has no cards and no way out. Press Draw to end your turn.',
      },
      expect: { type: 'DRAW' },
      replies: [{ type: 'DRAW' }],
    },
    {
      text: {
        vi: 'ĐÙNG! Cu Đơ rút trúng quả pháo vừa giấu, không còn xô nước: bạn thắng! Còn mấy lá nữa: Đẩy (người sau đi 2 lượt), Xóc (xóc lại nọc), Rút đáy (rút lá dưới cùng) và Xin (lấy bừa một lá). Chơi ván thật thôi!',
        en: 'BANG! Cu Đơ drew the firecracker he had hidden, with no bucket left: you win! A few more cards: Shove (the next player takes 2 turns), Shake (shuffle the deck), Bottom (draw the bottom card) and Beg (take a random card). Time for a real game!',
      },
    },
  ],
};
