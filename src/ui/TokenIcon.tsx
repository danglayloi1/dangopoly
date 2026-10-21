import type { ReactNode } from 'react';
import type { TokenId } from '../data/tokens';

// The six local tokens as little woodblock stamps: pigment colors with ink outlines,
// on a disc of the player's color inside a gold rim.
const INK = '#2b2420';
const CREAM = '#f6ecd4';
const STRAW = '#e8c872';
const GOLD = '#d9ae4f';

const DRAWINGS: Record<TokenId, ReactNode> = {
  // Nón lá: conical hat with its ribs and chin strap
  nonLa: (
    <>
      <path d="M16 6 L27 21.5 Q16 25 5 21.5 Z" fill={STRAW} />
      <path d="M16 6 L12.5 23.6 M16 6 L19.5 23.6" fill="none" strokeWidth="0.8" />
      <path d="M9 22.6 Q16 28.5 23 22.6" fill="none" stroke={CREAM} strokeWidth="1.6" />
    </>
  ),
  // Con trâu: buffalo head with curved horns
  conTrau: (
    <>
      <path d="M6 11 Q3 5 10 6.5 L12.5 11 Z M26 11 Q29 5 22 6.5 L19.5 11 Z" fill={CREAM} />
      <ellipse cx="16" cy="16" rx="7" ry="8" fill="#4d4642" />
      <ellipse cx="16" cy="21" rx="4.6" ry="3.1" fill="#9a8c80" />
      <circle cx="13" cy="14.5" r="1.1" fill={CREAM} stroke="none" />
      <circle cx="19" cy="14.5" r="1.1" fill={CREAM} stroke="none" />
    </>
  ),
  // Quả cam Xã Đoài: orange with a leaf
  quaCam: (
    <>
      <circle cx="16" cy="18" r="8.6" fill="#e8892b" />
      <path d="M16 9.5 Q19 4 24.5 6 Q21.5 10.5 16 9.5 Z" fill="#5c8a3a" />
      <path d="M11.5 15 Q12.5 12.5 15 12" fill="none" stroke={CREAM} strokeWidth="1.4" />
    </>
  ),
  // Bóng đá SLNA: football
  bongDa: (
    <>
      <circle cx="16" cy="16" r="9.6" fill={CREAM} />
      <path d="M16 11.5 L20.3 14.6 L18.7 19.6 H13.3 L11.7 14.6 Z" fill={INK} />
      <path d="M16 11.5 V6.5 M20.3 14.6 L25 13 M18.7 19.6 L21.5 24 M13.3 19.6 L10.5 24 M11.7 14.6 L7 13" fill="none" strokeWidth="1" />
    </>
  ),
  // Kẹo cu đơ: candy slab between two sheets of rice paper
  keoCuDo: (
    <>
      <rect x="5" y="9" width="22" height="14" rx="2" fill={CREAM} />
      <rect x="7" y="12.5" width="18" height="7" rx="1" fill="#8a5a2b" />
      <circle cx="11" cy="16" r="1.1" fill={STRAW} stroke="none" />
      <circle cx="16" cy="15" r="1.1" fill={STRAW} stroke="none" />
      <circle cx="21" cy="16.5" r="1.1" fill={STRAW} stroke="none" />
    </>
  ),
  // Xe đạp: bicycle, drawn as cream lines with an ink edge
  xeDap: (
    <>
      <g fill="none" strokeWidth="3.4">
        <circle cx="9" cy="20" r="5" />
        <circle cx="23" cy="20" r="5" />
        <path d="M9 20 L14 12 H21 L23 20 M14 12 L16.5 20 L21 12 M12 9 H16 M21 12 L20 8 H23" />
      </g>
      <g fill="none" stroke={CREAM} strokeWidth="1.6">
        <circle cx="9" cy="20" r="5" />
        <circle cx="23" cy="20" r="5" />
        <path d="M9 20 L14 12 H21 L23 20 M14 12 L16.5 20 L21 12 M12 9 H16 M21 12 L20 8 H23" />
      </g>
    </>
  ),
};

interface Props {
  token: TokenId;
  color: string;
  size?: number | string;
  title?: string;
}

export function TokenIcon({ token, color, size = 32, title }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className="token-icon"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      stroke={INK}
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <circle cx="16" cy="16" r="15.3" fill={GOLD} />
      <circle cx="16" cy="16" r="12.6" fill={color} />
      <g transform="translate(4.2 4.2) scale(0.74)">{DRAWINGS[token]}</g>
    </svg>
  );
}
