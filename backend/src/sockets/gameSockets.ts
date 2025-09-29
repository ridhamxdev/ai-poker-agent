import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import GameEngine from '../services/GameEngine';
import PokerAI from '../services/pokerAI';
import { verifyToken } from '../middleware/auth';
import { AuthenticatedUser, GameType, Difficulty, ActionType, GameState } from '../types';

interface AuthenticatedSocket extends Socket {
  user: AuthenticatedUser;
  gameId?: string;
}

interface CreateGameData {
  gameType: GameType;
  aiDifficulty: Difficulty;
}

interface MakeMoveData {
  gameId: string;
  action: ActionType;
  amount?: number;
}

interface TrainAIData {
  gameId: string;
  iterations?: number;
}

const activeGames = new Map<string, GameEngine>();
const aiInstances = new Map<string, PokerAI>();

export default (io: Server): void => {
  // Authentication middleware for socket connections
  io.use((socket: Socket, next) => {
    // Try to get token from auth or cookies
    const token = socket.handshake.auth.token || 
                 socket.handshake.headers.cookie?.match(/authToken=([^;]+)/)?.[1];
    
    if (token) {
      try {
        const decoded = verifyToken(token);
        (socket as AuthenticatedSocket).user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    } else {
      next(new Error('No token provided'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authenticatedSocket = socket as AuthenticatedSocket;
    console.log(`User connected: ${authenticatedSocket.user.userId}`);

    // Create or join a game
    authenticatedSocket.on('createGame', async (data: CreateGameData) => {
      try {
        const { gameType, aiDifficulty } = data;
        
        // Validate difficulty level
        const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
        if (!validDifficulties.includes(aiDifficulty)) {
          throw new Error(`Invalid difficulty level: ${aiDifficulty}. Must be one of: ${validDifficulties.join(', ')}`);
        }
        
        console.log(`\n🎮 CREATING AI GAME - Difficulty: ${aiDifficulty.toUpperCase()}, Type: ${gameType}`);
        
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const gameEngine = new GameEngine(gameId);
        
        // Fix: Convert string userId to ObjectId and provide proper types
        const players = [
          {
            userId: new Types.ObjectId(authenticatedSocket.user.userId),
            username: authenticatedSocket.user.username || 'Player',
            chips: 5000,
            isAI: false
          },
          {
            userId: undefined, // AI player has no userId
            username: `AI_${aiDifficulty}`,
            chips: 5000,
            isAI: true
          }
        ];

        const game = await gameEngine.initializeGame(players, gameType);
        activeGames.set(gameId, gameEngine);
        
        // Create AI instance for this game with validated difficulty
        const ai = new PokerAI(aiDifficulty);
        aiInstances.set(gameId, ai);
        
        console.log(`✅ AI Game Created - Game ID: ${gameId}, AI Difficulty: ${aiDifficulty.toUpperCase()}`);
        
        authenticatedSocket.join(gameId);
        authenticatedSocket.gameId = gameId;
        
        // Send initial game state (hide AI cards)
        const gameState = {
          ...game.toObject(),
          players: game.players.map(player => ({
            ...player,
            cards: player.isAI ? [] : player.cards // Hide AI cards from client
          }))
        };
        
        authenticatedSocket.emit('gameCreated', { 
          success: true,
          gameId, 
          gameState 
        });
        
        // If it's AI's turn, make AI move
        if (game.players[game.currentPlayer].isAI) {
          setTimeout(() => handleAIMove(gameId), 2000);
        }
        
      } catch (error) {
        console.error('Create game error:', error);
        authenticatedSocket.emit('error', { 
          success: false,
          message: (error as Error).message || 'Failed to create game',
          code: 'GAME_CREATION_ERROR'
        });
      }
    });

    // Player makes a move
    authenticatedSocket.on('makeMove', async (data: MakeMoveData) => {
      try {
        const { gameId, action, amount = 0 } = data;
        const gameEngine = activeGames.get(gameId);
        
        if (!gameEngine) {
          authenticatedSocket.emit('error', { 
            success: false,
            message: 'Game not found',
            code: 'GAME_NOT_FOUND'
          });
          return;
        }

        const updatedGame = await gameEngine.makeAction(
          gameId, 
          authenticatedSocket.user.userId, 
          action, 
          amount
        );

        // Broadcast updated game state
        const gameState = {
          ...updatedGame.toObject(),
          players: updatedGame.players.map(player => ({
            ...player,
            cards: player.isAI ? [] : player.cards
          }))
        };
        
        io.to(gameId).emit('gameUpdate', { 
          success: true,
          gameState,
          lastAction: {
            player: authenticatedSocket.user.username,
            action,
            amount
          }
        });

        // Observe opponent action for AI learning
        const ai = aiInstances.get(gameId);
        if (ai && !updatedGame.players[updatedGame.currentPlayer].isAI) {
          ai.observeOpponentAction(updatedGame.gameState, action, amount, updatedGame.pot);
        }

        // If it's AI's turn next, make AI move
        if (updatedGame.players[updatedGame.currentPlayer].isAI && 
            updatedGame.gameState !== 'finished') {
          setTimeout(() => handleAIMove(gameId), 1500);
        }

      } catch (error) {
        console.error('Make move error:', error);
        authenticatedSocket.emit('error', { 
          success: false,
          message: (error as Error).message || 'Failed to make move',
          code: 'MOVE_ERROR'
        });
      }
    });

    // Handle AI training request
    authenticatedSocket.on('trainAI', async (data: TrainAIData) => {
      try {
        const { gameId, iterations = 1000 } = data;
        const ai = aiInstances.get(gameId);
        
        if (!ai) {
          authenticatedSocket.emit('error', { 
            success: false,
            message: 'AI instance not found',
            code: 'AI_NOT_FOUND'
          });
          return;
        }

        authenticatedSocket.emit('trainingStarted', { 
          success: true,
          message: 'AI training in progress...',
          iterations
        });
        
        // Generate sample game states for training
        const sampleGameStates = generateTrainingData();
        
        // Run training in background
        setTimeout(async () => {
          try {
            ai.startTraining(sampleGameStates, iterations);
            authenticatedSocket.emit('trainingComplete', {
              success: true,
              message: 'AI training completed',
              stats: ai.getAIStats()
            });
          } catch (trainingError) {
            authenticatedSocket.emit('error', {
              success: false,
              message: 'Training failed',
              code: 'TRAINING_ERROR'
            });
          }
        }, 100);

      } catch (error) {
        console.error('Train AI error:', error);
        authenticatedSocket.emit('error', { 
          success: false,
          message: (error as Error).message || 'Failed to start training',
          code: 'TRAINING_START_ERROR'
        });
      }
    });

    // Get AI statistics
    authenticatedSocket.on('getAIStats', (data: { gameId: string }) => {
      try {
        const { gameId } = data;
        const ai = aiInstances.get(gameId);
        
        if (ai) {
          authenticatedSocket.emit('aiStats', {
            success: true,
            stats: ai.getAIStats()
          });
        } else {
          authenticatedSocket.emit('error', { 
            success: false,
            message: 'AI instance not found',
            code: 'AI_NOT_FOUND'
          });
        }
      } catch (error) {
        console.error('Get AI stats error:', error);
        authenticatedSocket.emit('error', {
          success: false,
          message: 'Failed to get AI stats',
          code: 'STATS_ERROR'
        });
      }
    });

    // Get game state
    authenticatedSocket.on('getGameState', async (data: { gameId: string }) => {
      try {
        const { gameId } = data;
        const gameEngine = activeGames.get(gameId);
        
        if (!gameEngine) {
          authenticatedSocket.emit('error', {
            success: false,
            message: 'Game not found',
            code: 'GAME_NOT_FOUND'
          });
          return;
        }

        const game = await gameEngine.getGameState(gameId);
        if (!game) {
          authenticatedSocket.emit('error', {
            success: false,
            message: 'Game state not found',
            code: 'GAME_STATE_NOT_FOUND'
          });
          return;
        }

        const gameState = {
          ...game.toObject(),
          players: game.players.map(player => ({
            ...player,
            cards: player.isAI ? [] : player.cards
          }))
        };

        authenticatedSocket.emit('gameState', {
          success: true,
          gameState
        });

      } catch (error) {
        console.error('Get game state error:', error);
        authenticatedSocket.emit('error', {
          success: false,
          message: 'Failed to get game state',
          code: 'GET_STATE_ERROR'
        });
      }
    });

    // Handle disconnection
    authenticatedSocket.on('disconnect', () => {
      console.log(`User disconnected: ${authenticatedSocket.user.userId}`);
      
      if (authenticatedSocket.gameId) {
        // Clean up game resources
        const gameEngine = activeGames.get(authenticatedSocket.gameId);
        if (gameEngine) {
          // Handle player disconnection (pause game, etc.)
          io.to(authenticatedSocket.gameId).emit('playerDisconnected', {
            success: false,
            userId: authenticatedSocket.user.userId,
            username: authenticatedSocket.user.username,
            message: 'Player disconnected'
          });
        }
      }
    });
  });

  // AI move handler
  async function handleAIMove(gameId: string): Promise<void> {
    try {
      const gameEngine = activeGames.get(gameId);
      const ai = aiInstances.get(gameId);
      
      if (!gameEngine || !ai) {
        console.log(`❌ AI Move Failed: Game engine or AI instance not found for game ${gameId}`);
        return;
      }

      const currentGame = await gameEngine.getGameState(gameId);
      if (!currentGame || currentGame.gameState === 'finished') {
        console.log(`❌ AI Move Failed: Game not found or finished for game ${gameId}`);
        return;
      }

      const currentPlayer = currentGame.players[currentGame.currentPlayer];
      if (!currentPlayer.isAI) {
        console.log(`❌ AI Move Failed: Current player is not AI for game ${gameId}`);
        return;
      }

      console.log(`\n🎮 AI MOVE INITIATED - Game: ${gameId}, Player: ${currentPlayer.username}`);
      console.log(`📊 Current Game State: ${currentGame.gameState}, Pot: $${currentGame.pot}`);

      // Get AI decision
      const decision = await ai.makeDecision(currentGame, currentPlayer.username);
      
      console.log(`🎯 AI DECISION MADE: ${decision.action}${decision.amount ? ` $${decision.amount}` : ''}`);
      console.log(`💭 AI Reasoning: ${decision.reasoning}`);
      
      // Execute AI move
      const updatedGame = await gameEngine.makeAction(
        gameId,
        currentPlayer.username,
        decision.action,
        decision.amount || 0
      );

      console.log(`✅ AI MOVE EXECUTED: ${decision.action}${decision.amount ? ` $${decision.amount}` : ''} - Game updated`);

      // Broadcast AI move
      const gameState = {
        ...updatedGame.toObject(),
        players: updatedGame.players.map(player => ({
          ...player,
          cards: player.isAI ? [] : player.cards
        }))
      };
      
      io.to(gameId).emit('aiMove', {
        success: true,
        gameState,
        aiDecision: {
          action: decision.action,
          amount: decision.amount,
          reasoning: decision.reasoning,
          isBluff: decision.isBluff,
          confidence: decision.probability
        }
      });

      // Record AI result for learning
      if (updatedGame.gameState === 'finished' && updatedGame.winner) {
        const result = updatedGame.winner.playerId === currentPlayer.username ? 'won' : 'lost';
        ai.recordGameResult(result);
      }

      // If still AI's turn, continue
      if (updatedGame.players[updatedGame.currentPlayer].isAI && 
          updatedGame.gameState !== 'finished') {
        setTimeout(() => handleAIMove(gameId), 1500);
      }

    } catch (error) {
      console.error('AI move error:', error);
      io.to(gameId).emit('error', { 
        success: false,
        message: 'AI move failed',
        code: 'AI_MOVE_ERROR'
      });
    }
  }

  // Generate training data for AI
  function generateTrainingData(): GameState[] {
    return [
      {
        currentPlayer: 0,
        players: [
          {
            userId: null,
            username: 'Player1',
            chips: 5000,
            cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'spades', rank: 'K' }],
            position: 'dealer',
            currentBet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            isAI: false
          },
          {
            userId: null,
            username: 'AI_Player',
            chips: 5000,
            cards: [{ suit: 'clubs', rank: '7' }, { suit: 'diamonds', rank: '2' }],
            position: 'smallBlind',
            currentBet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            isAI: true
          }
        ],
        communityCards: [
          { suit: 'hearts', rank: 'A' },
          { suit: 'clubs', rank: 'K' },
          { suit: 'spades', rank: 'Q' }
        ],
        pot: 300,
        currentBet: 100,
        bettingHistory: [50, 100],
        gameState: 'flop'
      },
      // Add more diverse training scenarios
      {
        currentPlayer: 1,
        players: [
          {
            userId: null,
            username: 'Player1',
            chips: 4800,
            cards: [{ suit: 'hearts', rank: '2' }, { suit: 'spades', rank: '7' }],
            position: 'dealer',
            currentBet: 100,
            totalBet: 300,
            folded: false,
            allIn: false,
            isAI: false
          },
          {
            userId: null,
            username: 'AI_Player',
            chips: 4700,
            cards: [{ suit: 'clubs', rank: 'A' }, { suit: 'diamonds', rank: 'A' }],
            position: 'smallBlind',
            currentBet: 100,
            totalBet: 300,
            folded: false,
            allIn: false,
            isAI: true
          }
        ],
        communityCards: [
          { suit: 'hearts', rank: '9' },
          { suit: 'clubs', rank: '10' },
          { suit: 'spades', rank: 'J' },
          { suit: 'diamonds', rank: 'Q' }
        ],
        pot: 600,
        currentBet: 100,
        bettingHistory: [300, 300],
        gameState: 'turn'
      }
    ];
  }
};
