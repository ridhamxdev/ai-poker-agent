import CFRAgent from './cfrAgent';
import { OpponentModel } from './opponentModel';
import { evaluateHand } from '../utils/handEvaluator';
import { IGame, ActionType, Difficulty, AIDecision, GameState, Card } from '../types';

export class PokerAI {
  private cfrAgent: CFRAgent;
  private difficulty: Difficulty;
  private isTraining: boolean = false;
  private trainingGames: number = 0;
  private opponentModel: OpponentModel;
  private personality: 'balanced' | 'aggressive' | 'defensive' | 'exploitative' = 'balanced';
  private aiId: string;
  private maxBetAmount: number = 900; // Set explicit betting limit
  private sessionState: {
    handsPlayed: number;
    recentResults: ('won' | 'lost')[];
    tiltFactor: number;
  } = {
    handsPlayed: 0,
    recentResults: [],
    tiltFactor: 0
  };
  setPersonality: any;

  constructor(difficulty: Difficulty = 'medium', aiId?: string) {
    this.cfrAgent = new CFRAgent();
    this.difficulty = difficulty;
    this.opponentModel = new OpponentModel();
    this.aiId = aiId || `ai_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set betting behavior based on difficulty
    this.configureDifficultySettings();
    
    // Load pre-trained strategy if available
    this.loadStrategy();
  }

  private configureDifficultySettings(): void {
    switch (this.difficulty) {
      case 'easy':
        this.maxBetAmount = 300; // Conservative betting
        this.personality = 'defensive';
        break;
      case 'medium':
        this.maxBetAmount = 600; // Moderate betting
        this.personality = 'balanced';
        break;
      case 'hard':
        this.maxBetAmount = 900; // Aggressive betting
        this.personality = 'aggressive';
        break;
      case 'expert':
        this.maxBetAmount = 1200; // Expert level betting
        this.personality = 'exploitative';
        break;
      default:
        this.maxBetAmount = 600;
        this.personality = 'balanced';
    }
  }

  async makeDecision(gameState: IGame, playerId: string): Promise<AIDecision> {
    const player = gameState.players.find(p =>
      p.userId?.toString() === playerId || p.username === playerId
    );

    if (!player || !player.isAI) {
      throw new Error('Invalid AI player');
    }

    // Update session state
    this.sessionState.handsPlayed++;
    this.updatePersonality();

    const validActions = this.getValidActions(gameState);
    
    // Use CFR strategy for decision making
    const decision = this.cfrAgent.getDecision(
      player.cards,
      gameState.communityCards,
      this.getBettingHistory(gameState),
      this.getPlayerPosition(gameState, player),
      validActions
    );

    // Apply multi-layered decision enhancements
    let enhancedDecision = this.applyDifficultyAdjustments(decision, gameState, player);
    enhancedDecision = this.applyOpponentModeling(enhancedDecision, gameState, player);
    enhancedDecision = this.applyPersonalityEffects(enhancedDecision, gameState, player);
    enhancedDecision = this.applyRiskManagement(enhancedDecision, gameState, player);
    
    // Final bluffing strategy with opponent awareness
    let finalDecision = this.addAdvancedBluffingStrategy(enhancedDecision, gameState, player);

    // Apply betting limits based on difficulty
    finalDecision = this.applyBettingLimits(finalDecision, gameState, player);

    return finalDecision;
  }

  private applyBettingLimits(decision: AIDecision, gameState: IGame, player: any): AIDecision {
    if (decision.action === 'raise') {
      // Ensure betting amount doesn't exceed the configured limit
      const maxAllowedBet = Math.min(this.maxBetAmount, player.chips);
      const currentBet = decision.amount || 0;
      
      if (currentBet > maxAllowedBet) {
        decision.amount = maxAllowedBet;
        decision.reasoning += ` (capped at ${maxAllowedBet} due to difficulty limit)`;
      }
      
      // Ensure minimum bet is respected
      const minBet = gameState.bigBlind;
      if (decision.amount && decision.amount < minBet) {
        decision.amount = minBet;
      }
    }
    
    return decision;
  }

  getId(): string {
    return this.aiId;
  }

  getMaxBetAmount(): number {
    return this.maxBetAmount;
  }

  private updatePersonality(): void {
    // Change personality based on recent performance and hands played
    const recentLosses = this.sessionState.recentResults.slice(-5).filter(r => r === 'lost').length;
    
    if (recentLosses >= 3) {
      this.personality = 'defensive';
      this.sessionState.tiltFactor = Math.min(this.sessionState.tiltFactor + 0.1, 0.5);
    } else if (this.sessionState.handsPlayed > 0 && this.sessionState.handsPlayed % 50 === 0) {
      // Periodically randomize personality for unpredictability
      const personalities: typeof this.personality[] = ['balanced', 'aggressive', 'defensive', 'exploitative'];
      this.personality = personalities[Math.floor(Math.random() * personalities.length)];
    }
  }

  private applyOpponentModeling(decision: AIDecision, gameState: IGame, player: any): AIDecision {
    const opponentStyle = this.opponentModel.estimateStyle();
    const currentBet = this.getCallAmount(gameState);
    const potSize = gameState.pot;
    
    // Adjust decision based on opponent's style
    switch (opponentStyle) {
      case 'tight':
        // Against tight players, bluff more and value bet thinner
        if (decision.action === 'call' && Math.random() < 0.3) {
          return { ...decision, action: 'raise', reasoning: 'Exploiting tight opponent' };
        }
        break;
        
      case 'loose':
        // Against loose players, value bet wider and bluff less
        if (decision.action === 'raise' && this.evaluateHandStrength(player.cards, gameState.communityCards) < 0.4) {
          return { ...decision, action: 'call', reasoning: 'Avoiding bluff against loose opponent' };
        }
        break;
        
      case 'aggressive':
        // Against aggressive players, trap more with strong hands
        const handStrength = this.evaluateHandStrength(player.cards, gameState.communityCards);
        if (handStrength > 0.8 && decision.action === 'raise' && Math.random() < 0.4) {
          return { ...decision, action: 'call', reasoning: 'Trapping aggressive opponent' };
        }
        break;
    }

    // Use fold probability prediction for bet sizing
    if (decision.action === 'raise') {
      const foldProb = this.opponentModel.predictFoldProbability(
        decision.amount || currentBet * 2, 
        potSize, 
        gameState.gameState
      );
      
      // Adjust bet size based on fold probability
      if (foldProb > 0.7) {
        decision.amount = Math.min((decision.amount || 0) * 1.3, player.chips);
        decision.reasoning += ' (exploiting high fold probability)';
      }
    }

    return decision;
  }

  private applyPersonalityEffects(decision: AIDecision, gameState: IGame, player: any): AIDecision {
    const handStrength = this.evaluateHandStrength(player.cards, gameState.communityCards);
    
    switch (this.personality) {
      case 'aggressive':
        // More likely to bet and raise
        if (decision.action === 'call' && handStrength > 0.4 && Math.random() < 0.4) {
          return { ...decision, action: 'raise', reasoning: 'Aggressive personality override' };
        }
        break;
        
      case 'defensive':
        // More conservative, avoid bluffs
        if (decision.isBluff) {
          return { ...decision, action: 'call', isBluff: false, reasoning: 'Defensive personality avoiding bluff' };
        }
        break;
        
      case 'exploitative':
        // Focus on exploiting opponent weaknesses
        const opponentStyle = this.opponentModel.estimateStyle();
        if (opponentStyle === 'tight' && handStrength < 0.3 && Math.random() < 0.5) {
          return { ...decision, action: 'raise', isBluff: true, reasoning: 'Exploitative bluff' };
        }
        break;
    }

    // Apply tilt factor
    if (this.sessionState.tiltFactor > 0) {
      if (Math.random() < this.sessionState.tiltFactor) {
        // Tilted behavior - more aggressive or passive randomly
        const randomActions: ActionType[] = ['raise', 'fold'];
        const randomAction = randomActions[Math.floor(Math.random() * randomActions.length)];
        return { ...decision, action: randomAction, reasoning: 'Tilt-influenced decision' };
      }
    }

    return decision;
  }

  private applyRiskManagement(decision: AIDecision, gameState: IGame, player: any): AIDecision {
    const handStrength = this.evaluateHandStrength(player.cards, gameState.communityCards);
    const handPotential = this.evaluateHandPotential(player.cards, gameState.communityCards);
    const potOdds = this.calculatePotOdds(gameState);
    const chipRisk = (decision.amount || 0) / player.chips;

    // Risk assessment
    if (chipRisk > 0.3 && handStrength < 0.6 && handPotential < 0.3) {
      return { ...decision, action: 'fold', reasoning: 'Risk management: high chip risk with weak hand' };
    }

    // Pot odds consideration
    if (decision.action === 'call' && potOdds > handStrength + handPotential && Math.random() < 0.7) {
      return { ...decision, action: 'fold', reasoning: 'Risk management: poor pot odds' };
    }

    // Bankroll preservation
    if (player.chips < gameState.bigBlind * 10 && decision.action === 'raise') {
      return { ...decision, action: 'call', reasoning: 'Risk management: short stack preservation' };
    }

    return decision;
  }

  private evaluateHandPotential(cards: Card[], communityCards: Card[]): number {
    if (communityCards.length >= 5) return 0; // No more cards to come

    // Count outs for potential improvements
    let outs = 0;
    const remainingCards = 52 - 2 - communityCards.length; // Approximate

    // Check for flush draws
    const suits = [...cards, ...communityCards].map(c => c.suit);
    const suitCounts = suits.reduce((acc, suit) => {
      acc[suit] = (acc[suit] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});

    Object.values(suitCounts).forEach(count => {
      if (count === 4) outs += 9; // Flush draw
    });

    // Check for straight draws (simplified)
    const ranks = [...cards, ...communityCards].map(c => this.getCardValue(c.rank)).sort((a, b) => a - b);
    const uniqueRanks = [...new Set(ranks)];
    if (uniqueRanks.length >= 4) {
      // Check for potential straights
      for (let i = 0; i <= uniqueRanks.length - 4; i++) {
        if (uniqueRanks[i + 3] - uniqueRanks[i] === 3) {
          outs += 8; // Open-ended straight draw
          break;
        }
      }
    }

    return Math.min(outs / remainingCards, 0.5);
  }

  private calculatePotOdds(gameState: IGame): number {
    const callAmount = this.getCallAmount(gameState);
    const potSize = gameState.pot + callAmount;
    return callAmount / potSize;
  }

  private addAdvancedBluffingStrategy(decision: AIDecision, gameState: IGame, player: any): AIDecision {
    const handStrength = this.evaluateHandStrength(player.cards, gameState.communityCards);
    const opponentBluffDetection = this.opponentModel.detectBluffProbability(
      decision.amount || 0,
      gameState.pot,
      gameState.gameState
    );

    // Advanced bluff frequency calculation
    const optimalBluffFreq = this.calculateOptimalBluffFrequency(gameState, player);
    const bluffChance = Math.max(optimalBluffFreq - opponentBluffDetection * 0.5, 0.05);

    if (Math.random() < bluffChance && decision.action !== 'fold' && handStrength < 0.4) {
      // Calculate optimal bluff size based on fold probability
      const foldProb = this.opponentModel.predictFoldProbability(
        gameState.pot,
        gameState.pot,
        gameState.gameState
      );
      
      const bluffSize = this.calculateOptimalBluffSize(gameState, foldProb);
      
      return {
        ...decision,
        action: 'raise',
        amount: bluffSize,
        isBluff: true,
        reasoning: `Advanced bluff (${(bluffChance * 100).toFixed(1)}% frequency, ${(foldProb * 100).toFixed(1)}% fold expectation)`
      };
    }

    return { ...decision, isBluff: false };
  }

  private calculateOptimalBluffFrequency(gameState: IGame, player: any): number {
    const position = this.getPlayerPosition(gameState, player);
    let baseFreq = 0.15;

    // Adjust based on game phase
    switch (gameState.gameState) {
      case 'preflop': baseFreq = 0.10; break;
      case 'flop': baseFreq = 0.20; break;
      case 'turn': baseFreq = 0.25; break;
      case 'river': baseFreq = 0.30; break;
    }

    // Position adjustment
    if (position === 'late') baseFreq *= 1.3;
    if (position === 'early') baseFreq *= 0.8;

    // Opponent style adjustment
    const opponentStyle = this.opponentModel.estimateStyle();
    switch (opponentStyle) {
      case 'tight': baseFreq *= 1.4; break;
      case 'loose': baseFreq *= 0.7; break;
      case 'aggressive': baseFreq *= 0.9; break;
    }

    return Math.min(baseFreq, 0.5);
  }

  private calculateOptimalBluffSize(gameState: IGame, foldProbability: number): number {
    const potSize = gameState.pot;
    
    // Game theory optimal sizing based on fold probability
    if (foldProbability > 0.7) {
      return Math.floor(potSize * 0.6); // Smaller size when likely to fold
    } else if (foldProbability > 0.5) {
      return Math.floor(potSize * 0.8); // Medium size
    } else {
      return Math.floor(potSize * 1.2); // Larger size when less likely to fold
    }
  }

  // Update opponent model when observing actions
  observeOpponentAction(phase: string, action: string, amount: number, potSize: number): void {
    this.opponentModel.observeAction(phase, action, amount, potSize);
  }

  // Record game result for session tracking
  recordGameResult(result: 'won' | 'lost'): void {
    this.sessionState.recentResults.push(result);
    if (this.sessionState.recentResults.length > 10) {
      this.sessionState.recentResults.shift();
    }
    
    // Reduce tilt factor on wins
    if (result === 'won') {
      this.sessionState.tiltFactor = Math.max(this.sessionState.tiltFactor - 0.05, 0);
    }
  }

  // Get current AI state for debugging/analysis
  getAIState(): any {
    return {
      personality: this.personality,
      tiltFactor: this.sessionState.tiltFactor,
      handsPlayed: this.sessionState.handsPlayed,
      opponentProfile: this.opponentModel.getProfile(),
      recentResults: this.sessionState.recentResults
    };
  }

  // Reset session state
  resetSession(): void {
    this.sessionState = {
      handsPlayed: 0,
      recentResults: [],
      tiltFactor: 0
    };
    this.personality = 'balanced';
    this.opponentModel.reset();
  }

  // Existing methods with enhancements...
  private getValidActions(gameState: IGame): ActionType[] {
    const actions: ActionType[] = ['fold'];
    const callAmount = this.getCallAmount(gameState);
    
    if (callAmount > 0) {
      actions.push('call');
    } else {
      actions.push('check');
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayer];
    if (currentPlayer.chips > callAmount) {
      actions.push('raise');
    }

    return actions;
  }

  private getCallAmount(gameState: IGame): number {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    const maxBet = Math.max(...gameState.players.map(p => p.currentBet));
    return Math.max(0, maxBet - currentPlayer.currentBet);
  }

  private getBettingHistory(gameState: IGame): number[] {
    return gameState.players.map(p => p.totalBet);
  }

  private getPlayerPosition(gameState: IGame, player: any): string {
    const playerIndex = gameState.players.indexOf(player);
    return playerIndex === gameState.dealerPosition ? 'dealer' : 
           playerIndex === (gameState.dealerPosition + 1) % gameState.players.length ? 'early' : 'late';
  }

  private applyDifficultyAdjustments(decision: AIDecision, gameState: IGame, player: any): AIDecision {
    const handStrength = this.evaluateHandStrength(player.cards, gameState.communityCards);
    
    switch (this.difficulty) {
      case 'easy':
        return this.easyAdjustments(decision, handStrength);
      case 'medium':
        return this.mediumAdjustments(decision, handStrength);
      case 'hard':
        return this.hardAdjustments(decision, handStrength);
      case 'expert':
        return decision; // Use pure CFR strategy with enhancements
      default:
        return decision;
    }
  }

  private easyAdjustments(decision: AIDecision, handStrength: number): AIDecision {
    if (handStrength < 0.3 && decision.action === 'raise') {
      return { ...decision, action: 'call' };
    }
    if (handStrength > 0.8 && decision.action === 'fold') {
      return { ...decision, action: 'call' };
    }
    return decision;
  }

  private mediumAdjustments(decision: AIDecision, handStrength: number): AIDecision {
    const randomFactor = Math.random();
    if (randomFactor < 0.1) {
      const actions: ActionType[] = ['fold', 'call', 'raise'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      return { ...decision, action: randomAction };
    }
    return decision;
  }

  private hardAdjustments(decision: AIDecision, handStrength: number): AIDecision {
    if (handStrength > 0.6 && Math.random() < 0.2) {
      return { ...decision, action: 'raise' };
    }
    return decision;
  }

  private evaluateHandStrength(cards: Card[], communityCards: Card[]): number {
    if (communityCards.length === 0) {
      return this.estimatePreFlopStrength(cards);
    }
    
    const hand = evaluateHand([...cards, ...communityCards]);
    const maxRank = 10;
    return (maxRank - hand.rank) / maxRank;
  }

  private estimatePreFlopStrength(cards: Card[]): number {
    if (cards.length !== 2) return 0;
    
    const ranks = cards.map(c => this.getCardValue(c.rank));
    const isPair = ranks[0] === ranks[1];
    const isSuited = cards[0].suit === cards[1].suit;
    const highCard = Math.max(...ranks);
    const lowCard = Math.min(...ranks);
    const gap = Math.abs(ranks[0] - ranks[1]);
    
    let strength = 0;
    
    if (isPair) {
      strength = 0.5 + (highCard / 14) * 0.4;
    } else {
      strength = (highCard + lowCard) / 28;
      if (isSuited) strength += 0.1;
      if (gap <= 4) strength += 0.05;
    }
    
    return Math.min(strength, 1.0);
  }

  private getCardValue(rank: Card['rank']): number {
    switch (rank) {
      case 'A': return 14;
      case 'K': return 13;
      case 'Q': return 12;
      case 'J': return 11;
      default: return parseInt(rank);
    }
  }

  // Training and persistence methods remain the same...
  startTraining(gameStates: GameState[], iterations: number = 10000): void {
    console.log(`Starting AI training with ${iterations} iterations...`);
    this.isTraining = true;
    
    this.cfrAgent.train(gameStates, iterations);
    this.trainingGames += gameStates.length * iterations;
    
    this.saveStrategy();
    this.isTraining = false;
    
    console.log(`Training completed. Total training games: ${this.trainingGames}`);
  }

  saveStrategy(): any {
    try {
      const strategyData = this.cfrAgent.exportStrategy();
      console.log('Strategy saved successfully');
      return strategyData;
    } catch (error) {
      console.error('Failed to save strategy:', error);
    }
  }

  loadStrategy(): void {
    try {
      console.log('Strategy loaded successfully');
    } catch (error) {
      console.log('No existing strategy found, starting fresh');
    }
  }

  getAIStats(): any {
    return {
      difficulty: this.difficulty,
      personality: this.personality,
      trainingGames: this.trainingGames,
      iterations: this.cfrAgent.totalIterations,
      isTraining: this.isTraining,
      strategySize: this.cfrAgent.strategySize,
      sessionState: this.sessionState,
      opponentProfile: this.opponentModel.getProfile()
    };
  }

  setDifficulty(difficulty: Difficulty): boolean {
    if (['easy', 'medium', 'hard', 'expert'].includes(difficulty)) {
      this.difficulty = difficulty;
      return true;
    }
    return false;
  }
}

export default PokerAI;
