import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import AIManager from '../services/AIManager';
import { GameEngine } from '../services/GameEngine';
import Game from '../models/Game';
import User from '../models/User';
import { IUser, Difficulty, GameAction } from '../types';

const router = Router();
const aiManager = new AIManager();

// Create AI vs Human game
router.post('/create', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { minAIPlayers, difficulty } = req.body;

    // Validate input
    if (!minAIPlayers || minAIPlayers < 1 || minAIPlayers > 5) {
      res.status(400).json({
        success: false,
        message: 'Minimum AI players must be between 1 and 5',
        code: 'INVALID_AI_COUNT'
      });
      return;
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      res.status(400).json({
        success: false,
        message: 'Difficulty must be easy, medium, or hard',
        code: 'INVALID_DIFFICULTY'
      });
      return;
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Check if user has enough chips
    if (user.chips < 1000) {
      res.status(400).json({
        success: false,
        message: 'Insufficient chips. Minimum 1000 chips required to play.',
        code: 'INSUFFICIENT_CHIPS'
      });
      return;
    }

    // Create game ID
    const gameId = `ai_game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create human player
    const humanPlayer = {
      userId: user._id,
      username: user.username,
      chips: Math.min(user.chips, 5000), // Cap at 5000 for game balance
      isAI: false,
      cards: [],
      position: 'none' as const,
      currentBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false
    };

    // Create AI players based on user preferences
    const { players, aiIds } = aiManager.createGameWithAIs([humanPlayer], minAIPlayers);

    // Initialize game engine
    const gameEngine = new GameEngine(gameId);
    const game = await gameEngine.initializeGame(players, 'ai-vs-human');

    // Update game with AI configuration
    game.minAIPlayers = minAIPlayers;
    game.aiIds = aiIds;
    if (difficulty) {
      game.aiDifficulty = difficulty as Difficulty;
    }

    await game.save();

    res.json({
      success: true,
      message: 'AI game created successfully',
      data: {
        gameId: game.gameId,
        gameState: game.gameState,
        players: game.players.map(player => ({
          username: player.username,
          chips: player.chips,
          isAI: player.isAI,
          aiId: player.aiId,
          position: player.position
        })),
        minAIPlayers,
        aiDifficulty: game.aiDifficulty,
        totalPlayers: game.players.length,
        humanPlayers: game.players.filter(p => !p.isAI).length,
        aiPlayers: game.players.filter(p => p.isAI).length
      }
    });

  } catch (error) {
    console.error('Create AI game error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create AI game',
      code: 'CREATE_AI_GAME_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle player action in AI game
router.post('/action', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { gameId, action } = req.body;

    if (!gameId || !action) {
      res.status(400).json({
        success: false,
        message: 'Game ID and action are required',
        code: 'MISSING_PARAMETERS'
      });
      return;
    }

    // Find the game
    const game = await Game.findOne({ gameId }).exec();
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    // Verify user is in the game
    const player = game.players.find(p => p.userId?.toString() === userId);
    if (!player) {
      res.status(403).json({
        success: false,
        message: 'You are not in this game',
        code: 'NOT_IN_GAME'
      });
      return;
    }

    // Initialize game engine with existing game
    const gameEngine = new GameEngine(gameId);
    
    // Make the player's action
    const updatedGame = await gameEngine.makeAction(
      gameId,
      player.username,
      action.type,
      action.amount || 0
    );

    // Process AI moves for all AI players
    if (game.aiIds && game.aiIds.length > 0) {
      for (const aiId of game.aiIds) {
        const currentPlayer = updatedGame.players[updatedGame.currentPlayer];
        if (currentPlayer.isAI && currentPlayer.aiId === aiId) {
          try {
            const aiDecision = await aiManager.makeAIDecision(updatedGame, aiId);
            await gameEngine.makeAction(
              gameId,
              currentPlayer.username,
              aiDecision.action,
              aiDecision.amount || 0
            );
          } catch (aiError) {
            console.error(`AI move error for ${aiId}:`, aiError);
          }
        }
      }
    }

    // Get final game state
    const finalGame = await Game.findOne({ gameId }).exec();
    if (!finalGame) {
      throw new Error('Game not found after processing');
    }

    res.json({
      success: true,
      message: 'Action processed successfully',
      data: {
        gameState: {
          ...finalGame.toObject(),
          players: finalGame.players.map(p => ({
            ...p,
            cards: p.isAI ? [] : p.cards // Hide AI cards
          }))
        }
      }
    });

  } catch (error) {
    console.error('AI game action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process action',
      code: 'ACTION_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get AI game configuration options
router.get('/config', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const availableAIs = aiManager.getAvailableAIs();
    const aisByDifficulty = {
      easy: aiManager.getAIsByDifficulty('easy'),
      medium: aiManager.getAIsByDifficulty('medium'),
      hard: aiManager.getAIsByDifficulty('hard')
    };

    res.json({
      success: true,
      data: {
        maxAIPlayers: 5,
        minAIPlayers: 1,
        difficulties: ['easy', 'medium', 'hard'],
        defaultDifficulty: 'medium',
        availableAIs: availableAIs.length,
        aisByDifficulty: {
          easy: aisByDifficulty.easy.length,
          medium: aisByDifficulty.medium.length,
          hard: aisByDifficulty.hard.length
        },
        bettingLimits: {
          easy: 300,
          medium: 600,
          hard: 900
        }
      }
    });

  } catch (error) {
    console.error('Get AI config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI configuration',
      code: 'GET_AI_CONFIG_ERROR'
    });
  }
});

// Get AI stats for a specific game
router.get('/stats/:gameId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    
    // Here you would get the game and its AI stats
    // For now, return general AI stats
    const allAIStats = aiManager.getAllAIStats();

    res.json({
      success: true,
      data: {
        gameId,
        aiStats: allAIStats
      }
    });

  } catch (error) {
    console.error('Get AI stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI statistics',
      code: 'GET_AI_STATS_ERROR'
    });
  }
});

// Reset AI learning for development/testing
router.post('/reset-learning', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    aiManager.resetAllAISessions();

    res.json({
      success: true,
      message: 'AI learning sessions reset successfully'
    });

  } catch (error) {
    console.error('Reset AI learning error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset AI learning',
      code: 'RESET_AI_ERROR'
    });
  }
});

export default router;


