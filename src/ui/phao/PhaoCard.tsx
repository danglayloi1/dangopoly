import type { CSSProperties, ReactNode } from 'react';
import { kindOf, type Card, type CardKind } from '../../games/phao/cards';
import { PHAO_TEXT } from '../../games/phao/text';
import { useLang } from '../../i18n/LangContext';

// Small woodblock-style drawings for each kind of card, in a 40×40 box. Ink outlines, flat colors.
const INK = '#2b2420';
const stroke = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const ART: Record<CardKind, ReactNode> = {
  // A lit firecracker: a red tube with gold bands, a fuse and its spark.
  phao: (
    <>
      <rect x="13" y="14" width="14" height="22" rx="2" fill="#c8372d" {...stroke} />
      <path d="M13 19h14M13 31h14" stroke="#e0b44a" strokeWidth="2" />
      <path d="M20 14c0-4 3-5 5-8" fill="none" {...stroke} />
      <path d="M25 6l1.5-3M25 6l3 .5M25 6l-.5 3.2M25 6l-2.6-1.6" stroke="#e0a01a" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  // A wooden bucket of water.
  xo: (
    <>
      <path d="M10 15h20l-2.5 20h-15z" fill="#4f8fbf" {...stroke} />
      <path d="M11 21h18M12 29h16" stroke="#2b2420" strokeWidth="1.1" opacity="0.5" />
      <path d="M10 15c0-8 20-8 20 0" fill="none" {...stroke} />
      <path d="M12 15c2.5 2 13.5 2 16 0" fill="#bfe1f5" stroke="none" />
      <path d="M31 22c1.6 2 1.6 3.5 0 4.5-1.6-1-1.6-2.5 0-4.5z" fill="#4f8fbf" {...stroke} strokeWidth="1" />
    </>
  ),
  // Dodging: a path that swerves around a spark.
  ne: (
    <>
      <circle cx="20" cy="20" r="4.5" fill="#e0a01a" {...stroke} />
      <path d="M8 34c10 0 2-26 22-26" fill="none" {...stroke} strokeWidth="2.6" />
      <path d="M26 4.5l5 3.5-4.5 4" fill="none" {...stroke} strokeWidth="2.6" />
    </>
  ),
  // Shoving: a big arrow with ×2.
  day: (
    <>
      <path d="M6 15h15v-6l13 11-13 11v-6H6z" fill="#c8372d" {...stroke} />
      <path d="M3 13h2M2 20h3M3 27h2" {...stroke} />
      <text x="13" y="23.5" fontSize="9" fontWeight="900" fill="#fbf6e8" fontFamily="sans-serif" textAnchor="middle">
        ×2
      </text>
    </>
  ),
  // Peeking: an eye.
  nhom: (
    <>
      <path d="M4 20c8-11 24-11 32 0-8 11-24 11-32 0z" fill="#fbf6e8" {...stroke} />
      <circle cx="20" cy="20" r="6" fill="#3f8a3c" {...stroke} />
      <circle cx="20" cy="20" r="2.4" fill={INK} />
      <circle cx="22" cy="18" r="1" fill="#fbf6e8" />
    </>
  ),
  // Shaking the deck: two crossing arrows.
  xoc: (
    <>
      <path d="M6 12h7c8 0 8 16 16 16h3M6 28h7c3 0 4.5-2.5 6-5.5M23 14.5c1.5-1.5 3-2.5 6-2.5h3" fill="none" {...stroke} strokeWidth="2.4" />
      <path d="M29 8l4 4-4 4M29 24l4 4-4 4" fill="none" {...stroke} strokeWidth="2.4" />
    </>
  ),
  // Drawing from the bottom: a stack with an arrow out from under it.
  day2: (
    <>
      <rect x="9" y="6" width="18" height="6" rx="1.5" fill="#fbf6e8" {...stroke} />
      <rect x="9" y="12" width="18" height="6" rx="1.5" fill="#fbf6e8" {...stroke} />
      <rect x="9" y="18" width="18" height="6" rx="1.5" fill="#e0a01a" {...stroke} />
      <path d="M18 26v9M14 31l4 4 4-4" fill="none" {...stroke} strokeWidth="2.2" />
    </>
  ),
  // Begging: an open bowl with a coin dropping in.
  xin: (
    <>
      <path d="M6 22h28c0 8-6 13-14 13S6 30 6 22z" fill="#8a5a3b" {...stroke} />
      <circle cx="20" cy="11" r="5" fill="#e0b44a" {...stroke} />
      <path d="M20 8.5v5" stroke={INK} strokeWidth="1.2" />
      <path d="M12 26c3 2 13 2 16 0" fill="none" stroke="#fbf6e8" strokeWidth="1.2" opacity="0.6" />
    </>
  ),
  // Bánh chưng: a green square cake tied with bamboo strings.
  banhChung: (
    <>
      <rect x="8" y="8" width="24" height="24" rx="2" fill="#3f8a3c" {...stroke} />
      <path d="M16 8v24M24 8v24M8 16h24M8 24h24" stroke="#e8d9a8" strokeWidth="1.6" />
    </>
  ),
  // Kẹo cu đơ: a slab of peanut candy between rice papers.
  cuDo: (
    <>
      <rect x="5" y="12" width="30" height="16" rx="3" fill="#f3e6c2" {...stroke} />
      <rect x="9" y="15" width="22" height="10" rx="2" fill="#9a5b2b" {...stroke} strokeWidth="1.2" />
      <circle cx="14" cy="19" r="1.3" fill="#f3e6c2" />
      <circle cx="20" cy="21.5" r="1.3" fill="#f3e6c2" />
      <circle cx="26" cy="18.5" r="1.3" fill="#f3e6c2" />
    </>
  ),
  // Cam Vinh: a green-skinned orange with a leaf.
  camVinh: (
    <>
      <circle cx="20" cy="23" r="12" fill="#e08a1e" {...stroke} />
      <path d="M12 18c4-4 12-4 16 0" fill="none" stroke="#7fae3f" strokeWidth="3" opacity="0.8" />
      <path d="M20 11c0-3 1-5 3-6" fill="none" {...stroke} />
      <path d="M22 9c3-4 9-3 10 0-3 2-7 3-10 0z" fill="#3f8a3c" {...stroke} strokeWidth="1.2" />
    </>
  ),
  // Nhút: a jar of pickled jackfruit.
  nhut: (
    <>
      <path d="M12 12h16v3c3 2 4 5 4 9v8c0 2-1 3-3 3H11c-2 0-3-1-3-3v-8c0-4 1-7 4-9z" fill="#c9a86a" {...stroke} />
      <rect x="11" y="7" width="18" height="5" rx="1.5" fill="#8a5a3b" {...stroke} />
      <path d="M12 23l4 6M17 22l3 7M22 23l2 6M26 22l2 5" stroke="#5f7f2f" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
};

/** The drawing for a kind of card. */
export function PhaoArt({ kind, size = 40 }: { kind: CardKind; size?: number | string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="phao-art">
      {ART[kind]}
    </svg>
  );
}

interface Props {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  glow?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * A Pháo Tết card: a band in the card's color with its name, and its drawing on cream paper. Built on
 * the playing cards' .pcard, so hands and piles lay out the same way.
 */
export function PhaoCard({ card, selected = false, disabled = false, glow = false, onClick, style }: Props) {
  const { uiLang } = useLang();
  const kind = kindOf(card);
  const name = PHAO_TEXT[uiLang].cards[kind].name;
  const className = `pcard phcard ph-${kind}${selected ? ' selected' : ''}${glow ? ' glow' : ''}`;
  const face = (
    <>
      <span className="phcard-name">{name}</span>
      <span className="phcard-art">
        <PhaoArt kind={kind} size="100%" />
      </span>
    </>
  );
  if (!onClick) {
    return (
      <span className={className} style={style} role="img" aria-label={name}>
        {face}
      </span>
    );
  }
  return (
    <button type="button" className={className} style={style} aria-pressed={selected} aria-label={name} disabled={disabled} onClick={onClick}>
      {face}
    </button>
  );
}

/** The back of a Pháo Tết card: red lacquer with a gold firecracker. */
export function PhaoCardBack({ style }: { style?: CSSProperties }) {
  return (
    <span className="pcard phcard back" style={style} aria-hidden="true">
      <span className="phcard-back-mark" />
    </span>
  );
}
