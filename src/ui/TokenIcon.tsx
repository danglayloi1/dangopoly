import type { ReactNode } from 'react';
import type { TokenId } from '../data/tokens';

// Simple flat drawings of the six local tokens, drawn in white on the player's color.
const DRAWINGS: Record<TokenId, ReactNode> = {
  // Nón lá: conical hat with a chin strap
  nonLa: (
    <>
      <path d="M16 6 L27 22 Q16 25 5 22 Z" fill="currentColor" />
      <path d="M9 22.6 Q16 28 23 22.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  // Con trâu: buffalo head with curved horns
  conTrau: (
    <>
      <path d="M5 10 Q4 5 10 7 L12 11 Z M27 10 Q28 5 22 7 L20 11 Z" fill="currentColor" />
      <ellipse cx="16" cy="16" rx="7" ry="8" fill="currentColor" />
      <ellipse cx="16" cy="21" rx="4.5" ry="3" fill="rgba(0,0,0,0.25)" />
    </>
  ),
  // Quả cam Xã Đoài: orange with a leaf
  quaCam: (
    <>
      <circle cx="16" cy="18" r="9" fill="currentColor" />
      <path d="M16 9 Q19 4 24 6 Q21 10 16 9 Z" fill="currentColor" />
    </>
  ),
  // Bóng đá SLNA: football
  bongDa: (
    <>
      <circle cx="16" cy="16" r="10" fill="currentColor" />
      <path d="M16 11 L20.5 14.3 L18.8 19.5 H13.2 L11.5 14.3 Z" fill="rgba(0,0,0,0.35)" />
    </>
  ),
  // Kẹo cu đơ: candy slab between two sheets of rice paper
  keoCuDo: (
    <>
      <rect x="5" y="9" width="22" height="14" rx="2" fill="currentColor" />
      <rect x="7" y="13" width="18" height="6" rx="1" fill="rgba(0,0,0,0.25)" />
      <circle cx="11" cy="16" r="1" fill="currentColor" />
      <circle cx="16" cy="15" r="1" fill="currentColor" />
      <circle cx="21" cy="16.5" r="1" fill="currentColor" />
    </>
  ),
  // Xe đạp: bicycle
  xeDap: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
      <circle cx="9" cy="20" r="5" />
      <circle cx="23" cy="20" r="5" />
      <path d="M9 20 L14 12 H21 L23 20 M14 12 L16.5 20 L21 12 M12 9 H16 M21 12 L20 8 H23" />
    </g>
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
      style={{ color: '#fff' }}
    >
      <circle cx="16" cy="16" r="16" fill={color} />
      <g transform="translate(3.2 3.2) scale(0.8)">{DRAWINGS[token]}</g>
    </svg>
  );
}
