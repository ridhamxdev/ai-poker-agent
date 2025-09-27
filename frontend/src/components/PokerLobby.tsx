import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { Users, GamepadIcon, Crown, Star, Eye, UserPlus, Clock, Trophy, DollarSign, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import WaitingRoom from './WaitingRoom';
import './PokerLobby.css';

const PokerLobby: React.FC = () => {
  const { 
    availableGames, 
    currentGame, 
    isConnected, 
    onlineUsers,
    error,
    waitingRoom,
    createGame,
    joinGame 
  } = useSocket();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'games' | 'players'>('games');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Calculate stats
  const totalOnlinePlayers = onlineUsers.length;
  const playersInGame = onlineUsers.filter(p => availableGames.some(game => 
    game.players.some(player => player.id === p.id)
  )).length;
  const availableToPlay = totalOnlinePlayers - playersInGame;

  const canCreateGame = availableToPlay >= 3;

  if (!isConnected) {
    return (
      <div className="poker-lobby">
        <div className="lobby-container">
          <div className="lobby-loading">
            <div className="loading-spinner"></div>
            <h1>Connecting to game server...</h1>
            <p>Please wait while we establish connection...</p>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show waiting room if user is in a waiting game
  if (waitingRoom) {
    return <WaitingRoom />;
  }

  if (currentGame) {
    // If we're in a game, the PokerGame component will be rendered instead
    return null;
  }

  const getPlayerInitials = (username: string) => {
    return username.split(' ').map(name => name[0]).join('').toUpperCase();
  };

  const getPlayerStatus = (playerId: string) => {
    const inGame = availableGames.some(game => 
      game.players.some(player => player.id === playerId)
    );
    return inGame ? 'in-game' : 'online';
  };

  const handleCreateGame = () => {
    if (canCreateGame) {
      createGame();
    }
  };

  return (
    <div className="poker-lobby">
      <div className="lobby-container">
        {/* Header */}
        <motion.div 
          className="lobby-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <Link to="/game-selection" className="back-link" style={{ color: '#94a3b8', marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={20} />
              Back to Game Selection
            </Link>
            <h1 className="lobby-title">Multiplayer Lobby</h1>
          </div>
          
          <div className="lobby-stats">
            <div className="stat-item">
              <div className="stat-value">{totalOnlinePlayers}</div>
              <div className="stat-label">Online Players</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{availableGames.length}</div>
              <div className="stat-label">Active Games</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{availableToPlay}</div>
              <div className="stat-label">Available</div>
            </div>
          </div>
          
          <motion.button
            className="create-game-btn"
            onClick={handleCreateGame}
            disabled={!canCreateGame}
            whileHover={{ scale: canCreateGame ? 1.05 : 1 }}
            whileTap={{ scale: canCreateGame ? 0.95 : 1 }}
            title={!canCreateGame ? `Need at least 3 players online to create a game (currently ${availableToPlay} available)` : 'Create a new poker game'}
          >
            <UserPlus size={20} />
            Create Game
            {!canCreateGame && (
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({availableToPlay}/3)</span>
            )}
          </motion.button>
        </motion.div>

        {error && (
          <motion.div 
            className="error-message"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {error}
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div 
          className="lobby-tabs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <button
            className={`tab-button ${activeTab === 'games' ? 'active' : ''}`}
            onClick={() => setActiveTab('games')}
          >
            <GamepadIcon size={20} />
            Available Games ({availableGames.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
            onClick={() => setActiveTab('players')}
          >
            <Users size={20} />
            Online Players ({totalOnlinePlayers})
          </button>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'games' && (
            <motion.div
              key="games"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="fade-in"
            >
              {availableGames.length === 0 ? (
                <div className="empty-state">
                  <GamepadIcon className="empty-state-icon" />
                  <h3>No Games Available</h3>
                  <p>Be the first to create a poker game!<br />You need at least 3 players online to start.</p>
                </div>
              ) : (
                <div className="games-grid">
                  {availableGames.map((game, index) => {
                    const isUserInGame = game.players.some(p => p.id === user?.id);
                    const canJoin = game.state === 'waiting' && !isUserInGame && game.players.length < game.maxPlayers;
                    const canStart = game.players.length >= 3;
                    const hostPlayer = game.players[0]; // First player is typically the host
                    
                    return (
                      <motion.div
                        key={game.id}
                        className={`game-card ${game.state}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="game-header">
                          <div className="game-info">
                            <h3>Game #{game.id.slice(-6)}</h3>
                            <div className="game-meta">
                              <span><Clock size={16} /> {game.state === 'waiting' ? 'Waiting for players' : 'In progress'}</span>
                              <span><Users size={16} /> {game.players.length}/{game.maxPlayers}</span>
                              {game.pot > 0 && <span><DollarSign size={16} /> ${game.pot}</span>}
                            </div>
                          </div>
                          
                          <div className="game-actions">
                            {canJoin && (
                              <motion.button
                                className="join-btn"
                                onClick={() => joinGame(game.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <UserPlus size={16} />
                                Join Game
                              </motion.button>
                            )}
                            {game.state === 'playing' && (
                              <button className="spectate-btn">
                                <Eye size={16} />
                                Spectate
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="players-section">
                          <div className="players-header">
                            <span>Players</span>
                            <span className={`players-count ${canStart ? 'can-start' : 'need-more'}`}>
                              {canStart ? 'Ready to start!' : `Need ${3 - game.players.length} more players`}
                            </span>
                          </div>
                          
                          <div className="players-list">
                            {game.players.map((player, playerIndex) => (
                              <motion.div
                                key={player.id}
                                className={`player-chip ${player.id === user?.id ? 'current-user' : ''}`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: playerIndex * 0.05 }}
                              >
                                {playerIndex === 0 && <Crown size={12} />}
                                {player.username}
                                {playerIndex === 0 && <span className="host-badge">Host</span>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'players' && (
            <motion.div
              key="players"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="fade-in"
            >
              {onlineUsers.length === 0 ? (
                <div className="empty-state">
                  <Users className="empty-state-icon" />
                  <h3>No Players Online</h3>
                  <p>You're the only one here right now.<br />Invite friends to join the action!</p>
                </div>
              ) : (
                <div className="online-players-grid">
                  {onlineUsers.map((player, index) => {
                    const status = getPlayerStatus(player.id);
                    const isCurrentUser = player.id === user?.id;
                    
                    return (
                      <motion.div
                        key={player.id}
                        className="player-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="player-info">
                          <div className="player-avatar">
                            {getPlayerInitials(player.username)}
                            <div className={`player-status ${status}`}></div>
                          </div>
                          <div className="player-details">
                            <h3>
                              {player.username}
                              {isCurrentUser && <span style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>(You)</span>}
                            </h3>
                            <p className="player-subtitle">
                              {status === 'online' ? 'Available to play' : 'Currently in game'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="player-stats">
                          <div className="stat">
                            <div className="stat-number">{player.chips || 1000}</div>
                            <div className="stat-text">Chips</div>
                          </div>
                          <div className="stat">
                            <div className="stat-number">-</div>
                            <div className="stat-text">Games</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PokerLobby;