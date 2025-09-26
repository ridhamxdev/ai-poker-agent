import express, { Request, Response } from 'express';
import Game from '../models/Game';
import User from '../models/User';
import GameEngine from '../services/GameEngine';
import authMiddleware from '../middleware/auth';
import { 
  validateCreateGame, 
  validateJoinGame, 
  validateGameAction, 
  validatePagination 
} from '../middleware/validation';
import { IGame, AuthenticatedUser, GameType, Difficulty, ActionType } from '../types';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface CreateGameRequest {
  gameType: GameType;
  aiDifficulty?: Difficulty;
  buyIn?: number;
}

interface JoinGameRequest {
  gameId: string;
}

interface GameActionRequest {
  gameId: string;
  action: ActionType;
  amount?: number;
}

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Create a new game
router.post('/create', validateCreateGame, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameType, aiDifficulty = 'medium', buyIn = 1000 } = req.body as CreateGameRequest;
    const userId = req.user!.userId;

    // Check if user has enough chips
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    if (user.chips < buyIn) {
      res.status(400).json({
        success: false,
        message: `Insufficient chips. You have ${user.chips} chips but need ${buyIn} chips to join`,
        code: 'INSUFFICIENT_CHIPS',
        data: {
          userChips: user.chips,
          requiredChips: buyIn,
          shortfall: buyIn - user.chips
        }
      });
      return;
    }

    // Check for existing active games
    const existingActiveGame = await Game.findOne({
      'players.userId': userId,
      gameState: { $nin: ['finished'] }
    });

    if (existingActiveGame) {
      res.status(409).json({
        success: false,
        message: 'You already have an active game. Please finish it before starting a new one',
        code: 'ACTIVE_GAME_EXISTS',
        data: {
          existingGameId: existingActiveGame.gameId,
          gameState: existingActiveGame.gameState
        }
      });
      return;
    }

    // Generate unique game ID
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create game engine instance
    const gameEngine = new GameEngine(gameId);
    
    // Define players based on game type
    let players;
    if (gameType === 'ai-vs-human' || gameType === 'ai-training') {
      players = [
        {
          userId: user._id,
          username: user.username,
          chips: buyIn,
          isAI: false
        },
        {
          username: `AI_${aiDifficulty}`,
          chips: buyIn,
          isAI: true
        }
      ];
    } else {
      // PvP game - just create the game, wait for another player
      players = [
        {
          userId: user._id,
          username: user.username,
          chips: buyIn,
          isAI: false
        }
      ];
    }

    // Initialize the game
    const game = await gameEngine.initializeGame(players, gameType);

    // Deduct buy-in from user's chips
    user.chips -= buyIn;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: {
        game: {
          gameId: game.gameId,
          gameType: game.gameType,
          gameState: game.gameState,
          players: game.players.map(player => ({
            username: player.username,
            chips: player.chips,
            position: player.position,
            isAI: player.isAI,
            // Hide cards from response
            cards: player.userId?.toString() === userId ? player.cards : []
          })),
          pot: game.pot,
          communityCards: game.communityCards,
          currentPlayer: game.currentPlayer,
          aiDifficulty: game.aiDifficulty,
          blinds: {
            smallBlind: game.smallBlind,
            bigBlind: game.bigBlind
          }
        },
        userChipsAfter: user.chips
      }
    });

  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create game',
      code: 'GAME_CREATION_ERROR'
    });
  }
});

// Join an existing game (for PvP)
router.post('/join', validateJoinGame, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.body as JoinGameRequest;
    const userId = req.user!.userId;

    const game = await Game.findOne({ gameId });
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    if (game.gameState !== 'waiting') {
      res.status(400).json({
        success: false,
        message: 'Game already in progress',
        code: 'GAME_IN_PROGRESS',
        data: {
          currentState: game.gameState
        }
      });
      return;
    }

    if (game.players.length >= 2) {
      res.status(400).json({
        success: false,
        message: 'Game is full',
        code: 'GAME_FULL',
        data: {
          maxPlayers: 2,
          currentPlayers: game.players.length
        }
      });
      return;
    }

    // Check if user is already in the game
    const existingPlayer = game.players.find(p => p.userId?.toString() === userId);
    if (existingPlayer) {
      res.status(409).json({
        success: false,
        message: 'Already joined this game',
        code: 'ALREADY_JOINED'
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    const buyIn = game.players[0].chips; // Use same buy-in as first player
    if (user.chips < buyIn) {
      res.status(400).json({
        success: false,
        message: `Insufficient chips. You have ${user.chips} chips but need ${buyIn} chips to join`,
        code: 'INSUFFICIENT_CHIPS',
        data: {
          userChips: user.chips,
          requiredChips: buyIn,
          shortfall: buyIn - user.chips
        }
      });
      return;
    }

    // Add player to game
    game.players.push({
      userId: user._id,
      username: user.username,
      chips: buyIn,
      cards: [],
      position: 'bigBlind',
      currentBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      isAI: false
    });

    // Start the game if we now have 2 players
    if (game.players.length === 2) {
      const gameEngine = new GameEngine(gameId);
      // Re-initialize with both players
      await gameEngine.initializeGame(game.players.map(p => ({
        userId: p.userId,
        username: p.username,
        chips: p.chips,
        isAI: p.isAI
      })), game.gameType);
    }

    // Deduct buy-in
    user.chips -= buyIn;
    await user.save();

    res.json({
      success: true,
      message: 'Successfully joined the game',
      data: {
        game: {
          gameId: game.gameId,
          gameType: game.gameType,
          gameState: game.gameState,
          players: game.players.map(player => ({
            username: player.username,
            chips: player.chips,
            position: player.position,
            isAI: player.isAI,
            cards: player.userId?.toString() === userId ? player.cards : []
          })),
          pot: game.pot,
          communityCards: game.communityCards,
          currentPlayer: game.currentPlayer
        },
        userChipsAfter: user.chips
      }
    });

  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join game',
      code: 'JOIN_GAME_ERROR'
    });
  }
});

// Get game state
router.get('/:gameId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = req.user!.userId;

    if (!gameId || gameId.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Game ID is required',
        code: 'INVALID_GAME_ID'
      });
      return;
    }

    const game = await Game.findOne({ gameId });
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    // Check if user is part of this game
    const playerInGame = game.players.find(p => p.userId?.toString() === userId);
    if (!playerInGame && game.gameType !== 'ai-training') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this game',
        code: 'UNAUTHORIZED_ACCESS'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        game: {
          gameId: game.gameId,
          gameType: game.gameType,
          gameState: game.gameState,
          players: game.players.map(player => ({
            username: player.username,
            chips: player.chips,
            position: player.position,
            currentBet: player.currentBet,
            totalBet: player.totalBet,
            folded: player.folded,
            allIn: player.allIn,
            isAI: player.isAI,
            // Only show cards to the player themselves or if game is finished
            cards: (player.userId?.toString() === userId || game.gameState === 'finished') ? player.cards : []
          })),
          pot: game.pot,
          communityCards: game.communityCards,
          currentPlayer: game.currentPlayer,
          lastAction: game.lastAction,
          winner: game.winner,
          aiDifficulty: game.aiDifficulty,
          blinds: {
            smallBlind: game.smallBlind,
            bigBlind: game.bigBlind
          },
          startTime: game.startTime,
          endTime: game.endTime
        },
        userContext: {
          isPlayerTurn: game.players[game.currentPlayer]?.userId?.toString() === userId,
          playerIndex: game.players.findIndex(p => p.userId?.toString() === userId)
        }
      }
    });

  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game state',
      code: 'GET_GAME_ERROR'
    });
  }
});

// Make a game action (fold, call, raise, check)
router.post('/action', validateGameAction, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId, action, amount = 0 } = req.body as GameActionRequest;
    const userId = req.user!.userId;

    const game = await Game.findOne({ gameId });
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    // Check if it's the user's turn
    const currentPlayer = game.players[game.currentPlayer];
    if (currentPlayer.userId?.toString() !== userId) {
      res.status(400).json({
        success: false,
        message: 'Not your turn',
        code: 'NOT_YOUR_TURN',
        data: {
          currentPlayer: currentPlayer.username,
          yourTurn: false
        }
      });
      return;
    }

    if (game.gameState === 'finished') {
      res.status(400).json({
        success: false,
        message: 'Game is already finished',
        code: 'GAME_FINISHED',
        data: {
          winner: game.winner
        }
      });
      return;
    }

    // Validate action amount for raise
    if (action === 'raise') {
      if (amount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Raise amount must be greater than 0',
          code: 'INVALID_RAISE_AMOUNT'
        });
        return;
      }

      if (amount > currentPlayer.chips) {
        res.status(400).json({
          success: false,
          message: `Cannot raise ${amount}. You only have ${currentPlayer.chips} chips`,
          code: 'INSUFFICIENT_CHIPS_FOR_RAISE',
          data: {
            requestedAmount: amount,
            availableChips: currentPlayer.chips
          }
        });
        return;
      }
    }

    // Execute the action using game engine
    const gameEngine = new GameEngine(gameId);
    const updatedGame = await gameEngine.makeAction(gameId, userId, action, amount);

    // Update user's chips if game is finished
    if (updatedGame.gameState === 'finished' && updatedGame.winner) {
      const winnerPlayer = updatedGame.players.find(p => 
        p.userId?.toString() === updatedGame.winner!.playerId || 
        p.username === updatedGame.winner!.playerId
      );
      
      if (winnerPlayer && winnerPlayer.userId) {
        const user = await User.findById(winnerPlayer.userId);
        if (user) {
          user.chips += updatedGame.winner.amount;
          user.gamesPlayed += 1;
          user.gamesWon += 1;
          user.totalWinnings += updatedGame.winner.amount;
          user.experience += 100; // Award experience points
          await user.save();
        }
      }

      // Update losing player's stats
      const losingPlayer = updatedGame.players.find(p => 
        p.userId && p.userId.toString() !== updatedGame.winner!.playerId
      );
      if (losingPlayer && losingPlayer.userId) {
        const user = await User.findById(losingPlayer.userId);
        if (user) {
          user.gamesPlayed += 1;
          user.experience += 50; // Consolation experience
          await user.save();
        }
      }
    }

    res.json({
      success: true,
      message: `Action '${action}' executed successfully`,
      data: {
        game: {
          gameId: updatedGame.gameId,
          gameState: updatedGame.gameState,
          players: updatedGame.players.map(player => ({
            username: player.username,
            chips: player.chips,
            position: player.position,
            currentBet: player.currentBet,
            totalBet: player.totalBet,
            folded: player.folded,
            allIn: player.allIn,
            isAI: player.isAI,
            cards: (player.userId?.toString() === userId || updatedGame.gameState === 'finished') ? player.cards : []
          })),
          pot: updatedGame.pot,
          communityCards: updatedGame.communityCards,
          currentPlayer: updatedGame.currentPlayer,
          lastAction: updatedGame.lastAction,
          winner: updatedGame.winner
        },
        actionResult: {
          action,
          amount,
          success: true,
          gameFinished: updatedGame.gameState === 'finished'
        }
      }
    });

  } catch (error) {
    console.error('Game action error:', error);
    res.status(500).json({
      success: false,
      message: (error as Error).message || 'Failed to execute action',
      code: 'ACTION_EXECUTION_ERROR'
    });
  }
});

// Get user's active games
router.get('/user/active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const activeGames = await Game.find({
      'players.userId': userId,
      gameState: { $nin: ['finished'] }
    }).select('gameId gameType gameState players pot currentPlayer aiDifficulty startTime');

    res.json({
      success: true,
      data: {
        games: activeGames.map(game => ({
          gameId: game.gameId,
          gameType: game.gameType,
          gameState: game.gameState,
          playerCount: game.players.length,
          pot: game.pot,
          isMyTurn: game.players[game.currentPlayer]?.userId?.toString() === userId,
          aiDifficulty: game.aiDifficulty,
          startTime: game.startTime,
          opponent: game.players.find(p => p.userId?.toString() !== userId)?.username || 'Unknown'
        })),
        totalActiveGames: activeGames.length
      }
    });

  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active games',
      code: 'GET_ACTIVE_GAMES_ERROR'
    });
  }
});

// Get user's game history
router.get('/user/history', validatePagination, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const gameHistory = await Game.find({
      'players.userId': userId,
      gameState: 'finished'
    })
    .select('gameId gameType winner players pot startTime endTime aiDifficulty')
    .sort({ endTime: -1 })
    .skip(skip)
    .limit(limit);

    const total = await Game.countDocuments({
      'players.userId': userId,
      gameState: 'finished'
    });

    const gamesWithStats = gameHistory.map(game => ({
      gameId: game.gameId,
      gameType: game.gameType,
      result: game.winner?.playerId === userId ? 'won' : 'lost',
      winAmount: game.winner?.playerId === userId ? game.winner.amount : 0,
      pot: game.pot,
      aiDifficulty: game.aiDifficulty,
      duration: game.endTime && game.startTime ? 
        Math.floor((game.endTime.getTime() - game.startTime.getTime()) / 1000) : 0,
      startTime: game.startTime,
      endTime: game.endTime,
      opponent: game.players.find(p => p.userId?.toString() !== userId)?.username || 'Unknown'
    }));

    // Calculate summary statistics
    const wins = gamesWithStats.filter(g => g.result === 'won').length;
    const totalWinnings = gamesWithStats.reduce((sum, game) => sum + game.winAmount, 0);

    res.json({
      success: true,
      data: {
        games: gamesWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalGames: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        statistics: {
          totalGames: total,
          wins,
          losses: total - wins,
          winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0',
          totalWinnings,
          averageWinAmount: wins > 0 ? Math.round(totalWinnings / wins) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get game history',
      code: 'GET_HISTORY_ERROR'
    });
  }
});

// Delete/Leave a game
router.delete('/:gameId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = req.user!.userId;

    const game = await Game.findOne({ gameId });
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    const playerInGame = game.players.find(p => p.userId?.toString() === userId);
    if (!playerInGame) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to delete this game',
        code: 'UNAUTHORIZED_DELETE'
      });
      return;
    }

    if (game.gameState === 'finished') {
      // Just remove from database
      await Game.findOneAndDelete({ gameId });
      
      res.json({
        success: true,
        message: 'Finished game removed from history'
      });
    } else {
      // If game is in progress, forfeit the game
      const opponent = game.players.find(p => p.userId?.toString() !== userId);
      
      game.gameState = 'finished';
      game.winner = {
        playerId: opponent?.userId?.toString() || opponent?.username || 'opponent',
        winningHand: 'Opponent Forfeited',
        amount: game.pot
      };
      game.endTime = new Date();
      await game.save();

      // Update opponent's stats if they exist and are not AI
      if (opponent && opponent.userId && !opponent.isAI) {
        const opponentUser = await User.findById(opponent.userId);
        if (opponentUser) {
          opponentUser.chips += game.pot;
          opponentUser.gamesPlayed += 1;
          opponentUser.gamesWon += 1;
          opponentUser.totalWinnings += game.pot;
          await opponentUser.save();
        }
      }

      // Update forfeiting player's stats
      const user = await User.findById(userId);
      if (user) {
        user.gamesPlayed += 1;
        await user.save();
      }

      res.json({
        success: true,
        message: 'Game forfeited successfully',
        data: {
          forfeitedAmount: game.pot,
          opponentAwarded: opponent?.username || 'Opponent'
        }
      });
    }

  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete game',
      code: 'DELETE_GAME_ERROR'
    });
  }
});

export default router;
