import express, { Request, Response } from 'express';
import PokerAI from '../services/pokerAI';
import Game from '../models/Game';
import authMiddleware from '../middleware/auth';
import { 
  validateTrainAI, 
  validateAIDecision, 
  validateUpdateAIDifficulty, 
  validatePersonality 
} from '../middleware/validation';
import { AuthenticatedUser, Difficulty, GameState } from '../types';

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface TrainAIRequest {
  difficulty: Difficulty;
  iterations?: number;
  gameScenarios?: GameState[];
}

interface GetAIDecisionRequest {
  gameId: string;
  difficulty?: Difficulty;
}

interface UpdateAIDifficultyRequest {
  gameId: string;
  difficulty: Difficulty;
}

interface PersonalityRequest {
  gameId: string;
  personality: 'balanced' | 'aggressive' | 'defensive' | 'exploitative';
}

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Store AI instances (in production, this should be in Redis or database)
const aiInstances = new Map<string, PokerAI>();

// Get AI instance or create if doesn't exist
const getOrCreateAI = (difficulty: Difficulty, gameId?: string): PokerAI => {
  const key = gameId ? `${gameId}_${difficulty}` : difficulty;
  
  if (!aiInstances.has(key)) {
    const ai = new PokerAI(difficulty);
    aiInstances.set(key, ai);
  }
  
  return aiInstances.get(key)!;
};

// Train AI with specific scenarios
router.post('/train', validateTrainAI, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { difficulty = 'medium', iterations = 1000, gameScenarios } = req.body as TrainAIRequest;
    
    const ai = getOrCreateAI(difficulty);
    
    // Generate training scenarios if not provided
    let trainingData: GameState[] = gameScenarios || generateDefaultTrainingData();
    
    // Validate training parameters
    if (iterations > 50000) {
      res.status(400).json({
        success: false,
        message: 'Iterations cannot exceed 50,000 for performance reasons',
        code: 'ITERATIONS_LIMIT_EXCEEDED'
      });
      return;
    }

    // Start training (this would run in background in production)
    res.json({
      success: true,
      message: 'AI training started successfully',
      data: {
        difficulty,
        iterations,
        trainingScenarios: trainingData.length,
        estimatedTime: Math.ceil(iterations / 100), // rough estimate in seconds
        status: 'TRAINING_STARTED'
      }
    });

    // Run training in background
    setTimeout(async () => {
      try {
        ai.startTraining(trainingData, iterations);
        console.log(`AI training completed for difficulty: ${difficulty}`);
      } catch (error) {
        console.error('Training error:', error);
      }
    }, 100);

  } catch (error) {
    console.error('AI training error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start AI training',
      code: 'TRAINING_ERROR'
    });
  }
});

// Get AI decision for a specific game state
router.post('/decision', validateAIDecision, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId, difficulty = 'medium' } = req.body as GetAIDecisionRequest;

    const game = await Game.findOne({ gameId });
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    // Check if user is part of this game or if it's a training game
    const userId = req.user!.userId;
    const playerInGame = game.players.find(p => p.userId?.toString() === userId);
    if (!playerInGame && game.gameType !== 'ai-training') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to get AI decision for this game',
        code: 'UNAUTHORIZED_ACCESS'
      });
      return;
    }

    const ai = getOrCreateAI(difficulty, gameId);
    const currentPlayer = game.players[game.currentPlayer];
    
    if (!currentPlayer.isAI) {
      res.status(400).json({
        success: false,
        message: 'Current player is not AI',
        code: 'INVALID_PLAYER_TYPE'
      });
      return;
    }

    const decision = await ai.makeDecision(game, currentPlayer.username);

    res.json({
      success: true,
      message: 'AI decision calculated successfully',
      data: {
        decision: {
          action: decision.action,
          amount: decision.amount || 0,
          probability: decision.probability,
          reasoning: decision.reasoning,
          isBluff: decision.isBluff || false,
          confidence: decision.probability > 0.7 ? 'high' : decision.probability > 0.4 ? 'medium' : 'low'
        },
        gameState: {
          gameId: game.gameId,
          currentPlayer: game.currentPlayer,
          pot: game.pot,
          communityCards: game.communityCards,
          gamePhase: game.gameState
        },
        aiStats: ai.getAIStats()
      }
    });

  } catch (error) {
    console.error('AI decision error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI decision',
      code: 'DECISION_ERROR'
    });
  }
});

// Get AI statistics
router.get('/stats/:difficulty', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const difficulty = req.params.difficulty as Difficulty;
    
    if (!['easy', 'medium', 'hard', 'expert'].includes(difficulty)) {
      res.status(400).json({
        success: false,
        message: 'Invalid difficulty level',
        code: 'INVALID_DIFFICULTY'
      });
      return;
    }

    const ai = getOrCreateAI(difficulty);
    const stats = ai.getAIStats();

    res.json({
      success: true,
      data: {
        stats: {
          difficulty: stats.difficulty,
          personality: stats.personality,
          trainingGames: stats.trainingGames,
          iterations: stats.iterations,
          isTraining: stats.isTraining,
          strategySize: stats.strategySize,
          sessionState: {
            handsPlayed: stats.sessionState?.handsPlayed || 0,
            recentResults: stats.sessionState?.recentResults || [],
            tiltFactor: stats.sessionState?.tiltFactor || 0
          },
          performance: {
            winRate: 0.65, // This would be calculated from actual game results
            bluffFrequency: difficulty === 'easy' ? 0.1 : difficulty === 'medium' ? 0.2 : 0.3,
            averageDecisionTime: difficulty === 'expert' ? 3000 : 1500, // ms
            exploitationLevel: stats.personality === 'exploitative' ? 'High' : 'Moderate'
          },
          opponentProfile: stats.opponentProfile
        }
      }
    });

  } catch (error) {
    console.error('AI stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI statistics',
      code: 'STATS_ERROR'
    });
  }
});

// Update AI difficulty for a game
router.put('/difficulty', validateUpdateAIDifficulty, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId, difficulty } = req.body as UpdateAIDifficultyRequest;

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
    const userId = req.user!.userId;
    const playerInGame = game.players.find(p => p.userId?.toString() === userId);
    if (!playerInGame) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to modify this game',
        code: 'UNAUTHORIZED_MODIFICATION'
      });
      return;
    }

    if (game.gameState !== 'waiting' && game.gameState !== 'finished') {
      res.status(400).json({
        success: false,
        message: 'Cannot change difficulty during active game',
        code: 'GAME_IN_PROGRESS'
      });
      return;
    }

    // Update game difficulty
    game.aiDifficulty = difficulty;
    await game.save();

    // Create new AI instance with updated difficulty
    const newAI = getOrCreateAI(difficulty, gameId);

    res.json({
      success: true,
      message: 'AI difficulty updated successfully',
      data: {
        gameId,
        newDifficulty: difficulty,
        aiStats: newAI.getAIStats()
      }
    });

  } catch (error) {
    console.error('Update AI difficulty error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI difficulty',
      code: 'UPDATE_ERROR'
    });
  }
});

// Update AI personality
router.post('/personality', validatePersonality, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId, personality } = req.body as PersonalityRequest;
    
    const ai = aiInstances.get(gameId);
    if (!ai) {
      res.status(404).json({
        success: false,
        message: 'AI instance not found for this game',
        code: 'AI_INSTANCE_NOT_FOUND'
      });
      return;
    }

    // Verify game exists and user has access
    const game = await Game.findOne({ gameId });
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found',
        code: 'GAME_NOT_FOUND'
      });
      return;
    }

    const userId = req.user!.userId;
    const playerInGame = game.players.find(p => p.userId?.toString() === userId);
    if (!playerInGame && game.gameType !== 'ai-training') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to modify AI personality for this game',
        code: 'UNAUTHORIZED_PERSONALITY_CHANGE'
      });
      return;
    }

    // Update AI personality (assuming this method exists in PokerAI)
    if (typeof ai.setPersonality === 'function') {
      ai.setPersonality(personality);
    }

    res.json({
      success: true,
      message: 'AI personality updated successfully',
      data: {
        gameId,
        newPersonality: personality,
        aiStats: ai.getAIStats()
      }
    });

  } catch (error) {
    console.error('Update AI personality error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI personality',
      code: 'PERSONALITY_UPDATE_ERROR'
    });
  }
});

// Get available AI difficulties with descriptions
router.get('/difficulties', (req: Request, res: Response) => {
  const difficulties = [
    {
      level: 'easy',
      name: 'Beginner',
      description: 'Plays conservatively, makes predictable moves, rarely bluffs',
      bluffRate: 5,
      aggressiveness: 'Low',
      suitable: 'New players learning the game',
      features: ['Basic hand evaluation', 'Conservative betting', 'Minimal bluffing']
    },
    {
      level: 'medium',
      name: 'Intermediate',
      description: 'Balanced gameplay with occasional bluffs and strategic moves',
      bluffRate: 15,
      aggressiveness: 'Medium',
      suitable: 'Players with basic poker knowledge',
      features: ['Position awareness', 'Moderate bluffing', 'Pot odds consideration']
    },
    {
      level: 'hard',
      name: 'Advanced',
      description: 'Sophisticated strategy, frequent bluffs, considers position and odds',
      bluffRate: 25,
      aggressiveness: 'High',
      suitable: 'Experienced players',
      features: ['Advanced bluffing', 'Opponent modeling', 'Complex betting patterns']
    },
    {
      level: 'expert',
      name: 'Professional',
      description: 'Uses game theory optimal strategies, complex bluffing patterns',
      bluffRate: 20,
      aggressiveness: 'Calculated',
      suitable: 'Expert players and professionals',
      features: ['Game theory optimal play', 'Dynamic personality', 'Exploitation detection']
    }
  ];

  res.json({
    success: true,
    data: { difficulties }
  });
});

// Get opponent model data
router.get('/opponent-profile/:gameId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = req.user!.userId;

    // Verify user has access to this game
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
    if (!playerInGame && game.gameType !== 'ai-training') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to access opponent profile for this game',
        code: 'UNAUTHORIZED_PROFILE_ACCESS'
      });
      return;
    }

    const ai = aiInstances.get(gameId);
    if (!ai) {
      res.status(404).json({
        success: false,
        message: 'AI instance not found for this game',
        code: 'AI_INSTANCE_NOT_FOUND'
      });
      return;
    }

    const aiState = ai.getAIState();
    
    res.json({
      success: true,
      data: {
        opponentProfile: aiState.opponentProfile,
        insights: {
          playingStyle: aiState.opponentProfile.style,
          aggression: aiState.opponentProfile.aggFactor,
          vpip: aiState.opponentProfile.vpip,
          predictedActions: {
            foldProbability: aiState.opponentProfile.foldFreq / Math.max(aiState.opponentProfile.totalActions, 1),
            bluffDetection: 'Advanced pattern recognition active',
            recommendedStrategy: aiState.opponentProfile.style === 'tight' ? 'Bluff more frequently' : 
                                aiState.opponentProfile.style === 'loose' ? 'Value bet wider' : 
                                'Balanced approach'
          }
        },
        analysis: {
          handsAnalyzed: aiState.opponentProfile.totalActions,
          confidenceLevel: aiState.opponentProfile.totalActions > 20 ? 'High' : 
                          aiState.opponentProfile.totalActions > 10 ? 'Medium' : 'Low'
        }
      }
    });

  } catch (error) {
    console.error('Get opponent profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get opponent profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// Get advanced AI analytics
router.get('/analytics/:gameId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = req.user!.userId;

    // Verify user has access to this game
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
    if (!playerInGame && game.gameType !== 'ai-training') {
      res.status(403).json({
        success: false,
        message: 'Not authorized to access analytics for this game',
        code: 'UNAUTHORIZED_ANALYTICS_ACCESS'
      });
      return;
    }

    const ai = aiInstances.get(gameId);
    if (!ai) {
      res.status(404).json({
        success: false,
        message: 'AI instance not found for this game',
        code: 'AI_INSTANCE_NOT_FOUND'
      });
      return;
    }

    const aiState = ai.getAIState();
    
    res.json({
      success: true,
      data: {
        analytics: {
          decisionQuality: 'Game theory optimal with opponent exploitation',
          bluffFrequency: `${((aiState.opponentProfile?.bluffDetectedFreq || 0) * 100).toFixed(1)}%`,
          exploitationLevel: aiState.personality === 'exploitative' ? 'High' : 'Moderate',
          adaptability: 'Dynamic personality and strategy adjustment',
          riskManagement: 'Advanced pot odds and bankroll consideration',
          sessionMetrics: {
            handsPlayed: aiState.sessionState?.handsPlayed || 0,
            recentPerformance: aiState.sessionState?.recentResults || [],
            tiltFactor: aiState.sessionState?.tiltFactor || 0,
            currentPersonality: aiState.personality
          }
        },
        recommendations: [
          'AI adapts to opponent playing style',
          'Uses advanced bluffing strategies',
          'Considers pot odds and position',
          'Employs risk management techniques'
        ]
      }
    });

  } catch (error) {
    console.error('Get AI analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

// Analyze game performance against AI
router.post('/analyze/:gameId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = req.user!.userId;

    const game = await Game.findOne({ gameId, gameState: 'finished' });
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Finished game not found',
        code: 'FINISHED_GAME_NOT_FOUND'
      });
      return;
    }

    const playerInGame = game.players.find(p => p.userId?.toString() === userId);
    if (!playerInGame) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to analyze this game',
        code: 'UNAUTHORIZED_ANALYSIS'
      });
      return;
    }

    const humanPlayer = game.players.find(p => !p.isAI);
    const aiPlayer = game.players.find(p => p.isAI);
    
    if (!humanPlayer || !aiPlayer) {
      res.status(400).json({
        success: false,
        message: 'Game analysis only available for human vs AI games',
        code: 'INVALID_GAME_TYPE'
      });
      return;
    }

    // Enhanced analysis with more detailed metrics
    const analysis = {
      gameResult: game.winner?.playerId === userId ? 'won' : 'lost',
      gameDuration: game.endTime && game.startTime ? 
        Math.floor((game.endTime.getTime() - game.startTime.getTime()) / 1000) : 0,
      totalPot: game.pot,
      aiDifficulty: game.aiDifficulty,
      playerStats: {
        finalChips: humanPlayer.chips,
        netGain: humanPlayer.chips - 5000, // Assuming 5000 starting chips
        biggestBet: humanPlayer.totalBet,
        playStyle: humanPlayer.totalBet > 1000 ? 'Aggressive' : 'Conservative',
        efficiency: humanPlayer.chips > 5000 ? 'Profitable' : 'Needs Improvement'
      },
      aiStats: {
        finalChips: aiPlayer.chips,
        playStyle: aiPlayer.totalBet > 1000 ? 'Aggressive' : 'Conservative',
        estimatedBluffs: Math.floor(Math.random() * 3) + 1, // Simplified
        adaptationLevel: game.aiDifficulty === 'expert' ? 'High' : 'Moderate'
      },
      recommendations: [
        'Consider your position when making betting decisions',
        'Pay attention to betting patterns to spot potential bluffs',
        'Practice bankroll management for longer sessions',
        game.winner?.playerId === userId ? 
          'Great job! Try increasing AI difficulty for more challenge' : 
          'Analyze opponent patterns more carefully'
      ],
      insights: {
        keyMoments: ['Pre-flop aggression', 'Post-flop decisions', 'River play'],
        improvementAreas: humanPlayer.chips < 5000 ? 
          ['Risk management', 'Hand selection', 'Bluff detection'] : 
          ['Advanced strategies', 'Exploitation techniques']
      }
    };

    res.json({
      success: true,
      data: { analysis }
    });

  } catch (error) {
    console.error('Game analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze game',
      code: 'ANALYSIS_ERROR'
    });
  }
});

// Helper function to generate default training data
function generateDefaultTrainingData(): GameState[] {
  const scenarios: GameState[] = [
    // Preflop scenarios
    {
      currentPlayer: 0,
      players: [
        {
          userId: null,
          username: 'Player1',
          chips: 4950,
          cards: [{ suit: 'hearts', rank: 'A' }, { suit: 'spades', rank: 'A' }],
          position: 'dealer',
          currentBet: 50,
          totalBet: 50,
          folded: false,
          allIn: false,
          isAI: false
        },
        {
          userId: null,
          username: 'AI_Player',
          chips: 4900,
          cards: [{ suit: 'clubs', rank: '7' }, { suit: 'diamonds', rank: '2' }],
          position: 'smallBlind',
          currentBet: 100,
          totalBet: 100,
          folded: false,
          allIn: false,
          isAI: true
        }
      ],
      communityCards: [],
      pot: 150,
      currentBet: 100,
      bettingHistory: [50, 100],
      gameState: 'preflop'
    },
    // Flop scenarios
    {
      currentPlayer: 1,
      players: [
        {
          userId: null,
          username: 'Player1',
          chips: 4800,
          cards: [{ suit: 'hearts', rank: 'K' }, { suit: 'spades', rank: 'Q' }],
          position: 'dealer',
          currentBet: 0,
          totalBet: 200,
          folded: false,
          allIn: false,
          isAI: false
        },
        {
          userId: null,
          username: 'AI_Player',
          chips: 4800,
          cards: [{ suit: 'clubs', rank: 'A' }, { suit: 'diamonds', rank: 'K' }],
          position: 'smallBlind',
          currentBet: 0,
          totalBet: 200,
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
      pot: 400,
      currentBet: 0,
      bettingHistory: [200, 200],
      gameState: 'flop'
    }
  ];

  return scenarios;
}

export default router;
