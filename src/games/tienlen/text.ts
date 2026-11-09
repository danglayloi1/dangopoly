// Tiến lên's words, in the three languages the hub speaks (kept with the game, not in the big list).

import type { UiLang } from '../../data/text';
import type { ComboKind } from './combos';
import type { InstantWin } from './game';

const vi = {
  name: 'Tiến lên',
  blurb: 'Tiến lên miền Nam: ai đánh hết bài trước thì thắng. Chơi với máy.',
  you: 'Bạn',
  yourName: 'Tên bạn',
  opponents: 'Đối thủ',
  addBot: 'Thêm máy',
  deal: 'Chia bài',
  play: 'Đánh',
  pass: 'Bỏ lượt',
  hint: 'Gợi ý',
  yourTurn: 'Tới lượt bạn',
  turnOf: (name: string) => `Lượt của ${name}`,
  thinking: (name: string) => `${name} đang tính…`,
  lead: 'Bạn đi trước: đánh bộ nào cũng được.',
  mustInclude: (card: string) => `Ván đầu: bộ đầu tiên phải có lá ${card}.`,
  beat: 'Chặn bằng bộ cùng kiểu, cao hơn, hoặc bỏ lượt.',
  pick: 'Chạm vào bài để chọn.',
  notCombo: 'Mấy lá này không thành bộ.',
  tooLow: 'Bộ này không chặn được bài trên bàn.',
  mustHave: (card: string) => `Phải có lá ${card}.`,
  youAreOut: (place: string) => `Bạn về ${place}! Chờ mọi người đánh nốt…`,
  cards: (n: number) => `${n} lá`,
  passed: 'Bỏ lượt',
  places: ['Nhất', 'Nhì', 'Ba'],
  last: 'Bét',
  kinds: {
    single: 'Rác',
    pair: 'Đôi',
    triple: 'Sám',
    quad: 'Tứ quý',
    straight: 'Sảnh',
    pairRun: 'Đôi thông',
  } as Record<ComboKind, string>,
  instant: {
    fourTwos: 'tứ quý heo',
    dragon: 'sảnh rồng',
    sixPairs: 'sáu đôi',
    fivePairRun: 'năm đôi thông',
  } as Record<InstantWin, string>,
  played: (name: string, what: string) => `${name} đánh ${what}`,
  chopped: (name: string, what: string) => `${name} chặt bằng ${what}!`,
  passedLog: (name: string) => `${name} bỏ lượt`,
  roundWon: (name: string) => `${name} thắng vòng, đi tiếp`,
  finished: (name: string, place: string) => `${name} về ${place}`,
  instantWin: (name: string, how: string) => `${name} tới trắng: ${how}!`,
  dealt: (game: number) => `Ván ${game}: chia bài`,
  game: (n: number) => `Ván ${n}`,
  gameOver: 'Hết ván',
  points: 'Điểm',
  nextGame: 'Ván mới',
  toHub: 'Về Sân nhởi',
  table: 'Bàn',
};

export type TienLenText = typeof vi;

const en: TienLenText = {
  name: 'Tiến lên',
  blurb: "Vietnam's favorite card game: first to empty their hand wins. Play against the computer.",
  you: 'You',
  yourName: 'Your name',
  opponents: 'Opponents',
  addBot: 'Add a computer player',
  deal: 'Deal',
  play: 'Play',
  pass: 'Pass',
  hint: 'Hint',
  yourTurn: 'Your turn',
  turnOf: (name) => `${name}'s turn`,
  thinking: (name) => `${name} is thinking…`,
  lead: 'You lead: play any combination.',
  mustInclude: (card) => `First game: the first play must include the ${card}.`,
  beat: 'Beat it with the same kind, higher, or pass.',
  pick: 'Tap cards to choose them.',
  notCombo: "Those cards don't make a combination.",
  tooLow: "That doesn't beat what's on the table.",
  mustHave: (card) => `It must include the ${card}.`,
  youAreOut: (place) => `You came ${place}! Waiting for the others to finish…`,
  cards: (n) => `${n} ${n === 1 ? 'card' : 'cards'}`,
  passed: 'Passed',
  places: ['1st', '2nd', '3rd'],
  last: 'Last',
  kinds: {
    single: 'Single',
    pair: 'Pair',
    triple: 'Triple',
    quad: 'Four of a kind',
    straight: 'Straight',
    pairRun: 'Pairs in a row',
  },
  instant: {
    fourTwos: 'four 2s',
    dragon: 'a dragon straight',
    sixPairs: 'six pairs',
    fivePairRun: 'five pairs in a row',
  },
  played: (name, what) => `${name} plays ${what}`,
  chopped: (name, what) => `${name} bombs it with ${what}!`,
  passedLog: (name) => `${name} passes`,
  roundWon: (name) => `${name} wins the round and leads`,
  finished: (name, place) => `${name} finishes ${place}`,
  instantWin: (name, how) => `${name} wins on the deal: ${how}!`,
  dealt: (game) => `Game ${game}: cards dealt`,
  game: (n) => `Game ${n}`,
  gameOver: 'Game over',
  points: 'Points',
  nextGame: 'New game',
  toHub: 'Back to Sân nhởi',
  table: 'Table',
};

const nghe: TienLenText = {
  ...vi,
  blurb: 'Tiến lên miền Nam: đứa mô đánh hết bài trước thì thắng. Nhởi với máy.',
  yourName: 'Tên mi',
  yourTurn: 'Tới lượt mi',
  thinking: (name) => `${name} đang tính răng đây…`,
  lead: 'Mi đi trước: đánh bộ mô cũng được.',
  pick: 'Chạm vô bài để chọn.',
  notCombo: 'Mấy lá ni nỏ thành bộ.',
  tooLow: 'Bộ ni nỏ chặn được bài trên bàn.',
  youAreOut: (place) => `Mi về ${place}! Chờ mấy đứa nớ đánh nốt…`,
  passedLog: (name) => `${name} bỏ lượt, nỏ đánh`,
  toHub: 'Về Sân nhởi',
};

export const TIENLEN_TEXT: Record<UiLang, TienLenText> = { vi, en, nghe };

/** "Nhất", "Nhì", "Ba", or "Bét" for whoever came last. */
export function placeName(text: TienLenText, place: number, players: number): string {
  return place === players ? text.last : text.places[place - 1];
}
