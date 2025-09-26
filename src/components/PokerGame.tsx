import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, DollarSign, Users } from 'lucide-react';

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  value: number;
}

interface Player {
  id: number;
  name: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  folded: boolean;
  isAI: boolean;
  position: 'bottom' | 'left' | 'top' | 'right';
}

const PokerGame = () => {
  const location = useLocation();
  const gameMode = location.state?.gameMode || 'ai';
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [communityCards, setCommunityCards] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [gamePhase, setGamePhase] = useState<'preflop' | 'flop' | 'turn' | 'river' | 'showdown'>('preflop');
  const [playerAction, setPlayerAction] = useState<string>('');

  // Initialize game
  useEffect(() => {
    initializeGame();
  }, [gameMode]);

  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    suits.forEach(suit => {
      ranks.forEach((rank, index) => {
        deck.push({
          suit,
          rank,
          value: index + 2
        });
      });
    });
    return shuffleDeck(deck);
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const initializeGame = () => {
    const deck = createDeck();
    let cardIndex = 0;

    const newPlayers: Player[] = [
      {
        id: 1,
        name: 'You',
        chips: 1000,
        cards: [deck[cardIndex++], deck[cardIndex++]],
        currentBet: 0,
        folded: false,
        isAI: false,
        position: 'bottom'
      }
    ];

    if (gameMode === 'multiplayer') {
      newPlayers.push(
        {
          id: 2,
          name: 'Player 2',
          chips: 1000,
          cards: [deck[cardIndex++], deck[cardIndex++]],
          currentBet: 0,
          folded: false,
          isAI: false,
          position: 'left'
        },
        {
          id: 3,
          name: 'Player 3',
          chips: 1000,
          cards: [deck[cardIndex++], deck[cardIndex++]],
          currentBet: 0,
          folded: false,
          isAI: false,
          position: 'top'
        },
        {
          id: 4,
          name: 'Player 4',
          chips: 1000,
          cards: [deck[cardIndex++], deck[cardIndex++]],
          currentBet: 0,
          folded: false,
          isAI: false,
          position: 'right'
        }
      );
    } else {
      newPlayers.push(
        {
          id: 2,
          name: 'AI Bot 1',
          chips: 1000,
          cards: [deck[cardIndex++], deck[cardIndex++]],
          currentBet: 0,
          folded: false,
          isAI: true,
          position: 'left'
        },
        {
          id: 3,
          name: 'AI Bot 2',
          chips: 1000,
          cards: [deck[cardIndex++], deck[cardIndex++]],
          currentBet: 0,
          folded: false,
          isAI: true,
          position: 'top'
        },
        {
          id: 4,
          name: 'AI Bot 3',
          chips: 1000,
          cards: [deck[cardIndex++], deck[cardIndex++]],
          currentBet: 0,
          folded: false,
          isAI: true,
          position: 'right'
        }
      );
    }

    setPlayers(newPlayers);
    setPot(0);
    setCurrentPlayer(0);
    setGamePhase('preflop');
  };

  const handlePlayerAction = (action: 'fold' | 'call' | 'raise', amount?: number) => {
    setPlayerAction(action);
    
    setPlayers(prev => prev.map(player => {
      if (player.id === 1) {
        switch (action) {
          case 'fold':
            return { ...player, folded: true };
          case 'call':
            const callAmount = Math.min(50, player.chips);
            setPot(prev => prev + callAmount);
            return { 
              ...player, 
              chips: player.chips - callAmount,
              currentBet: player.currentBet + callAmount
            };
          case 'raise':
            const raiseAmount = amount || 100;
            const actualRaise = Math.min(raiseAmount, player.chips);
            setPot(prev => prev + actualRaise);
            return { 
              ...player, 
              chips: player.chips - actualRaise,
              currentBet: player.currentBet + actualRaise
            };
          default:
            return player;
        }
      }
      return player;
    }));

    // Simulate AI actions
    setTimeout(() => {
      simulateAIActions();
    }, 1000);
  };

  const simulateAIActions = () => {
    setPlayers(prev => prev.map(player => {
      if (player.isAI && !player.folded) {
        const actions = ['call', 'fold', 'raise'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        switch (randomAction) {
          case 'fold':
            return { ...player, folded: true };
          case 'call':
            const callAmount = Math.min(50, player.chips);
            setPot(prev => prev + callAmount);
            return { 
              ...player, 
              chips: player.chips - callAmount,
              currentBet: player.currentBet + callAmount
            };
          case 'raise':
            const raiseAmount = Math.min(75, player.chips);
            setPot(prev => prev + raiseAmount);
            return { 
              ...player, 
              chips: player.chips - raiseAmount,
              currentBet: player.currentBet + raiseAmount
            };
          default:
            return player;
        }
      }
      return player;
    }));
  };

  const dealCommunityCards = () => {
    const deck = createDeck();
    let newCards: Card[] = [];
    
    switch (gamePhase) {
      case 'preflop':
        newCards = deck.slice(0, 3); // Flop
        setGamePhase('flop');
        break;
      case 'flop':
        newCards = [...communityCards, deck[3]]; // Turn
        setGamePhase('turn');
        break;
      case 'turn':
        newCards = [...communityCards, deck[4]]; // River
        setGamePhase('river');
        break;
    }
    
    setCommunityCards(newCards);
  };

  const getCardSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const getCardColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? '#e53e3e' : '#2d3748';
  };

  const renderCard = (card: Card, isHidden = false) => (
    <motion.div
      className={`playing-card ${isHidden ? 'hidden' : ''}`}
      initial={{ scale: 0, rotateY: 180 }}
      animate={{ scale: 1, rotateY: 0 }}
      transition={{ duration: 0.6 }}
    >
      {!isHidden ? (
        <>
          <div className="card-rank" style={{ color: getCardColor(card.suit) }}>
            {card.rank}
          </div>
          <div className="card-suit" style={{ color: getCardColor(card.suit) }}>
            {getCardSymbol(card.suit)}
          </div>
        </>
      ) : (
        <div className="card-back">🂠</div>
      )}
    </motion.div>
  );

  const renderPlayer = (player: Player) => (
    <motion.div
      key={player.id}
      className={`player player-${player.position} ${player.folded ? 'folded' : ''}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-chips">
          <DollarSign size={16} />
          {player.chips}
        </div>
        {player.currentBet > 0 && (
          <div className="player-bet">Bet: ${player.currentBet}</div>
        )}
      </div>
      <div className="player-cards">
        {player.cards.map((card, index) => (
          <div key={index}>
            {renderCard(card, player.id !== 1)}
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="poker-game">
      <div className="game-header">
        <Link to="/game-selection" className="back-link">
          <ArrowLeft size={20} />
          Back to Game Selection
        </Link>
        <div className="game-info">
          <div className="game-mode">
            <Users size={20} />
            {gameMode === 'multiplayer' ? 'Multiplayer' : 'AI Mode'}
          </div>
          <div className="pot-info">
            <DollarSign size={20} />
            Pot: ${pot}
          </div>
        </div>
      </div>

      <div className="poker-table">
        <div className="table-center">
          <div className="community-cards">
            <h3>Community Cards</h3>
            <div className="cards-container">
              <AnimatePresence>
                {communityCards.map((card, index) => (
                  <motion.div
                    key={index}
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                  >
                    {renderCard(card)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="game-phase">
              Phase: {gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}
            </div>
          </div>
        </div>

        <div className="players-container">
          {players.map(renderPlayer)}
        </div>
      </div>

      <div className="game-controls">
        <div className="action-buttons">
          <motion.button
            className="btn btn-danger"
            onClick={() => handlePlayerAction('fold')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Fold
          </motion.button>
          <motion.button
            className="btn btn-warning"
            onClick={() => handlePlayerAction('call')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Call ($50)
          </motion.button>
          <motion.button
            className="btn btn-success"
            onClick={() => handlePlayerAction('raise', 100)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Raise ($100)
          </motion.button>
        </div>

        {gamePhase !== 'river' && (
          <motion.button
            className="btn btn-primary"
            onClick={dealCommunityCards}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Deal Next Cards
          </motion.button>
        )}
      </div>

      {playerAction && (
        <motion.div
          className="action-feedback"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          You {playerAction}ed!
        </motion.div>
      )}
    </div>
  );
};

export default PokerGame;