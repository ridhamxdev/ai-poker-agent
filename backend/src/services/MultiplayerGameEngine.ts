import { Player, GameState, ActionType, RoundResult, GameAction } from '../types/game.types';

class MultiplayerGameEngine {
  private id: string;
  private players: Player[];
  private state: GameState;
  private pot: number;
  private deck: string[];
  private communityCards: string[];
  private currentTurn: number;
  private currentBet: number;
  private smallBlind: number;
  private bigBlind: number;

  constructor(id: string) {
    this.id = id;
    this.players = [];
    this.state = 'waiting';
    this.pot = 0;
    this.deck = this.createDeck();
    this.communityCards = [];
    this.currentTurn = 0;
    this.currentBet = 0;
    this.smallBlind = 25;
    this.bigBlind = 50;
  }

  private createDeck(): string[] {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: string[] = [];

    for (const suit of suits) {
      for (const value of values) {
        deck.push(value + suit);
      }
    }

    return this.shuffleDeck(deck);
  }

  private shuffleDeck(deck: string[]): string[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  public async initializeMultiplayerGame(players: Player[]): Promise<void> {
    this.players = players;
    this.state = 'playing';
    this.deck = this.createDeck();
    this.dealInitialCards();
    this.setupBlinds();
  }

  private dealInitialCards(): void {
    this.players.forEach(player => {
      player.cards = [this.deck.pop()!, this.deck.pop()!];
      player.bet = 0;
      player.folded = false;
    });
  }

  private setupBlinds(): void {
    if (this.players.length < 2) return;

    // Small blind
    this.players[0].bet = this.smallBlind;
    this.players[0].chips -= this.smallBlind;

    // Big blind
    this.players[1].bet = this.bigBlind;
    this.players[1].chips -= this.bigBlind;

    this.currentBet = this.bigBlind;
    this.pot = this.smallBlind + this.bigBlind;
    this.currentTurn = 2 % this.players.length; // Start with player after big blind
  }

  public async handlePlayerAction(action: GameAction): Promise<{isRoundComplete: boolean}> {
    const playerIndex = this.players.findIndex(p => p.id === action.playerId);
    if (playerIndex === -1) throw new Error('Player not found');
    if (playerIndex !== this.currentTurn) throw new Error('Not your turn');

    const player = this.players[playerIndex];
    const playerBet = player.bet || 0;
    
    switch (action.type) {
      case 'fold':
        player.folded = true;
        break;
      case 'check':
        if (this.currentBet > playerBet) throw new Error('Cannot check');
        break;
      case 'call':
        const callAmount = this.currentBet - playerBet;
        if (callAmount > player.chips) throw new Error('Not enough chips');
        player.chips -= callAmount;
        player.bet = (playerBet + callAmount);
        this.pot += callAmount;
        break;
      case 'bet':
      case 'raise':
        if (!action.amount) throw new Error('Bet amount required');
        if (action.amount > player.chips) throw new Error('Not enough chips');
        if (action.amount <= this.currentBet) throw new Error('Bet must be higher than current bet');
        player.chips -= action.amount;
        this.pot += action.amount - playerBet;
        player.bet = action.amount;
        this.currentBet = action.amount;
        break;
      case 'all-in':
        const allInAmount = player.chips;
        player.chips = 0;
        this.pot += allInAmount;
        player.bet = (playerBet + allInAmount);
        if (player.bet > this.currentBet) {
          this.currentBet = player.bet;
        }
        break;
    }

    // Move to next active player
    do {
      this.currentTurn = (this.currentTurn + 1) % this.players.length;
    } while (this.players[this.currentTurn].folded);

    // Check if round is complete
    const isRoundComplete = this.isRoundComplete();
    if (isRoundComplete) {
      await this.handleRoundEnd();
    }

    return { isRoundComplete };
  }

  private isRoundComplete(): boolean {
    const activePlayers = this.players.filter(p => !p.folded);
    if (activePlayers.length === 1) return true;

    const allPlayersActed = activePlayers.every(p => 
      (p.bet === this.currentBet) || p.chips === 0
    );

    return allPlayersActed;
  }

  private async handleRoundEnd(): Promise<void> {
    // Deal remaining community cards if needed
    // Evaluate hands
    // Determine winner(s)
    // Distribute pot
    this.resetRound();
  }

  private resetRound(): void {
    this.pot = 0;
    this.currentBet = 0;
    this.communityCards = [];
    this.deck = this.createDeck();
    this.players.forEach(player => {
      player.bet = 0;
      player.folded = false;
    });
    this.dealInitialCards();
    this.setupBlinds();
  }

  public getGameState(forPlayerId?: string): any {
    return {
      id: this.id,
      players: this.players.map(player => ({
        ...player,
        cards: forPlayerId === player.id ? player.cards : undefined
      })),
      state: this.state,
      pot: this.pot,
      communityCards: this.communityCards,
      currentTurn: this.currentTurn,
      currentBet: this.currentBet
    };
  }

  public getRoundResult(): RoundResult {
    // Implement poker hand evaluation logic here
    // For now, return a simple result
    return {
      winners: [this.players[0]], // Implement actual winner determination
      pot: this.pot,
      hands: this.players.map(player => ({
        playerId: player.id,
        cards: player.cards || [],
        handRank: 'To be implemented'
      }))
    };
  }
}

export default MultiplayerGameEngine;