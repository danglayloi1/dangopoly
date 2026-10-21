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
  | 'music';

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
