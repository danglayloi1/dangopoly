import { useMemo } from 'react';
import { encode } from 'uqr';

/** A QR code for `text`, drawn as an SVG (dark ink on white, so phone cameras read it in any theme). */
export function QrCode({ text, size = 168, label }: { text: string; size?: number; label: string }) {
  const { path, n } = useMemo(() => {
    const { data } = encode(text, { ecc: 'M', border: 2 });
    let d = '';
    data.forEach((row, y) => row.forEach((dark, x) => dark && (d += `M${x} ${y}h1v1h-1z`)));
    return { path: d, n: data.length };
  }, [text]);
  return (
    <svg className="qr-code" viewBox={`0 0 ${n} ${n}`} width={size} height={size} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      <path d={path} fill="#2b2420" />
    </svg>
  );
}
