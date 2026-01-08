import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, DollarSign, Users, Bot } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useAIGame } from '../contexts/AIGameContext';
import './PokerGame.css';

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
}

interface AIPlayer {
  id: string;
  userId?: string;
  username: string;
  chips: number;
  cards?: string[];
  currentBet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  isAI: boolean;
  aiId?: string;
  position?: 'bottom' | 'left' | 'top' | 'right' | 'dealer' | 'smallBlind' | 'bigBlind' | 'none';
  socketId?: string;
}

const PokerGame = () => {
  const { currentGame, makeAction, leaveGame, error: socketError } = useSocket();
  const { currentAIGame, makeAIAction, processAITurn, leaveAIGame, isLoading: aiLoading, error: aiError } = useAIGame();
  const { user } = useAuth();
  const location = useLocation();
  const [playerAction, setPlayerAction] = useState<string>('');
  const [gameMode, setGameMode] = useState<'multiplayer' | 'ai' | null>(null);
  const [showGameNotification, setShowGameNotification] = useState(false);
  const [gameNotification, setGameNotification] = useState<{
    type: 'start' | 'winner' | 'loser' | 'finish';
    message: string;
    details?: string;
  } | null>(null);
  const [showWinnerNotification, setShowWinnerNotification] = useState(false);

  // Check if this is an AI game from route state
  useEffect(() => {
    const state = location.state as any;
    if (state?.mode === 'ai') {
      setGameMode('ai');
    } else {
      setGameMode('multiplayer');
    }
  }, [location.state]);

  // Monitor game state changes for notifications
  useEffect(() => {
    const gameState = gameMode === 'ai' ? currentAIGame : currentGame;
    if (!gameState) return;

    // Show game start notification
    if (gameState.gameState === 'preflop' && gameState.players?.length > 0) {
      setGameNotification({
        type: 'start',
        message: 'New Hand Started!',
        details: `Blinds: $${gameState.smallBlind || 25} / $${gameState.bigBlind || 50}`
      });
      setShowGameNotification(true);
      setTimeout(() => setShowGameNotification(false), 3000);
    }

    // Show game finish notification
    if (gameState.gameState === 'finished' && gameState.winner) {


      // Show winner notification for 5 seconds then hide
      setShowWinnerNotification(true);
      setTimeout(() => setShowWinnerNotification(false), 5000);
    }
  }, [gameMode, currentAIGame, currentGame, user]);

  // Effect to trigger AI turn processing if needed
  useEffect(() => {
    if (gameMode === 'ai' && currentAIGame && currentAIGame.gameState !== 'finished') {
      const currentPlayer = currentAIGame.players[currentAIGame.currentTurn];
      // If current player is AI, trigger backend process
      // We use a timeout to throttle and allow UI update
      if (currentPlayer && (currentPlayer.isAI || currentPlayer.aiId)) {
        const timer = setTimeout(() => {
          console.log('Detected AI turn, ensuring processing...');
          processAITurn();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [gameMode, currentAIGame, processAITurn]);

  // Don't render anything until we know the game mode
  if (gameMode === null) {
    return <div className="poker-game loading"><div className="loading-spinner">Loading game...</div></div>;
  }

  // For AI games, redirect to game selection if no game state
  // Add a small loading state to prevent premature redirect
  if (gameMode === 'ai' && !currentAIGame && !aiLoading) {
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

  const getPlayerPositions = (players: AIPlayer[]): AIPlayer[] => {
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

  const parseCard = (cardData: string | { suit: string; rank: string }): Card => {
    // Handle both string format ("A♥") and object format ({suit: "hearts", rank: "A"})
    if (typeof cardData === 'string') {
      const rank = cardData.slice(0, -1);
      const suit = cardData.slice(-1);
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
    } else if (cardData && typeof cardData === 'object' && cardData.suit && cardData.rank) {
      // Handle object format
      return {
        rank: cardData.rank,
        suit: cardData.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades'
      };
    } else {
      // Fallback for invalid data
      console.warn('Invalid card data:', cardData);
      return {
        rank: 'A',
        suit: 'spades'
      };
    }
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

  const renderCard = (cardData: string | { suit: string; rank: string } | null, isHidden = false) => {
    // Handle empty or invalid card data
    if (!cardData) {
      return (
        <motion.div
          className="playing-card hidden"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card-back">🂠</div>
        </motion.div>
      );
    }

    const card = parseCard(cardData);
    // Show all cards when game is finished or in showdown
    const shouldShowCard = !isHidden || (gameState?.gameState === 'finished' || gameState?.gameState === 'showdown');
    const isReveal = isHidden && (gameState?.gameState === 'finished' || gameState?.gameState === 'showdown');

    // Debug logging
    if (gameState?.gameState === 'finished') {
      console.log('Card reveal debug:', {
        cardData,
        isHidden,
        gameState: gameState?.gameState,
        shouldShowCard,
        isReveal,
        card: card
      });
    }

    return (
      <motion.div
        className={`playing-card ${!shouldShowCard ? 'hidden' : ''} ${isReveal ? 'reveal' : ''}`}
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        transition={{ duration: 0.6, delay: isReveal ? 0.5 : 0 }}
      >
        {shouldShowCard ? (
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

  const renderPlayer = (player: AIPlayer, uiPosition: 'bottom' | 'left' | 'top' | 'right') => {
    const isCurrentPlayer = gameState?.currentTurn === gameState?.players.findIndex(p => p.id === player.id || p.username === player.username || p.userId === player.userId);
    const isDealer = player.position === 'dealer';
    const isSmallBlind = player.position === 'smallBlind';
    const isBigBlind = player.position === 'bigBlind';

    // Debug AI player data
    if (gameState?.gameState === 'finished') {
      console.log('AI Player data:', {
        username: player.username,
        isAI: player.isAI,
        aiId: player.aiId,
        cards: player.cards,
        gameState: gameState?.gameState
      });
    }

    return (
      <motion.div
        key={player.id}
        className={`player player-${uiPosition} ${player.folded ? 'folded' : ''} ${isCurrentPlayer ? 'current-player' : ''}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="player-info">
          <div className="player-name">
            {player.username}
            {player.isAI && <Bot size={14} className="ai-icon" />}
          </div>
          <div className="player-chips">
            <DollarSign size={16} />
            {player.chips}
          </div>
          {player.currentBet > 0 && (
            <div className="player-bet">Bet: ${player.currentBet}</div>
          )}
          {player.allIn && (
            <div className="all-in-badge">ALL-IN</div>
          )}
        </div>

        {/* Position indicators */}
        <div className="position-indicators">
          {isDealer && <div className="dealer-button">D</div>}
          {isSmallBlind && <div className="small-blind">SB</div>}
          {isBigBlind && <div className="big-blind">BB</div>}
        </div>

        <div className="player-cards">
          {player.cards && player.cards.length > 0 ? (
            player.cards.map((card, index) => {
              // Show AI cards when game is finished, otherwise hide them
              // Check multiple ways to identify AI players
              const isAI = player.isAI || player.aiId || player.username.startsWith('Bot_') || player.username.includes('AI');
              const isHumanPlayer = player.id === user?.id || player.userId === user?.id || player.username === user?.username;

              // Force show all cards when game is finished
              const shouldHide = Boolean(gameState?.gameState === 'finished' ? false : (isAI && !isHumanPlayer));

              // Debug logging
              if (gameState?.gameState === 'finished') {
                console.log(`Card for ${player.username}:`, {
                  card,
                  isAI,
                  isHumanPlayer,
                  shouldHide,
                  gameState: gameState?.gameState
                });
              }

              return (
                <div key={index}>
                  {renderCard(card, shouldHide)}
                </div>
              );
            })
          ) : (
            // Show placeholder cards if no cards are available
            <>
              <div>{renderCard(null, player.id !== user?.id && player.userId !== user?.id)}</div>
              <div>{renderCard(null, player.id !== user?.id && player.userId !== user?.id)}</div>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // Get the current game state (either multiplayer or AI)
  const gameState = gameMode === 'ai' ? currentAIGame : currentGame;
  const isLoading = gameMode === 'ai' ? aiLoading : false;
  const gameError = gameMode === 'ai' ? aiError : socketError;

  const playerIndex = gameState?.players.findIndex(p =>
    gameMode === 'ai' ? p.username === user?.username : (p.id === user?.id || p.userId === user?.id || p.username === user?.username)
  );

  // Temporary fix: If currentTurn is out of bounds, assume it's the human player's turn
  const currentTurn = gameState?.currentTurn || 0;
  const validCurrentTurn = currentTurn < (gameState?.players.length || 0) ? currentTurn : 0;
  const isCurrentPlayer = user && gameState && validCurrentTurn === playerIndex;
  const currentPlayerState = user && gameState?.players.find(p =>
    gameMode === 'ai' ? p.username === user.username : (p.id === user.id || p.userId === user.id || p.username === user.username)
  );

  // Debug logging
  console.log('Game Debug:', {
    gameMode,
    user: user?.username,
    gameState: gameState ? {
      currentTurn: gameState.currentTurn,
      players: gameState.players.map(p => ({ username: p.username, isAI: p.isAI })),
      pot: gameState.pot,
      currentBet: gameState.currentBet
    } : null,
    playerIndex,
    isCurrentPlayer,
    currentPlayerState: currentPlayerState ? {
      username: currentPlayerState.username,
      folded: currentPlayerState.folded,
      currentBet: currentPlayerState.currentBet
    } : null
  });

  const getBackPath = () => {
    return gameMode === 'ai' ? '/ai-game-setup' : '/lobby';
  };

  const handleBackClick = () => {
    if (gameMode === 'ai') {
      leaveAIGame();
    } else {
      leaveGame();
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
      <div className="game-hud-header">
        <div className="hud-left">
          <Link to={getBackPath()} onClick={handleBackClick} className="hud-btn" title={gameMode === 'ai' ? 'Back to Setup' : 'Back to Lobby'}>
            <ArrowLeft size={20} />
            <span className="btn-text">Back</span>
          </Link>
        </div>

        <div className="hud-center">
          <div className="logo-text">AI POKER <span className="highlight">AGENT</span></div>
        </div>

        <div className="hud-right">
          <div className="hud-stat">
            {gameMode === 'ai' ? <Bot size={18} /> : <Users size={18} />}
            <span>{gameMode === 'ai' ? 'AI Game' : 'Multiplayer'}</span>
          </div>
          <div className="hud-stat pot-stat">
            <DollarSign size={18} />
            <span>Pot: ${gameState.pot || 0}</span>
          </div>
        </div>
      </div>

      <div className="poker-table">
        <div className="table-center">
          {/* Game state and betting info */}
          <div className="game-info-panel">
            <div className="game-phase">
              <span className="phase-label">Phase:</span>
              <span className="phase-value">
                {gameState.gameState === 'preflop' && '🃏 PREFLOP'}
                {gameState.gameState === 'flop' && '🌊 FLOP'}
                {gameState.gameState === 'turn' && '🔄 TURN'}
                {gameState.gameState === 'river' && '🌊 RIVER'}
                {gameState.gameState === 'showdown' && '👁️ SHOWDOWN'}
                {gameState.gameState === 'finished' && '🏁 FINISHED'}
                {!gameState.gameState && '🃏 PREFLOP'}
              </span>
            </div>
            <div className="blinds-info">
              <span className="blinds-label">Blinds:</span>
              <span className="blinds-value">${gameState.smallBlind || 25} / ${gameState.bigBlind || 50}</span>
            </div>
            <div className="current-bet">
              <span className="bet-label">Current Bet:</span>
              <span className="bet-value">${gameState.currentBet || 0}</span>
            </div>
          </div>

          <div className="community-cards">
            <h3>Community Cards</h3>
            <div className="cards-container">
              <AnimatePresence>
                {gameState.communityCards && gameState.communityCards.length > 0 ? (
                  gameState.communityCards.map((card, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: -100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      {renderCard(card)}
                    </motion.div>
                  ))
                ) : (
                  // Show placeholder for community cards
                  <div className="community-placeholder">
                    <span>Community cards will appear here</span>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Pot display */}
          <div className="pot-display">
            <div className="pot-amount">
              <DollarSign size={24} />
              <span className="pot-value">${gameState.pot || 0}</span>
            </div>
            <div className="pot-label">POT</div>
          </div>
        </div>

        <div className={`players-container players-${(gameState.players || []).length}`}>
          {gameMode === 'ai'
            ? getPlayerPositions(gameState.players as AIPlayer[] || []).map((player) => renderPlayer(player, player.position as 'bottom' | 'left' | 'top' | 'right'))
            : (gameState.players || []).map((player: any) => (
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
                  {player.cards && player.cards.length > 0 ? (
                    player.cards.map((card: any, index: number) => {
                      // Show AI cards when game is finished, otherwise hide them
                      // Check multiple ways to identify AI players
                      const isAI = player.isAI || player.aiId || player.username.startsWith('Bot_') || player.username.includes('AI');
                      const isHumanPlayer = player.id === user?.id || player.userId === user?.id || player.username === user?.username;

                      // Force show all cards when game is finished or showdown
                      const shouldHide = Boolean((gameState?.gameState === 'finished' || gameState?.gameState === 'showdown') ? false : (isAI && !isHumanPlayer));

                      return (
                        <div key={index}>
                          {renderCard(card, shouldHide)}
                        </div>
                      );
                    })
                  ) : (
                    // Show placeholder cards if no cards are available
                    <>
                      <div>{renderCard(null, player.id !== user?.id && player.userId !== user?.id)}</div>
                      <div>{renderCard(null, player.id !== user?.id && player.userId !== user?.id)}</div>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          }
        </div>
      </div>



      {isCurrentPlayer && currentPlayerState && !currentPlayerState.folded && (
        <div className="game-controls">
          <div className="action-info">
            <div className="call-amount">
              To call: ${(gameState.currentBet || 0) - (currentPlayerState.currentBet || 0)}
            </div>
            <div className="your-chips">
              Your chips: ${currentPlayerState.chips || 0}
            </div>
          </div>

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

            {/* Check button - only show if no bet to call */}
            {(gameState.currentBet || 0) === (currentPlayerState.currentBet || 0) && (
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

            {/* Call button - show if there's a bet to call */}
            {(gameState.currentBet || 0) > (currentPlayerState.currentBet || 0) && (
              <motion.button
                className="btn btn-warning"
                onClick={() => handlePlayerAction('call')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
              >
                Call ${(gameState.currentBet || 0) - (currentPlayerState.currentBet || 0)}
              </motion.button>
            )}

            {/* Raise buttons - show different raise amounts */}
            {(currentPlayerState.chips || 0) > (gameState.currentBet || 0) && (
              <>
                <motion.button
                  className="btn btn-success"
                  onClick={() => handlePlayerAction('raise', gameState.bigBlind || 50)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading}
                >
                  Raise ${gameState.bigBlind || 50}
                </motion.button>

                <motion.button
                  className="btn btn-success"
                  onClick={() => handlePlayerAction('raise', (gameState.currentBet || 0) * 2)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading}
                >
                  Raise ${(gameState.currentBet || 0) * 2}
                </motion.button>
              </>
            )}

            {/* All-in button */}
            {(currentPlayerState.chips || 0) > 0 && (
              <motion.button
                className="btn btn-primary"
                onClick={() => handlePlayerAction('all-in')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLoading}
              >
                All-in ${currentPlayerState.chips || 0}
              </motion.button>
            )}
          </div>
        </div>
      )}

      {playerAction && (
        <motion.div
          className="action-feedback-pill"
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}

        >
          {playerAction === 'raise' ? 'You Raised!' :
            playerAction === 'call' ? 'You Called!' :
              playerAction === 'fold' ? 'You Folded!' :
                playerAction === 'check' ? 'You Checked!' :
                  playerAction === 'all-in' ? 'You went All-In!' :
                    `You ${playerAction}!`}
        </motion.div>
      )}

      {gameError && (
        <motion.div
          className="error-feedback"
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}

        >
          Error: {gameError}
        </motion.div>
      )}

      {/* Game State Notifications */}
      <AnimatePresence>
        {showGameNotification && gameNotification && (
          <motion.div
            className={`game-notification ${gameNotification.type}-notification`}
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ duration: 0.3 }}
          >
            <h2>{gameNotification.message}</h2>
            {gameNotification.details && (
              <p>{gameNotification.details}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner/Loser Display on Table */}
      {showWinnerNotification && gameState?.gameState === 'finished' && gameState?.winner && (
        <motion.div
          className={`${gameState.winner.playerId === user?.id || gameState.winner.playerId === user?.username ? 'winner' : 'loser'}-display`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
        >
          <h2>{gameState.winner.playerId === user?.id || gameState.winner.playerId === user?.username ? '🎉 YOU WON! 🎉' : '😞 You Lost'}</h2>
          <p>{gameState.winner.winningHand}</p>
          <p>Won: ${gameState.winner.amount}</p>
        </motion.div>
      )}
    </div>
  );
};

export default PokerGame;