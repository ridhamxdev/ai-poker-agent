import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, DollarSign, Users, Bot } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useAIGame } from '../contexts/AIGameContext';

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
}

interface Player {
  id: string;
  username: string;
  chips: number;
  cards?: string[];
  bet: number;
  folded: boolean;
  position?: 'bottom' | 'left' | 'top' | 'right';
  socketId: string;
}

const PokerGame = () => {
  const { currentGame, makeAction, leaveGame, error: socketError } = useSocket();
  const { currentAIGame, makeAIAction, leaveAIGame, isLoading: aiLoading, error: aiError } = useAIGame();
  const { user } = useAuth();
  const location = useLocation();
  const [playerAction, setPlayerAction] = useState<string>('');
  const [gameMode, setGameMode] = useState<'multiplayer' | 'ai'>('multiplayer');

  // Check if this is an AI game from route state
  useEffect(() => {
    const state = location.state as any;
    if (state?.mode === 'ai') {
      setGameMode('ai');
    }
  }, [location.state]);

  // For AI games, redirect to game selection if no game state
  if (gameMode === 'ai' && !currentAIGame) {
    return <Navigate to="/ai-game-setup" />;
  }

  // For multiplayer games, redirect to lobby if no current game
  if (gameMode === 'multiplayer' && !currentGame) {
    return <Navigate to="/lobby" />;
  }

  const handlePlayerAction = async (action: 'fold' | 'call' | 'bet' | 'raise' | 'check' | 'all-in', amount?: number) => {
    if (!user) return;

    setPlayerAction(action);

    if (gameMode === 'ai') {
      // Handle AI game action using the AI context
      await makeAIAction({
        playerId: user.id,
        type: action,
        amount
      });
    } else {
      // Handle multiplayer game action
      makeAction({
        playerId: user.id,
        type: action,
        amount
      });
    }
  };

  const getPlayerPositions = (players: Player[]): Player[] => {
    // Find current player's index
    const currentPlayerIndex = players.findIndex(p => p.id === user?.id);
    if (currentPlayerIndex === -1) return players;

    // Assign positions relative to the current player
    return players.map((player, index) => {
      const relativePosition = (index - currentPlayerIndex + players.length) % players.length;
      let position: 'bottom' | 'left' | 'top' | 'right';
      
      switch (relativePosition) {
        case 0:
          position = 'bottom';
          break;
        case 1:
          position = 'right';
          break;
        case 2:
          position = 'top';
          break;
        default:
          position = 'left';
      }

      return {
        ...player,
        position
      };
    });
  };

  const parseCard = (cardString: string): Card => {
    const rank = cardString.slice(0, -1);
    const suit = cardString.slice(-1);
    const suitMap: { [key: string]: 'hearts' | 'diamonds' | 'clubs' | 'spades' } = {
      '♥': 'hearts',
      '♦': 'diamonds',
      '♣': 'clubs',
      '♠': 'spades'
    };
    return {
      rank,
      suit: suitMap[suit] || 'spades'
    };
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

  const renderCard = (cardString: string, isHidden = false) => {
    const card = parseCard(cardString);
    return (
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
  };

  const renderPlayer = (player: Player) => (
    <motion.div
      key={player.id}
      className={`player player-${player.position} ${player.folded ? 'folded' : ''}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="player-info">
        <div className="player-name">{player.username}</div>
        <div className="player-chips">
          <DollarSign size={16} />
          {player.chips}
        </div>
        {player.bet > 0 && (
          <div className="player-bet">Bet: ${player.bet}</div>
        )}
      </div>
      <div className="player-cards">
        {player.cards?.map((card, index) => (
          <div key={index}>
            {renderCard(card, player.id !== user?.id)}
          </div>
        ))}
      </div>
    </motion.div>
  );

  // Get the current game state (either multiplayer or AI)
  const gameState = gameMode === 'ai' ? currentAIGame : currentGame;
  const isLoading = gameMode === 'ai' ? aiLoading : false;
  const gameError = gameMode === 'ai' ? aiError : socketError;
  
  const isCurrentPlayer = user && gameState && gameState.currentTurn === gameState.players.findIndex(p => 
    gameMode === 'ai' ? p.username === user.username : p.id === user.id
  );
  const currentPlayerState = user && gameState?.players.find(p => 
    gameMode === 'ai' ? p.username === user.username : p.id === user.id
  );

  const handleBackClick = () => {
    if (gameMode === 'ai') {
      leaveAIGame();
      return '/ai-game-setup';
    } else {
      leaveGame();
      return '/lobby';
    }
  };

  if (!gameState) {
    return (
      <div className="poker-game loading">
        <div className="loading-spinner">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="poker-game">
      <div className="game-header">
        <Link to={handleBackClick()} className="back-link">
          <ArrowLeft size={20} />
          {gameMode === 'ai' ? 'Back to Setup' : 'Back to Lobby'}
        </Link>
        <div className="game-info">
          <div className="game-mode">
            {gameMode === 'ai' ? <Bot size={20} /> : <Users size={20} />}
            {gameMode === 'ai' ? 'AI Game' : 'Multiplayer Game'}
          </div>
          <div className="pot-info">
            <DollarSign size={20} />
            Pot: ${gameState.pot || 0}
          </div>
        </div>
      </div>

      <div className="poker-table">
        <div className="table-center">
          <div className="community-cards">
            <h3>Community Cards</h3>
            <div className="cards-container">
              <AnimatePresence>
                {(gameState.communityCards || []).map((card, index) => (
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
          </div>
        </div>

        <div className="players-container">
          {getPlayerPositions(gameState.players || []).map(renderPlayer)}
        </div>
      </div>

      {isCurrentPlayer && currentPlayerState && !currentPlayerState.folded && (
        <div className="game-controls">
          <div className="action-buttons">
            <motion.button
              className="btn btn-danger"
              onClick={() => handlePlayerAction('fold')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Fold'}
            </motion.button>
            {(gameState.currentBet || 0) === (currentPlayerState.bet || 0) && (
              <motion.button
                className="btn btn-info"
                onClick={() => handlePlayerAction('check')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
              >
                Check
              </motion.button>
            )}
            {(gameState.currentBet || 0) > (currentPlayerState.bet || 0) && (
              <motion.button
                className="btn btn-warning"
                onClick={() => handlePlayerAction('call')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={(gameState.currentBet || 0) >= (currentPlayerState.chips || 0) || isLoading}
              >
                Call (${(gameState.currentBet || 0) - (currentPlayerState.bet || 0)})
              </motion.button>
            )}
            {(currentPlayerState.chips || 0) > (gameState.currentBet || 0) && (
              <motion.button
                className="btn btn-success"
                onClick={() => handlePlayerAction('raise', (gameState.currentBet || 0) * 2)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
              >
                Raise (${(gameState.currentBet || 0) * 2})
              </motion.button>
            )}
            {(currentPlayerState.chips || 0) > 0 && (
              <motion.button
                className="btn btn-primary"
                onClick={() => handlePlayerAction('all-in')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
              >
                All-in (${currentPlayerState.chips || 0})
              </motion.button>
            )}
          </div>
        </div>
      )}

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

      {socketError && (
        <motion.div
          className="error-feedback"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          Error: {socketError}
        </motion.div>
      )}
    </div>
  );
};

export default PokerGame;