// src/services/opponentModel.ts
export interface OpponentProfile {
  foldFreq: number;
  callFreq: number;
  raiseFreq: number;
  checkFreq: number;
  bluffDetectedFreq: number;
  style: 'aggressive' | 'tight' | 'loose' | 'passive';
  lastActions: Array<{ phase: string; action: string; amount: number; potSize: number }>;
  totalActions: number;
  vpip: number; // Voluntarily Put In Pot percentage
  pfr: number; // Pre-Flop Raise percentage
  aggFactor: number; // Aggression Factor
  foldToCBet: number; // Fold to Continuation Bet
  betSizePattern: { [key: string]: number[] }; // Track bet sizing patterns
}

export class OpponentModel {
  private profile: OpponentProfile;
  private handHistory: Array<{ 
    cards?: any[], 
    actions: string[], 
    result: 'won' | 'lost' | 'folded' 
  }> = [];

  constructor() {
    this.profile = {
      foldFreq: 0,
      callFreq: 0,
      raiseFreq: 0,
      checkFreq: 0,
      bluffDetectedFreq: 0,
      style: 'tight',
      lastActions: [],
      totalActions: 0,
      vpip: 0,
      pfr: 0,
      aggFactor: 0,
      foldToCBet: 0,
      betSizePattern: {
        preflop: [],
        flop: [],
        turn: [],
        river: []
      }
    };
  }

  observeAction(phase: string, action: string, amount: number, potSize: number = 0) {
    this.profile.lastActions.push({ phase, action, amount, potSize });
    this.profile.totalActions++;

    // Update frequencies
    switch (action) {
      case 'fold':
        this.profile.foldFreq++;
        break;
      case 'call':
        this.profile.callFreq++;
        break;
      case 'raise':
        this.profile.raiseFreq++;
        // Track bet sizing patterns
        if (potSize > 0) {
          const betRatio = amount / potSize;
          this.profile.betSizePattern[phase] = this.profile.betSizePattern[phase] || [];
          this.profile.betSizePattern[phase].push(betRatio);
        }
        break;
      case 'check':
        this.profile.checkFreq++;
        break;
    }

    // Update advanced statistics
    this.updateAdvancedStats();
    this.updatePlayingStyle();
  }

  private updateAdvancedStats() {
    const total = this.profile.totalActions;
    if (total === 0) return;

    // VPIP - how often player puts money in pot voluntarily
    const voluntaryActions = this.profile.callFreq + this.profile.raiseFreq;
    this.profile.vpip = (voluntaryActions / total) * 100;

    // Aggression Factor - (Bets + Raises) / Calls
    const aggressive = this.profile.raiseFreq;
    const passive = this.profile.callFreq;
    this.profile.aggFactor = passive > 0 ? aggressive / passive : aggressive;
  }

  private updatePlayingStyle() {
    const { raiseFreq, callFreq, foldFreq, vpip, aggFactor } = this.profile;
    
    // More sophisticated style detection
    if (vpip > 25 && aggFactor > 2) {
      this.profile.style = 'aggressive';
    } else if (vpip < 15 && aggFactor < 1) {
      this.profile.style = 'tight';
    } else if (vpip > 30 && aggFactor < 1.5) {
      this.profile.style = 'loose';
    } else {
      this.profile.style = 'passive';
    }
  }

  estimateStyle(): 'aggressive' | 'tight' | 'loose' | 'passive' {
    return this.profile.style;
  }

  // Predict fold probability based on bet size and phase
  predictFoldProbability(betSize: number, potSize: number, phase: string): number {
    const betRatio = betSize / Math.max(potSize, 1);
    let baseFoldProb = this.profile.foldFreq / Math.max(this.profile.totalActions, 1);

    // Adjust based on bet sizing
    if (betRatio > 1.5) baseFoldProb *= 1.3; // Large bets increase fold probability
    if (betRatio < 0.5) baseFoldProb *= 0.7; // Small bets decrease fold probability

    // Adjust based on playing style
    switch (this.profile.style) {
      case 'tight': baseFoldProb *= 1.2; break;
      case 'loose': baseFoldProb *= 0.8; break;
      case 'aggressive': baseFoldProb *= 0.9; break;
    }

    return Math.min(Math.max(baseFoldProb, 0.1), 0.9);
  }

  // Detect if opponent is likely bluffing based on betting patterns
  detectBluffProbability(betSize: number, potSize: number, phase: string): number {
    const betRatio = betSize / Math.max(potSize, 1);
    const recentActions = this.profile.lastActions.slice(-5);
    
    let bluffProb = 0.2; // Base bluff probability

    // Large bet sizes in later streets often indicate bluffs
    if (phase === 'river' && betRatio > 1.0) bluffProb += 0.2;
    
    // Consistent aggression might indicate bluffing
    const recentAggression = recentActions.filter(a => a.action === 'raise').length;
    if (recentAggression > 2) bluffProb += 0.15;

    // Adjust based on style
    if (this.profile.style === 'aggressive') bluffProb += 0.1;
    if (this.profile.style === 'tight') bluffProb -= 0.1;

    return Math.min(Math.max(bluffProb, 0.05), 0.6);
  }

  getProfile(): OpponentProfile {
    return { ...this.profile };
  }

  // Reset for new session
  reset() {
    this.profile = {
      foldFreq: 0,
      callFreq: 0,
      raiseFreq: 0,
      checkFreq: 0,
      bluffDetectedFreq: 0,
      style: 'tight',
      lastActions: [],
      totalActions: 0,
      vpip: 0,
      pfr: 0,
      aggFactor: 0,
      foldToCBet: 0,
      betSizePattern: {
        preflop: [],
        flop: [],
        turn: [],
        river: []
      }
    };
  }
}
