import type { MissionId } from './missions';
import type { ColorGroup } from '../data/board';
import type { CardDeck } from '../data/cards';
import type { PlayerColorId } from '../data/colors';
import type { TokenId } from '../data/tokens';

/** One secret mission. Online, others' unfinished ones arrive with id null: they're secret. */
export interface MissionSlot {
  id: MissionId | null;
  done: boolean;
}

/** How well a computer player plays (see engine/bot.ts). */
export type BotLevel = 'easy' | 'normal' | 'hard';

export interface Player {
  id: number; // index in GameState.players
  name: string;
  bot?: BotLevel; // a computer player; people have no level
  anVaUsed?: boolean; // Chế độ Việt: this player has thrown their one tantrum (Ăn vạ) this game
  missions?: MissionSlot[]; // Chế độ Việt: secret missions (see engine/missions.ts)
  token: TokenId;
  color: PlayerColorId;
  cash: number; // đồng
  position: number; // board index 0..39
  bankrupt: boolean;
  inJail: boolean;
  jailAttempts: number; // failed rolls for doubles while in jail (max 3)
  jailCards: CardDeck[]; // "Ra tù miễn phí" cards held, and which deck each came from
}

export interface Ownership {
  owner: number; // player id
  houses: number; // 0..4 houses, 5 = hotel
  mortgaged: boolean;
}

/** Why a player has to pay; used for the log once the debt is paid. */
export type PaymentReason =
  | { kind: 'rent'; space: number }
  | { kind: 'tax'; space: number }
  | { kind: 'card' } // a card that says "pay" (incl. repairs)
  | { kind: 'payEach'; each: number } // a card: pay every other player `each`
  | { kind: 'jailFine' }; // third failed attempt to roll out of jail

/** What the game is waiting for. Each phase allows only certain actions (see legalActions). */
export type Phase =
  | { kind: 'awaitRoll' }
  // price: what it costs after haggling (Mặc cả), if the player haggled
  | { kind: 'awaitBuy'; space: number; price?: number; haggled?: boolean }
  | { kind: 'awaitEndTurn' }
  | {
      kind: 'inDebt';
      debtor: number;
      creditor: number | null; // null = the bank (or, for payEach, the other players)
      amount: number;
      reason: PaymentReason;
    }
  | { kind: 'gameOver'; winner: number }
  // Chế độ Việt: stuck in rush-hour traffic on `space`, `remaining` steps short; pay a xe ôm or wait
  | { kind: 'inJam'; space: number; remaining: number }
  // Chế độ Việt: landed on the buffalo; lead it home (then land as usual) or ride it
  | { kind: 'buffalo'; space: number; rentMultiplier?: number; utilityPerPip?: number }
  // A trade offer waits for the other player's answer, then the turn carries on where it was.
  | { kind: 'tradeOffer'; offer: TradeOffer; resume: TradablePhase };

/** The phases in which the current player may propose a trade. */
export type TradablePhase = Extract<Phase, { kind: 'awaitRoll' | 'awaitEndTurn' }>;

/** What one side of a trade hands over. */
export interface TradeSide {
  spaces: number[]; // board indices
  cash: number; // đồng
  jailCards: number; // how many "Ra tù miễn phí" cards
}

/** `from` (the current player) offers `give` to `to`, and asks for `take` in return. */
export interface TradeOffer {
  from: number;
  to: number;
  give: TradeSide;
  take: TradeSide;
}

export type Dice = [number, number];

/**
 * How the game ends: when one player is left (classic), after a set number of rounds, or when
 * the time is up. With a limit, the richest player wins (see worthOf in rounds.ts).
 */
export type GameMode =
  | { kind: 'classic' }
  | { kind: 'rounds'; rounds: number }
  | { kind: 'time'; minutes: number; endsAt: number }; // endsAt: ms since 1970

export interface Rules {
  mode: GameMode;
  festivals: boolean; // every few rounds, a local festival changes one rule for a round
  viet?: VietRules; // missing: all off (and in games saved before Chế độ Việt)
}

/** Chế độ Việt: optional rules with a Vietnamese twist, each on or off. */
export interface VietRules {
  tet: boolean; // every TET_EVERY rounds it's Tết: the richest gives the poorest lì xì
  anVa: boolean; // once a game, a player who can't pay a debt throws a tantrum and 20% is forgiven
  macCa: boolean; // before buying, haggle once: 20% off, or the seller sulks and adds 10%
  funnyCards: boolean; // extra Cơ hội / Khí vận cards with silly stories
  missions: boolean; // each player gets two secret missions; finishing one pays a reward
  traffic: boolean; // rush hour: moving through a jam spot stops you, unless you pay a xe ôm
  buffalo: boolean; // now and then a buffalo wanders onto a space and blocks the way
}

export type FestivalId =
  | 'denCuong'
  | 'langSen'
  | 'gioLao'
  | 'chieuTrung'
  | 'cuaLo'
  | 'muaCuoi'
  | 'nangNong'
  | 'muaBao'
  | 'choPhien'
  | 'hoiVat'
  | 'anXa'
  | 'duocMua'
  | 'hongSon'
  | 'dongGop'
  | 'tuongThan'
  | 'luaChin';

/** The festival of the current round; group is the color set it doubles the rent of (Đền Cuông). */
export interface Festival {
  id: FestivalId;
  group: ColorGroup | null;
}

/** Counted during the game for the summary at the end. */
export interface PlayerStats {
  rentPaid: number;
  rentReceived: number;
  jailed: number; // times sent to jail
  doubles: number;
  bought: number; // properties bought from the bank
  housesBuilt: number;
  laps: number; // times passing Xuất phát
  trades: number; // trades agreed
  cards: number; // cards drawn
}

export type EndReason = 'lastStanding' | 'rounds' | 'time';

export type Action =
  | { type: 'ROLL'; dice?: Dice } // `dice` forces the result (tutorial and tests)
  | { type: 'BUY' }
  | { type: 'DECLINE' }
  | { type: 'PAY_DEBT' }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'END_TURN' }
  // Getting out of jail before rolling
  | { type: 'PAY_JAIL_FINE' }
  | { type: 'USE_JAIL_CARD' }
  // Managing your properties (see buildings.ts for when each is allowed)
  | { type: 'BUILD_HOUSE'; space: number }
  | { type: 'SELL_HOUSE'; space: number }
  | { type: 'MORTGAGE'; space: number }
  | { type: 'UNMORTGAGE'; space: number }
  // Trading (see trading.ts)
  | { type: 'PROPOSE_TRADE'; offer: TradeOffer }
  | { type: 'ACCEPT_TRADE' }
  | { type: 'REJECT_TRADE' }
  // Timed games: the time is up (sent at the start of a turn; whoever sends it checks the clock)
  | { type: 'TIME_UP' }
  // Chế độ Việt
  | { type: 'HAGGLE' } // Mặc cả: try for a better price before buying
  | { type: 'AN_VA' } // Ăn vạ: the debtor's once-a-game tantrum
  | { type: 'XE_OM' } // stuck in a jam: pay a xe ôm and go on
  | { type: 'WAIT_IN_JAM' } // ...or wait, and stay on the jam spot
  | { type: 'LEAD_BUFFALO' } // a buffalo in the way: pay to have it led home
  | { type: 'RIDE_BUFFALO' }; // ...or ride it somewhere

export type ActionType = Action['type'];
export type PropertyAction = Extract<Action, { space: number }>;
/** Actions that need no extra details: one button each. Excludes property actions and proposing a trade. */
export type TurnActionType = Exclude<ActionType, PropertyAction['type'] | 'PROPOSE_TRADE'>;

export type JailReason = 'space' | 'doubles' | 'card';
export type JailExit = 'doubles' | 'fine' | 'card' | 'forcedFine';

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
  | { type: 'builtHouse'; player: number; space: number; houses: number; cost: number }
  | { type: 'soldHouse'; player: number; space: number; houses: number; refund: number }
  | { type: 'mortgaged'; player: number; space: number; amount: number }
  | { type: 'unmortgaged'; player: number; space: number; amount: number }
  | { type: 'tradeProposed'; offer: TradeOffer }
  | { type: 'tradeAccepted'; offer: TradeOffer }
  | { type: 'tradeRejected'; offer: TradeOffer }
  | { type: 'drewCard'; player: number; deck: CardDeck; card: number }
  | { type: 'cardCollected'; player: number; amount: number }
  | { type: 'cardPaid'; player: number; amount: number }
  | { type: 'paidEach'; player: number; each: number }
  | { type: 'collectedFromEach'; player: number; total: number }
  | { type: 'wentToJail'; player: number; reason: JailReason }
  | { type: 'stayedInJail'; player: number; attempt: number }
  | { type: 'leftJail'; player: number; how: JailExit }
  | { type: 'bankrupt'; player: number; creditor: number | null }
  | { type: 'won'; player: number }
  | { type: 'roundStarted'; round: number }
  | { type: 'festival'; festival: Festival; round: number }
  | { type: 'festivalGift'; amount: number }
  | { type: 'festivalBonus'; player: number; amount: number; reason: 'doubles' | 'card' }
  | { type: 'festivalTaxFree'; player: number; space: number }
  | { type: 'festivalAmnesty'; players: number[] }
  | { type: 'festivalLevy'; total: number }
  | { type: 'festivalShare'; to: number; total: number }
  | { type: 'limitReached'; reason: 'rounds' | 'time' }
  // Chế độ Việt
  | { type: 'tetLiXi'; from: number; to: number; amount: number; round: number }
  | { type: 'haggled'; player: number; space: number; price: number; won: boolean }
  | { type: 'anVa'; player: number; forgiven: number }
  | { type: 'missionDone'; player: number; mission: MissionId; reward: number }
  | { type: 'jam'; player: number; space: number; remaining: number }
  | { type: 'xeOm'; player: number; fee: number }
  | { type: 'buffaloArrived'; space: number }
  | { type: 'buffaloMet'; player: number; space: number }
  | { type: 'buffaloLed'; player: number; fee: number }
  | { type: 'buffaloRide'; player: number; steps: number };

export interface GameState {
  players: Player[];
  current: number; // id of the player whose turn it is
  ownership: Record<number, Ownership>; // board index -> owner info; missing = bank owns it
  phase: Phase;
  dice: Dice | null; // last roll this turn
  doublesCount: number; // doubles rolled in a row this turn
  extraRoll: boolean; // the last roll earns another one (doubles, not from jail, not sent to jail)
  decks: Record<CardDeck, number[]>; // card indices into CARDS, top of the deck first
  lastCard: { deck: CardDeck; card: number } | null; // the card drawn this turn, to show it
  rngState: number;
  log: LogEntry[];
  rules: Rules;
  round: number; // 1 for the first round; a round ends when play comes back around to the first player
  festival: Festival | null;
  buffalo?: number | null; // Chế độ Việt: the space a buffalo stands on this round, if any // the festival of this round, if any
  stats: PlayerStats[]; // by player id
  worth: number[][]; // each player's worth at the start of every round (and at the end)
  endReason: EndReason | null;
}
