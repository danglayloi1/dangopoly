import type { LocalText } from './text';

// All prices are the classic board's values × 10,000đ (classic $200 -> 2tr).
const UNIT = 10_000;
const v = (classic: number) => classic * UNIT;

export const BOARD_SIZE = 40;
export const STARTING_CASH = v(1500); // 15tr
export const START_SALARY = v(200); // 2tr
/** Rent for owning 1, 2, 3 or 4 transport spaces. */
export const TRANSPORT_RENT = [v(25), v(50), v(100), v(200)] as const;
/** Utility rent = dice total × this (index: number of utilities owned - 1). */
export const UTILITY_MULTIPLIER = [v(4), v(10)] as const;

export type ColorGroup =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue';

/** Rent with 0, 1, 2, 3, 4 houses, then with a hotel. */
export type RentTable = readonly [number, number, number, number, number, number];

export type Space =
  | { kind: 'start'; name: LocalText }
  | { kind: 'jail'; name: LocalText }
  | { kind: 'rest'; name: LocalText }
  | { kind: 'goToJail'; name: LocalText }
  | { kind: 'card'; name: LocalText; deck: 'chance' | 'community' }
  | { kind: 'tax'; name: LocalText; amount: number }
  | {
      kind: 'property';
      name: LocalText;
      group: ColorGroup;
      price: number;
      houseCost: number;
      rent: RentTable;
    }
  | { kind: 'transport'; name: LocalText; price: number }
  | { kind: 'utility'; name: LocalText; price: number };

export type OwnableSpace = Extract<Space, { kind: 'property' | 'transport' | 'utility' }>;

function property(
  vi: string,
  en: string,
  group: ColorGroup,
  price: number,
  houseCost: number,
  rent: [number, number, number, number, number, number],
): Space {
  return {
    kind: 'property',
    name: { vi, en },
    group,
    price: v(price),
    houseCost: v(houseCost),
    rent: [v(rent[0]), v(rent[1]), v(rent[2]), v(rent[3]), v(rent[4]), v(rent[5])],
  };
}

const transport = (vi: string, en: string): Space => ({
  kind: 'transport',
  name: { vi, en },
  price: v(200),
});
const utility = (vi: string, en: string): Space => ({
  kind: 'utility',
  name: { vi, en },
  price: v(150),
});
const chance: Space = { kind: 'card', deck: 'chance', name: { vi: 'Cơ hội', en: 'Chance' } };
const community: Space = {
  kind: 'card',
  deck: 'community',
  name: { vi: 'Khí vận', en: 'Community Chest' },
};

// Spaces 1–19 are Hà Tĩnh, corner 20 is Bến Thủy bridge, spaces 21–39 are Nghệ An.
export const BOARD: readonly Space[] = [
  { kind: 'start', name: { vi: 'Xuất phát', en: 'Start' } },
  property('Vườn bưởi Phúc Trạch', 'Phúc Trạch Pomelo Gardens', 'brown', 60, 50, [2, 10, 30, 90, 160, 250]),
  community,
  property('Lò kẹo cu đơ', 'Cu Đơ Candy Workshop', 'brown', 60, 50, [4, 20, 60, 180, 320, 450]),
  { kind: 'tax', name: { vi: 'Thuế thu nhập', en: 'Income Tax' }, amount: v(200) },
  transport('Bến xe Hà Tĩnh', 'Hà Tĩnh Bus Station'),
  property('Suối nước nóng Sơn Kim', 'Sơn Kim Hot Springs', 'lightblue', 100, 50, [6, 30, 90, 270, 400, 550]),
  chance,
  property('Hồ Kẻ Gỗ', 'Kẻ Gỗ Lake', 'lightblue', 100, 50, [6, 30, 90, 270, 400, 550]),
  property('Cửa khẩu Cầu Treo', 'Cầu Treo Border Gate', 'lightblue', 120, 50, [8, 40, 100, 300, 450, 600]),

  { kind: 'jail', name: { vi: 'Nhà tạm giữ', en: 'Jail' } },
  property('Kỳ Anh', 'Kỳ Anh', 'pink', 140, 100, [10, 50, 150, 450, 625, 750]),
  utility('Nhiệt điện Vũng Áng', 'Vũng Áng Power Plant'),
  property('Nghi Xuân', 'Nghi Xuân', 'pink', 140, 100, [10, 50, 150, 450, 625, 750]),
  property('Hồng Lĩnh', 'Hồng Lĩnh', 'pink', 160, 100, [12, 60, 180, 500, 700, 900]),
  transport('Cảng Vũng Áng', 'Vũng Áng Port'),
  property('Biển Thạch Hải', 'Thạch Hải Beach', 'orange', 180, 100, [14, 70, 200, 550, 750, 950]),
  community,
  property('Biển Thiên Cầm', 'Thiên Cầm Beach', 'orange', 180, 100, [14, 70, 200, 550, 750, 950]),
  property('Biển Xuân Thành', 'Xuân Thành Beach', 'orange', 200, 100, [16, 80, 220, 600, 800, 1000]),

  { kind: 'rest', name: { vi: 'Cầu Bến Thủy', en: 'Bến Thủy Bridge' } },
  property('Đảo chè Thanh Chương', 'Thanh Chương Tea Island', 'red', 220, 150, [18, 90, 250, 700, 875, 1050]),
  chance,
  property('Thái Hòa', 'Thái Hòa', 'red', 220, 150, [18, 90, 250, 700, 875, 1050]),
  property('Vườn quốc gia Pù Mát', 'Pù Mát National Park', 'red', 240, 150, [20, 100, 300, 750, 925, 1100]),
  transport('Ga Vinh', 'Vinh Railway Station'),
  property('Biển Diễn Thành', 'Diễn Thành Beach', 'yellow', 260, 150, [22, 110, 330, 800, 975, 1150]),
  property('Biển Cửa Hội', 'Cửa Hội Beach', 'yellow', 260, 150, [22, 110, 330, 800, 975, 1150]),
  utility('Thủy điện Bản Vẽ', 'Bản Vẽ Hydropower Plant'),
  property('Biển Cửa Lò', 'Cửa Lò Beach', 'yellow', 280, 150, [24, 120, 360, 850, 1025, 1200]),

  { kind: 'goToJail', name: { vi: 'Vào nhà tạm giữ', en: 'Go to Jail' } },
  property('Chợ Vinh', 'Vinh Market', 'green', 300, 200, [26, 130, 390, 900, 1100, 1275]),
  property('Đại học Vinh', 'Vinh University', 'green', 300, 200, [26, 130, 390, 900, 1100, 1275]),
  community,
  property('Công viên trung tâm Vinh', 'Vinh Central Park', 'green', 320, 200, [28, 150, 450, 1000, 1200, 1400]),
  transport('Sân bay Vinh', 'Vinh Airport'),
  chance,
  property('Sân vận động Vinh (SLNA)', 'Vinh Stadium (SLNA)', 'darkblue', 350, 200, [35, 175, 500, 1100, 1300, 1500]),
  { kind: 'tax', name: { vi: 'Phí cầu đường', en: 'Road Toll' }, amount: v(100) },
  property('Đường Quang Trung', 'Quang Trung Street', 'darkblue', 400, 200, [50, 200, 600, 1400, 1700, 2000]),
];

export function isOwnable(space: Space): space is OwnableSpace {
  return space.kind === 'property' || space.kind === 'transport' || space.kind === 'utility';
}

/** Board indices of each color group, cheapest first. */
export const GROUP_SPACES: Readonly<Record<ColorGroup, readonly number[]>> = (() => {
  const groups: Record<ColorGroup, number[]> = {
    brown: [],
    lightblue: [],
    pink: [],
    orange: [],
    red: [],
    yellow: [],
    green: [],
    darkblue: [],
  };
  BOARD.forEach((space, index) => {
    if (space.kind === 'property') groups[space.group].push(index);
  });
  return groups;
})();
