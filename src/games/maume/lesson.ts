// Màu Mè's guided first game: you against Cu Đơ, dealt (and the deck stacked) so every lesson comes
// up: following the color, the number, Chặn, +2, drawing, "Báo!", and a +4 to go out.

import type { Lesson } from '../lesson';
import { colorOf, parseCard, parseCards } from './cards';
import { applyMauMe, createMauMe, type MauMeAction, type MauMeState } from './game';

const play = (card: string, color?: number): MauMeAction => ({ type: 'PLAY', card: parseCard(card), ...(color === undefined ? {} : { color }) });
const DRAW: MauMeAction = { type: 'DRAW' };

export const MAUME_LESSON: Lesson<MauMeState, MauMeAction> = {
  start: (lang) => {
    const s = createMauMe({
      players: [
        { name: lang === 'en' ? 'You' : 'Bạn', token: 'nonLa', color: 'red' },
        { name: 'Cu Đơ', token: 'conTrau', color: 'indigo', bot: 'normal' },
      ],
      seed: 1,
    });
    const hands = ['son 8, la 8, la skip, la +2, cham 4, +4', 'son 1, nghe 2, nghe 8, nghe 9, la 3, cham 6, cham 7'];
    const pile = parseCards('son 5');
    return {
      ...s,
      players: s.players.map((p, i) => ({ ...p, hand: parseCards(hands[i]) })),
      // Drawn from the end: Cu Đơ's two cards for the +2 first, then the Lá 6 for you.
      deck: parseCards('son 3, nghe 4, la 6, cham 9, son 2'),
      pile,
      color: colorOf(pile[0]),
      current: 0,
      direction: 1,
      draw: 0,
      drawn: null,
      phase: 'playing',
      log: [{ type: 'dealt', game: 1, first: pile[0] }],
    };
  },
  apply: applyMauMe,
  // A wild card may name any color: only the card has to be the one asked for.
  same: (made, expected) => made.type === expected.type && (made.type !== 'PLAY' || (expected.type === 'PLAY' && made.card === expected.card)),
  steps: [
    {
      text: {
        vi: 'Màu Mè: ai đánh hết bài trước là thắng. Mỗi lượt, đánh một lá cùng màu hoặc cùng số với lá trên cùng của chồng bài. Bốn màu là Son ●, Nghệ ▲, Lá ■ và Chàm ◆.',
        en: 'Màu Mè: the first to get rid of all their cards wins. Each turn, play a card of the same color or the same number as the top card of the pile. The four colors are Vermilion ●, Turmeric ▲, Leaf ■ and Indigo ◆.',
      },
    },
    {
      text: {
        vi: 'Lá trên bàn là Son 5. Bạn có Son 8, cùng màu Son: chạm vào để đánh.',
        en: 'The top card is Vermilion 5. You have Vermilion 8, the same color: tap it to play it.',
      },
      expect: play('son 8'),
      replies: [play('nghe 8')],
      glow: parseCards('son 8'),
    },
    {
      text: {
        vi: 'Cu Đơ đánh Nghệ 8 (cùng số 8), nên màu đổi sang Nghệ. Bạn không có lá Nghệ, nhưng Lá 8 cùng số: đánh Lá 8.',
        en: 'Cu Đơ played Turmeric 8 (the same number), so the color is now Turmeric. You have no Turmeric, but Leaf 8 has the same number: play it.',
      },
      expect: play('la 8'),
      replies: [play('la 3')],
      glow: parseCards('la 8'),
    },
    {
      text: {
        vi: 'Lá Chặn ⊘ làm người sau mất lượt. Hai người chơi thì bạn được đánh tiếp! Đánh Lá Chặn.',
        en: 'A Skip ⊘ makes the next player miss a turn. With two players, that means you go again! Play the Leaf Skip.',
      },
      expect: play('la skip'),
      glow: parseCards('la skip'),
    },
    {
      text: {
        vi: 'Lá +2 bắt người sau rút 2 lá, trừ khi họ cộng dồn bằng một lá +2 hay +4 (khi đó người kế tiếp rút cả). Đánh Lá +2.',
        en: 'A +2 makes the next player draw two, unless they add a +2 or a +4 of their own (then the one after draws the lot). Play the Leaf +2.',
      },
      expect: play('la +2'),
      replies: [DRAW],
      glow: parseCards('la +2'),
    },
    {
      text: {
        vi: 'Cu Đơ không có gì để cộng dồn nên rút 2. Còn bạn: Chàm 4 không hợp, lá +4 thì nên để dành. Bấm Rút bài.',
        en: "Cu Đơ had nothing to add, so he drew two. Your turn: Indigo 4 doesn't fit, and the +4 is worth keeping. Press Draw.",
      },
      expect: DRAW,
    },
    {
      text: {
        vi: 'Rút được Lá 6, hợp màu Lá: đánh luôn được! (Lá rút không hợp thì lượt kết thúc.)',
        en: "You drew Leaf 6, which fits the color: you may play it straight away! (If the card you draw doesn't fit, your turn ends.)",
      },
      expect: play('la 6'),
      replies: [play('cham 6')],
      glow: parseCards('la 6'),
    },
    {
      text: {
        vi: 'Cu Đơ đổi sang màu Chàm bằng lá Chàm 6. Đánh Chàm 4: còn một lá thì được “Báo!” cho cả bàn biết.',
        en: 'Cu Đơ switched to Indigo with his Indigo 6. Play your Indigo 4: down to one card, you call "Last card!" for everyone to see.',
      },
      expect: play('cham 4'),
      replies: [play('cham 7')],
      glow: parseCards('cham 4'),
    },
    {
      text: {
        vi: 'Lá cuối là +4. Lá Đổi màu ✦ và +4 đánh lên lá nào cũng được, và bạn chọn màu tiếp theo; +4 còn bắt người sau rút 4. Đánh +4, chọn màu nào cũng được: hết bài!',
        en: "Your last card is a +4. Wild ✦ and +4 cards go on anything, and you choose the next color; a +4 also makes the next player draw four. Play it, pick any color, and you're out!",
      },
      expect: play('+4', 0),
      glow: parseCards('+4'),
    },
    {
      text: {
        vi: 'Thắng rồi! Còn lá Quay ⇄ đổi chiều đánh (hai người chơi thì như được đánh thêm). Người thắng ăn điểm từ bài còn lại của mọi người: số thì theo số, Chặn, Quay, +2 là 20, Đổi màu và +4 là 50. Chơi ván thật thôi!',
        en: "You win! There's also Reverse ⇄, which turns the direction around (with two players it means you go again). The winner scores the cards left in everyone's hands: numbers as printed, Skip, Reverse and +2 are 20, Wild and +4 are 50. Time for a real game!",
      },
    },
  ],
};
