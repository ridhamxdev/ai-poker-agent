import { Document, Types } from 'mongoose';

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
}

export interface Hand {
  cards: Card[];
  rank: number;
  name: string;
  highCard?: Card;
}

export interface Player {
  userId?: Types.ObjectId | null;
  username: string;
  chips: number;
  cards: Card[];
  position: 'dealer' | 'smallBlind' | 'bigBlind';
  currentBet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  isAI: boolean;
}

export interface GameAction {
  player: number;
  action: 'fold' | 'call' | 'raise' | 'check';
  amount: number;
  timestamp: Date;
}

export interface Winner {
  playerId: string;
  winningHand: string;
  amount: number;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  chips: number;
  gamesPlayed: number;
  gamesWon: number;
  totalWinnings: number;
  level: number;
  experience: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IGame extends Document {
  gameId: string;
  players: Player[];
  gameType: 'pvp' | 'ai-training' | 'ai-vs-human';
  gameState: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
  pot: number;
  communityCards: Card[];
  deck: Card[];
  currentPlayer: number;
  dealerPosition: number;
  smallBlind: number;
  bigBlind: number;
  bettingRound: number;
  lastAction: GameAction;
  winner?: Winner;
  aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  startTime: Date;
  endTime?: Date;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  username?: string;
}

export interface GameState {
  currentPlayer: number;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  bettingHistory: number[];
  gameState: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
}

export interface AIDecision {
  action: 'fold' | 'call' | 'raise' | 'check';
  amount?: number;
  probability: number;
  reasoning: string;
  isBluff?: boolean;
}

export interface CFRStrategy {
  [action: string]: number;
}

export interface CFRNode {
  infoSet: string;
  strategy: CFRStrategy;
  regretSum: CFRStrategy;
  strategySum: CFRStrategy;
}

export type GameType = 'pvp' | 'ai-training' | 'ai-vs-human';
export type GameStateType = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
export type ActionType = 'fold' | 'call' | 'raise' | 'check';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface SocketUser extends AuthenticatedUser {
  socketId: string;
}

export interface GameRoom {
  gameId: string;
  players: SocketUser[];
  gameEngine: any; // We'll type this properly later
  ai?: any; // We'll type this properly later
}
