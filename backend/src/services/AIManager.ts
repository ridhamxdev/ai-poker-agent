import PokerAI from './pokerAI';
import { IGame, Difficulty, Player } from '../types';

export interface AIPlayerConfig {
  id: string;
  username: string;
  difficulty: Difficulty;
  chips: number;
}

export class AIManager {
  private aiInstances: Map<string, PokerAI> = new Map();
  private aiConfigs: Map<string, AIPlayerConfig> = new Map();

  constructor() {
    this.initializeDefaultAIs();
  }

  private initializeDefaultAIs(): void {
    const defaultAIs: AIPlayerConfig[] = [
      { id: 'ai_easy_1', username: 'Bot_Novice', difficulty: 'easy', chips: 5000 },
      { id: 'ai_easy_2', username: 'Bot_Beginner', difficulty: 'easy', chips: 5000 },
      { id: 'ai_medium_1', username: 'Bot_Skilled', difficulty: 'medium', chips: 5000 },
      { id: 'ai_medium_2', username: 'Bot_Pro', difficulty: 'medium', chips: 5000 },
      { id: 'ai_hard_1', username: 'Bot_Expert', difficulty: 'hard', chips: 5000 }
    ];

    defaultAIs.forEach(config => {
      this.createAI(config);
    });
  }

  createAI(config: AIPlayerConfig): PokerAI {
    const ai = new PokerAI(config.difficulty, config.id);
    this.aiInstances.set(config.id, ai);
    this.aiConfigs.set(config.id, config);
    return ai;
  }

  getAI(aiId: string): PokerAI | undefined {
    return this.aiInstances.get(aiId);
  }

  getAIConfig(aiId: string): AIPlayerConfig | undefined {
    return this.aiConfigs.get(aiId);
  }

  selectAIsForGame(playerCount: number, minAIs: number): AIPlayerConfig[] {
    const requiredAIs = Math.max(minAIs, playerCount - 1); // At least minAIs, but fill game
    const availableAIs = Array.from(this.aiConfigs.values());
    
    // Shuffle and select AIs with varied difficulties
    const shuffled = this.shuffleArray([...availableAIs]);
    const selectedAIs = shuffled.slice(0, Math.min(requiredAIs, 5)); // Max 5 AIs
    
    return selectedAIs;
  }

  createGameWithAIs(humanPlayers: Partial<Player>[], minAIs: number): { players: Partial<Player>[], aiIds: string[] } {
    const totalSlots = 6; // Maximum players in a game
    const humanCount = humanPlayers.length;
    const aiCount = Math.min(minAIs, totalSlots - humanCount);
    
    const selectedAIs = this.selectAIsForGame(totalSlots, aiCount);
    const aiPlayers: Partial<Player>[] = selectedAIs.map(config => ({
      userId: null,
      username: config.username,
      chips: config.chips,
      isAI: true,
      aiId: config.id,
      cards: [],
      position: 'none',
      currentBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false
    }));

    // Combine human and AI players
    const allPlayers = [...humanPlayers, ...aiPlayers];
    const aiIds = selectedAIs.map(ai => ai.id);

    return { players: allPlayers, aiIds };
  }

  async makeAIDecision(gameState: IGame, aiId: string): Promise<any> {
    const ai = this.getAI(aiId);
    if (!ai) {
      throw new Error(`AI with id ${aiId} not found`);
    }

    const player = gameState.players.find(p => p.aiId === aiId);
    if (!player) {
      throw new Error(`AI player not found in game state`);
    }

    return await ai.makeDecision(gameState, player.username);
  }

  observeGameAction(aiId: string, phase: string, action: string, amount: number, potSize: number): void {
    const ai = this.getAI(aiId);
    if (ai) {
      ai.observeOpponentAction(phase, action, amount, potSize);
    }
  }

  recordGameResult(aiId: string, result: 'won' | 'lost'): void {
    const ai = this.getAI(aiId);
    if (ai) {
      ai.recordGameResult(result);
    }
  }

  getAIStats(aiId: string): any {
    const ai = this.getAI(aiId);
    const config = this.getAIConfig(aiId);
    
    if (!ai || !config) {
      return null;
    }

    return {
      ...ai.getAIStats(),
      config
    };
  }

  getAllAIStats(): any[] {
    return Array.from(this.aiConfigs.keys()).map(aiId => this.getAIStats(aiId));
  }

  resetAISession(aiId: string): void {
    const ai = this.getAI(aiId);
    if (ai) {
      ai.resetSession();
    }
  }

  resetAllAISessions(): void {
    this.aiInstances.forEach(ai => ai.resetSession());
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Get AIs by difficulty level
  getAIsByDifficulty(difficulty: Difficulty): AIPlayerConfig[] {
    return Array.from(this.aiConfigs.values()).filter(config => config.difficulty === difficulty);
  }

  // Create custom AI for specific needs
  createCustomAI(difficulty: Difficulty, username?: string): string {
    const aiId = `custom_ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const config: AIPlayerConfig = {
      id: aiId,
      username: username || `CustomBot_${aiId.slice(-5)}`,
      difficulty,
      chips: 5000
    };

    this.createAI(config);
    return aiId;
  }

  removeAI(aiId: string): boolean {
    const removed = this.aiInstances.delete(aiId) && this.aiConfigs.delete(aiId);
    return removed;
  }

  getAvailableAIs(): AIPlayerConfig[] {
    return Array.from(this.aiConfigs.values());
  }
}

export default AIManager;


