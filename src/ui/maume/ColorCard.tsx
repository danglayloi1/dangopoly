import type { CSSProperties } from 'react';
import { COLOR_FACE, COLOR_HEX, COLOR_INK, COLOR_SHAPES, colorOf, faceLabel, faceOf, FACE_WILD4, isWild, type Card } from '../../games/maume/cards';
import { cardName, MAUME_TEXT } from '../../games/maume/text';
import { useLang } from '../../i18n/LangContext';

interface Props {
  card: Card;
  selected?: boolean;
  disabled?: boolean; // in your hand, but it can't be played now
  glow?: boolean; // a lesson points at it
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * A Màu Mè card: the whole card in its folk color (son, nghệ, lá, chàm) with a cream cartouche in the
 * middle; the color's shape in the corner, so it reads without the colors too. Wild cards are ink
 * black with the four colors in their cartouche. Built on the playing cards' .pcard, so hands and
 * piles lay out the same way.
 */
export function ColorCard({ card, selected = false, disabled = false, glow = false, onClick, style }: Props) {
  const { uiLang } = useLang();
  const wild = isWild(card);
  const color = colorOf(card);
  const label = faceLabel(card);
  const className = `pcard mcard${wild ? ' wild' : ''}${faceOf(card) > 9 ? ' action' : ''}${selected ? ' selected' : ''}${glow ? ' glow' : ''}`;
  const look = { ...style, ...(wild ? {} : { '--c': COLOR_HEX[color], '--on': COLOR_INK[color], '--face': COLOR_FACE[color] }) } as CSSProperties;
  const face = (
    <>
      <span className="mcard-corner">{label}</span>
      <span className="mcard-panel" aria-hidden="true">
        <span className={`mcard-face${label.length > 1 ? ' long' : ''}`}>{label}</span>
      </span>
      <span className="mcard-shape" aria-hidden="true">
        {wild ? (faceOf(card) === FACE_WILD4 ? '+4' : '✦') : COLOR_SHAPES[color]}
      </span>
    </>
  );
  const name = cardName(MAUME_TEXT[uiLang], card);
  if (!onClick) {
    return (
      <span className={className} style={look} role="img" aria-label={name}>
        {face}
      </span>
    );
  }
  return (
    <button type="button" className={className} style={look} aria-pressed={selected} aria-label={name} disabled={disabled} onClick={onClick}>
      {face}
    </button>
  );
}

/** The back of a Màu Mè card: ink black, with the four colors' shapes. */
export function ColorCardBack({ style }: { style?: CSSProperties }) {
  return (
    <span className="pcard mcard back" style={style} aria-hidden="true">
      <span className="mcard-back-shapes">
        {COLOR_SHAPES.map((s, i) => (
          <span key={i} style={{ color: COLOR_HEX[i] }}>
            {s}
          </span>
        ))}
      </span>
    </span>
  );
}
