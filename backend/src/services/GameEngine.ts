import { createDeck, shuffleDeck } from '../utils/cards';
import { evaluateHand, compareHands } from '../utils/handEvaluator';
import Game from '../models/Game';
import { IGame, Player, Card, GameType, ActionType } from '../types';

export class GameEngine {
  private gameId: string;

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  async initializeGame(players: Partial<Player>[], gameType: GameType = 'ai-vs-human'): Promise<IGame> {
    try {
      const deck = shuffleDeck(createDeck());
      
      const game = new Game({
        gameId: this.gameId,
        gameType,
        players: players.map((player, index) => {
          let position: 'dealer' | 'smallBlind' | 'bigBlind' | 'none' = 'none';
          if (players.length >= 3) {
            if (index === 0) position = 'dealer';
            else if (index === 1) position = 'smallBlind';
            else if (index === 2) position = 'bigBlind';
          } else if (players.length === 2) {
            if (index === 0) position = 'dealer';
            else if (index === 1) position = 'bigBlind';
          }
          
          return {
            userId: player.userId || null,
            username: player.username || `Player_${index + 1}`,
            chips: player.chips || 5000,
            cards: [],
            position,
            currentBet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            isAI: player.isAI || false
          } as Player;
        }),
        deck,
        gameState: 'preflop',
        dealerPosition: 0,
        currentPlayer: this.getFirstToAct(players.length), // Proper first to act calculation
        pot: 0,
        communityCards: [],
        bettingRound: 0,
        smallBlind: 25,
        bigBlind: 50,
        currentBet: 0,
        lastAction: null,
        startTime: new Date()
      });

      // Deal hole cards
      this.dealHoleCards(game);
      
      // Post blinds
      this.postBlinds(game);

      // Set current bet to big blind
      game.currentBet = game.bigBlind;

      await game.save();
      return game;
    } catch (error) {
      throw new Error(`Failed to initialize game: ${(error as Error).message}`);
    }
  }

  private getFirstToAct(playerCount: number): number {
    // In heads-up (2 players), dealer acts first preflop
    // With 3+ players, first to act is left of big blind
    if (playerCount === 2) {
      return 0; // Dealer acts first in heads-up
    } else if (playerCount === 3) {
      return 0; // With 3 players: dealer(0), small blind(1), big blind(2) - dealer acts first after big blind
    } else {
      return 3; // With 4+ players: left of big blind acts first
    }
  }

  private dealHoleCards(game: IGame): void {
    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
      for (const player of game.players) {
        if (game.deck.length > 0) {
          const card = game.deck.pop();
          if (card) {
            player.cards.push(card);
          }
        }
      }
    }
  }

  private postBlinds(game: IGame): void {
    const smallBlindPlayer = game.players.find(p => p.position === 'smallBlind');
    const bigBlindPlayer = game.players.find(p => p.position === 'bigBlind');

    if (smallBlindPlayer) {
      smallBlindPlayer.currentBet = game.smallBlind;
      smallBlindPlayer.totalBet = game.smallBlind;
      smallBlindPlayer.chips -= game.smallBlind;
      game.pot += game.smallBlind;
    }

    if (bigBlindPlayer) {
      bigBlindPlayer.currentBet = game.bigBlind;
      bigBlindPlayer.totalBet = game.bigBlind;
      bigBlindPlayer.chips -= game.bigBlind;
      game.pot += game.bigBlind;
    }
  }

  async makeAction(gameId: string, playerId: string, action: ActionType, amount: number = 0): Promise<IGame> {
    try {
      const game = await Game.findOne({ gameId });
      if (!game) throw new Error('Game not found');

      const playerIndex = game.players.findIndex(p => 
        p.userId?.toString() === playerId || p.username === playerId
      );
      
      console.log(`Action attempt: playerId=${playerId}, playerIndex=${playerIndex}, currentPlayer=${game.currentPlayer}, players=${game.players.map(p => p.username)}`);
      
      if (playerIndex === -1) throw new Error('Player not found');
      if (playerIndex !== game.currentPlayer) throw new Error(`Not your turn. Current player: ${game.currentPlayer}, Your index: ${playerIndex}`);
      if (game.gameState === 'finished') throw new Error('Game is finished');

      const player = game.players[playerIndex];
      if (player.folded) throw new Error('Player has already folded');
      if (player.allIn) throw new Error('Player is all-in');

      const callAmount = this.getCallAmount(game, playerIndex);
      let actionAmount = 0;
      let newCurrentBet = game.currentBet;

      switch (action.toLowerCase() as ActionType) {
        case 'fold':
          player.folded = true;
          break;
          
        case 'call':
          if (callAmount === 0) throw new Error('Nothing to call');
          if (callAmount > player.chips) {
            // All-in call
            actionAmount = player.chips;
            player.allIn = true;
          } else {
            actionAmount = callAmount;
          }
          player.chips -= actionAmount;
          player.currentBet += actionAmount;
          player.totalBet += actionAmount;
          game.pot += actionAmount;
          break;
          
        case 'raise':
          if (amount < game.bigBlind) throw new Error(`Minimum raise is ${game.bigBlind}`);
          const totalRaiseAmount = callAmount + amount;
          if (totalRaiseAmount > player.chips) {
            // All-in raise
            actionAmount = player.chips;
            player.allIn = true;
            newCurrentBet = player.currentBet + actionAmount;
          } else {
            actionAmount = totalRaiseAmount;
            newCurrentBet = player.currentBet + actionAmount;
          }
          player.chips -= actionAmount;
          player.currentBet += actionAmount;
          player.totalBet += actionAmount;
          game.pot += actionAmount;
          game.currentBet = newCurrentBet;
          break;
          
        case 'check':
          if (callAmount > 0) {
            throw new Error('Cannot check, must call or fold');
          }
          break;

        case 'all-in':
          actionAmount = player.chips;
          player.allIn = true;
          player.chips = 0;
          player.currentBet += actionAmount;
          player.totalBet += actionAmount;
          game.pot += actionAmount;
          if (player.currentBet > game.currentBet) {
            game.currentBet = player.currentBet;
          }
          break;
          
        default:
          throw new Error('Invalid action');
      }

      // Record the action
      game.lastAction = {
        player: playerIndex,
        action: action.toLowerCase() as ActionType,
        amount: actionAmount,
        timestamp: new Date()
      };

      // Move to next player or next betting round
      this.advanceGame(game);

      await game.save();
      return game;
    } catch (error) {
      throw new Error(`Action failed: ${(error as Error).message}`);
    }
  }

  private getCallAmount(game: IGame, playerIndex: number): number {
    const player = game.players[playerIndex];
    const maxBet = Math.max(...game.players.map(p => p.currentBet));
    return Math.max(0, maxBet - player.currentBet);
  }

  private advanceGame(game: IGame): void {
    // Check if only one player remains (everyone else folded)
    const activePlayers = game.players.filter(p => !p.folded);
    if (activePlayers.length <= 1) {
      this.endHand(game);
      return;
    }

    // Move to next active player
    let attempts = 0;
    do {
      game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
      attempts++;
      if (attempts > game.players.length) {
        // Safety check to prevent infinite loop
        console.error('Infinite loop detected in advanceGame');
        break;
      }
    } while (game.players[game.currentPlayer].folded || game.players[game.currentPlayer].allIn);

    // Check if betting round is complete
    if (this.isBettingRoundComplete(game)) {
      this.nextBettingRound(game);
    }
  }

  private isBettingRoundComplete(game: IGame): boolean {
    const activePlayers = game.players.filter(p => !p.folded);
    if (activePlayers.length <= 1) return true;
    
    const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
    
    // Check if all active players have either matched the bet or are all-in
    return activePlayers.every(p => 
      p.currentBet === maxBet || p.allIn || p.chips === 0
    );
  }

  private endHand(game: IGame): void {
    const activePlayers = game.players.filter(p => !p.folded);
    
    if (activePlayers.length === 1) {
      // Only one player left, they win
      const winner = activePlayers[0];
      winner.chips += game.pot;
      game.winner = {
        playerId: winner.userId?.toString() || winner.username,
        winningHand: 'Last Player Standing',
        amount: game.pot
      };
    } else {
      // Showdown - evaluate hands
      this.showdown(game);
    }
    
    game.gameState = 'finished';
    game.endTime = new Date();
  }

  private nextBettingRound(game: IGame): void {
    // Reset current bets for next round
    game.players.forEach(p => p.currentBet = 0);
    game.currentBet = 0;
    
    // Advance game state
    switch (game.gameState) {
      case 'preflop':
        this.dealFlop(game);
        game.gameState = 'flop';
        break;
      case 'flop':
        this.dealTurn(game);
        game.gameState = 'turn';
        break;
      case 'turn':
        this.dealRiver(game);
        game.gameState = 'river';
        break;
      case 'river':
        this.endHand(game);
        return;
    }

    // Set current player to first active player after dealer (small blind)
    game.currentPlayer = this.getFirstToActAfterDealer(game);
  }

  private getFirstToActAfterDealer(game: IGame): number {
    const activePlayers = game.players.filter(p => !p.folded);
    if (activePlayers.length <= 1) return 0;

    // Find the dealer position among active players
    let dealerIndex = game.dealerPosition;
    while (game.players[dealerIndex].folded) {
      dealerIndex = (dealerIndex + 1) % game.players.length;
    }

    // First to act is the next active player after dealer
    let firstToAct = (dealerIndex + 1) % game.players.length;
    while (game.players[firstToAct].folded) {
      firstToAct = (firstToAct + 1) % game.players.length;
    }

    return firstToAct;
  }

  private dealFlop(game: IGame): void {
    // Burn one card
    game.deck.pop();
    // Deal 3 community cards
    for (let i = 0; i < 3; i++) {
      const card = game.deck.pop();
      if (card) {
        game.communityCards.push(card);
      }
    }
  }

  private dealTurn(game: IGame): void {
    // Burn one card
    game.deck.pop();
    // Deal 1 community card
    const card = game.deck.pop();
    if (card) {
      game.communityCards.push(card);
    }
  }

  private dealRiver(game: IGame): void {
    // Burn one card
    game.deck.pop();
    // Deal 1 community card
    const card = game.deck.pop();
    if (card) {
      game.communityCards.push(card);
    }
  }

  private showdown(game: IGame): void {
    const activePlayers = game.players.filter(p => !p.folded);
    
    if (activePlayers.length === 1) {
      // Only one player left, they win
      const winner = activePlayers[0];
      winner.chips += game.pot;
      game.winner = {
        playerId: winner.userId?.toString() || winner.username,
        winningHand: 'Last Player Standing',
        amount: game.pot
      };
    } else {
      // Evaluate hands and determine winner
      const handEvaluations = activePlayers.map(player => ({
        player,
        hand: evaluateHand([...player.cards, ...game.communityCards])
      }));

      handEvaluations.sort((a, b) => compareHands(b.hand, a.hand));
      const winner = handEvaluations[0];
      
      winner.player.chips += game.pot;
      game.winner = {
        playerId: winner.player.userId?.toString() || winner.player.username,
        winningHand: winner.hand.name,
        amount: game.pot
      };
    }

    game.gameState = 'finished';
    game.endTime = new Date();
  }

  private getFirstActivePlayer(game: IGame): number {
    for (let i = 0; i < game.players.length; i++) {
      if (!game.players[i].folded) {
        return i;
      }
    }
    return 0;
  }

  // Start a new hand (for multi-hand games)
  async startNewHand(gameId: string): Promise<IGame> {
    try {
      const game = await Game.findOne({ gameId });
      if (!game) throw new Error('Game not found');

      // Rotate dealer
      game.dealerPosition = (game.dealerPosition + 1) % game.players.length;

      // Reset game state for new hand
      game.gameState = 'preflop';
      game.pot = 0;
      game.currentBet = 0;
      game.communityCards = [];
      game.bettingRound = 0;
      // game.lastAction will be set when actions are made
      game.winner = undefined;
      game.endTime = undefined;

      // Reset player states
      game.players.forEach(player => {
        player.cards = [];
        player.currentBet = 0;
        player.totalBet = 0;
        player.folded = false;
        player.allIn = false;
        // Reset positions
        player.position = 'none';
      });

      // Set new positions
      this.setPlayerPositions(game);

      // Create new deck and deal cards
      game.deck = shuffleDeck(createDeck());
      this.dealHoleCards(game);
      this.postBlinds(game);

      // Set current bet and first to act
      game.currentBet = game.bigBlind;
      game.currentPlayer = this.getFirstToAct(game.players.length);

      await game.save();
      return game;
    } catch (error) {
      throw new Error(`Failed to start new hand: ${(error as Error).message}`);
    }
  }

  private setPlayerPositions(game: IGame): void {
    const playerCount = game.players.length;
    const dealerIndex = game.dealerPosition;

    if (playerCount >= 3) {
      // 3+ players: dealer, small blind, big blind
      game.players[dealerIndex].position = 'dealer';
      game.players[(dealerIndex + 1) % playerCount].position = 'smallBlind';
      game.players[(dealerIndex + 2) % playerCount].position = 'bigBlind';
    } else if (playerCount === 2) {
      // Heads-up: dealer posts small blind, other player posts big blind
      game.players[dealerIndex].position = 'dealer';
      game.players[(dealerIndex + 1) % playerCount].position = 'bigBlind';
    }
  }

  // Public getter methods
  public getGameState(gameId: string): Promise<IGame | null> {
    return Game.findOne({ gameId });
  }

  public async getValidActions(gameId: string, playerId: string): Promise<ActionType[]> {
    const game = await Game.findOne({ gameId });
    if (!game) throw new Error('Game not found');

    const actions: ActionType[] = ['fold'];
    const callAmount = this.getCallAmount(game, game.currentPlayer);
    
    if (callAmount > 0) {
      actions.push('call');
    } else {
      actions.push('check');
    }
    
    const currentPlayer = game.players[game.currentPlayer];
    if (currentPlayer.chips > callAmount) {
      actions.push('raise');
    }

    return actions;
  }
}

export default GameEngine;
