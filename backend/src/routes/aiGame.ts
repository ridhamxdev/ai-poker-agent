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
    console.log(`Creating game with ${players.length} players:`, players.map(p => ({ username: p.username, isAI: p.isAI, aiId: p.aiId })));
    console.log(`AI IDs: ${aiIds.join(', ')}`);

    // Initialize game engine
    const gameEngine = new GameEngine(gameId);
    const game = await gameEngine.initializeGame(players, 'ai-vs-human');
    console.log(`Game initialized. Current player: ${game.currentPlayer}, Game state: ${game.gameState}`);

    // Update game with AI configuration
    game.minAIPlayers = minAIPlayers;
    game.aiIds = aiIds;
    if (difficulty) {
      game.aiDifficulty = difficulty as Difficulty;
    }

    await game.save();

    // Calculate current bet as the maximum bet among all players
    const currentBet = Math.max(...game.players.map(p => p.currentBet));
    console.log(`Final game state - Current player: ${game.currentPlayer}, Current bet: ${currentBet}, Pot: ${game.pot}`);
    console.log(`Players:`, game.players.map((p, i) => ({ index: i, username: p.username, isAI: p.isAI })));

    res.json({
      success: true,
      message: 'AI game created successfully',
      data: {
        gameId: game.gameId,
        gameState: game.gameState,
        pot: game.pot,
        communityCards: game.communityCards,
        currentTurn: game.currentPlayer,
        currentBet: currentBet,
        players: game.players.map(player => ({
          id: player.userId?.toString() || player.aiId || `player_${Math.random()}`,
          userId: player.userId?.toString(),
          username: player.username,
          chips: player.chips,
          isAI: player.isAI,
          aiId: player.aiId,
          position: player.position,
          cards: (player.isAI && game.gameState !== 'finished') ? [] : player.cards,
          currentBet: player.currentBet,
          totalBet: player.totalBet,
          folded: player.folded,
          allIn: player.allIn
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

    // Process AI moves until it's a human player's turn or game ends
    let maxAIMoves = 10; // Prevent infinite loops
    const startTime = Date.now();
    const maxProcessingTime = 5000; // 5 seconds max
    console.log(`Starting AI processing loop. Max moves: ${maxAIMoves}`);

    while (maxAIMoves > 0 && (Date.now() - startTime) < maxProcessingTime) {
      const currentGame = await Game.findOne({ gameId });
      if (!currentGame) {
        console.log('Game not found, breaking AI loop');
        break;
      }

      const currentPlayer = currentGame.players[currentGame.currentPlayer];
      console.log(`Current player: ${currentPlayer.username}, isAI: ${currentPlayer.isAI}, aiId: ${currentPlayer.aiId}`);

      if (!currentPlayer.isAI) {
        console.log('Current player is human, breaking AI loop');
        break; // It's a human player's turn
      }

      try {
        console.log(`Making AI decision for ${currentPlayer.aiId}`);

        // Simple AI decision - just call for now to test
        const aiDecision = { action: 'call', amount: 0 };
        console.log(`AI ${currentPlayer.username} making decision:`, aiDecision);

        await gameEngine.makeAction(
          gameId,
          currentPlayer.username,
          aiDecision.action as any,
          aiDecision.amount || 0
        );
        maxAIMoves--;
        console.log(`AI move completed. Remaining moves: ${maxAIMoves}`);
      } catch (aiError) {
        console.error(`AI move error for ${currentPlayer.aiId}:`, aiError);
        // If AI decision fails, just call to keep the game moving
        try {
          await gameEngine.makeAction(gameId, currentPlayer.username, 'call', 0);
          console.log(`AI fallback call completed for ${currentPlayer.username}`);
        } catch (fallbackError) {
          console.error(`AI fallback error:`, fallbackError);
        }
        break;
      }
    }

    // Get final game state
    const finalGame = await Game.findOne({ gameId }).exec();
    if (!finalGame) {
      throw new Error('Game not found after processing');
    }

    // Fallback removed to allow AI vs AI play
    if (finalGame.players[finalGame.currentPlayer].isAI && finalGame.gameState !== 'finished') {
      console.log('AI turn detected strictly. Frontend should request process-turn.');
    }

    console.log(`After action processing - Current player: ${finalGame.currentPlayer}, Game state: ${finalGame.gameState}`);

    res.json({
      success: true,
      message: 'Action processed successfully',
      data: {
        gameState: {
          ...finalGame.toObject(),
          players: finalGame.players.map(p => ({
            id: p.userId?.toString() || p.aiId || `player_${Math.random()}`,
            userId: p.userId?.toString(),
            username: p.username,
            chips: p.chips,
            isAI: p.isAI,
            aiId: p.aiId,
            position: p.position,
            cards: (p.isAI && finalGame.gameState !== 'finished') ? [] : p.cards, // Hide AI cards until finished
            currentBet: p.currentBet,
            totalBet: p.totalBet,
            folded: p.folded,
            allIn: p.allIn
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

// Manually trigger AI turn processing (for AI vs AI scenarios)
router.post('/process-turn', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.body;

    if (!gameId) {
      res.status(400).json({ success: false, message: 'Game ID required' });
      return;
    }

    const game = await Game.findOne({ gameId }).exec();
    if (!game) {
      res.status(404).json({ success: false, message: 'Game not found' });
      return;
    }

    const gameEngine = new GameEngine(gameId);

    // AI Processing Loop
    let maxAIMoves = 10;
    const startTime = Date.now();
    const maxProcessingTime = 5000;

    console.log(`Processing turn for game ${gameId}`);

    while (maxAIMoves > 0 && (Date.now() - startTime) < maxProcessingTime) {
      const currentGame = await Game.findOne({ gameId });
      if (!currentGame || currentGame.gameState === 'finished') break;

      const currentPlayer = currentGame.players[currentGame.currentPlayer];

      if (!currentPlayer.isAI) {
        console.log('Turn is Human, stopping AI loop');
        break;
      }

      try {
        console.log(`Making AI decision for ${currentPlayer.username}`);
        // For now, simple AI (Call/Check)
        // In real impl, check valid actions and decide
        // Note: AIManager logic should be here, but using fallback for specific move for now or integration
        const aiDecision = { action: 'call', amount: 0 };
        const validActions = await gameEngine.getValidActions(gameId, currentPlayer.username);

        // Improve simple AI to check if it can check
        let actionToTake: any = 'call';
        if (validActions.includes('check')) actionToTake = 'check';
        if (validActions.includes('call')) actionToTake = 'call'; // prefer call if forced

        await gameEngine.makeAction(gameId, currentPlayer.username, actionToTake, 0);
        maxAIMoves--;
      } catch (e) {
        console.error(`AI Loop Error:`, e);
        // Force check/fold if stuck?
        break;
      }
    }

    const finalGame = await Game.findOne({ gameId });
    if (!finalGame) throw new Error('Game lost');

    res.json({
      success: true,
      data: {
        gameState: {
          ...finalGame.toObject(),
          players: finalGame.players.map(p => ({
            id: p.userId?.toString() || p.aiId || `player_${Math.random()}`,
            userId: p.userId?.toString(),
            username: p.username,
            chips: p.chips,
            isAI: p.isAI,
            aiId: p.aiId,
            position: p.position,
            cards: (p.isAI && finalGame.gameState !== 'finished') ? [] : p.cards,
            currentBet: p.currentBet,
            totalBet: p.totalBet,
            folded: p.folded,
            allIn: p.allIn
          }))
        }
      }
    });

  } catch (error) {
    console.error('Process turn error:', error);
    res.status(500).json({ success: false, message: 'Process turn failed' });
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


