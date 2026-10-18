import type { TokenId } from '../data/tokens';

export interface Player {
  id: number; // index in GameState.players
  name: string;
  token: TokenId;
  cash: number; // đồng
  position: number; // board index 0..39
  bankrupt: boolean;
}

export interface Ownership {
  owner: number; // player id
  houses: number; // 0..4 houses, 5 = hotel
  mortgaged: boolean;
}

/** Why a player has to pay; used for the log once the debt is paid. */
export type PaymentReason = { kind: 'rent'; space: number } | { kind: 'tax'; space: number };

/** What the game is waiting for. Each phase allows only certain actions (see legalActions). */
export type Phase =
  | { kind: 'awaitRoll' }
  | { kind: 'awaitBuy'; space: number }
  | { kind: 'awaitEndTurn' }
  | {
      kind: 'inDebt';
      debtor: number;
      creditor: number | null; // null = the bank
      amount: number;
      reason: PaymentReason;
    }
  | { kind: 'gameOver'; winner: number };

export type Dice = [number, number];

export type Action =
  | { type: 'ROLL'; dice?: Dice } // `dice` forces the result (tutorial and tests)
  | { type: 'BUY' }
  | { type: 'DECLINE' }
  | { type: 'PAY_DEBT' }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'END_TURN' };

export type ActionType = Action['type'];

/** Structured history, so the UI can show it in either language. */
export type LogEntry =
  | { type: 'turnStarted'; player: number }
  | { type: 'rolled'; player: number; dice: Dice }
  | { type: 'moved'; player: number; to: number }
  | { type: 'passedStart'; player: number; amount: number }
  | { type: 'bought'; player: number; space: number; price: number }
  | { type: 'declined'; player: number; space: number }
  | { type: 'paidRent'; player: number; to: number; space: number; amount: number }
  | { type: 'paidTax'; player: number; space: number; amount: number }
  | { type: 'cannotPay'; player: number; amount: number }
  | { type: 'bankrupt'; player: number; creditor: number | null }
  | { type: 'won'; player: number };

export interface GameState {
  players: Player[];
  current: number; // id of the player whose turn it is
  ownership: Record<number, Ownership>; // board index -> owner info; missing = bank owns it
  phase: Phase;
  dice: Dice | null; // last roll this turn
  doublesCount: number; // doubles rolled in a row this turn
  rngState: number;
  log: LogEntry[];
}
