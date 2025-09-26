import { evaluateHand } from '../utils/handEvaluator';
import { Card, CFRStrategy, ActionType, GameState, AIDecision } from '../types';

interface CFRNode {
  infoSet: string;
  strategy: CFRStrategy;
  regretSum: CFRStrategy;
  strategySum: CFRStrategy;
}

export class CFRAgent {
  private strategy: Map<string, CFRStrategy> = new Map();
  private regrets: Map<string, CFRStrategy> = new Map();
  private strategySum: Map<string, CFRStrategy> = new Map();
  private iterations: number = 0;

  // Information Set: combines cards + betting history + position
  getInformationSet(cards: Card[], communityCards: Card[], bettingHistory: number[], position: string): string {
    const hand = evaluateHand([...cards, ...communityCards]);
    const handStrength = this.getHandStrength(hand);
    const potOdds = this.calculatePotOdds(bettingHistory);
    
    return `${handStrength}-${position}-${bettingHistory.join('')}-${potOdds}`;
  }

  private getHandStrength(hand: any): string {
    // Simplified hand strength categories
    if (hand.rank <= 2) return 'strong';
    if (hand.rank <= 5) return 'medium';
    return 'weak';
  }

  private calculatePotOdds(bettingHistory: number[]): string {
    // Simplified pot odds calculation
    const totalPot = bettingHistory.reduce((sum, bet) => sum + (bet || 0), 0);
    if (totalPot < 200) return 'low';
    if (totalPot < 500) return 'medium';
    return 'high';
  }

  getStrategy(infoSet: string, actions: ActionType[] = ['fold', 'call', 'raise']): CFRStrategy {
    if (!this.strategy.has(infoSet)) {
      // Initialize with uniform random strategy
      const numActions = actions.length;
      const uniformProb = 1.0 / numActions;
      const initialStrategy: CFRStrategy = {};
      actions.forEach(action => {
        initialStrategy[action] = uniformProb;
      });
      this.strategy.set(infoSet, initialStrategy);
    }

    return this.strategy.get(infoSet)!;
  }

  updateRegrets(infoSet: string, action: ActionType, regret: number): void {
    if (!this.regrets.has(infoSet)) {
      this.regrets.set(infoSet, {});
    }
    
    const regretMap = this.regrets.get(infoSet)!;
    if (!regretMap[action]) {
      regretMap[action] = 0;
    }
    
    regretMap[action] += regret;
  }

  updateStrategy(infoSet: string, actions: ActionType[] = ['fold', 'call', 'raise']): void {
    const regrets = this.regrets.get(infoSet) || {};
    
    // Calculate positive regrets
    let totalPositiveRegret = 0;
    const positiveRegrets: CFRStrategy = {};
    
    actions.forEach(action => {
      positiveRegrets[action] = Math.max(0, regrets[action] || 0);
      totalPositiveRegret += positiveRegrets[action];
    });

    // Update strategy based on regret matching
    const newStrategy: CFRStrategy = {};
    if (totalPositiveRegret > 0) {
      actions.forEach(action => {
        newStrategy[action] = positiveRegrets[action] / totalPositiveRegret;
      });
    } else {
      // Uniform random if no positive regrets
      const uniformProb = 1.0 / actions.length;
      actions.forEach(action => {
        newStrategy[action] = uniformProb;
      });
    }

    this.strategy.set(infoSet, newStrategy);
    
    // Update strategy sum for average strategy
    if (!this.strategySum.has(infoSet)) {
      this.strategySum.set(infoSet, {});
    }
    
    const strategySum = this.strategySum.get(infoSet)!;
    actions.forEach(action => {
      if (!strategySum[action]) {
        strategySum[action] = 0;
      }
      strategySum[action] += newStrategy[action];
    });
  }

  getAverageStrategy(infoSet: string, actions: ActionType[] = ['fold', 'call', 'raise']): CFRStrategy {
    const strategySum = this.strategySum.get(infoSet) || {};
    const avgStrategy: CFRStrategy = {};
    
    let totalSum = 0;
    actions.forEach(action => {
      totalSum += strategySum[action] || 0;
    });

    if (totalSum > 0) {
      actions.forEach(action => {
        avgStrategy[action] = (strategySum[action] || 0) / totalSum;
      });
    } else {
      const uniformProb = 1.0 / actions.length;
      actions.forEach(action => {
        avgStrategy[action] = uniformProb;
      });
    }

    return avgStrategy;
  }

  // Main CFR training method
  train(gameStates: GameState[], iterations: number = 1000): void {
    for (let i = 0; i < iterations; i++) {
      // Simulate games and update regrets
      gameStates.forEach(gameState => {
        this.cfrIteration(gameState, 1.0, 1.0);
      });
      this.iterations++;
    }
  }

  private cfrIteration(gameState: GameState, p0: number, p1: number): number {
    // Simplified CFR iteration
    const player = gameState.currentPlayer;
    const playerCards = gameState.players[player].cards;
    const infoSet = this.getInformationSet(
      playerCards,
      gameState.communityCards,
      gameState.bettingHistory,
      player.toString()
    );

    const actions = this.getValidActions(gameState);
    const strategy = this.getStrategy(infoSet, actions);
    
    // Calculate action values (simplified)
    const actionValues: { [action: string]: number } = {};
    let nodeValue = 0;

    actions.forEach(action => {
      const actionValue = this.calculateActionValue(gameState, action);
      actionValues[action] = actionValue;
      nodeValue += strategy[action] * actionValue;
    });

    // Update regrets
    actions.forEach(action => {
      const regret = actionValues[action] - nodeValue;
      this.updateRegrets(infoSet, action, regret);
    });

    // Update strategy
    this.updateStrategy(infoSet, actions);

    return nodeValue;
  }

  private getValidActions(gameState: GameState): ActionType[] {
    const actions: ActionType[] = ['fold'];
    
    if (this.canCall(gameState)) {
      actions.push('call');
    } else {
      actions.push('check');
    }
    
    if (this.canRaise(gameState)) {
      actions.push('raise');
    }

    return actions;
  }

  private canCall(gameState: GameState): boolean {
    return gameState.currentBet > 0;
  }

  private canRaise(gameState: GameState): boolean {
    const player = gameState.players[gameState.currentPlayer];
    return player.chips > gameState.currentBet;
  }

  private calculateActionValue(gameState: GameState, action: ActionType): number {
    // Simplified action value calculation
    const playerCards = gameState.players[gameState.currentPlayer].cards;
    const hand = evaluateHand([...playerCards, ...gameState.communityCards]);
    const handStrength = this.getHandStrength(hand);

    const baseValue = handStrength === 'strong' ? 100 : 
                     handStrength === 'medium' ? 50 : 10;

    switch (action) {
      case 'fold':
        return 0;
      case 'call':
      case 'check':
        return baseValue * 0.8;
      case 'raise':
        return baseValue * 1.2 - 50; // Risk adjustment
      default:
        return 0;
    }
  }

  // Get AI's decision for a given game state
  getDecision(cards: Card[], communityCards: Card[], bettingHistory: number[], position: string, validActions: ActionType[]): AIDecision {
    const infoSet = this.getInformationSet(cards, communityCards, bettingHistory, position);
    const strategy = this.getAverageStrategy(infoSet, validActions);
    
    // Sample action based on strategy probabilities
    const random = Math.random();
    let cumulative = 0;
    
    for (const action of validActions) {
      cumulative += strategy[action];
      if (random <= cumulative) {
        return {
          action,
          probability: strategy[action],
          reasoning: this.getActionReasoning(action, strategy)
        };
      }
    }
    
    // Fallback to first valid action
    return {
      action: validActions[0],
      probability: strategy[validActions[0]],
      reasoning: 'Fallback decision'
    };
  }

  private getActionReasoning(action: ActionType, strategy: CFRStrategy): string {
    const confidence = strategy[action];
    if (confidence > 0.6) {
      return `High confidence ${action} (${(confidence * 100).toFixed(1)}%)`;
    } else if (confidence > 0.4) {
      return `Moderate confidence ${action} (${(confidence * 100).toFixed(1)}%)`;
    } else {
      return `Low confidence ${action} (${(confidence * 100).toFixed(1)}%)`;
    }
  }

  // Save/Load strategy for persistence
  exportStrategy(): any {
    return {
      strategy: Object.fromEntries(this.strategy),
      regrets: Object.fromEntries(this.regrets),
      strategySum: Object.fromEntries(this.strategySum),
      iterations: this.iterations
    };
  }

  importStrategy(data: any): void {
    this.strategy = new Map(Object.entries(data.strategy || {}));
    this.regrets = new Map(Object.entries(data.regrets || {}));
    this.strategySum = new Map(Object.entries(data.strategySum || {}));
    this.iterations = data.iterations || 0;
  }

  // Getters
  get totalIterations(): number {
    return this.iterations;
  }

  get strategySize(): number {
    return this.strategy.size;
  }
}

export default CFRAgent;
