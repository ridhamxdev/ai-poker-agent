import mongoose, { Schema } from 'mongoose';
import { IGame, Card, Player, GameAction, Winner } from '../types';

const cardSchema = new Schema<Card>({
  suit: {
    type: String,
    enum: ['hearts', 'diamonds', 'clubs', 'spades'],
    required: true
  },
  rank: {
    type: String,
    enum: ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'],
    required: true
  }
});

const playerSchema = new Schema<Player>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  username: {
    type: String,
    required: true
  },
  chips: {
    type: Number,
    required: true
  },
  cards: [cardSchema],
  position: {
    type: String,
    enum: ['dealer', 'smallBlind', 'bigBlind', 'none'],
    required: true
  },
  currentBet: {
    type: Number,
    default: 0
  },
  totalBet: {
    type: Number,
    default: 0
  },
  folded: {
    type: Boolean,
    default: false
  },
  allIn: {
    type: Boolean,
    default: false
  },
  isAI: {
    type: Boolean,
    default: false
  },
  aiId: {
    type: String,
    default: null
  },
  hasActed: {
    type: Boolean,
    default: false
  }
});

const gameActionSchema = new Schema<GameAction>({
  player: {
    type: Number,
    required: true
  },
  action: {
    type: String,
    enum: ['fold', 'call', 'raise', 'check', 'all-in'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  }
});

const winnerSchema = new Schema<Winner>({
  playerId: {
    type: String,
    required: true
  },
  winningHand: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
});

const gameSchema = new Schema<IGame>({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  players: [playerSchema],
  gameType: {
    type: String,
    enum: ['pvp', 'ai-training', 'ai-vs-human'],
    required: true
  },
  gameState: {
    type: String,
    enum: ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown', 'finished'],
    default: 'waiting'
  },
  pot: {
    type: Number,
    default: 0
  },
  communityCards: [cardSchema],
  deck: [cardSchema],
  currentPlayer: {
    type: Number,
    default: 0
  },
  dealerPosition: {
    type: Number,
    default: 0
  },
  smallBlind: {
    type: Number,
    default: 50
  },
  bigBlind: {
    type: Number,
    default: 100
  },
  bettingRound: {
    type: Number,
    default: 0
  },
  currentBet: {
    type: Number,
    default: 0
  },
  lastAction: gameActionSchema,
  winner: winnerSchema,
  aiDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  minAIPlayers: {
    type: Number,
    default: 1
  },
  aiIds: [{
    type: String
  }],
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date
}, {
  timestamps: true
});

export default mongoose.model<IGame>('Game', gameSchema);
