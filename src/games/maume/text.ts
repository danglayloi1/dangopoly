// Màu Mè's words, in the three languages the hub speaks.

import type { UiLang } from '../../data/text';
import { colorOf, FACE_SKIP, faceOf, isWild, type Card } from './cards';

const vi = {
  name: 'Màu Mè',
  blurb: 'Bài bốn màu: theo màu hoặc theo số; Chặn, Quay, +2, Đổi màu và +4. Chơi với máy, hoặc online.',
  vsBots: 'Chơi với máy',
  vsBotsHint: 'Một mình cũng chơi được: đấu với 1–3 người máy.',
  online: 'Chơi online',
  onlineHint: 'Mỗi người cầm điện thoại của mình; chỉ thấy bài của mình. Thiếu người thì thêm máy.',
  colors: ['Son', 'Nghệ', 'Lá', 'Chàm'],
  faces: ['Chặn', 'Quay', '+2', 'Đổi màu', '+4'], // the action cards, in FACE_ order
  draw: 'Rút bài',
  pass: 'Bỏ lượt',
  yourTurn: 'Tới lượt bạn',
  turnBadge: 'Đang đánh',
  turnOf: (name: string) => `Lượt của ${name}`,
  thinking: (name: string) => `${name} đang tính…`,
  follow: (color: string, face: string) => `Đánh lá màu ${color}, lá ${face}, hoặc lá Đổi màu. Không có thì rút.`,
  followColor: (color: string) => `Đánh lá màu ${color}, hoặc lá Đổi màu. Không có thì rút.`,
  mustDraw: (n: number) => `Bị phạt ${n} lá: cộng dồn bằng lá +2/+4, hoặc rút.`,
  mustDraw4: (n: number) => `Bị phạt ${n} lá: cộng dồn bằng lá +4, hoặc rút.`,
  drewFits: 'Lá vừa rút đánh được: đánh luôn, hoặc bỏ lượt.',
  nothingToDraw: 'Hết bài để rút: bỏ lượt.',
  pickColor: 'Chọn màu tiếp theo',
  colorNow: (color: string) => `Màu: ${color}`,
  penalty: (n: number) => `+${n}`,
  deck: (n: number) => `Nọc: ${n} lá`,
  cards: (n: number) => `${n} lá`,
  lastCardBadge: 'Báo!',
  played: (name: string, card: string) => `${name} đánh ${card}`,
  playedWild: (name: string, card: string, color: string) => `${name} đánh ${card}, đổi sang màu ${color}`,
  drew: (name: string, n: number) => (n === 0 ? `${name} hết bài để rút` : `${name} rút ${n} lá`),
  forcedDraw: (name: string, n: number) => `${name} bị phạt rút ${n} lá`,
  passed: (name: string) => `${name} bỏ lượt`,
  skipped: (name: string) => `${name} mất lượt`,
  reversed: 'Quay đầu!',
  lastCard: (name: string) => `${name}: Báo! Còn 1 lá`,
  reshuffled: 'Xào lại bài trên bàn để rút tiếp',
  won: (name: string, points: number) => `${name} thắng ván, được ${points} điểm`,
  dealt: (game: number, card: string) => `Ván ${game}: lật lá ${card}`,
  game: (n: number) => `Ván ${n}`,
  gameOver: 'Hết ván',
  winner: (name: string, points: number) => `${name} hết bài trước, ăn ${points} điểm`,
  points: 'Điểm',
  nextGame: 'Ván mới',
  toMenu: 'Về menu Màu Mè',
  waitingDeal: (name: string) => `Chờ ${name} chia ván mới…`,
  inRoom: (code: string) => `Màu Mè · Phòng ${code}`,
  table: 'Bàn',
};

export type MauMeText = typeof vi;

const en: MauMeText = {
  name: 'Màu Mè',
  blurb: 'A four-color card game: match the color or the number; Skip, Reverse, +2, Wild and +4. Against the computer, or online.',
  vsBots: 'Play against the computer',
  vsBotsHint: 'On your own: take on 1–3 computer players.',
  online: 'Play online',
  onlineHint: 'Everyone on their own phone, seeing only their own cards. Short of players? Add computer ones.',
  colors: ['Vermilion', 'Turmeric', 'Leaf', 'Indigo'],
  faces: ['Skip', 'Reverse', '+2', 'Wild', '+4'],
  draw: 'Draw',
  pass: 'Pass',
  yourTurn: 'Your turn',
  turnBadge: 'Playing',
  turnOf: (name) => `${name}'s turn`,
  thinking: (name) => `${name} is thinking…`,
  follow: (color, face) => `Play a ${color} card, a ${face}, or a Wild. Nothing? Draw.`,
  followColor: (color) => `Play a ${color} card, or a Wild. Nothing? Draw.`,
  mustDraw: (n) => `${n} cards to draw: add a +2 or +4 to pass them on, or draw.`,
  mustDraw4: (n) => `${n} cards to draw: add a +4 to pass them on, or draw.`,
  drewFits: 'The card you drew fits: play it, or pass.',
  nothingToDraw: 'Nothing left to draw: pass.',
  pickColor: 'Choose the next color',
  colorNow: (color) => `Color: ${color}`,
  penalty: (n) => `+${n}`,
  deck: (n) => `Deck: ${n} ${n === 1 ? 'card' : 'cards'}`,
  cards: (n) => `${n} ${n === 1 ? 'card' : 'cards'}`,
  lastCardBadge: 'Last card!',
  played: (name, card) => `${name} plays ${card}`,
  playedWild: (name, card, color) => `${name} plays ${card} and picks ${color}`,
  drew: (name, n) => (n === 0 ? `Nothing left for ${name} to draw` : `${name} draws ${n}`),
  forcedDraw: (name, n) => `${name} has to draw ${n}`,
  passed: (name) => `${name} passes`,
  skipped: (name) => `${name} is skipped`,
  reversed: 'Reverse!',
  lastCard: (name) => `${name}: last card!`,
  reshuffled: 'The pile is shuffled back into the deck',
  won: (name, points) => `${name} wins the game: ${points} points`,
  dealt: (game, card) => `Game ${game}: ${card} turned up`,
  game: (n) => `Game ${n}`,
  gameOver: 'Game over',
  winner: (name, points) => `${name} went out first and scores ${points}`,
  points: 'Points',
  nextGame: 'New game',
  toMenu: 'Back to the Màu Mè menu',
  waitingDeal: (name) => `Waiting for ${name} to deal again…`,
  inRoom: (code) => `Màu Mè · Room ${code}`,
  table: 'Table',
};

const nghe: MauMeText = {
  ...vi,
  blurb: 'Bài bốn màu: theo màu hay theo số; Chặn, Quay, +2, Đổi màu với +4. Nhởi với máy, hay online.',
  vsBots: 'Nhởi với máy',
  vsBotsHint: 'Một mình cũng nhởi được: đấu với 1–3 cấy máy.',
  online: 'Nhởi online',
  onlineHint: 'Mỗi đứa cầm điện thoại của mình, chỉ chộ bài của mình. Thiếu người thì thêm máy.',
  yourTurn: 'Tới lượt mi',
  thinking: (name) => `${name} đang tính răng đây…`,
  follow: (color, face) => `Đánh lá màu ${color}, lá ${face}, hay lá Đổi màu. Nỏ có thì rút.`,
  followColor: (color) => `Đánh lá màu ${color}, hay lá Đổi màu. Nỏ có thì rút.`,
  nothingToDraw: 'Hết bài rút rồi: bỏ lượt.',
  passed: (name) => `${name} bỏ lượt, nỏ đánh`,
  lastCard: (name) => `${name}: Báo! Còn một lá nữa thôi`,
};

export const MAUME_TEXT: Record<UiLang, MauMeText> = { vi, en, nghe };

/** A card's name for the log and screen readers: "Son 7", "Lá +2", "Đổi màu". */
export function cardName(text: MauMeText, card: Card): string {
  const face = faceOf(card);
  const label = face <= 9 ? String(face) : text.faces[face - FACE_SKIP];
  return isWild(card) ? label : `${text.colors[colorOf(card)]} ${label}`;
}

/** The face alone, as the "follow" hint says it: "7", "Chặn". */
export function faceName(text: MauMeText, card: Card): string {
  const face = faceOf(card);
  return face <= 9 ? String(face) : text.faces[face - FACE_SKIP];
}
