import type { LocalText } from './text';

export type CardDeck = 'chance' | 'community';

/** What a card does. Amounts in đồng. */
export type CardEffect =
  | { kind: 'collect'; amount: number } // the bank pays you
  | { kind: 'pay'; amount: number } // you pay the bank
  | { kind: 'collectFromEach'; amount: number } // every other player pays you
  | { kind: 'payEach'; amount: number } // you pay every other player
  | { kind: 'advanceTo'; space: number } // move forward to a space (2tr if you pass Start)
  | { kind: 'advanceToNearest'; target: 'transport' | 'utility' } // and pay extra rent if owned
  | { kind: 'moveBack'; steps: number }
  | { kind: 'goToJail' }
  | { kind: 'jailFree' } // keep until used (or traded)
  | { kind: 'repairs'; perHouse: number; perHotel: number };

export interface Card {
  text: LocalText;
  effect: CardEffect;
}

const k = (thousands: number) => thousands * 1_000;

// Same mix of effects as the classic decks, with amounts × 10,000đ and Nghệ Tĩnh stories.
export const CARDS: Record<CardDeck, readonly Card[]> = {
  chance: [
    {
      text: {
        vi: 'Đi tắm biển Cửa Lò! Tiến đến Biển Cửa Lò.',
        en: 'Beach day! Advance to Cửa Lò Beach.',
      },
      effect: { kind: 'advanceTo', space: 29 },
    },
    {
      text: { vi: 'Về quê ăn Tết. Tiến về Xuất phát, nhận 2tr.', en: 'Home for Tết. Advance to Start and collect 2tr.' },
      effect: { kind: 'advanceTo', space: 0 },
    },
    {
      text: {
        vi: 'Dạo phố đêm Vinh. Tiến đến Đường Quang Trung.',
        en: 'A night out in Vinh. Advance to Quang Trung Street.',
      },
      effect: { kind: 'advanceTo', space: 39 },
    },
    {
      text: {
        vi: 'Đi hái chè ở Thanh Chương. Tiến đến Đảo chè Thanh Chương.',
        en: 'Tea picking time. Advance to Thanh Chương Tea Island.',
      },
      effect: { kind: 'advanceTo', space: 21 },
    },
    {
      text: { vi: 'Bắt tàu Thống Nhất. Tiến đến Ga Vinh.', en: 'Catch the Reunification Express. Advance to Vinh Station.' },
      effect: { kind: 'advanceTo', space: 25 },
    },
    {
      text: {
        vi: 'Đi xe khách. Tiến đến bến giao thông gần nhất. Nếu đã có chủ, trả gấp đôi tiền thuê.',
        en: 'Take the coach. Advance to the nearest transport space. If owned, pay double rent.',
      },
      effect: { kind: 'advanceToNearest', target: 'transport' },
    },
    {
      text: {
        vi: 'Đi nhờ xe tải hàng. Tiến đến bến giao thông gần nhất. Nếu đã có chủ, trả gấp đôi tiền thuê.',
        en: 'Hitch a ride on a truck. Advance to the nearest transport space. If owned, pay double rent.',
      },
      effect: { kind: 'advanceToNearest', target: 'transport' },
    },
    {
      text: {
        vi: 'Mất điện! Tiến đến nhà máy gần nhất. Nếu đã có chủ, trả tổng xúc xắc × 100k.',
        en: 'Power cut! Advance to the nearest utility. If owned, pay the dice total × 100k.',
      },
      effect: { kind: 'advanceToNearest', target: 'utility' },
    },
    {
      text: { vi: 'Lạc đường trong thành Vinh. Lùi lại 3 ô.', en: 'Lost in Vinh city. Go back 3 spaces.' },
      effect: { kind: 'moveBack', steps: 3 },
    },
    {
      text: {
        vi: 'Vượt đèn đỏ ở ngã tư! Vào nhà tạm giữ, không đi qua Xuất phát.',
        en: 'Ran a red light! Go to Jail. Do not pass Start.',
      },
      effect: { kind: 'goToJail' },
    },
    {
      text: { vi: 'Thẻ Ra tù miễn phí. Giữ thẻ này đến khi cần.', en: 'Get Out of Jail Free. Keep this card until needed.' },
      effect: { kind: 'jailFree' },
    },
    {
      text: { vi: 'Không đội mũ bảo hiểm. Nộp phạt 150k.', en: 'No helmet! Pay a 150k fine.' },
      effect: { kind: 'pay', amount: k(150) },
    },
    {
      text: { vi: 'Trúng mùa bưởi Phúc Trạch. Nhận 500k.', en: 'Bumper pomelo harvest in Phúc Trạch. Collect 500k.' },
      effect: { kind: 'collect', amount: k(500) },
    },
    {
      text: { vi: 'Trúng xổ số kiến thiết. Nhận 1tr5.', en: 'You won the lottery. Collect 1tr5.' },
      effect: { kind: 'collect', amount: k(1_500) },
    },
    {
      text: {
        vi: 'Lũ miền Trung. Sửa nhà: trả 250k mỗi nhà, 1tr mỗi khách sạn.',
        en: 'Central Vietnam floods. Repairs: pay 250k per house, 1tr per hotel.',
      },
      effect: { kind: 'repairs', perHouse: k(250), perHotel: k(1_000) },
    },
    {
      text: {
        vi: 'Khao cả nhóm cháo lươn Vinh. Trả mỗi người chơi 500k.',
        en: 'You treat everyone to Vinh eel porridge. Pay each player 500k.',
      },
      effect: { kind: 'payEach', amount: k(500) },
    },
  ],
  community: [
    {
      text: { vi: 'Tiến về Xuất phát, nhận 2tr.', en: 'Advance to Start and collect 2tr.' },
      effect: { kind: 'advanceTo', space: 0 },
    },
    {
      text: { vi: 'Ngân hàng tính nhầm có lợi cho bạn. Nhận 2tr.', en: 'Bank error in your favor. Collect 2tr.' },
      effect: { kind: 'collect', amount: k(2_000) },
    },
    {
      text: { vi: 'Đi khám ở bệnh viện. Trả 1tr viện phí.', en: 'Hospital visit. Pay 1tr in fees.' },
      effect: { kind: 'pay', amount: k(1_000) },
    },
    {
      text: { vi: 'Đóng học phí Đại học Vinh. Trả 500k.', en: 'Vinh University tuition. Pay 500k.' },
      effect: { kind: 'pay', amount: k(500) },
    },
    {
      text: {
        vi: 'Bán kẹo cu đơ cho khách du lịch. Nhận 500k.',
        en: 'You sold cu đơ candy to tourists. Collect 500k.',
      },
      effect: { kind: 'collect', amount: k(500) },
    },
    {
      text: { vi: 'Thẻ Ra tù miễn phí. Giữ thẻ này đến khi cần.', en: 'Get Out of Jail Free. Keep this card until needed.' },
      effect: { kind: 'jailFree' },
    },
    {
      text: {
        vi: 'Chạy xe không bằng lái! Vào nhà tạm giữ, không đi qua Xuất phát.',
        en: 'Driving without a licence! Go to Jail. Do not pass Start.',
      },
      effect: { kind: 'goToJail' },
    },
    {
      text: { vi: 'Thưởng tháng 13. Nhận 1tr.', en: 'Year-end bonus. Collect 1tr.' },
      effect: { kind: 'collect', amount: k(1_000) },
    },
    {
      text: { vi: 'SLNA vô địch! Được thưởng nóng 200k.', en: 'SLNA wins the league! Collect a 200k bonus.' },
      effect: { kind: 'collect', amount: k(200) },
    },
    {
      text: {
        vi: 'Đám cưới của bạn! Mỗi người chơi mừng bạn 100k.',
        en: "It's your wedding! Every player gives you 100k.",
      },
      effect: { kind: 'collectFromEach', amount: k(100) },
    },
    {
      text: { vi: 'Bảo hiểm đáo hạn. Nhận 1tr.', en: 'Your insurance matures. Collect 1tr.' },
      effect: { kind: 'collect', amount: k(1_000) },
    },
    {
      text: {
        vi: 'Dâng hương tại Ngã ba Đồng Lộc. Góp 100k tiền hương hoa.',
        en: 'Pay respects at Đồng Lộc Junction. Give 100k for incense and flowers.',
      },
      effect: { kind: 'pay', amount: k(100) },
    },
    {
      text: { vi: 'Dạy thêm buổi tối. Nhận 250k.', en: 'Evening tutoring pays off. Collect 250k.' },
      effect: { kind: 'collect', amount: k(250) },
    },
    {
      text: {
        vi: 'Làng sửa đường. Góp 400k mỗi nhà, 1tr15 mỗi khách sạn.',
        en: 'The village fixes its roads. Pay 400k per house, 1tr15 per hotel.',
      },
      effect: { kind: 'repairs', perHouse: k(400), perHotel: k(1_150) },
    },
    {
      text: {
        vi: 'Đạt giải nhì thi hát dân ca ví giặm. Nhận 100k.',
        en: 'Second prize in the ví giặm folk singing contest. Collect 100k.',
      },
      effect: { kind: 'collect', amount: k(100) },
    },
    {
      text: { vi: 'Ông bà lì xì Tết. Nhận 1tr.', en: 'Lucky money from your grandparents. Collect 1tr.' },
      effect: { kind: 'collect', amount: k(1_000) },
    },
  ],
};

export const DECK_NAMES: Record<CardDeck, LocalText> = {
  chance: { vi: 'Cơ hội', en: 'Chance' },
  community: { vi: 'Khí vận', en: 'Community Chest' },
};
