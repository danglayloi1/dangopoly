// Small hand-drawn icons in the woodblock style: flat pigment fills with ink outlines.
// The outline uses currentColor, which the stylesheet sets to the theme's ink.

import type { ReactNode } from 'react';
import { BOARD } from '../data/board';

const RED = '#b8322a';
const YELLOW = '#d9a62e';
const INDIGO = '#2f4f6f';
const SKY = '#6fa8c4';
const GREEN = '#4f7a3a';
const BROWN = '#7a4a2c';
const CREAM = '#f6ecd4';
const PINK = '#d98a9a';

export type IconName =
  | 'bus'
  | 'ship'
  | 'train'
  | 'plane'
  | 'power'
  | 'water'
  | 'tax'
  | 'chance'
  | 'community'
  | 'start'
  | 'jail'
  | 'bridge'
  | 'police'
  | 'coins'
  | 'ticket'
  | 'music'
  // Interface icons (replacing emoji, so everything is drawn in the same style)
  | 'dice'
  | 'house'
  | 'handshake'
  | 'scroll'
  | 'gear'
  | 'globe'
  | 'speaker'
  | 'mute'
  | 'sun'
  | 'moon'
  | 'autoTheme'
  | 'person'
  | 'slipper'
  | 'buffalo'
  | 'xeOm'
  | 'banhChung'
  | 'bot'
  | 'save'
  | 'trophy'
  | 'chart'
  | 'lantern'
  | 'chat'
  | 'eye'
  | 'clock'
  | 'medalGold'
  | 'medalSilver'
  | 'medalBronze'
  | 'purse'
  | 'blossom'
  | 'wave'
  | 'contrast'
  | 'dog'
  | 'chicken';

const SILVER = '#c0c7cf';
const BRONZE = '#c27a3a';

/** A medal on a red and indigo ribbon. */
function medal(color: string, rank: string): ReactNode {
  return (
    <>
      <path d="M10 3 L14 13 M22 3 L18 13" fill="none" strokeWidth={3.2} stroke={RED} />
      <path d="M10 3 L14 13 M22 3 L18 13" fill="none" strokeWidth={1} />
      <circle cx="16" cy="20" r="8.5" fill={color} />
      <text x="16" y="24" textAnchor="middle" fontSize="10" fontWeight="900" fill="currentColor" stroke="none">
        {rank}
      </text>
    </>
  );
}

const DRAWINGS: Record<IconName, ReactNode> = {
  bus: (
    <>
      <rect x="5" y="8" width="22" height="15" rx="3" fill={RED} />
      <rect x="8" y="11" width="5" height="5" fill={CREAM} />
      <rect x="14.5" y="11" width="5" height="5" fill={CREAM} />
      <rect x="21" y="11" width="3" height="5" fill={CREAM} />
      <circle cx="10" cy="24" r="2.6" fill={INDIGO} />
      <circle cx="22" cy="24" r="2.6" fill={INDIGO} />
    </>
  ),
  ship: (
    <>
      <path d="M5 18 H27 L23.5 24 H8.5 Z" fill={RED} />
      <rect x="11" y="12" width="10" height="6" fill={CREAM} />
      <rect x="17" y="7" width="3" height="5" fill={INDIGO} />
      <path d="M3 27 Q6.5 25 10 27 T17 27 T24 27 T30 27" fill="none" />
    </>
  ),
  train: (
    <>
      <rect x="8" y="5" width="16" height="19" rx="4" fill={INDIGO} />
      <rect x="11" y="8" width="10" height="6" rx="1" fill={CREAM} />
      <circle cx="12" cy="18.5" r="1.6" fill={YELLOW} />
      <circle cx="20" cy="18.5" r="1.6" fill={YELLOW} />
      <path d="M11 24 L8 28 M21 24 L24 28" fill="none" />
    </>
  ),
  plane: (
    <path
      d="M16 4 C17.4 4 18 5.5 18 7 V13 L28 18 V21 L18 18 V24 L21 26.5 V28.5 L16 27 L11 28.5 V26.5 L14 24 V18 L4 21 V18 L14 13 V7 C14 5.5 14.6 4 16 4 Z"
      fill={SKY}
    />
  ),
  power: (
    <>
      <path d="M9 27 L11 10 H16 L18 27 Z" fill={BROWN} />
      <path d="M12 9 Q10 6 13 5 Q12 2.5 15.5 3" fill="none" />
      <path d="M22 8 L18.5 16 H22 L19.5 25 L26.5 13.5 H22.5 L25 8 Z" fill={YELLOW} />
    </>
  ),
  water: (
    <>
      <path d="M4 26 V14 H12 V26 Z" fill={BROWN} />
      <path d="M21 5 C21 5 15 13 15 17.5 A6 6 0 0 0 27 17.5 C27 13 21 5 21 5 Z" fill={SKY} />
      <path d="M3 28 H29" fill="none" />
    </>
  ),
  tax: (
    <>
      <path d="M8 5 H23 V24 Q23 27 20 27 H9 Q6 27 6 24 V7 Q6 5 8 5 Z" fill={CREAM} />
      <path d="M10 10 H19 M10 14 H19 M10 18 H15" fill="none" />
      <circle cx="21.5" cy="21.5" r="5" fill={YELLOW} />
      <rect x="20" y="20" width="3" height="3" fill={CREAM} />
    </>
  ),
  // A carp leaping, the luck of Cơ hội
  chance: (
    <>
      <path d="M6 21 Q10 9 21 10 Q26 11 25 16 Q24 22 14 23 Z" fill={RED} />
      <path d="M8 20 L3 25 L5 17 Z" fill={YELLOW} />
      <path d="M15 12 L17 7.5 L19 11" fill={YELLOW} />
      <circle cx="21" cy="14" r="1.4" fill={CREAM} />
      <path d="M12 16 Q14 18 13 20 M16 15 Q18 17 17 19.5" fill="none" />
    </>
  ),
  // A jar of good fortune for Khí vận
  community: (
    <>
      <path d="M11 9 H21 V11 Q27 14 26 21 Q25 27 16 27 Q7 27 6 21 Q5 14 11 11 Z" fill={INDIGO} />
      <rect x="10" y="6" width="12" height="3.5" rx="1" fill={BROWN} />
      <circle cx="16" cy="19" r="4" fill={YELLOW} />
      <rect x="14.8" y="17.8" width="2.4" height="2.4" fill={INDIGO} />
    </>
  ),
  start: (
    <>
      <path d="M27 12 H14 V6 L4 16 L14 26 V20 H27 Z" fill={RED} />
      <circle cx="24" cy="16" r="2.2" fill={YELLOW} />
    </>
  ),
  jail: (
    <>
      <rect x="6" y="5" width="20" height="22" rx="2" fill={BROWN} />
      <rect x="9" y="8" width="14" height="16" fill={CREAM} />
      <path d="M12 8 V24 M16 8 V24 M20 8 V24" fill="none" strokeWidth={2.4} />
    </>
  ),
  // Cầu Bến Thủy: a steel truss bridge over the Lam River
  bridge: (
    <>
      <path d="M2 24 Q8 22 16 24 T30 24 V28 H2 Z" fill={SKY} />
      <path d="M3 19 H29" fill="none" strokeWidth={2.4} />
      <path d="M5 19 L9 12 H23 L27 19 M9 12 L13 19 L16 12 L19 19 L23 12" fill="none" />
      <path d="M8 19 V24 M24 19 V24" fill="none" />
    </>
  ),
  police: (
    <>
      <path d="M5 15 Q16 4 27 15 Z" fill={INDIGO} />
      <path d="M4 15 H28 L25 19 H7 Z" fill={GREEN} />
      <circle cx="16" cy="11" r="2.4" fill={YELLOW} />
      <path d="M10 24 L16 28 L22 24" fill="none" strokeWidth={2.4} />
    </>
  ),
  coins: (
    <>
      <ellipse cx="16" cy="22" rx="10" ry="4" fill={YELLOW} />
      <ellipse cx="16" cy="17" rx="10" ry="4" fill={YELLOW} />
      <ellipse cx="16" cy="12" rx="10" ry="4" fill={YELLOW} />
      <rect x="14.5" y="10.5" width="3" height="3" fill={PINK} />
    </>
  ),
  // Music: two notes
  music: (
    <>
      <path d="M12 23 V9 L25 6 V20 M12 13 L25 10" fill="none" strokeWidth={2.2} />
      <ellipse cx="8.6" cy="23" rx="4" ry="3" fill={RED} />
      <ellipse cx="21.6" cy="20" rx="4" ry="3" fill={RED} />
    </>
  ),
  dice: (
    <>
      <rect x="5" y="5" width="22" height="22" rx="5" fill={CREAM} />
      <circle cx="11" cy="11" r="2.3" fill={RED} stroke="none" />
      <circle cx="16" cy="16" r="2.3" fill="currentColor" stroke="none" />
      <circle cx="21" cy="21" r="2.3" fill="currentColor" stroke="none" />
    </>
  ),
  house: (
    <>
      <rect x="7.5" y="14" width="17" height="12" fill={CREAM} />
      <path d="M4 15 L16 5 L28 15 Z" fill={RED} />
      <rect x="14" y="18.5" width="4.5" height="7.5" fill={BROWN} />
    </>
  ),
  handshake: (
    <>
      <path d="M2.5 13 L8 10 L13 12 L19 9.5 L24 10 L29.5 13 V18.5 L23 21 L17 25.5 Q15.5 26.5 14 25.5 L8 21 L2.5 18.5 Z" fill={YELLOW} />
      <path d="M13 12 L10 16 Q11.5 17.5 13.5 15.5 L16 13.5 L22.5 19 M17 25.5 L12.5 21.5 M20 23.3 L15.5 19.3" fill="none" />
    </>
  ),
  // The tutorial: an unrolled scroll
  scroll: (
    <>
      <rect x="8" y="6" width="17" height="20" fill={CREAM} />
      <rect x="5" y="4" width="22" height="4" rx="2" fill={RED} />
      <rect x="5" y="24" width="22" height="4" rx="2" fill={RED} />
      <path d="M11.5 12 H21.5 M11.5 16 H21.5 M11.5 20 H18" fill="none" />
    </>
  ),
  gear: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x="14" y="3" width="4" height="6" rx="1" fill={SKY} transform={`rotate(${a} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="9" fill={SKY} />
      <circle cx="16" cy="16" r="3.5" fill={CREAM} />
    </>
  ),
  globe: (
    <>
      <circle cx="16" cy="16" r="11" fill={SKY} />
      <ellipse cx="16" cy="16" rx="4.5" ry="11" fill="none" />
      <path d="M5 16 H27 M7 10 H25 M7 22 H25" fill="none" strokeWidth={1.4} />
    </>
  ),
  speaker: (
    <>
      <path d="M4 12 H9.5 L16.5 6 V26 L9.5 20 H4 Z" fill={YELLOW} />
      <path d="M20.5 11.5 Q23.5 16 20.5 20.5 M24 8 Q29.5 16 24 24" fill="none" />
    </>
  ),
  mute: (
    <>
      <path d="M4 12 H9.5 L16.5 6 V26 L9.5 20 H4 Z" fill={YELLOW} />
      <path d="M20.5 12 L28 20 M28 12 L20.5 20" fill="none" stroke={RED} strokeWidth={2.4} />
    </>
  ),
  sun: (
    <>
      <path d="M16 2.5 V7 M16 25 V29.5 M2.5 16 H7 M25 16 H29.5 M6.5 6.5 L9.5 9.5 M22.5 22.5 L25.5 25.5 M25.5 6.5 L22.5 9.5 M9.5 22.5 L6.5 25.5" fill="none" />
      <circle cx="16" cy="16" r="6.5" fill={YELLOW} />
    </>
  ),
  moon: <path d="M19 4 A12 12 0 1 0 28 21 A9.5 9.5 0 1 1 19 4 Z" fill={YELLOW} />,
  // Follow the device: the sun by day, the moon by night
  autoTheme: (
    <>
      <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M5 5 L7 7 M17 5 L15 7 M5 19 L7 17" fill="none" />
      <circle cx="12" cy="12" r="5.5" fill={YELLOW} />
      <path d="M22 13 A8 8 0 1 0 30 25 A6 6 0 1 1 22 13 Z" fill={INDIGO} />
    </>
  ),
  // A buffalo that wandered onto the road: body, head and the big curved horns
  buffalo: (
    <>
      <path d="M5 13 Q4 22 8 23 L9 28 M14 23 L14 28 M21 23 L22 28" fill="none" />
      <path d="M6 12 Q10 9 18 10 L22 12 Q24 20 20 23 L9 23 Q4 22 6 12 Z" fill="#4a4a4a" />
      <circle cx="25" cy="14" r="4.5" fill="#4a4a4a" />
      <path d="M22 10 Q20 4 25 5 M28 10 Q31 4 26 5" fill="none" strokeWidth={2.4} />
      <circle cx="26.5" cy="13.5" r="0.9" fill={CREAM} />
    </>
  ),
  // Con Vàng, the village dog, running off with something in its mouth
  dog: (
    <>
      <path d="M6 15 Q2 12 3 8" fill="none" />
      <path d="M9 21 L6 26 M12 21 L13 26 M18 21 L16 26 M21 20 L24 25" fill="none" />
      <path d="M6 18 Q5 12 9 12 L19 12 Q23 12 23 16 L23 19 Q22 21 19 21 L9 21 Q6 21 6 18 Z" fill={YELLOW} />
      <path d="M20 13 Q20 7 25 7 Q29 7 29 11 L30 13 Q29 15 26 15 Q22 15 20 13 Z" fill={YELLOW} />
      <path d="M22 8 L20.5 3.5 L25 7 Z" fill={BROWN} />
      <circle cx="25.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="29.6" cy="12.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // A hen from the yard: red comb, yellow beak, a dark green tail
  chicken: (
    <>
      <path d="M12 24 L11 29 M17 24 L18 29 M9 29 H13 M16 29 H20" fill="none" />
      <path d="M8 17 Q2 13 5 6 Q8 11 11 13 Z" fill={GREEN} />
      <path d="M6 18 Q6 25 14 25 Q22 25 23 17 L24 13 Q19 13 17 12 Q9 11 6 18 Z" fill={BROWN} />
      <path d="M11 18 Q14 22 18 18" fill="none" />
      <circle cx="22" cy="10" r="4" fill={BROWN} />
      <path d="M19.5 6.8 Q20.5 3.5 22 5.8 Q23.2 3.5 24.8 6.6 Z" fill={RED} />
      <path d="M25.8 9 L29.5 10.6 L25.8 12.2 Z" fill={YELLOW} />
      <path d="M24.2 13.4 Q25.4 16.4 23.4 16.2 Z" fill={RED} />
      <circle cx="23.2" cy="9.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // A xe ôm: a motorbike taxi through the traffic
  xeOm: (
    <>
      <circle cx="8" cy="23" r="4.5" fill={CREAM} />
      <circle cx="25" cy="23" r="4.5" fill={CREAM} />
      <path d="M8 23 L13 15 H21 L25 23 M13 15 L11 11 H15 M21 15 L23 11" fill="none" />
      <path d="M14 15 Q17 12 21 15 Z" fill={RED} />
    </>
  ),
  // Dép lào: the sole and its strap (thrown, lovingly, online)
  slipper: (
    <>
      <path d="M16 3 C9 3 7 9 8 16 C9 24 11 29 16 29 C21 29 23 24 24 16 C25 9 23 3 16 3 Z" fill={SKY} />
      <path d="M9 13 L16 17.5 L23 13" fill="none" stroke={RED} strokeWidth={3} />
      <circle cx="16" cy="17.5" r="1.6" fill={RED} />
    </>
  ),
  // Bánh chưng: a green square cake tied with bamboo strings
  banhChung: (
    <>
      <rect x="5" y="5" width="22" height="22" rx="2" fill={GREEN} />
      <path d="M5 12.5 H27 M5 19.5 H27 M12.5 5 V27 M19.5 5 V27" fill="none" stroke={CREAM} strokeWidth={1.6} />
    </>
  ),
  // A player at the table
  person: (
    <>
      <circle cx="16" cy="10" r="5.5" fill={CREAM} />
      <path d="M6 28 Q6 18 16 18 Q26 18 26 28 Z" fill={RED} />
    </>
  ),
  // A computer player: a little robot head with an antenna
  bot: (
    <>
      <path d="M16 4 V8" fill="none" />
      <circle cx="16" cy="4" r="1.6" fill={YELLOW} />
      <rect x="6" y="8" width="20" height="16" rx="4" fill={SKY} />
      <circle cx="12" cy="15" r="2.4" fill={CREAM} />
      <circle cx="20" cy="15" r="2.4" fill={CREAM} />
      <path d="M12 20 H20" fill="none" />
      <path d="M4 14 V18 M28 14 V18" fill="none" />
      <path d="M11 24 V28 M21 24 V28" fill="none" />
    </>
  ),
  save: (
    <>
      <path d="M5 5 H23 L27 9 V27 H5 Z" fill={INDIGO} />
      <rect x="9" y="5" width="12" height="7" fill={CREAM} />
      <rect x="9" y="17" width="14" height="10" fill={CREAM} />
    </>
  ),
  trophy: (
    <>
      <path d="M9 5 H23 V11 Q23 19 16 19 Q9 19 9 11 Z" fill={YELLOW} />
      <path d="M9 8 H5 Q5 14 10 14 M23 8 H27 Q27 14 22 14" fill="none" />
      <path d="M14 19 H18 V23 H14 Z" fill={YELLOW} />
      <rect x="10" y="23" width="12" height="4" rx="1" fill={BROWN} />
    </>
  ),
  chart: (
    <>
      <path d="M5 4 V27 H28" fill="none" />
      <rect x="9" y="16" width="4" height="11" fill={RED} />
      <rect x="15" y="10" width="4" height="17" fill={YELLOW} />
      <rect x="21" y="6" width="4" height="21" fill={GREEN} />
    </>
  ),
  // Đèn lồng: a festival lantern
  lantern: (
    <>
      <path d="M16 1.5 V5" fill="none" />
      <rect x="11" y="5" width="10" height="3" rx="1" fill={YELLOW} />
      <ellipse cx="16" cy="15" rx="10" ry="7.5" fill={RED} />
      <path d="M16 7.5 V22.5 M11 8.5 Q8 15 11 21.5 M21 8.5 Q24 15 21 21.5" fill="none" strokeWidth={1.2} />
      <rect x="11" y="22" width="10" height="3" rx="1" fill={YELLOW} />
      <path d="M14 25 V30 M16 25 V30.5 M18 25 V30" fill="none" stroke={RED} />
    </>
  ),
  chat: (
    <>
      <path d="M5 6 H27 V21 H14 L8 27 V21 H5 Z" fill={CREAM} />
      <circle cx="11" cy="13.5" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13.5" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="21" cy="13.5" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 16 Q16 3 29.5 16 Q16 29 2.5 16 Z" fill={CREAM} />
      <circle cx="16" cy="16" r="5" fill={INDIGO} />
      <circle cx="17.5" cy="14.5" r="1.4" fill={CREAM} stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="16" cy="17" r="11" fill={CREAM} />
      <path d="M16 10 V17 L21 20" fill="none" strokeWidth={2.2} />
      <path d="M13 3.5 H19" fill="none" strokeWidth={2.4} />
    </>
  ),
  medalGold: medal(YELLOW, '1'),
  medalSilver: medal(SILVER, '2'),
  medalBronze: medal(BRONZE, '3'),
  // Hoa mai, for the Tết theme
  blossom: (
    <>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx="16" cy="8.5" r="6" fill={YELLOW} transform={`rotate(${a} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="3.5" fill={RED} />
    </>
  ),
  // Waves, for the Chàm theme
  wave: (
    <>
      <path d="M3 19 Q9 11 15 19 T27 19 V27 H3 Z" fill={INDIGO} />
      <path d="M3 12 Q9 4 15 12 T27 12" fill="none" />
    </>
  ),
  contrast: (
    <>
      <circle cx="16" cy="16" r="11" fill="#fff" />
      <path d="M16 5 A11 11 0 0 1 16 27 Z" fill="#000" />
    </>
  ),
  // Bankrupt: an empty purse
  purse: (
    <>
      <path d="M8 12 Q4 27 16 27 Q28 27 24 12 Z" fill={BROWN} />
      <path d="M8 12 Q16 8 24 12" fill="none" />
      <path d="M12 9 Q16 3 20 9" fill="none" />
      <path d="M13 19 L19 19" fill="none" stroke={CREAM} strokeWidth={2} />
    </>
  ),
  // The get-out-of-jail card: a ticket with notched sides
  ticket: (
    <>
      <path
        d="M4 9 H28 V13 A3 3 0 0 0 28 19 V23 H4 V19 A3 3 0 0 0 4 13 Z"
        fill={YELLOW}
      />
      <path d="M11 9 V23" fill="none" strokeDasharray="2 2" />
      <path d="M15 14 H24 M15 18 H21" fill="none" />
    </>
  ),
};

interface Props {
  name: IconName;
  size?: number | string;
  title?: string;
}

export function Icon({ name, size = '1em', title }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className="icon"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      strokeLinecap="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {DRAWINGS[name]}
    </svg>
  );
}

const TRANSPORT_ICONS: Record<number, IconName> = { 5: 'bus', 15: 'ship', 25: 'train', 35: 'plane' };
const UTILITY_ICONS: Record<number, IconName> = { 12: 'power', 28: 'water' };

/** Which icon a space shows, or null for colored properties. */
export function spaceIconName(index: number): IconName | null {
  const space = BOARD[index];
  switch (space.kind) {
    case 'start':
      return 'start';
    case 'jail':
      return 'jail';
    case 'rest':
      return 'bridge';
    case 'goToJail':
      return 'police';
    case 'card':
      return space.deck;
    case 'tax':
      return 'tax';
    case 'transport':
      return TRANSPORT_ICONS[index] ?? 'bus';
    case 'utility':
      return UTILITY_ICONS[index] ?? 'power';
    case 'property':
      return null;
  }
}

/** The icon for a space, ready to put in the page, or null for colored properties. */
export function spaceIcon(index: number): ReactNode {
  const name = spaceIconName(index);
  return name ? <Icon name={name} /> : null;
}
