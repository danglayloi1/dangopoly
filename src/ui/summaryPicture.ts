// The end-of-game summary drawn as a picture (PNG) to share or keep: the ranking with each player's
// token, the wealth chart, titles and new badges, printed like a folk card. Always in the Giấy dó
// colors, whatever the theme on screen, so every shared picture looks alike.

import boardArt from '../assets/art/board.webp';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { playerColor } from './look';

const W = 1080;
const H = 1350;
const PAPER = '#f3e7cc';
const INK = '#2b2420';
const MUTED = '#6b5a48';
const RED = '#b8322a';
const GOLD = '#c99a2e';
const MEDALS = ['#d9a62e', '#a8aeb5', '#b0703a'];
const SERIF = '"Playfair Display", Georgia, serif';
const SANS = '"Be Vietnam Pro", system-ui, sans-serif';
const BRUSH = '"Water Brush", "Playfair Display", serif';

export interface PictureText {
  title: string; // "Tổng kết ván"
  edition: string; // "Phiên bản Nghệ Tĩnh"
  how: string; // how the game ended and who won
  rounds: string; // "12 vòng"
  bankrupt: string;
  titlesHeading: string;
  titles: string[]; // "Vua thu tô: Đăng"
  newBadges: string;
  badges: string[]; // "Đăng: Dựng đình"
  site: string;
}

/** Loads an SVG (e.g. a token as drawn on screen) as an image for the canvas. */
function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', '96');
  copy.setAttribute('height', '96');
  copy.style.color = INK; // currentColor outlines
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], { type: 'image/svg+xml' }));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url)) as Promise<HTMLImageElement | null>;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/**
 * Draws the picture. `ranking` is the players best first; `tokens` are their token drawings from
 * the screen (by player id), so the picture shows exactly what the players chose.
 */
export async function drawSummary(
  game: GameState,
  ranking: readonly number[],
  worth: readonly number[],
  tokens: ReadonlyMap<number, SVGSVGElement>,
  text: PictureText,
): Promise<Blob | null> {
  await Promise.all([document.fonts.load(`96px ${BRUSH}`), document.fonts.load(`700 40px ${SERIF}`), document.fonts.load(`600 30px ${SANS}`)]).catch(() => {});
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Paper with a printed double frame and gold corners.
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.fillStyle = GOLD;
  for (const [x, y] of [[44, 44], [W - 44, 44], [44, H - 44], [W - 44, H - 44]]) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = `110px ${BRUSH}`;
  ctx.fillText('Dangopoly', W / 2 + 4, 168);
  ctx.fillStyle = RED;
  ctx.fillText('Dangopoly', W / 2, 164);
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${SERIF}`;
  ctx.fillText(`${text.title} · ${text.edition}`, W / 2, 252);
  ctx.fillStyle = MUTED;
  ctx.font = `500 28px ${SANS}`;
  ctx.fillText(fitText(ctx, `${text.how} · ${text.rounds}`, W - 160), W / 2, 298);

  // Ranking
  const images = await Promise.all(ranking.map((id) => (tokens.get(id) ? svgImage(tokens.get(id)!) : Promise.resolve(null))));
  let y = 336;
  ranking.forEach((id, i) => {
    const p = game.players[id];
    ctx.fillStyle = '#fbf4e4';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(90, y, W - 180, 84, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = playerColor(p);
    ctx.fillRect(90, y, 14, 84);
    // medal
    ctx.fillStyle = p.bankrupt ? MUTED : (MEDALS[i] ?? MUTED);
    ctx.beginPath();
    ctx.arc(150, y + 42, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `800 26px ${SANS}`;
    ctx.fillText(String(i + 1), 150, y + 51);
    const img = images[i];
    if (img) ctx.drawImage(img, 188, y + 12, 60, 60);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `700 34px ${SANS}`;
    ctx.fillText(fitText(ctx, p.name, 420), 270, y + 54);
    ctx.textAlign = 'right';
    ctx.font = `800 34px ${SANS}`;
    ctx.fillStyle = p.bankrupt ? MUTED : INK;
    ctx.fillText(p.bankrupt ? text.bankrupt : formatMoney(worth[id]), W - 120, y + 54);
    ctx.textAlign = 'center';
    y += 100;
  });

  // Wealth chart
  const chart = { x: 120, y: y + 20, w: W - 240, h: 260 };
  const rows = game.worth;
  const max = Math.max(1, ...rows.flat()) * 1.05;
  ctx.strokeStyle = 'rgba(43, 36, 32, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  for (const f of [0, 0.5, 1]) {
    const ly = chart.y + chart.h * (1 - f);
    ctx.beginPath();
    ctx.moveTo(chart.x, ly);
    ctx.lineTo(chart.x + chart.w, ly);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (rows.length > 1) {
    game.players.forEach((p) => {
      ctx.strokeStyle = playerColor(p);
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      rows.forEach((row, r) => {
        const px = chart.x + (r / (rows.length - 1)) * chart.w;
        const py = chart.y + chart.h * (1 - row[p.id] / max);
        if (r === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    });
  }
  y = chart.y + chart.h + 40;

  // Titles and new badges, two columns
  const column = (heading: string, lines: string[], x: number) => {
    if (!lines.length) return;
    ctx.textAlign = 'left';
    ctx.fillStyle = RED;
    ctx.font = `800 30px ${SERIF}`;
    ctx.fillText(heading, x, y + 30);
    ctx.fillStyle = INK;
    ctx.font = `500 25px ${SANS}`;
    lines.slice(0, 6).forEach((line, i) => ctx.fillText(fitText(ctx, `◆ ${line}`, 400), x, y + 72 + i * 38));
  };
  column(text.titlesHeading, text.titles, 110);
  column(text.newBadges, text.badges, text.titles.length ? W / 2 + 20 : 110);
  const lines = Math.min(6, Math.max(text.titles.length, text.badges.length));
  y += lines ? 72 + lines * 38 : 0;

  // The rest of the paper: the Lam River picture from the board, in a printed frame.
  const art = await loadImage(boardArt);
  const space = { x: 90, y: y + 10, w: W - 180, h: H - 120 - (y + 10) };
  if (art && space.h > 120) {
    const scale = Math.max(space.w / art.width, space.h / art.height);
    const sw = space.w / scale;
    const sh = space.h / scale;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(space.x, space.y, space.w, space.h, 14);
    ctx.clip();
    ctx.drawImage(art, (art.width - sw) / 2, (art.height - sh) / 2, sw, sh, space.x, space.y, space.w, space.h);
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(space.x, space.y, space.w, space.h, 14);
    ctx.stroke();
  }

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = `600 24px ${SANS}`;
  ctx.fillText(text.site, W / 2, H - 70);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// The picture is drawn as soon as the summary opens, so these run straight from the tap: browsers
// only let a page share or copy right after the person taps something.

/** Opens the phone's share sheet with the picture. False if this browser can't (or the share failed). */
export async function sharePicture(blob: Blob, fileName: string, title: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: 'image/png' });
  if (!navigator.canShare?.({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title });
    return true;
  } catch (error) {
    return (error as DOMException).name === 'AbortError'; // closing the share sheet isn't a failure
  }
}

/** Puts the picture on the clipboard, to paste into a chat. False if this browser won't. */
export async function copyPicture(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

/** Saves the picture as a file. */
export function savePicture(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Whether this browser can share a picture (show the Share button only then). */
export function canSharePictures(): boolean {
  try {
    const probe = new File([new Blob()], 'probe.png', { type: 'image/png' });
    return Boolean(navigator.canShare?.({ files: [probe] }));
  } catch {
    return false;
  }
}

/** Whether this browser can copy a picture to the clipboard (show the Copy button only then). */
export function canCopyPictures(): boolean {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function';
}
