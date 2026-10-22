import type { Dice as DiceValues } from '../engine/types';

// Which of the 3×3 pip slots are filled for each face.
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// The cube's turn that brings each face to the front (faces sit on the cube as in folk.css:
// 1 front, 2 right, 3 top, 4 bottom, 5 left, 6 back, like a real die where opposites add to 7).
const SHOW_FACE: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateY(-90deg)',
  3: 'rotateX(-90deg)',
  4: 'rotateX(90deg)',
  5: 'rotateY(90deg)',
  6: 'rotateY(180deg)',
};

function Face({ n }: { n: number }) {
  // Traditional Vietnamese dice have red pips on the 1 and the 4.
  return (
    <div className={`die-face face-${n}${n === 1 || n === 4 ? ' red-pips' : ''}`}>
      {Array.from({ length: 9 }, (_, slot) => (
        <span key={slot} className={PIPS[n].includes(slot) ? 'pip' : ''} />
      ))}
    </div>
  );
}

/** One die as a small 3D cube: it spins while rolling, then turns to show `value`. */
function Die({ value, rolling }: { value: number | null; rolling: boolean }) {
  if (value === null && !rolling) return <div className="die blank" role="img" aria-label="–" />;
  return (
    <div className="die" role="img" aria-label={rolling || value === null ? '…' : String(value)}>
      <div className={`die-cube${rolling ? ' rolling' : ''}`} style={rolling ? undefined : { transform: SHOW_FACE[value!] }}>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Face key={n} n={n} />
        ))}
      </div>
    </div>
  );
}

/** Two dice. While `rolling`, they spin; then each settles on its number. */
export function Dice({ dice, rolling = false }: { dice: DiceValues | null; rolling?: boolean }) {
  return (
    <div className="dice">
      <Die value={dice?.[0] ?? null} rolling={rolling} />
      <Die value={dice?.[1] ?? null} rolling={rolling} />
    </div>
  );
}
