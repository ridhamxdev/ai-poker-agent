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
        players: players.map((player, index) => ({
          userId: player.userId || null,
          username: player.username || `Player_${index + 1}`,
          chips: player.chips || 5000,
          cards: [],
          position: index === 0 ? 'dealer' : index === 1 ? 'smallBlind' : 'bigBlind',
          currentBet: 0,
          totalBet: 0,
          folded: false,
          allIn: false,
          isAI: player.isAI || false
        } as Player)),
        deck,
        gameState: 'preflop',
        dealerPosition: 0,
        currentPlayer: 1, // Start with small blind
        pot: 0,
        communityCards: [],
        bettingRound: 0
      });

      // Deal hole cards
      this.dealHoleCards(game);
      
      // Post blinds
      this.postBlinds(game);

      await game.save();
      return game;
    } catch (error) {
      throw new Error(`Failed to initialize game: ${(error as Error).message}`);
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
      
      if (playerIndex === -1) throw new Error('Player not found');
      if (playerIndex !== game.currentPlayer) throw new Error('Not your turn');

      const player = game.players[playerIndex];

      switch (action.toLowerCase() as ActionType) {
        case 'fold':
          player.folded = true;
          break;
          
        case 'call':
          const callAmount = this.getCallAmount(game, playerIndex);
          player.chips -= callAmount;
          player.currentBet += callAmount;
          player.totalBet += callAmount;
          game.pot += callAmount;
          break;
          
        case 'raise':
          const raiseAmount = Math.min(amount, player.chips);
          const toCall = this.getCallAmount(game, playerIndex);
          const totalAmount = toCall + raiseAmount;
          
          player.chips -= totalAmount;
          player.currentBet += totalAmount;
          player.totalBet += totalAmount;
          game.pot += totalAmount;
          break;
          
        case 'check':
          if (this.getCallAmount(game, playerIndex) > 0) {
            throw new Error('Cannot check, must call or fold');
          }
          break;
          
        default:
          throw new Error('Invalid action');
      }

      // Record the action
      game.lastAction = {
        player: playerIndex,
        action: action.toLowerCase() as ActionType,
        amount,
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
    // Move to next active player
    do {
      game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
    } while (game.players[game.currentPlayer].folded);

    // Check if betting round is complete
    if (this.isBettingRoundComplete(game)) {
      this.nextBettingRound(game);
    }
  }

  private isBettingRoundComplete(game: IGame): boolean {
    const activePlayers = game.players.filter(p => !p.folded);
    const maxBet = Math.max(...activePlayers.map(p => p.currentBet));
    
    return activePlayers.every(p => 
      p.currentBet === maxBet || p.chips === 0
    );
  }

  private nextBettingRound(game: IGame): void {
    // Reset current bets
    game.players.forEach(p => p.currentBet = 0);
    
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
        this.showdown(game);
        game.gameState = 'showdown';
        break;
    }

    // Set current player to first active player after dealer
    game.currentPlayer = this.getFirstActivePlayer(game);
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
