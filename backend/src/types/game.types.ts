export interface Player {
  id: string;
  username: string;
  chips: number;
  socketId: string;
  cards?: string[];
  bet?: number;
  folded?: boolean;
}

export type GameState = 'waiting' | 'playing' | 'finished';

export type ActionType = 'check' | 'call' | 'bet' | 'raise' | 'fold' | 'all-in';

export interface GameRoom {
  id: string;
  players: Player[];
  state: GameState;
  maxPlayers: number;
  currentTurn: number;
  pot?: number;
  communityCards?: string[];
  currentBet?: number;
}

export interface GameAction {
  playerId: string;
  type: ActionType;
  amount?: number;
}

export interface RoundResult {
  winners: Player[];
  pot: number;
  hands?: {
    playerId: string;
    cards: string[];
    handRank: string;
  }[];
}